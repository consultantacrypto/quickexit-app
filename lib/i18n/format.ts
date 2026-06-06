export function getNumberLocale(appLocale: string): string {
  return appLocale === "en" ? "en-GB" : "ro-RO";
}

export function formatEurAmount(value: number, appLocale: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "€0";
  return `€${n.toLocaleString(getNumberLocale(appLocale))}`;
}

export function formatMemberSince(
  createdAt: string | null | undefined,
  appLocale: string,
): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const formatted = new Intl.DateTimeFormat(getNumberLocale(appLocale), {
    month: "long",
    year: "numeric",
  }).format(d);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
