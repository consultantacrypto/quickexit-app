import { isCatalogOffer } from "@/lib/listingInventory";
import { isPriceOnRequest } from "@/lib/pricingMode";

export const MEDIA_PACKAGE_IDS = ["stories_4", "stories_8", "featured"] as const;
export type MediaPackageId = (typeof MEDIA_PACKAGE_IDS)[number];

export const MEDIA_VALUE_TIERS = [
  "under_50k",
  "50_100k",
  "100_500k",
  "over_500k",
] as const;
export type MediaValueTier = (typeof MEDIA_VALUE_TIERS)[number];

/** Provisional Phase 1 display pricing only — not a checkout contract. */
export const MEDIA_DISPLAY_PRICES_RON: Record<
  MediaValueTier,
  Record<MediaPackageId, number>
> = {
  under_50k: { stories_4: 199, stories_8: 349, featured: 699 },
  "50_100k": { stories_4: 299, stories_8: 499, featured: 899 },
  "100_500k": { stories_4: 449, stories_8: 749, featured: 1299 },
  over_500k: { stories_4: 599, stories_8: 999, featured: 1799 },
};

export type MediaPricingListing = {
  status?: unknown;
  is_seed?: unknown;
  exit_price?: unknown;
  listing_kind?: unknown;
  details?: unknown;
};

export function resolveMediaValueTier(exitPriceEur: unknown): MediaValueTier | null {
  const n = Number(exitPriceEur);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 50_000) return "under_50k";
  if (n < 100_000) return "50_100k";
  if (n < 500_000) return "100_500k";
  return "over_500k";
}

/**
 * Server-side display eligibility only.
 * No checkout, no persistence, no client-supplied tier.
 */
export function resolveMediaDisplayPricing(listing: MediaPricingListing | null | undefined): {
  eligible: boolean;
  tier: MediaValueTier | null;
  exitPriceEur: number | null;
} {
  if (!listing) {
    return { eligible: false, tier: null, exitPriceEur: null };
  }
  if (listing.status !== "active") {
    return { eligible: false, tier: null, exitPriceEur: null };
  }
  if (listing.is_seed !== false) {
    return { eligible: false, tier: null, exitPriceEur: null };
  }
  if (isCatalogOffer(listing.listing_kind)) {
    return { eligible: false, tier: null, exitPriceEur: null };
  }
  if (isPriceOnRequest(listing.details)) {
    return { eligible: false, tier: null, exitPriceEur: null };
  }

  const tier = resolveMediaValueTier(listing.exit_price);
  if (!tier) {
    return { eligible: false, tier: null, exitPriceEur: null };
  }

  const exitPriceEur = Number(listing.exit_price);
  return {
    eligible: true,
    tier,
    exitPriceEur: Number.isFinite(exitPriceEur) ? exitPriceEur : null,
  };
}

export function formatMediaPriceRon(amount: number, locale: string): string {
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO").format(amount);
  return `${formatted} RON`;
}
