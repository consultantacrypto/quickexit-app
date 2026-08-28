/**
 * Canonical sale-intent contract for listing publish.
 *
 * Four independent dimensions:
 * - category: what is sold (never implies method or package)
 * - sale method: how offers are accepted (`direct` | `auction`)
 * - pricing presentation: how price is shown (`fixed_price` | `price_on_request` | `evaluated`)
 * - commercial package: what QuickExit charges (`economy` | `standard` | `urgent` | `auction`)
 *
 * Column `sale_strategy` remains the package id for public SQL / checkout / HQ compatibility.
 * `details.sale_method` is the explicit seller choice when present.
 * `details.package` is the commercial package.
 * `details.strategy` is the legacy UI alias and must not contradict sale method.
 * `details.pricing_mode` never toggles sale method.
 */
import { type PricingMode } from "@/lib/pricingMode";

export const LISTING_SALE_PACKAGE_IDS = [
  "economy",
  "standard",
  "urgent",
  "auction",
] as const;

export type ListingSalePackageId = (typeof LISTING_SALE_PACKAGE_IDS)[number];

export const DIRECT_LISTING_PACKAGE_IDS = ["economy", "standard", "urgent"] as const;
export type DirectListingPackageId = (typeof DIRECT_LISTING_PACKAGE_IDS)[number];

export const DEFAULT_DIRECT_PACKAGE: DirectListingPackageId = "standard";
export const AUCTION_PACKAGE: ListingSalePackageId = "auction";

export type SaleMethod = "direct" | "auction";

export type ListingDetailsStrategy = "standard" | "licitatie";

export type ListingSaleFields = {
  sale_strategy: ListingSalePackageId;
  detailsPackage: ListingSalePackageId;
  detailsStrategy: ListingDetailsStrategy;
};

export type CanonicalListingSaleState = ListingSaleFields & {
  saleMethod: SaleMethod;
  packageId: ListingSalePackageId;
  detailsSaleMethod: SaleMethod;
  pricingMode: PricingMode | null;
};

export type SaleIntentErrorCode =
  | "invalid_package"
  | "incompatible_sale_intent"
  | "invalid_pricing_mode";

export type SaleIntentError = {
  code: SaleIntentErrorCode;
  message: string;
};

export type SaleIntentInput = {
  saleMethod?: unknown;
  packageId?: unknown;
  pricingMode?: unknown;
  sale_strategy?: unknown;
  details?: unknown;
};

export type SaleIntentResult =
  | { ok: true; state: CanonicalListingSaleState }
  | { ok: false; error: SaleIntentError };

const PACKAGE_SET = new Set<string>(LISTING_SALE_PACKAGE_IDS);
const DIRECT_PACKAGE_SET = new Set<string>(DIRECT_LISTING_PACKAGE_IDS);
const PRICING_MODES = new Set<PricingMode>([
  "evaluated",
  "fixed_price",
  "price_on_request",
]);

function detailsRecord(details: unknown): Record<string, unknown> | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  return details as Record<string, unknown>;
}

export function parseListingSalePackageId(value: unknown): ListingSalePackageId | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return PACKAGE_SET.has(raw) ? (raw as ListingSalePackageId) : null;
}

export function parseSaleMethod(value: unknown): SaleMethod | null {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "direct" || raw === "vanzare_directa" || raw === "vânzare directă") {
    return "direct";
  }
  if (raw === "auction" || raw === "licitatie" || raw === "licitație deschisă") {
    return "auction";
  }
  return null;
}

export function parsePricingMode(value: unknown): PricingMode | null {
  if (value === null || value === undefined || value === "") return null;
  return PRICING_MODES.has(value as PricingMode) ? (value as PricingMode) : null;
}

export function isDirectListingPackage(value: unknown): value is DirectListingPackageId {
  const pkg = parseListingSalePackageId(value);
  return pkg !== null && DIRECT_PACKAGE_SET.has(pkg);
}

export function isAuctionListingPackage(value: unknown): boolean {
  return parseListingSalePackageId(value) === AUCTION_PACKAGE;
}

/** Homepage / public auction classification (column or legacy alias). Never uses category. */
export function isAuctionSaleStrategy(value: unknown): boolean {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "auction" || v === "licitatie" || v === "flash";
}

export function saleMethodFromPackage(pkg: ListingSalePackageId): SaleMethod {
  return pkg === AUCTION_PACKAGE ? "auction" : "direct";
}

export function detailsStrategyFromPackage(pkg: ListingSalePackageId): ListingDetailsStrategy {
  return pkg === AUCTION_PACKAGE ? "licitatie" : "standard";
}

export function listingSaleFieldsForPackage(pkg: ListingSalePackageId): ListingSaleFields {
  return {
    sale_strategy: pkg,
    detailsPackage: pkg,
    detailsStrategy: detailsStrategyFromPackage(pkg),
  };
}

export function compatiblePackageForSaleMethod(
  saleMethod: SaleMethod,
  preferredPackage?: ListingSalePackageId | null,
): ListingSalePackageId {
  if (saleMethod === "auction") return AUCTION_PACKAGE;
  if (preferredPackage && isDirectListingPackage(preferredPackage)) return preferredPackage;
  return DEFAULT_DIRECT_PACKAGE;
}

export function resolveListingPackageIdFromRow(listing: {
  sale_strategy?: string | null;
  details?: unknown;
}): ListingSalePackageId | null {
  const fromStrategy = parseListingSalePackageId(listing.sale_strategy);
  if (fromStrategy) return fromStrategy;
  return parseListingSalePackageId(detailsRecord(listing.details)?.package);
}

/**
 * Derive sale method for legacy rows that have no details.sale_method.
 * Uses package / sale_strategy only — never pricing_mode or category.
 */
export function deriveSaleMethodFromLegacyRow(listing: {
  sale_strategy?: string | null;
  details?: unknown;
}): SaleMethod | null {
  const details = detailsRecord(listing.details);
  const explicit = parseSaleMethod(details?.sale_method);
  if (explicit) return explicit;
  const pkg = resolveListingPackageIdFromRow(listing);
  if (!pkg) {
    if (isAuctionSaleStrategy(listing.sale_strategy) || isAuctionSaleStrategy(details?.strategy)) {
      return "auction";
    }
    return null;
  }
  return saleMethodFromPackage(pkg);
}

export function canonicalStateFor(
  saleMethod: SaleMethod,
  packageId: ListingSalePackageId,
  pricingMode: PricingMode | null = null,
): CanonicalListingSaleState {
  const pkg = compatiblePackageForSaleMethod(saleMethod, packageId);
  const fields = listingSaleFieldsForPackage(pkg);
  return {
    saleMethod,
    packageId: pkg,
    pricingMode,
    detailsSaleMethod: saleMethod,
    ...fields,
  };
}

/** Form/draft: explicit sale method wins; package is coerced to a compatible value. */
export function coerceCompatibleSaleIntent(input: SaleIntentInput): CanonicalListingSaleState {
  const details = detailsRecord(input.details);
  const explicitMethod =
    parseSaleMethod(input.saleMethod) ?? parseSaleMethod(details?.sale_method);
  const pkgFromInput =
    parseListingSalePackageId(input.packageId) ??
    parseListingSalePackageId(input.sale_strategy) ??
    parseListingSalePackageId(details?.package);
  const pricingMode =
    parsePricingMode(input.pricingMode) ?? parsePricingMode(details?.pricing_mode);

  let saleMethod: SaleMethod;
  if (explicitMethod) {
    saleMethod = explicitMethod;
  } else if (pkgFromInput) {
    saleMethod = saleMethodFromPackage(pkgFromInput);
  } else if (isAuctionSaleStrategy(input.sale_strategy) || isAuctionSaleStrategy(details?.strategy)) {
    saleMethod = "auction";
  } else {
    saleMethod = "direct";
  }

  return canonicalStateFor(saleMethod, pkgFromInput ?? DEFAULT_DIRECT_PACKAGE, pricingMode);
}

/**
 * Checkout / HQ: persist-time validation.
 * Legacy rows without details.sale_method are derived, not rejected.
 * Contradictory explicit sale_method vs package is rejected (no silent rewrite).
 */
export function validatePersistedSaleIntent(listing: {
  sale_strategy?: string | null;
  details?: unknown;
}): SaleIntentResult {
  const details = detailsRecord(listing.details);
  const pkg = resolveListingPackageIdFromRow(listing);
  const pricingRaw = details?.pricing_mode;
  if (pricingRaw !== undefined && pricingRaw !== null && pricingRaw !== "" && !parsePricingMode(pricingRaw)) {
    return {
      ok: false,
      error: {
        code: "invalid_pricing_mode",
        message: "Prezentarea prețului salvată este invalidă. Reia publicarea.",
      },
    };
  }

  if (!pkg) {
    return {
      ok: false,
      error: {
        code: "invalid_package",
        message: "Pachet invalid pentru plată. Te rugăm să reîncerci.",
      },
    };
  }

  const explicit = parseSaleMethod(details?.sale_method);
  const derived = saleMethodFromPackage(pkg);
  if (explicit && explicit !== derived) {
    return {
      ok: false,
      error: {
        code: "incompatible_sale_intent",
        message:
          "Metoda de vânzare și pachetul nu coincid. Alege din nou metoda de vânzare înainte de plată.",
      },
    };
  }

  const strategyAlias = details?.strategy;
  if (typeof strategyAlias === "string" && strategyAlias.trim()) {
    const aliasAuction = strategyAlias.trim().toLowerCase() === "licitatie";
    if (aliasAuction !== (derived === "auction")) {
      return {
        ok: false,
        error: {
          code: "incompatible_sale_intent",
          message:
            "Metoda de vânzare și pachetul nu coincid. Alege din nou metoda de vânzare înainte de plată.",
        },
      };
    }
  }

  return {
    ok: true,
    state: canonicalStateFor(explicit ?? derived, pkg, parsePricingMode(pricingRaw)),
  };
}

export function mergeSaleFieldsIntoDetails(
  details: unknown,
  pkg: ListingSalePackageId,
  saleMethod?: SaleMethod,
): Record<string, unknown> {
  const state = coerceCompatibleSaleIntent({
    details,
    packageId: pkg,
    saleMethod: saleMethod ?? saleMethodFromPackage(pkg),
  });
  const base = detailsRecord(details) ? { ...detailsRecord(details)! } : {};
  base.package = state.detailsPackage;
  base.strategy = state.detailsStrategy;
  base.sale_method = state.detailsSaleMethod;
  return base;
}

export function packagesVisibleForSaleMethod(saleMethod: SaleMethod): readonly ListingSalePackageId[] {
  return saleMethod === "auction" ? [AUCTION_PACKAGE] : DIRECT_LISTING_PACKAGE_IDS;
}
