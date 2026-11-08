import { query } from "./pg";
import { exec } from "./sql";

const COVER_CHUNK = 480 * 1024;
const AUDIO_CHUNK = 1024 * 1024;
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
  await exec("DELETE FROM file_parts WHERE id = ?", id);
  await exec("DELETE FROM files WHERE id = ?", id);
}

export async function readMedia(id: string, start: number, length: number) {
  if (!mediaId(`/media/${id}`)) return null;
  const fromByte = Math.max(0, start);
  const takeHint = Math.max(0, length);
  const rows = await query<{ mime: string; name: string | null; size: number; chunk: unknown; parts: number; part_size: number }>(
    `SELECT mime, name,
            octet_length(bytes) AS size,
            substring(bytes from ? for ?) AS chunk,
            (SELECT count(*)::int FROM file_parts WHERE file_parts.id = files.id) AS parts,
            (SELECT COALESCE(sum(octet_length(bytes)), 0)::int FROM file_parts WHERE file_parts.id = files.id) AS part_size
     FROM files WHERE id = ?`,
    [fromByte + 1, takeHint, id]
  );
  const meta = rows[0];
  if (!meta) return null;
  const stored = Number(meta.size);
  const partSize = Number(meta.part_size);
  const useParts = Number(meta.parts) > 0 && partSize > 0 && stored === 0;
  const size = useParts ? partSize : stored;
  const from = Math.min(fromByte, Math.max(0, size - 1));
  const take = Math.min(takeHint, size - from);
  if (take <= 0) return { mime: meta.mime, name: meta.name, size, bytes: Buffer.alloc(0) };
  const bytes = useParts ? await readPartRange(id, from, take) : asBuffer(meta.chunk);
  return { mime: meta.mime, name: meta.name, size, bytes };
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
  const pieceLimit = input.kind === "audio" ? AUDIO_CHUNK : COVER_CHUNK;
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > pieceLimit) throw new Error("That piece of the file is too large.");
  if (input.kind === "audio" && input.part < input.total - 1 && input.bytes.byteLength !== AUDIO_CHUNK) {
    throw new Error("That piece of the file is the wrong size. Try the file again.");
  }
  const audioMime = input.kind === "audio" ? await audioType(input) : null;
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
  if (audioMime && input.part === 0) await rememberAudio(input.id, audioMime, input.name);
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
    await rememberAudio(input.id, audioMime!, input.name);
    const saved = await query<{ size: number }>("SELECT COALESCE(sum(octet_length(bytes)), 0)::int AS size FROM file_parts WHERE id = ?", [input.id]);
    if (Number(saved[0]?.size ?? 0) > MAX_AUDIO) {
      await forgetMedia(`/media/${input.id}`);
      throw new Error("That master is over 250 MB.");
    }
    await attachAudio(await resolveTrack(input.trackId, input.releaseId), input.id, audioMime!);
  }
  return { done: true as const, url: `/media/${input.id}` };
}

async function audioType(input: { id: string; part: number; mime: string; name: string; bytes: Uint8Array }) {
  const known = masterType(input.mime, input.name) ?? (input.part === 0 ? sniffAudio(input.bytes) : null);
  if (known) return known;
  if (input.part === 0) return null;
  const rows = await query<{ mime: string }>("SELECT mime FROM files WHERE id = ?", [input.id]);
  const saved = rows[0]?.mime;
  return saved === "audio/wav" || saved === "audio/mpeg" ? saved : null;
}

async function rememberAudio(id: string, mime: string, name: string) {
  await query(
    `INSERT INTO files (id, mime, name, bytes, created_at)
     VALUES (?, ?, ?, ''::bytea, ?)
     ON CONFLICT (id) DO UPDATE SET mime = EXCLUDED.mime, name = EXCLUDED.name`,
    [id, mime, name.slice(0, 180), new Date().toISOString()]
  );
}

async function readPartRange(id: string, start: number, length: number) {
  const first = Math.floor(start / AUDIO_CHUNK);
  const last = Math.floor((start + length - 1) / AUDIO_CHUNK);
  const rows = await query<{ part: number; bytes: unknown }>(
    "SELECT part, bytes FROM file_parts WHERE id = ? AND part >= ? AND part <= ? ORDER BY part",
    [id, first, last]
  );
  const chunks: Buffer[] = [];
  for (const row of rows) {
    const buf = asBuffer(row.bytes);
    const partStart = row.part * AUDIO_CHUNK;
    const sliceFrom = Math.max(0, start - partStart);
    const sliceTo = Math.min(buf.length, start + length - partStart);
    if (sliceTo > sliceFrom) chunks.push(buf.subarray(sliceFrom, sliceTo));
  }
  return Buffer.concat(chunks);
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
    `INSERT INTO tracks (id, release_id, artist_id, title, track_number, explicit, writers, writer_ipis, master_owner, publishing, bmi, mlc, soundexchange, created_at)
     VALUES (?, ?, ?, ?, 1, 1, 'NOAH MCBRIDE', 'NOAH MCBRIDE 01285250159', 'FOF Records', 'FOF Music Publishing', 0, 0, 0, ?)`,
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
  const wave = bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
  const riff = bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const rf64 = bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x46 && bytes[2] === 0x36 && bytes[3] === 0x34;
  if (wave && (riff || rf64)) return "audio/wav";
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
