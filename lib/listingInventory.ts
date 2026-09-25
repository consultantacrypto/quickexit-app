/**
 * Inventory kind is independent of category, sale package, Stripe, and expiry.
 * Public users cannot choose catalog_offer. Missing values read as the defaults
 * so existing rows stay specific assets until a later manual classification.
 */

export const LISTING_KINDS = ["specific_asset", "catalog_offer"] as const;
export type ListingKind = (typeof LISTING_KINDS)[number];

export const AVAILABILITY_STATUSES = [
  "available",
  "needs_confirmation",
  "sold",
  "archived",
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const DEFAULT_LISTING_KIND: ListingKind = "specific_asset";
export const DEFAULT_AVAILABILITY_STATUS: AvailabilityStatus = "available";

export const PUBLIC_INVENTORY_COLUMNS = "listing_kind,availability_status";

/** Public pages keep available and needs_confirmation rows. Sold and archived stay out. */
export const PUBLIC_AVAILABILITY_OR =
  "availability_status.eq.available,availability_status.eq.needs_confirmation";

const KIND_SET = new Set<string>(LISTING_KINDS);
const AVAILABILITY_SET = new Set<string>(AVAILABILITY_STATUSES);

export const CATALOG_OFFER_COPY = {
  ro: {
    tag: "Disponibil la comandă",
    cta: "Solicită prețul și disponibilitatea",
    explanation:
      "Model disponibil prin partener. Configurația, prețul și termenul de livrare se confirmă înaintea comenzii.",
  },
  en: {
    tag: "Available to order",
    cta: "Request price and availability",
    explanation:
      "Available through a partner. Configuration, price, and delivery time are confirmed before ordering.",
  },
} as const;

export type InventoryLocale = "ro" | "en";

export function inventoryLocale(locale: string): InventoryLocale {
  return locale.toLowerCase().startsWith("en") ? "en" : "ro";
}

export function parseListingKind(value: unknown): ListingKind | null {
  if (value == null || value === "") return DEFAULT_LISTING_KIND;
  if (typeof value !== "string" || !KIND_SET.has(value)) return null;
  return value as ListingKind;
}

export function parseAvailabilityStatus(value: unknown): AvailabilityStatus | null {
  if (value == null || value === "") return DEFAULT_AVAILABILITY_STATUS;
  if (typeof value !== "string" || !AVAILABILITY_SET.has(value)) return null;
  return value as AvailabilityStatus;
}

export function isCatalogOffer(kind: unknown): boolean {
  return parseListingKind(kind) === "catalog_offer";
}

export function isPubliclyAvailableStatus(status: unknown): boolean {
  const parsed = parseAvailabilityStatus(status);
  return parsed === "available" || parsed === "needs_confirmation";
}

export type InquiryInventoryFields = {
  status?: unknown;
  is_seed?: unknown;
  expires_at?: unknown;
  user_id?: unknown;
  listing_kind?: unknown;
  availability_status?: unknown;
};

/**
 * specific_asset still respects package expiry.
 * catalog_offer and needs_confirmation stay inquirable when the listing is active.
 * sold and archived are never inquirable.
 */
export function isInventoryInquirable(listing: InquiryInventoryFields | null | undefined): boolean {
  if (!listing) return false;
  if (listing.status !== "active") return false;
  if (listing.is_seed !== false) return false;
  if (typeof listing.user_id !== "string" || !listing.user_id.trim()) return false;

  const kind = parseListingKind(listing.listing_kind);
  const availability = parseAvailabilityStatus(listing.availability_status);
  if (!kind || !availability) return false;
  if (availability === "sold" || availability === "archived") return false;

  const ignoresPackageExpiry = kind === "catalog_offer" || availability === "needs_confirmation";
  if (ignoresPackageExpiry) return true;

  if (listing.expires_at == null || listing.expires_at === "") return true;
  const expires = new Date(String(listing.expires_at));
  if (Number.isNaN(expires.getTime())) return false;
  return expires.getTime() > Date.now();
}

export function countsTowardIndividualAssetValue(row: {
  status?: unknown;
  is_seed?: unknown;
  listing_kind?: unknown;
  availability_status?: unknown;
}): boolean {
  if (row.status !== "active") return false;
  if (row.is_seed !== false) return false;
  if (parseListingKind(row.listing_kind) !== "specific_asset") return false;
  return parseAvailabilityStatus(row.availability_status) === "available";
}

export type DeclaredValueListing = {
  status?: unknown;
  is_seed?: unknown;
  listing_kind?: unknown;
  availability_status?: unknown;
  exit_price?: unknown;
  market_price?: unknown;
};

export function individualAssetDeclaredValue(rows: DeclaredValueListing[]): number {
  return rows.reduce((sum, row) => {
    if (!countsTowardIndividualAssetValue(row)) return sum;
    const exitPrice = Number(row.exit_price);
    const marketPrice = Number(row.market_price);
    const amount = Number.isFinite(exitPrice) && exitPrice > 0
      ? exitPrice
      : Number.isFinite(marketPrice) && marketPrice > 0
        ? marketPrice
        : 0;
    return sum + amount;
  }, 0);
}

/** Active demand budgets stay in the public total. Invalid budgets contribute 0. */
export function activeDemandDeclaredValue(rows: Array<{ budget?: unknown }>): number {
  return rows.reduce((sum, row) => sum + (Number(row.budget) || 0), 0);
}

/**
 * Value shown by GlobalStats: individual available assets plus active demand budgets.
 * catalog_offer, needs_confirmation, sold, and archived listings contribute nothing.
 */
export function globalStatsDeclaredValue(
  listings: DeclaredValueListing[],
  demands: Array<{ budget?: unknown }>,
): number {
  return individualAssetDeclaredValue(listings) + activeDemandDeclaredValue(demands);
}

export function catalogOfferJsonLdAvailability(): string {
  return "https://schema.org/PreOrder";
}

/** Public publish and owner edit may only persist the default kind. */
export function publicListingKindPayload(): {
  listing_kind: ListingKind;
  availability_status: AvailabilityStatus;
} {
  return {
    listing_kind: DEFAULT_LISTING_KIND,
    availability_status: DEFAULT_AVAILABILITY_STATUS,
  };
}

export function payloadAttemptsInventoryReclassification(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  return "listing_kind" in record || "availability_status" in record || "availability_confirmed_at" in record;
}
