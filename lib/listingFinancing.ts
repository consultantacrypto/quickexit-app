import { financingConfig } from "./financingConfig";
import { isValidPrice } from "./listingPrice";
import { LISTING_AUTO_CATEGORY } from "./listingPremium";
import { getPricingMode } from "./pricingMode";
import { normalizeSaleType } from "@/utils/normalizeSaleType";

type ListingLike = {
  category?: string | null;
  status?: string | null;
  exit_price?: unknown;
  sale_strategy?: string | null;
  details?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAuctionListing(saleStrategy: string | null | undefined): boolean {
  return normalizeSaleType(saleStrategy) === "auction";
}

export function isFinancingCalculatorEnabled(listing: ListingLike): boolean {
  if (String(listing.category ?? "").trim() !== LISTING_AUTO_CATEGORY) {
    return false;
  }

  if (String(listing.status ?? "").trim() !== "active") {
    return false;
  }

  if (!isValidPrice(listing.exit_price)) {
    return false;
  }

  if (getPricingMode(listing.details) === "price_on_request") {
    return false;
  }

  if (isAuctionListing(listing.sale_strategy ?? null)) {
    return false;
  }

  const details = listing.details;
  if (!isRecord(details)) {
    return false;
  }

  if (details.financing_enabled !== true) {
    return false;
  }

  if (details.financing_partner !== financingConfig.partnerId) {
    return false;
  }

  return true;
}

export function getFinancingVehiclePrice(listing: ListingLike): number | null {
  if (!isValidPrice(listing.exit_price)) {
    return null;
  }
  return Number(listing.exit_price);
}
