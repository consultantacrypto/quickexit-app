/** Agregate publice pentru licitații deschise (fără listing_offers). */

import { getNumberLocale } from "@/lib/i18n/format";

export function parseListingOfferCount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export type AuctionCardCopy = {
  expired: string;
  closesToday: string;
  closesInOneDay: string;
  closesInDays: (days: number) => string;
  firstOffer: string;
  oneOffer: string;
  manyOffers: (count: number) => string;
};

const DEFAULT_RO_COPY: AuctionCardCopy = {
  expired: "Expirată",
  closesToday: "Se închide azi",
  closesInOneDay: "Se închide în 1 zi",
  closesInDays: (days) => `Se închide în ${days} zile`,
  firstOffer: "Fii primul care trimite ofertă",
  oneOffer: "1 ofertă",
  manyOffers: (count) => `${count} oferte`,
};

/** Linie pentru card: EUR ca text, valorile mari formatate per locale. */
export function formatHighestOfferEURLabel(
  raw: unknown,
  appLocale: string = "ro",
): string | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `EUR ${n.toLocaleString(getNumberLocale(appLocale))}`;
}

/** Compact pentru card mobil: countdown până la expires_at ISO. */
export function formatAuctionCardTimeLeft(
  expiresAt: unknown,
  copy: AuctionCardCopy = DEFAULT_RO_COPY,
  now: Date = new Date(),
): string | null {
  if (expiresAt === null || expiresAt === undefined) return null;
  const end = new Date(String(expiresAt));
  if (Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return copy.expired;
  const dayMs = 24 * 60 * 60 * 1000;
  if (diff < dayMs) return copy.closesToday;
  const days = Math.ceil(diff / dayMs);
  if (days === 1) return copy.closesInOneDay;
  return copy.closesInDays(days);
}

export function auctionOfferLineForCard(
  count: number,
  copy: AuctionCardCopy = DEFAULT_RO_COPY,
): string {
  if (count === 0) return copy.firstOffer;
  if (count === 1) return copy.oneOffer;
  return copy.manyOffers(count);
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
