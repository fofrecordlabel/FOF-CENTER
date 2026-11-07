import { readMedia } from "@/lib/media";

export const runtime = "nodejs";

const SLICE = 1024 * 1024;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const probe = await readMedia(id, 0, 1);
  if (!probe) return new Response("Not found", { status: 404 });
  const size = probe.size;
  if (size <= 0) return new Response(null, { status: 404 });
  const header = request.headers.get("range");
  let start = 0;
  let end = size - 1;
  if (header?.startsWith("bytes=")) {
    const [rawStart, rawEnd] = header.slice(6).split("-");
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : Math.min(start + SLICE - 1, size - 1);
    if (!Number.isFinite(start) || start < 0 || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
  }
  if (end >= size) end = size - 1;
  if (end - start + 1 > SLICE) end = start + SLICE - 1;
  const file = start === 0 && probe.bytes.byteLength === end - start + 1 ? probe : await readMedia(id, start, end - start + 1);
  if (!file) return new Response("Not found", { status: 404 });
  const ranged = Boolean(header);
  return new Response(new Uint8Array(file.bytes), {
    status: ranged ? 206 : 200,
    headers: {
      "Content-Type": file.mime || "application/octet-stream",
      "Content-Length": String(file.bytes.byteLength),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      ...(ranged ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    },
  });
}
