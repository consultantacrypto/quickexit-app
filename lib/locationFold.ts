/**
 * Unicode-safe location folding used by search, validation and catalog matching.
 * Comma-separated and whitespace-separated input collapse to the same value.
 * Romanian ș/ş and ț/ţ are treated as equivalent.
 */
export function foldLocationSearch(value: string): string {
  return value
    .replace(/ș|ş/gi, "s")
    .replace(/ț|ţ/gi, "t")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[,;/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
