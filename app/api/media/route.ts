import { storePart } from "@/lib/media";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a file." }, { status: 400 });
  const kind = form.get("kind") === "audio" ? "audio" : form.get("kind") === "cover" ? "cover" : null;
  if (!kind) return Response.json({ error: "That upload is not valid." }, { status: 400 });
  try {
    const result = await storePart({
      id: String(form.get("id") ?? ""),
      part: Number(form.get("part")),
      total: Number(form.get("total")),
      mime: String(form.get("mime") ?? file.type ?? ""),
      name: String(form.get("name") ?? file.name ?? "file"),
      kind,
      releaseId: String(form.get("release_id") ?? "") || null,
      trackId: String(form.get("track_id") ?? "") || null,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return Response.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Could not save that file.";
    return Response.json({ error: message }, { status: 400 });
  }
}
