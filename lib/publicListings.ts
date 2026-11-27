import type { SupabaseClient } from "@supabase/supabase-js";
import { findCountry } from "@/lib/countries";
import { foldLocationSearch } from "@/lib/locationFold";
import { isActivePublicListingRow } from "@/lib/sitemapEntries";
import {
  listingMatchesKeyword,
  listingMatchesLocationFilter,
} from "@/lib/listingLocation";
import {
  canonicalBucharestDistrict,
  canonicalRomaniaCity,
  canonicalRomaniaCounty,
  foldRo,
  looksLikeStreetLocation,
  uniqueCatalogLocality,
} from "@/lib/romaniaLocations";

import { CRYPTO_LISTING_COLUMNS, listingAcceptsCrypto } from "@/lib/cryptoPayment";
import { PUBLIC_INVENTORY_COLUMNS, isPubliclyAvailableStatus, looksAvailableToOrder } from "@/lib/listingInventory";
import { queryToleratingMissingVerifiedQe, readVerifiedQe } from "@/lib/verifiedQe";

export const PUBLIC_LISTING_SEARCH_FIELDS =
  `id,title,images,market_price,exit_price,discount,deal_score,sale_strategy,offer_count,highest_offer,expires_at,status,is_seed,category,description,created_at,details,${CRYPTO_LISTING_COLUMNS},${PUBLIC_INVENTORY_COLUMNS}`;

export const PUBLIC_SEARCH_PAGE_SIZE = 24;
export const PUBLIC_SEARCH_MAX_PAGE = 20;

const POSTGREST_LITERAL_RE = /^[\p{L}0-9 .'\-\/]+$/u;

export type PublicSearchListing = {
  id: string;
  title: string | null;
  images: string[] | null;
  market_price?: unknown;
  exit_price?: unknown;
  discount?: unknown;
  deal_score?: unknown;
  sale_strategy?: string | null;
  offer_count?: unknown;
  highest_offer?: unknown;
  expires_at?: string | null;
  status?: string | null;
  is_seed?: boolean | null;
  category?: string | null;
  description?: string | null;
  created_at?: string | null;
  details?: unknown;
  crypto_payment_mode?: string | null;
  crypto_assets?: string[] | null;
  listing_kind?: string | null;
  availability_status?: string | null;
};

export type PublicListingSearchParams = {
  q?: string | null;
  country?: string | null;
  county?: string | null;
  city?: string | null;
  district?: string | null;
  crypto?: boolean | string | null;
  catalog?: boolean | string | null;
  verified?: boolean | string | null;
  page?: number | string | null;
  limit?: number;
};

export type ParsedPublicListingSearchParams = {
  q: string;
  country: string;
  county: string;
  city: string;
  district: string;
  crypto: boolean;
  catalog: boolean;
  verified: boolean;
  page: number;
  locationInvalid: boolean;
};

export function sanitizeSearchQuery(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[%_,()\\:*"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function sanitizeLocationParam(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[%_,()\\:*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function quotePostgrestLiteral(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return null;
  if (!POSTGREST_LITERAL_RE.test(trimmed)) return null;
  return `"${trimmed}"`;
}

export function canonicalizePublicLocationFilter(input: {
  country?: string | null;
  county?: string | null;
  city?: string | null;
  district?: string | null;
}): { country: string; county: string; city: string; district: string; invalid: boolean } {
  const countryMatched = findCountry(sanitizeLocationParam(input.country));
  let country = countryMatched?.code ?? "";
  let countyRaw = sanitizeLocationParam(input.county);
  let cityRaw = sanitizeLocationParam(input.city);
  let districtRaw = sanitizeLocationParam(input.district);

  if (!country && !countyRaw && !cityRaw && !districtRaw) {
    return { country: "", county: "", city: "", district: "", invalid: false };
  }

  if (cityRaw && looksLikeStreetLocation(cityRaw)) {
    return { country: "", county: "", city: "", district: "", invalid: true };
  }
  if (countyRaw && looksLikeStreetLocation(countyRaw)) {
    return { country: "", county: "", city: "", district: "", invalid: true };
  }

  if (!countyRaw && districtRaw) {
    const sector = canonicalBucharestDistrict(districtRaw);
    if (sector) {
      country = country || "RO";
      countyRaw = "București";
      cityRaw = cityRaw || "București";
      districtRaw = sector;
    }
  }

  if (!countyRaw && cityRaw) {
    const inferred = uniqueCatalogLocality(cityRaw);
    if (inferred) {
      country = country || "RO";
      countyRaw = inferred.county;
      cityRaw = inferred.city;
    }
  }

  const countyCanonical = countyRaw ? canonicalRomaniaCounty(countyRaw) : null;
  if (countyRaw && countyCanonical) {
    country = country || "RO";
  } else if (countyRaw && (country === "RO" || (!country && !cityRaw))) {
    if (!countyCanonical) {
      return { country: "", county: "", city: "", district: "", invalid: true };
    }
  }

  let city = cityRaw;
  if (cityRaw && countyCanonical) {
    city = canonicalRomaniaCity(countyCanonical, cityRaw) ?? cityRaw;
  }

  let district = districtRaw;
  if (districtRaw) {
    district = canonicalBucharestDistrict(districtRaw) ?? districtRaw;
  }

  return {
    country,
    county: countyCanonical ?? countyRaw,
    city,
    district,
    invalid: false,
  };
}

export function parsePublicListingSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): ParsedPublicListingSearchParams {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key) ?? "";
    const value = searchParams[key];
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
  };
  const location = canonicalizePublicLocationFilter({
    country: get("country"),
    county: get("county"),
    city: get("city"),
    district: get("district"),
  });
  const pageRaw = Number.parseInt(get("page") || "1", 10);
  const page = Number.isFinite(pageRaw)
    ? Math.min(Math.max(pageRaw, 1), PUBLIC_SEARCH_MAX_PAGE)
    : 1;
  return {
    q: sanitizeSearchQuery(get("q")),
    country: location.country,
    county: location.county,
    city: location.city,
    district: location.district,
    page,
    crypto: get("crypto") === "1",
    catalog: get("catalog") === "1",
    verified: get("verified") === "1",
    locationInvalid: location.invalid,
  };
}

export function buildKeywordOrFilter(rawQuery: string): string | null {
  const safe = sanitizeSearchQuery(rawQuery);
  const quoted = quotePostgrestLiteral(safe);
  if (!quoted) return null;
  const inner = quoted.slice(1, -1);
  const variants = Array.from(
    new Set([inner, foldRo(inner)].filter((value) => value && quotePostgrestLiteral(value))),
  );
  const fields = [
    "title",
    "description",
    "category",
    "details->>make",
    "details->>model",
    "details->>brand",
    "details->>refModel",
    "details->>location",
  ];
  const clauses: string[] = [];
  for (const variant of variants) {
    for (const field of fields) {
      clauses.push(`${field}.ilike."%${variant}%"`);
    }
  }
  return clauses.length > 0 ? clauses.join(",") : null;
}

export function buildLocationOrFilters(filter: {
  country?: string;
  county?: string;
  city?: string;
  district?: string;
}): string[] {
  const ors: string[] = [];
  const country = sanitizeLocationParam(filter.country).toUpperCase();
  const county = sanitizeLocationParam(filter.county);
  const city = sanitizeLocationParam(filter.city);
  const district = sanitizeLocationParam(filter.district);

  const pushValue = (value: string, columns: string[]) => {
    const variants = Array.from(
      new Set([value, foldLocationSearch(value)].map((item) => item.trim()).filter(Boolean)),
    );
    const clauses: string[] = [];
    for (const variant of variants) {
      const quoted = quotePostgrestLiteral(variant);
      if (!quoted) continue;
      const inner = quoted.slice(1, -1);
      for (const column of columns) {
        if (column.endsWith("location") || column.endsWith("location_search") || column.endsWith("country_name")) {
          clauses.push(`${column}.ilike."%${inner}%"`);
        } else {
          clauses.push(`${column}.eq.${quoted}`);
        }
      }
    }
    if (clauses.length > 0) ors.push(clauses.join(","));
  };

  if (country && country !== "RO") {
    pushValue(country, ["details->>country_code"]);
    const named = findCountry(country);
    if (named) {
      pushValue(named.nameRo, ["details->>country_name", "details->>location", "details->>location_search"]);
    }
  }

  if (city) {
    pushValue(city, [
      "details->>city",
      "details->>district",
      "details->>location",
      "details->>location_search",
    ]);
  } else if (district) {
    pushValue(district, ["details->>district", "details->>location", "details->>location_search"]);
  } else if (county) {
    pushValue(county, ["details->>county", "details->>location", "details->>location_search"]);
  }

  return ors;
}

export function filterPublicSearchListings(
  rows: unknown,
  params: {
    q?: string;
    country?: string;
    county?: string;
    city?: string;
    district?: string;
    crypto?: boolean;
    catalog?: boolean;
    verified?: boolean;
  },
): PublicSearchListing[] {
  if (!Array.isArray(rows)) return [];
  const q = sanitizeSearchQuery(params.q);
  const country = sanitizeLocationParam(params.country);
  const county = sanitizeLocationParam(params.county);
  const city = sanitizeLocationParam(params.city);
  const district = sanitizeLocationParam(params.district);

  return rows.filter((raw): raw is PublicSearchListing => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as PublicSearchListing;
    if (!isActivePublicListingRow(row)) return false;
    if (!listingMatchesKeyword(row, q)) return false;
    if (!listingMatchesLocationFilter(row.details, { country, county, city, district })) return false;
    if (params.crypto && !listingAcceptsCrypto(row)) return false;
    if (!isPubliclyAvailableStatus(row.availability_status)) return false;
    if (params.catalog && !looksAvailableToOrder(row)) return false;
    if (params.verified && !readVerifiedQe(row)) return false;
    return true;
  });
}

/**
 * Superset of looksAvailableToOrder for PostgREST. Diacritics and word
 * boundaries are finished in JS; description is not queried.
 * `%comand%` covers both "comanda" and "comandă" without matching a bare
 * "comand" unless "la" / "pe" (or the English phrases) also appear.
 */
const AVAILABLE_TO_ORDER_ILIKE_PATTERNS = [
  "%la%comand%",
  "%pe%comand%",
  "%on%order%",
  "%available%to%order%",
] as const;

const AVAILABLE_TO_ORDER_FIELDS = ["title", "details->>delivery_status"] as const;

export function buildAvailableToOrderOrFilter(): string {
  const clauses = ["listing_kind.eq.catalog_offer"];
  for (const field of AVAILABLE_TO_ORDER_FIELDS) {
    for (const pattern of AVAILABLE_TO_ORDER_ILIKE_PATTERNS) {
      clauses.push(`${field}.ilike."${pattern}"`);
    }
  }
  return clauses.join(",");
}

export function buildPublicSearchPath(
  filters: {
    q?: string;
    country?: string;
    county?: string;
    city?: string;
    district?: string;
    crypto?: boolean;
    catalog?: boolean;
    verified?: boolean;
  },
  page = 1,
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.country) params.set("country", filters.country);
  if (filters.county) params.set("county", filters.county);
  if (filters.city) params.set("city", filters.city);
  if (filters.district) params.set("district", filters.district);
  if (filters.crypto) params.set("crypto", "1");
  if (filters.catalog) params.set("catalog", "1");
  if (filters.verified) params.set("verified", "1");
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/cauta?${qs}` : "/cauta";
}

export async function fetchPublicSearchListings(
  supabase: SupabaseClient,
  params: PublicListingSearchParams & { locationInvalid?: boolean },
): Promise<{
  listings: PublicSearchListing[];
  total: number;
  page: number;
  pageSize: number;
  error: string | null;
}> {
  const parsed = parsePublicListingSearchParams({
    q: params.q ?? "",
    country: params.country ?? "",
    county: params.county ?? "",
    city: params.city ?? "",
    district: params.district ?? "",
    crypto: params.crypto ? "1" : "",
    catalog: params.catalog ? "1" : "",
    verified: params.verified ? "1" : "",
    page: params.page == null ? "1" : String(params.page),
  });
  const locationInvalid = params.locationInvalid ?? parsed.locationInvalid;
  const page = parsed.page;
  const pageSize = Math.min(
    Math.max(params.limit ?? PUBLIC_SEARCH_PAGE_SIZE, 1),
    PUBLIC_SEARCH_PAGE_SIZE,
  );
  const empty = {
    listings: [] as PublicSearchListing[],
    total: 0,
    page,
    pageSize,
    error: null as string | null,
  };

  if (locationInvalid) {
    return empty;
  }

  const from = (page - 1) * pageSize;
  const keywordOr = buildKeywordOrFilter(parsed.q);
  const locationOrs = buildLocationOrFilters(parsed);

  const runSearch = (fields: string, applyVerified: boolean) => {
    let query = supabase
      .from("listings")
      .select(fields, { count: "exact" })
      .eq("status", "active")
      .eq("is_seed", false)
      .order("effective_sort_at", { ascending: false })
      .order("id", { ascending: false });

    // Verified-only is a SQL predicate before range/limit so count and pages
    // describe the filtered set, not the unfiltered catalog.
    if (applyVerified) query = query.eq("verified_qe", true);

    if (parsed.catalog) {
      // SQL is a superset. Paginate after looksAvailableToOrder so the count
      // matches the rows actually shown.
      query = query.limit(PUBLIC_SEARCH_PAGE_SIZE * PUBLIC_SEARCH_MAX_PAGE);
    } else {
      query = query.range(from, from + pageSize - 1);
    }

    if (keywordOr) query = query.or(keywordOr);
    for (const locationOr of locationOrs) {
      query = query.or(locationOr);
    }
    if (parsed.crypto) query = query.neq("crypto_payment_mode", "none");
    query = query.or("availability_status.eq.available,availability_status.eq.needs_confirmation");
    if (parsed.catalog) query = query.or(buildAvailableToOrderOrFilter());
    return query;
  };

  const result = await queryToleratingMissingVerifiedQe(
    (fields) => runSearch(fields, parsed.verified),
    PUBLIC_LISTING_SEARCH_FIELDS,
    parsed.verified ? { onMissing: "empty" } : undefined,
  );
  if (result.columnMissing && parsed.verified) {
    return empty;
  }
  const { data, error, count } = result;
  if (error) {
    return { listings: [], total: 0, page, pageSize, error: error.message ?? null };
  }

  const filtered = filterPublicSearchListings(data, parsed);
  if (parsed.catalog) {
    return {
      listings: filtered.slice(from, from + pageSize),
      total: filtered.length,
      page,
      pageSize,
      error: null,
    };
  }

  return {
    listings: filtered,
    total: typeof count === "number" ? count : 0,
    page,
    pageSize,
    error: null,
  };
}
