export const BIGDEUCE_LOGO = "/brand/bigdeucefof.png";

export function isBigDeuce(name: string | null | undefined) {
  return (name ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase() === "bigdeucefof";
}

export function portrait(name: string, image?: string | null) {
  const picture = image?.trim() || null;
  if (picture) return picture;
  if (isBigDeuce(name)) return BIGDEUCE_LOGO;
  return null;
}
