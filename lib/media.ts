import { query } from "./pg";
import { exec } from "./sql";

const CHUNK = 480 * 1024;
const MAX_PARTS = 180;
const MAX_AUDIO = 80 * 1024 * 1024;
const MAX_COVER = 4 * 1024 * 1024;
const AUDIO = new Set(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/wave", "audio/aac", "audio/flac", "audio/x-flac", "audio/aiff", "audio/x-aiff"]);

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
  if (!Number.isInteger(input.part) || input.part < 0 || input.part >= MAX_PARTS) throw new Error("That upload is not valid.");
  if (!Number.isInteger(input.total) || input.total < 1 || input.total > MAX_PARTS || input.part >= input.total) throw new Error("That upload is not valid.");
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > CHUNK) throw new Error("That piece of the file is too large.");
  if (input.kind === "cover") {
    if (input.mime !== "image/jpeg") throw new Error("A cover has to be a JPEG.");
    if (!input.releaseId) throw new Error("Pick the song for this cover.");
  } else if (!AUDIO.has(input.mime)) {
    throw new Error("Use an mp3, m4a, wav, aac, flac, or aiff master.");
  } else if (!input.trackId) {
    throw new Error("Pick the song for this master.");
  }

  await query(
    "INSERT INTO file_parts (id, part, bytes) VALUES (?, ?, ?) ON CONFLICT (id, part) DO UPDATE SET bytes = EXCLUDED.bytes",
    [input.id, input.part, input.bytes]
  );
  const counted = await query<{ n: number }>("SELECT count(*)::int AS n FROM file_parts WHERE id = ?", [input.id]);
  if (Number(counted[0]?.n) !== input.total) return { done: false as const };

  const parts = await query<{ bytes: unknown }>("SELECT bytes FROM file_parts WHERE id = ? ORDER BY part", [input.id]);
  const file = Buffer.concat(parts.map((part) => asBuffer(part.bytes)));
  await exec("DELETE FROM file_parts WHERE id = ?", input.id);
  if (input.kind === "cover") {
    if (file.byteLength > MAX_COVER) throw new Error("That cover is too large to save.");
    const size = jpegSize(file);
    if (!size || size.width !== 3000 || size.height !== 3000) throw new Error("The cover has to be 3000×3000.");
    await attachCover(input.releaseId!, input.id, file, input.name);
  } else {
    if (file.byteLength > MAX_AUDIO) throw new Error("That master is over 80 MB. Export a smaller file and try again.");
    await attachAudio(input.trackId!, input.id, input.mime, file, input.name);
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

async function attachAudio(trackId: string, id: string, mime: string, bytes: Buffer, name: string) {
  const rows = await query<{ audio_url: string | null; artist_id: string; title: string }>("SELECT audio_url, artist_id, title FROM tracks WHERE id = ?", [trackId]);
  const track = rows[0];
  if (!track) throw new Error("That song is not on file.");
  await query("INSERT INTO files (id, mime, name, bytes, created_at) VALUES (?, ?, ?, ?, ?)", [id, mime, name.slice(0, 180), bytes, new Date().toISOString()]);
  await exec("UPDATE tracks SET audio_url = ? WHERE id = ?", `/media/${id}`, trackId);
  if (track.audio_url && track.audio_url !== `/media/${id}`) await forgetMedia(track.audio_url);
  await query("INSERT INTO activity (id, artist_id, action, detail, created_at) VALUES (?, ?, 'Master', ?, ?)", [
    crypto.randomUUID(),
    track.artist_id,
    `${track.title} master audio saved.`,
    new Date().toISOString(),
  ]);
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
