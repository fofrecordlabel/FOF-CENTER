export function str(form: FormData, key: string, max = 4000) {
  const value = String(form.get(key) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

export function optInt(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "").trim().replace(/,/g, "");
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

export function optFloat(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function dollars(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "").trim().replace(/[$,]/g, "");
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

export function percent(form: FormData, key: string) {
  const value = optFloat(form, key);
  if (value == null || value < 0) return null;
  return Math.min(100, Math.round(value * 100) / 100);
}

export function flag(form: FormData, key: string) {
  return form.get(key) === "1" ? 1 : 0;
}

export function oneOf(value: string | null, allowed: string[], fallback: string) {
  if (value && allowed.includes(value)) return value;
  return fallback;
}

export function safePath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export function httpUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

export function mediaUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !value.includes("..")) return value.slice(0, 400);
  return httpUrl(value);
}

export function day(form: FormData, key: string) {
  const value = str(form, key, 20);
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function parseDuration(value: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  const seconds = Number(match[2]);
  if (seconds > 59) return null;
  return Number(match[1]) * 60 + seconds;
}
