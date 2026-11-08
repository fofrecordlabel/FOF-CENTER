import { query } from "./pg";
import { exec } from "./sql";

const CHUNK = 480 * 1024;
const MAX_PARTS = 560;
const MAX_AUDIO = 250 * 1024 * 1024;
const MAX_COVER = 4 * 1024 * 1024;
const AUDIO = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave", "audio/x-pn-wav", "audio/aac", "audio/flac", "audio/x-flac", "audio/aiff", "audio/x-aiff"]);

export function mediaId(url: string | null | undefined) {
  if (!url?.startsWith("/media/")) return null;
  const id = url.slice("/media/".length);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

export async function forgetMedia(url: string | null | undefined) {
  const id = mediaId(url);
  if (!id) return;
  await exec("DELETE FROM files WHERE id = ?", id);
}

export async function readMedia(id: string, start: number, length: number) {
  if (!mediaId(`/media/${id}`)) return null;
  const rows = await query<{ mime: string; name: string | null; size: number }>(
    "SELECT mime, name, octet_length(bytes) AS size FROM files WHERE id = ?",
    [id]
  );
  const meta = rows[0];
  if (!meta) return null;
  const size = Number(meta.size);
  const from = Math.min(Math.max(0, start), Math.max(0, size - 1));
  const take = Math.min(length, size - from);
  if (take <= 0) return { mime: meta.mime, name: meta.name, size, bytes: Buffer.alloc(0) };
  const chunks = await query<{ chunk: unknown }>("SELECT substring(bytes from ? for ?) AS chunk FROM files WHERE id = ?", [from + 1, take, id]);
  return { mime: meta.mime, name: meta.name, size, bytes: asBuffer(chunks[0]?.chunk) };
}

export async function storePart(input: {
  id: string;
  part: number;
  total: number;
  mime: string;
  name: string;
  kind: "cover" | "audio";
  releaseId: string | null;
  trackId: string | null;
  bytes: Uint8Array;
}) {
  if (!mediaId(`/media/${input.id}`)) throw new Error("That upload is not valid.");
  if (!Number.isInteger(input.part) || input.part < 0 || input.part >= MAX_PARTS) throw new Error(input.kind === "audio" ? "That master is over 250 MB." : "That upload is not valid.");
  if (!Number.isInteger(input.total) || input.total < 1 || input.total > MAX_PARTS || input.part >= input.total) throw new Error(input.kind === "audio" ? "That master is over 250 MB." : "That upload is not valid.");
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > CHUNK) throw new Error("That piece of the file is too large.");
  const audioMime = input.kind === "audio" ? masterType(input.mime, input.name) ?? sniffAudio(input.bytes) : null;
  if (input.kind === "cover") {
    if (input.mime !== "image/jpeg") throw new Error("A cover has to be a JPEG.");
    if (!input.releaseId) throw new Error("Pick the song for this cover.");
  } else if (!audioMime) {
    throw new Error("Use an MP3 or WAV.");
  } else if (!input.trackId && !input.releaseId) {
    throw new Error("Pick the song for this master.");
  }

  await query(
    "INSERT INTO file_parts (id, part, bytes) VALUES (?, ?, ?) ON CONFLICT (id, part) DO UPDATE SET bytes = EXCLUDED.bytes",
    [input.id, input.part, input.bytes]
  );
  const counted = await query<{ n: number }>("SELECT count(*)::int AS n FROM file_parts WHERE id = ?", [input.id]);
  if (Number(counted[0]?.n) !== input.total) return { done: false as const };

  if (input.kind === "cover") {
    const parts = await query<{ bytes: unknown }>("SELECT bytes FROM file_parts WHERE id = ? ORDER BY part", [input.id]);
    const file = Buffer.concat(parts.map((part) => asBuffer(part.bytes)));
    await exec("DELETE FROM file_parts WHERE id = ?", input.id);
    if (file.byteLength > MAX_COVER) throw new Error("That cover is too large to save.");
    const size = jpegSize(file);
    if (!size || size.width !== 3000 || size.height !== 3000) throw new Error("The cover has to be 3000×3000.");
    await attachCover(input.releaseId!, input.id, file, input.name);
  } else {
    await query(
      `INSERT INTO files (id, mime, name, bytes, created_at)
       SELECT ?, ?, ?, bytea_agg(bytes ORDER BY part), ?
       FROM file_parts WHERE id = ?`,
      [input.id, audioMime, input.name.slice(0, 180), new Date().toISOString(), input.id]
    );
    await exec("DELETE FROM file_parts WHERE id = ?", input.id);
    const saved = await query<{ size: number }>("SELECT octet_length(bytes) AS size FROM files WHERE id = ?", [input.id]);
    if (Number(saved[0]?.size ?? 0) > MAX_AUDIO) {
      await exec("DELETE FROM files WHERE id = ?", input.id);
      throw new Error("That master is over 250 MB.");
    }
    await attachAudio(await resolveTrack(input.trackId, input.releaseId), input.id, audioMime!);
  }
  return { done: true as const, url: `/media/${input.id}` };
}

async function attachCover(releaseId: string, id: string, bytes: Buffer, name: string) {
  const rows = await query<{ cover_url: string | null; artist_id: string; title: string }>("SELECT cover_url, artist_id, title FROM releases WHERE id = ?", [releaseId]);
  const release = rows[0];
  if (!release) throw new Error("That song is not on file.");
  await query("INSERT INTO files (id, mime, name, bytes, created_at) VALUES (?, 'image/jpeg', ?, ?, ?)", [id, name.slice(0, 180), bytes, new Date().toISOString()]);
  await exec("UPDATE releases SET cover_url = ? WHERE id = ?", `/media/${id}`, releaseId);
  if (release.cover_url && release.cover_url !== `/media/${id}`) await forgetMedia(release.cover_url);
  await query("INSERT INTO activity (id, artist_id, action, detail, created_at) VALUES (?, ?, 'Cover', ?, ?)", [
    crypto.randomUUID(),
    release.artist_id,
    `${release.title} cover saved at 3000×3000.`,
    new Date().toISOString(),
  ]);
}

async function resolveTrack(trackId: string | null, releaseId: string | null) {
  if (trackId) {
    const rows = await query<{ id: string }>("SELECT id FROM tracks WHERE id = ?", [trackId]);
    if (!rows[0]) throw new Error("That song is not on file.");
    return trackId;
  }
  if (!releaseId) throw new Error("Pick the song for this master.");
  const open = await query<{ id: string }>(
    `SELECT tracks.id
     FROM tracks
     LEFT JOIN files ON tracks.audio_url = '/media/' || files.id::text
     WHERE tracks.release_id = ? AND files.id IS NULL
     ORDER BY tracks.track_number, tracks.title COLLATE NOCASE
     LIMIT 1`,
    [releaseId]
  );
  if (open[0]) return open[0].id;
  const release = await query<{ artist_id: string; title: string }>("SELECT artist_id, title FROM releases WHERE id = ?", [releaseId]);
  const song = release[0];
  if (!song) throw new Error("That song is not on file.");
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO tracks (id, release_id, artist_id, title, track_number, explicit, master_owner, publishing, bmi, mlc, soundexchange, created_at)
     VALUES (?, ?, ?, ?, 1, 1, 'FOF Records', 'FOF Music Publishing', 0, 0, 0, ?)`,
    [id, releaseId, song.artist_id, song.title, new Date().toISOString()]
  );
  return id;
}

async function attachAudio(trackId: string, id: string, mime: string) {
  const rows = await query<{ audio_url: string | null; artist_id: string; title: string }>("SELECT audio_url, artist_id, title FROM tracks WHERE id = ?", [trackId]);
  const track = rows[0];
  if (!track) throw new Error("That song is not on file.");
  await exec("UPDATE files SET mime = ? WHERE id = ?", mime, id);
  await exec("UPDATE tracks SET audio_url = ? WHERE id = ?", `/media/${id}`, trackId);
  if (track.audio_url && track.audio_url !== `/media/${id}`) await forgetMedia(track.audio_url);
  await query("INSERT INTO activity (id, artist_id, action, detail, created_at) VALUES (?, ?, 'Master', ?, ?)", [
    crypto.randomUUID(),
    track.artist_id,
    `${track.title} master audio saved.`,
    new Date().toISOString(),
  ]);
}

function sniffAudio(bytes: Uint8Array) {
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
    return "audio/wav";
  }
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return "audio/mpeg";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";
  return null;
}

function masterType(mime: string, name: string) {
  const ext = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (ext === "wav" || ext === "wave") return "audio/wav";
  if (ext === "mp3") return "audio/mpeg";
  const clean = mime.toLowerCase().split(";")[0].trim();
  if (["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave", "audio/x-pn-wav"].includes(clean)) return "audio/wav";
  if (["audio/mpeg", "audio/mp3", "audio/mpeg3", "audio/x-mpeg", "audio/x-mp3"].includes(clean)) return "audio/mpeg";
  return AUDIO.has(clean) ? clean : null;
}

function jpegSize(bytes: Buffer) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function asBuffer(value: unknown) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value.replace(/^\\x/, ""), "hex");
  return Buffer.alloc(0);
}
