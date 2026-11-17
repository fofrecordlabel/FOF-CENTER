import { storeVaultPart } from "@/lib/vault";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a file." }, { status: 400 });
  try {
    const result = await storeVaultPart({
      id: String(form.get("id") ?? ""),
      part: Number(form.get("part")),
      total: Number(form.get("total")),
      name: String(form.get("name") ?? file.name ?? "file"),
      title: String(form.get("title") ?? ""),
      category: String(form.get("category") ?? ""),
      notes: String(form.get("notes") ?? "") || null,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return Response.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && error.message && !/unexpected|syntax|password|ECONN/i.test(error.message) ? error.message : "Could not save that file.";
    return Response.json({ error: message }, { status: 400 });
  }
}
