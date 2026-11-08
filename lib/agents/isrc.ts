/**
 * ISRC structure: CC-XXX-YY-NNNNN (12 alphanumerics without dashes).
 * Validates format only — does not claim registry ownership.
 */
export type IsrcIssue =
  | { code: "missing"; message: string }
  | { code: "length"; message: string }
  | { code: "charset"; message: string }
  | { code: "year"; message: string }
  | { code: "duplicate"; message: string; otherTrackId: string; otherTitle: string };

export function normalizeIsrc(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function formatIsrcCode(value: string) {
  const code = normalizeIsrc(value);
  if (code.length !== 12) return value;
  return `${code.slice(0, 2)}-${code.slice(2, 5)}-${code.slice(5, 7)}-${code.slice(7)}`;
}

export function validateIsrcFormat(value: string | null | undefined): IsrcIssue | null {
  if (!value?.trim()) return { code: "missing", message: "ISRC is missing" };
  const code = normalizeIsrc(value);
  if (code.length !== 12) return { code: "length", message: `ISRC must be 12 characters (got ${code.length})` };
  if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(code)) {
    return { code: "charset", message: "ISRC must match CC-XXX-YYNNNNN (country, registrant, year+designation)" };
  }
  const year = Number(code.slice(5, 7));
  if (!Number.isFinite(year) || year < 0 || year > 99) {
    return { code: "year", message: "ISRC year segment is invalid" };
  }
  return null;
}

export function findDuplicateIsrcs(
  tracks: Array<{ id: string; title: string; isrc: string | null }>
): Array<{ isrc: string; tracks: Array<{ id: string; title: string }> }> {
  const map = new Map<string, Array<{ id: string; title: string }>>();
  for (const track of tracks) {
    const code = normalizeIsrc(track.isrc);
    if (!code) continue;
    const list = map.get(code) ?? [];
    list.push({ id: track.id, title: track.title });
    map.set(code, list);
  }
  return [...map.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([isrc, group]) => ({ isrc, tracks: group }));
}

export function validateUpc(value: string | null | undefined) {
  if (!value?.trim()) return { ok: false as const, message: "UPC is missing" };
  const digits = value.replace(/\D/g, "");
  if (!(digits.length === 12 || digits.length === 13 || digits.length === 14)) {
    return { ok: false as const, message: `UPC should be 12–14 digits (got ${digits.length})` };
  }
  return { ok: true as const };
}
