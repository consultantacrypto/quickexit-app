import { premiumSellerConfig } from "./premiumSeller";

export const LISTING_AUTO_CATEGORY = "Auto & Moto";

type ListingLike = {
  user_id?: string | null;
  category?: string | null;
  details?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasValidSocialVideos(details: Record<string, unknown>): boolean {
  const raw = details.social_videos;
  if (!Array.isArray(raw) || raw.length === 0) return false;
  return raw.some((item) => {
    if (!isRecord(item)) return false;
    const url = item.url;
    return typeof url === "string" && url.trim().length > 0;
  });
}

function hasSoftOptIn(details: Record<string, unknown>): boolean {
  if (details.premium_seller_enabled === true) return true;
  if (details.vehicle_reviewed === true) return true;
  if (hasValidSocialVideos(details)) return true;
  return false;
}

export function isPremiumSellerListing(listing: ListingLike): boolean {
  const userId = typeof listing.user_id === "string" ? listing.user_id.trim() : "";
  if (!userId || userId !== premiumSellerConfig.ownerUserId) return false;

  const details = listing.details;
  if (!isRecord(details)) return false;

  return hasSoftOptIn(details);
}

export function isAutoListingCategory(category: string | null | undefined): boolean {
  return String(category ?? "").trim() === LISTING_AUTO_CATEGORY;
}

export function showVehicleReviewedBadge(
  details: unknown,
  category: string | null | undefined,
): boolean {
  if (!isRecord(details) || details.vehicle_reviewed !== true) return false;
  return isAutoListingCategory(category);
}
