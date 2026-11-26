/**
 * Public promise shown next to paid listing packages and on paid or promoted listings.
 * Copy lives in messages/{ro,en}.json. This helper only decides where the line is relevant.
 */

import { isCatalogOffer } from "@/lib/listingInventory";
import {
  isAuctionSaleStrategy,
  parseListingSalePackageId,
} from "@/lib/listingSaleStrategy";

export const SOCIAL_PROMO_PROMISE_RO =
  "Promovat în max. 1 oră de la plată: clip pe YouTube, TikTok, Instagram + post pe X";

export const SOCIAL_PROMO_PROMISE_EN =
  "Promoted within max. 1 hour of payment: a clip on YouTube, TikTok, Instagram + a post on X";

function detailsRecord(details: unknown): Record<string, unknown> | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  return details as Record<string, unknown>;
}

export function listingShowsSocialPromo(listing: {
  status?: string | null;
  is_seed?: boolean | null;
  sale_strategy?: string | null;
  listing_kind?: string | null;
  details?: unknown;
}): boolean {
  if (listing.is_seed === true) return false;
  if (listing.status !== "active") return false;
  if (isCatalogOffer(listing.listing_kind)) return false;
  const details = detailsRecord(listing.details);
  if (details && details.stripe_fulfillment && typeof details.stripe_fulfillment === "object") {
    return true;
  }
  if (parseListingSalePackageId(listing.sale_strategy)) return true;
  if (parseListingSalePackageId(details?.package)) return true;
  if (isAuctionSaleStrategy(listing.sale_strategy)) return true;
  return false;
}
