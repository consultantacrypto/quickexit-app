import type { SupabaseClient } from "@supabase/supabase-js";
import { isActivePublicListingRow } from "@/lib/sitemapEntries";
import {
  listingMatchesKeyword,
  listingMatchesLocationFilter,
} from "@/lib/listingLocation";

export const PUBLIC_LISTING_SEARCH_FIELDS =
  "id,title,images,market_price,exit_price,discount,deal_score,sale_strategy,offer_count,highest_offer,expires_at,status,is_seed,category,description,created_at,details";

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
};

export type PublicListingSearchParams = {
  q?: string | null;
  county?: string | null;
  city?: string | null;
  district?: string | null;
  limit?: number;
};

export function sanitizeSearchQuery(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function parsePublicListingSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): { q: string; county: string; city: string; district: string } {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key) ?? "";
    const value = searchParams[key];
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
  };
  return {
    q: sanitizeSearchQuery(get("q")),
    county: sanitizeSearchQuery(get("county")),
    city: sanitizeSearchQuery(get("city")),
    district: sanitizeSearchQuery(get("district")),
  };
}

export function filterPublicSearchListings(
  rows: unknown,
  params: { q?: string; county?: string; city?: string; district?: string },
): PublicSearchListing[] {
  if (!Array.isArray(rows)) return [];
  const q = sanitizeSearchQuery(params.q);
  const county = sanitizeSearchQuery(params.county);
  const city = sanitizeSearchQuery(params.city);
  const district = sanitizeSearchQuery(params.district);

  return rows.filter((raw): raw is PublicSearchListing => {
    if (!raw || typeof raw !== "object") return false;
    const row = raw as PublicSearchListing;
    if (!isActivePublicListingRow(row)) return false;
    if (!listingMatchesKeyword(row, q)) return false;
    if (!listingMatchesLocationFilter(row.details, { county, city, district })) return false;
    return true;
  });
}

export async function fetchPublicSearchListings(
  supabase: SupabaseClient,
  params: PublicListingSearchParams,
): Promise<{ listings: PublicSearchListing[]; error: string | null }> {
  const limit = Math.min(Math.max(params.limit ?? 200, 1), 500);
  const { data, error } = await supabase
    .from("listings")
    .select(PUBLIC_LISTING_SEARCH_FIELDS)
    .eq("status", "active")
    .eq("is_seed", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { listings: [], error: error.message };
  }

  return {
    listings: filterPublicSearchListings(data, {
      q: params.q ?? undefined,
      county: params.county ?? undefined,
      city: params.city ?? undefined,
      district: params.district ?? undefined,
    }),
    error: null,
  };
}
