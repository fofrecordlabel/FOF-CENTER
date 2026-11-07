export function letterOf(name: string) {
  const letter = name.trim().replace(/^@/, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : "#";
}

export function groupByLetter<T>(items: T[], name: (item: T) => string) {
  const groups = new Map<string, T[]>();
  const sorted = [...items].sort((a, b) => name(a).localeCompare(name(b), undefined, { sensitivity: "base" }));
  for (const item of sorted) {
    const letter = letterOf(name(item));
    groups.set(letter, [...(groups.get(letter) ?? []), item]);
  }
  return [...groups.keys()]
    .sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
    .map((letter) => ({ letter, items: groups.get(letter) ?? [] }));
}
