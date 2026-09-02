export const LISTING_CATEGORY_FILTERS = [
  { slug: "auto", dbName: "Auto & Moto", labelKey: "auto" },
  { slug: "imobiliare", dbName: "Imobiliare", labelKey: "realEstate" },
  { slug: "lux", dbName: "Lux & Ceasuri", labelKey: "luxury" },
  { slug: "business", dbName: "Afaceri de vânzare", labelKey: "business" },
  { slug: "gadgets", dbName: "Gadgets", labelKey: "gadgets" },
  { slug: "foto", dbName: "Foto & Audio", labelKey: "photoAudio" },
] as const;

export type ListingCategorySlug = (typeof LISTING_CATEGORY_FILTERS)[number]["slug"];

const SLUGS = new Set<string>(LISTING_CATEGORY_FILTERS.map((item) => item.slug));

export function isListingCategorySlug(value: string): value is ListingCategorySlug {
  return SLUGS.has(value);
}

export function parseListingsCategoryParam(
  raw: string | null | undefined,
): ListingCategorySlug | null {
  const slug = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!slug || slug === "all" || slug === "toate") return null;
  return isListingCategorySlug(slug) ? slug : null;
}

export function listingCategoryDbName(slug: ListingCategorySlug): string {
  const match = LISTING_CATEGORY_FILTERS.find((item) => item.slug === slug);
  return match?.dbName ?? slug;
}

export function filterListingsByCategorySlug<T extends { category?: string | null }>(
  listings: T[],
  slug: ListingCategorySlug | null,
): T[] {
  if (!slug) return listings;
  const dbName = listingCategoryDbName(slug);
  return listings.filter((item) => String(item.category ?? "").trim() === dbName);
}
