import { financingConfig } from "./financingConfig";
import { isValidPrice } from "./listingPrice";
import { LISTING_AUTO_CATEGORY } from "./listingPremium";
import { getPricingMode } from "./pricingMode";
import { normalizeSaleType } from "@/utils/normalizeSaleType";

export type ListingFinancingRow = {
  id: string;
  user_id?: string | null;
  category?: string | null;
  status?: string | null;
  exit_price?: unknown;
  sale_strategy?: string | null;
  details?: unknown;
};

export type FinancingEligibilityRejectReason =
  | "not_auto"
  | "not_active"
  | "invalid_price"
  | "price_on_request"
  | "auction";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAuctionListing(saleStrategy: string | null | undefined): boolean {
  return normalizeSaleType(saleStrategy) === "auction";
}

export function isListingFinancingActive(details: unknown): boolean {
  if (!isRecord(details)) {
    return false;
  }
  return (
    details.financing_enabled === true &&
    details.financing_partner === financingConfig.partnerId
  );
}

/**
 * Eligibility for HQ to enable financing (mirrors public gating minus financing flags).
 */
export function getListingFinancingEligibility(
  listing: ListingFinancingRow,
): { eligible: true } | { eligible: false; reason: FinancingEligibilityRejectReason } {
  if (String(listing.category ?? "").trim() !== LISTING_AUTO_CATEGORY) {
    return { eligible: false, reason: "not_auto" };
  }

  if (String(listing.status ?? "").trim() !== "active") {
    return { eligible: false, reason: "not_active" };
  }

  if (!isValidPrice(listing.exit_price)) {
    return { eligible: false, reason: "invalid_price" };
  }

  if (getPricingMode(listing.details) === "price_on_request") {
    return { eligible: false, reason: "price_on_request" };
  }

  if (isAuctionListing(listing.sale_strategy ?? null)) {
    return { eligible: false, reason: "auction" };
  }

  return { eligible: true };
}

/**
 * Merge financing flags into existing details without replacing the JSON object.
 * On disable: financing_enabled=false; financing_partner is kept for audit trail.
 */
export function mergeListingFinancingDetails(
  existingDetails: unknown,
  enabled: boolean,
): Record<string, unknown> {
  const base = isRecord(existingDetails) ? { ...existingDetails } : {};

  if (enabled) {
    return {
      ...base,
      financing_enabled: true,
      financing_partner: financingConfig.partnerId,
    };
  }

  return {
    ...base,
    financing_enabled: false,
  };
}

export type ListingFinancingSnapshot = {
  financing_enabled: boolean;
  financing_partner?: string;
};

export function extractFinancingSnapshotFromDetails(
  details: unknown,
): ListingFinancingSnapshot {
  if (!isRecord(details)) {
    return { financing_enabled: false };
  }

  const snapshot: ListingFinancingSnapshot = {
    financing_enabled: details.financing_enabled === true,
  };

  if (typeof details.financing_partner === "string" && details.financing_partner.trim()) {
    snapshot.financing_partner = details.financing_partner.trim();
  }

  return snapshot;
}

export function applyFinancingSnapshotToDetails(
  details: Record<string, unknown>,
  snapshot: ListingFinancingSnapshot,
): Record<string, unknown> {
  const next = { ...details };
  delete next.financing_enabled;
  delete next.financing_partner;

  next.financing_enabled = snapshot.financing_enabled;

  if (snapshot.financing_partner !== undefined) {
    next.financing_partner = snapshot.financing_partner;
  }

  return next;
}
