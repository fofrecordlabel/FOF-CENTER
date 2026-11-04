const TONES = ["#111111", "#161616", "#1c1c1c", "#0e0e0e", "#141414", "#191919", "#121212", "#1a1a1a"];

export function tone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function money(cents: number | null | undefined) {
  const value = (cents ?? 0) / 100;
  const hasCents = Math.abs(cents ?? 0) % 100 !== 0;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

export function dollarsInput(cents: number | null | undefined) {
  if (cents == null) return "";
  const amount = cents / 100;
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export function compact(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function count(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function prettyDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: DESK_TIME_ZONE });
}

export function ago(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const seconds = Math.max(0, Date.now() - then) / 1000;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 21) return `${Math.floor(seconds / 86400)}d ago`;
  return prettyDate(value);
}

export function duration(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function durationInput(seconds: number | null | undefined) {
  if (seconds == null) return "";
  return duration(seconds);
}

export function rate(value: number | null | undefined) {
  if (value == null) return "—";
  return `${value}%`;
}

export function term(years: number | null | undefined, options: number | null | undefined) {
  const parts = [
    years != null ? `${years} yr${years === 1 ? "" : "s"}` : "",
    options ? `${options} option${options === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" + ") : "—";
}

const DESK_TIME_ZONE = "America/New_York";

export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DESK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function clockTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    timeZone: DESK_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function addDays(day: string, days: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateNumber = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${dateNumber}`;
}

export function formatIsrc(value: string | null | undefined) {
  if (!value) return "—";
  const code = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (code.length !== 12) return value.toUpperCase();
  return `${code.slice(0, 2)}-${code.slice(2, 5)}-${code.slice(5, 7)}-${code.slice(7)}`;
}

export function socialUrl(kind: "instagram" | "tiktok" | "youtube" | "website" | "spotify", value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "");
  if (kind === "instagram") return `https://instagram.com/${handle}`;
  if (kind === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (kind === "youtube") return `https://www.youtube.com/@${handle}`;
  if (kind === "website") return `https://${handle}`;
  return null;
}
