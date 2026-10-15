/**
 * Guards paid publish/checkout so specific_asset listings cannot proceed with zero images.
 * Catalog offers keep their existing contract (images optional at checkout).
 */
import { parseListingKind } from "@/lib/listingInventory";
import {
  MIN_LISTING_IMAGES,
  sanitizeListingImageUrls,
} from "@/lib/listingImageUpload";

export const BLOCKED_ZERO_IMAGES_CODE = "blocked_zero_images" as const;

export type ListingImagesCheckoutGate =
  | { ok: true; images: string[]; kind: "specific_asset" | "catalog_offer" }
  | { ok: false; code: typeof BLOCKED_ZERO_IMAGES_CODE; kind: "specific_asset" };

/**
 * Final gate used by Stripe checkout (and mirrored client-side).
 * specific_asset requires ≥1 sanitized public image URL.
 * catalog_offer is not blocked by empty images.
 */
export function listingImagesReadyForCheckout(
  listingKind: unknown,
  images: unknown,
): ListingImagesCheckoutGate {
  const kind = parseListingKind(listingKind) ?? "specific_asset";
  const sanitized = sanitizeListingImageUrls(images);

  if (kind === "catalog_offer") {
    return { ok: true, images: sanitized, kind: "catalog_offer" };
  }

  if (sanitized.length < MIN_LISTING_IMAGES) {
    return { ok: false, code: BLOCKED_ZERO_IMAGES_CODE, kind: "specific_asset" };
  }

  return { ok: true, images: sanitized, kind: "specific_asset" };
}

export function listingHasRenderableImages(images: unknown): boolean {
  return sanitizeListingImageUrls(images).length > 0;
}
