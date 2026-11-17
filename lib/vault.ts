import { labelFor, VAULT_CATEGORIES, values } from "./labels";
import { query } from "./pg";
import { exec } from "./sql";

const CHUNK = 480 * 1024;
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PARTS = 60;
const CATEGORIES = new Set(values(VAULT_CATEGORIES));

export async function storeVaultPart(input: {
  id: string;
  part: number;
  total: number;
  name: string;
  title: string;
  category: string;
  notes: string | null;
  bytes: Uint8Array;
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)) throw new Error("That upload is not valid.");
  if (!Number.isInteger(input.part) || input.part < 0 || input.part >= MAX_PARTS) throw new Error("That file is over 25 MB.");
  if (!Number.isInteger(input.total) || input.total < 1 || input.total > MAX_PARTS || input.part >= input.total) throw new Error("That file is over 25 MB.");
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > CHUNK) throw new Error("That piece of the file is too large.");
  if (input.part < input.total - 1 && input.bytes.byteLength !== CHUNK) throw new Error("That piece of the file is the wrong size. Try the file again.");
  const category = CATEGORIES.has(input.category) ? input.category : "";
  if (!category) throw new Error("Pick a category for this file.");
  const title = input.title.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 180);
  if (!title) throw new Error("A file needs a name.");
  if (await saved(input.id)) return { done: true as const, url: `/files/${input.id}` };
  if (input.part === 0) {
    const mime = sniffDoc(input.bytes);
    if (!mime) throw new Error(heic(input.name) ? "Save that screenshot as a JPEG or PNG." : "Use a PDF or a picture.");
  }

  await query(
    "INSERT INTO file_parts (id, part, bytes) VALUES (?, ?, ?) ON CONFLICT (id, part) DO UPDATE SET bytes = EXCLUDED.bytes",
    [input.id, input.part, input.bytes]
  );
  const counted = await query<{ n: number }>("SELECT count(*)::int AS n FROM file_parts WHERE id = ?", [input.id]);
  if (Number(counted[0]?.n) !== input.total) return { done: false as const };

  const parts = await query<{ bytes: unknown }>("SELECT bytes FROM file_parts WHERE id = ? ORDER BY part", [input.id]);
  const file = Buffer.concat(parts.map((part) => asBuffer(part.bytes)));
  if (file.byteLength === 0 || file.byteLength > MAX_BYTES) {
    await exec("DELETE FROM file_parts WHERE id = ?", input.id);
    throw new Error("That file is over 25 MB.");
  }
  const mime = sniffDoc(file);
  if (!mime) {
    await exec("DELETE FROM file_parts WHERE id = ?", input.id);
    throw new Error("Use a PDF or a picture.");
  }
  const name = cleanName(input.name);
  const notes = input.notes?.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 500) || null;
  const now = new Date().toISOString();
  try {
    await query("INSERT INTO files (id, mime, name, bytes, created_at) VALUES (?, ?, ?, ?, ?)", [input.id, mime, name, file, now]);
    await query("INSERT INTO vault (id, title, category, notes, created_at) VALUES (?, ?, ?, ?, ?)", [input.id, title, category, notes, now]);
    await query("INSERT INTO activity (id, artist_id, action, detail, created_at) VALUES (?, NULL, 'File', ?, ?)", [
      crypto.randomUUID(),
      `${title} saved under ${labelFor(VAULT_CATEGORIES, category)}.`,
      now,
    ]);
  } catch (error) {
    await exec("DELETE FROM vault WHERE id = ?", input.id);
    await exec("DELETE FROM files WHERE id = ?", input.id);
    await exec("DELETE FROM file_parts WHERE id = ?", input.id);
    throw error;
  }
  await exec("DELETE FROM file_parts WHERE id = ?", input.id);
  return { done: true as const, url: `/files/${input.id}` };
}

async function saved(id: string) {
  const rows = await query<{ id: string }>("SELECT id FROM vault WHERE id = ?", [id]);
  return Boolean(rows[0]);
}

function cleanName(name: string) {
  const base = name.replace(/^.*[\\/]/, "").replace(/[\u0000-\u001f"]/g, "").trim();
  return (base || "file").slice(0, 180);
}

function heic(name: string) {
  return /\.(heic|heif)$/i.test(name);
}

function sniffDoc(bytes: Uint8Array) {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function asBuffer(value: unknown) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value.replace(/^\\x/, ""), "hex");
  return Buffer.alloc(0);
}
