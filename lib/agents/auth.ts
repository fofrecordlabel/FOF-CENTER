import { createHash, timingSafeEqual } from "crypto";

export function cronAuthorized(request: Request) {
  const expected = process.env.AGENTS_CRON_SECRET?.trim();
  if (!expected) return { ok: false as const, reason: "AGENTS_CRON_SECRET is not configured" };

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const alt = request.headers.get("x-fof-agents-secret")?.trim() ?? "";
  const provided = bearer || alt;
  if (!provided) return { ok: false as const, reason: "Missing bearer token" };

  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false as const, reason: "Invalid cron secret" };
  }
  return { ok: true as const };
}
