/** Agregate publice pentru licitații deschise (fără listing_offers). */

export function parseListingOfferCount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Linie pentru card: EUR ca text, valorile mari formatate ro-RO. */
export function formatHighestOfferEURLabel(raw: unknown): string | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `EUR ${n.toLocaleString("ro-RO")}`;
}

/** Compact pentru card mobil: countdown până la expires_at ISO. */
export function formatAuctionCardTimeLeft(expiresAt: unknown): string | null {
  if (expiresAt === null || expiresAt === undefined) return null;
  const end = new Date(String(expiresAt));
  if (Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return "Expirată";
  const dayMs = 24 * 60 * 60 * 1000;
  if (diff < dayMs) return "Se închide azi";
  const days = Math.ceil(diff / dayMs);
  if (days === 1) return "Se închide în 1 zi";
  return `Se închide în ${days} zile`;
}

export function auctionOfferLineForCard(count: number): string {
  if (count === 0) return "Fii primul care trimite ofertă";
  if (count === 1) return "1 ofertă";
  return `${count} oferte`;
}

export function auctionOffersReceivedLineDetail(count: number): string | null {
  if (count === 0) return null;
  if (count === 1) return "1 ofertă primită";
  return `${count} oferte primite`;
}

export function formatFereastraOfertariiRo(expiresAt: unknown): string | null {
  if (expiresAt === null || expiresAt === undefined) return null;
  const d = new Date(String(expiresAt));
  if (Number.isNaN(d.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `Fereastră de ofertare până la: ${formatted}`;
}

export function detailHighestOfferLine(raw: unknown): string | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `Cea mai mare ofertă primită: EUR ${n.toLocaleString("ro-RO")}`;
}
