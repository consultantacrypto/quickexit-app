import { normalizeSaleType } from "@/utils/normalizeSaleType";

export type PublicAuctionListingFields = {
  status?: string | null;
  sale_strategy?: string | null;
  expires_at?: string | null;
};

/**
 * Licitație vizibilă public: activă, tip auction, expires_at valid și strict în viitor.
 * Fail-closed la lipsă sau dată invalidă. Fără excepții per listing ID.
 */
export function isPublicAuctionOpen(
  listing: PublicAuctionListingFields,
  now: Date = new Date(),
): boolean {
  if (listing.status !== "active") return false;
  if (normalizeSaleType(listing.sale_strategy) !== "auction") return false;

  const raw = listing.expires_at;
  if (raw === null || raw === undefined || String(raw).trim() === "") return false;

  const end = new Date(String(raw));
  if (Number.isNaN(end.getTime())) return false;

  return end.getTime() > now.getTime();
}
