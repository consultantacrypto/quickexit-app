import { parseListingKind } from "@/lib/listingInventory";
import { isPriceOnRequest } from "@/lib/pricingMode";

export const MEDIA_PACKAGE_IDS = ["stories_4", "stories_8", "featured"] as const;
export type MediaPackageId = (typeof MEDIA_PACKAGE_IDS)[number];
export type MediaPackage = MediaPackageId;

export const MEDIA_VALUE_TIERS = [
  "under_50k",
  "50k_100k",
  "100k_500k",
  "over_500k",
] as const;
export type MediaValueTier = (typeof MEDIA_VALUE_TIERS)[number];

export const MEDIA_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "cancelled",
] as const;
export type MediaPaymentStatus = (typeof MEDIA_PAYMENT_STATUSES)[number];

export const MEDIA_EDITORIAL_STATUSES = [
  "queued",
  "needs_info",
  "in_research",
  "in_production",
  "published",
  "rejected",
  "cancelled",
] as const;
export type MediaEditorialStatus = (typeof MEDIA_EDITORIAL_STATUSES)[number];

export const MEDIA_ORDER_SOURCES = ["publish_checkout", "post_publish"] as const;
export type MediaOrderSource = (typeof MEDIA_ORDER_SOURCES)[number];

/** Canonical server-side Media pricing grid (RON). Single source of truth. */
export const MEDIA_PRICES_RON: Record<MediaValueTier, Record<MediaPackageId, number>> = {
  under_50k: { stories_4: 199, stories_8: 349, featured: 699 },
  "50k_100k": { stories_4: 299, stories_8: 499, featured: 899 },
  "100k_500k": { stories_4: 449, stories_8: 749, featured: 1299 },
  over_500k: { stories_4: 599, stories_8: 999, featured: 1799 },
};

/** @deprecated Use MEDIA_PRICES_RON — alias kept for Phase 1 Media page imports. */
export const MEDIA_DISPLAY_PRICES_RON = MEDIA_PRICES_RON;

export type MediaQuote = {
  package: MediaPackageId;
  tier: MediaValueTier;
  amountRon: number;
  currency: "ron";
  listingValueEur: number;
};

export type MediaPricingListing = {
  status?: unknown;
  is_seed?: unknown;
  exit_price?: unknown;
  listing_kind?: unknown;
  details?: unknown;
  user_id?: unknown;
  crypto_payment_mode?: unknown;
  crypto_assets?: unknown;
};

export type MediaEligibilityReason =
  | "missing_listing"
  | "missing_user"
  | "not_owner"
  | "seed_listing"
  | "catalog_offer"
  | "price_on_request"
  | "invalid_exit_price"
  | "wrong_status"
  | "invalid_package";

export class MediaPricingError extends Error {
  readonly code:
    | "invalid_exit_price"
    | "invalid_package"
    | "invalid_tier"
    | "price_not_found";

  constructor(
    code: MediaPricingError["code"],
    message: string,
  ) {
    super(message);
    this.name = "MediaPricingError";
    this.code = code;
  }
}

function parsePositiveExitPriceEur(exitPriceEur: unknown): number | null {
  const n = Number(exitPriceEur);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function isMediaPackageId(value: unknown): value is MediaPackageId {
  return typeof value === "string" && (MEDIA_PACKAGE_IDS as readonly string[]).includes(value);
}

/**
 * Resolve Media value tier from exit price (EUR).
 * Boundaries: <50k | 50k–100k inclusive | >100k–500k inclusive | >500k
 */
export function getMediaValueTier(exitPriceEur: unknown): MediaValueTier {
  const n = parsePositiveExitPriceEur(exitPriceEur);
  if (n === null) {
    throw new MediaPricingError("invalid_exit_price", "exit_price must be a finite number > 0");
  }
  if (n < 50_000) return "under_50k";
  if (n <= 100_000) return "50k_100k";
  if (n <= 500_000) return "100k_500k";
  return "over_500k";
}

/** Non-throwing tier lookup for display helpers. */
export function resolveMediaValueTier(exitPriceEur: unknown): MediaValueTier | null {
  try {
    return getMediaValueTier(exitPriceEur);
  } catch {
    return null;
  }
}

export function getMediaPackagePriceRon(
  tier: MediaValueTier,
  mediaPackage: MediaPackageId,
): number {
  if (!MEDIA_VALUE_TIERS.includes(tier)) {
    throw new MediaPricingError("invalid_tier", `Unknown Media value tier: ${tier}`);
  }
  if (!isMediaPackageId(mediaPackage)) {
    throw new MediaPricingError("invalid_package", `Unknown Media package: ${String(mediaPackage)}`);
  }
  const amount = MEDIA_PRICES_RON[tier][mediaPackage];
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new MediaPricingError("price_not_found", `No price for ${tier}/${mediaPackage}`);
  }
  return amount;
}

export function quoteMediaPackage(
  exitPriceEur: unknown,
  mediaPackage: MediaPackageId,
): MediaQuote {
  if (!isMediaPackageId(mediaPackage)) {
    throw new MediaPricingError("invalid_package", `Unknown Media package: ${String(mediaPackage)}`);
  }
  const listingValueEur = parsePositiveExitPriceEur(exitPriceEur);
  if (listingValueEur === null) {
    throw new MediaPricingError("invalid_exit_price", "exit_price must be a finite number > 0");
  }
  const tier = getMediaValueTier(listingValueEur);
  const amountRon = getMediaPackagePriceRon(tier, mediaPackage);
  return {
    package: mediaPackage,
    tier,
    amountRon,
    currency: "ron",
    listingValueEur,
  };
}

function sharedMediaAssetEligibility(listing: MediaPricingListing): MediaEligibilityReason | null {
  if (listing.is_seed !== false) return "seed_listing";
  if (parseListingKind(listing.listing_kind) !== "specific_asset") return "catalog_offer";
  if (isPriceOnRequest(listing.details)) return "price_on_request";
  if (parsePositiveExitPriceEur(listing.exit_price) === null) return "invalid_exit_price";
  return null;
}

/**
 * Display eligibility — active listings on the public Media page.
 * Crypto acceptance does not affect eligibility.
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

  const blocked = sharedMediaAssetEligibility(listing);
  if (blocked) {
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

export type MediaCheckoutEligibilityResult =
  | {
      eligible: true;
      reason: null;
      quote: MediaQuote | null;
    }
  | {
      eligible: false;
      reason: MediaEligibilityReason;
      quote: null;
    };

/**
 * Checkout-time eligibility — pending_payment listings during publish checkout.
 * When mediaPackage is null, returns eligible with quote null (listing-only path).
 */
export function resolveMediaCheckoutEligibility(input: {
  userId: string;
  mediaPackage: MediaPackageId | null;
  listing: MediaPricingListing | null | undefined;
}): MediaCheckoutEligibilityResult {
  const { userId, mediaPackage, listing } = input;

  if (!userId.trim()) {
    return { eligible: false, reason: "missing_user", quote: null };
  }
  if (!listing) {
    return { eligible: false, reason: "missing_listing", quote: null };
  }
  if (String(listing.user_id ?? "").trim() !== userId.trim()) {
    return { eligible: false, reason: "not_owner", quote: null };
  }
  if (listing.status !== "pending_payment") {
    return { eligible: false, reason: "wrong_status", quote: null };
  }

  if (mediaPackage === null) {
    return { eligible: true, reason: null, quote: null };
  }

  if (!isMediaPackageId(mediaPackage)) {
    return { eligible: false, reason: "invalid_package", quote: null };
  }

  const blocked = sharedMediaAssetEligibility(listing);
  if (blocked) {
    return { eligible: false, reason: blocked, quote: null };
  }

  try {
    const quote = quoteMediaPackage(listing.exit_price, mediaPackage);
    return { eligible: true, reason: null, quote };
  } catch {
    return { eligible: false, reason: "invalid_exit_price", quote: null };
  }
}

export function formatMediaPriceRon(amount: number, locale: string): string {
  const formatted = new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO").format(amount);
  return `${formatted} RON`;
}

/** Display-only add-on prefix for publish Step 4. Does not change checkout amounts. */
export function formatMediaAddonPriceRon(amount: number, locale: string): string {
  return `+${formatMediaPriceRon(amount, locale)}`;
}

/**
 * Publish Step 4 UI eligibility (draft, before listing row exists).
 * Assumes seller-created specific_asset / non-seed — same as live publish insert.
 * Does not require ownership or pending_payment status.
 */
export function resolveMediaPublishUiEligibility(input: {
  pricingMode: unknown;
  exitPrice: unknown;
  details?: unknown;
}): {
  eligible: boolean;
  reason: Extract<
    MediaEligibilityReason,
    "price_on_request" | "invalid_exit_price"
  > | null;
  tier: MediaValueTier | null;
  exitPriceEur: number | null;
} {
  const details =
    input.details ??
    (input.pricingMode != null ? { pricing_mode: input.pricingMode } : undefined);
  if (isPriceOnRequest(details) || input.pricingMode === "price_on_request") {
    return { eligible: false, reason: "price_on_request", tier: null, exitPriceEur: null };
  }
  const exitPriceEur = parsePositiveExitPriceEur(input.exitPrice);
  if (exitPriceEur === null) {
    return { eligible: false, reason: "invalid_exit_price", tier: null, exitPriceEur: null };
  }
  const tier = resolveMediaValueTier(exitPriceEur);
  if (!tier) {
    return { eligible: false, reason: "invalid_exit_price", tier: null, exitPriceEur: null };
  }
  return { eligible: true, reason: null, tier, exitPriceEur };
}
