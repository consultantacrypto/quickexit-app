/**
 * Static asserts: no misleading Unsplash house fallbacks on public listing UIs.
 * Neutral empty frames via ListingMedia (no empty/invalid img src).
 * Preserves Admin Bump public ordering on category + auctions surfaces.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalListingImageSrc } from "../lib/listingMedia";
import { sanitizeListingImageUrls } from "../lib/listingImageUpload";
import { PUBLIC_LISTING_SORT_PRIMARY } from "../lib/listingRank";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const HOUSE_FALLBACK = "images.unsplash.com/photo-1512917774080";

const surfaces = [
  "app/[locale]/anunturi/AnunturiClient.tsx",
  "app/[locale]/cauta/page.tsx",
  "app/[locale]/licitatii/page.tsx",
  "app/[locale]/categorii/[slug]/CategorieClient.tsx",
  "app/[locale]/future-mobility/FutureMobilityListingGrid.tsx",
  "app/[locale]/anunt/[id]/AnuntClient.tsx",
  "app/[locale]/page.tsx",
  "app/components/AdCard.tsx",
  "app/components/ListingMedia.tsx",
] as const;

for (const path of surfaces) {
  const src = readFileSync(resolve(path), "utf8");
  assert(!src.includes(HOUSE_FALLBACK), `${path} must not use Unsplash house fallback`);
}

const listingMedia = readFileSync(resolve("app/components/ListingMedia.tsx"), "utf8");
assert(
  listingMedia.includes("{canonical ? (") || listingMedia.includes("canonical ? ("),
  "ListingMedia gates Image on canonical src",
);
assert(
  listingMedia.includes('role: "img"') || listingMedia.includes('role="img"'),
  "ListingMedia empty frame exposes accessible role",
);

assert(canonicalListingImageSrc("") === "", "empty src stays empty (no fabricated URL)");
assert(canonicalListingImageSrc("   ") === "", "whitespace src stays empty");
assert(sanitizeListingImageUrls([]).length === 0, "sanitize empty array → no URLs");
assert(sanitizeListingImageUrls([""]).length === 0, "sanitize blank string → no URLs");
assert(sanitizeListingImageUrls(["javascript:alert(1)"]).length === 0, "sanitize blocks javascript URL");
assert(
  sanitizeListingImageUrls([
    "https://geywuzwbzecknokvnins.supabase.co/storage/v1/object/public/listings/u/a.jpg",
  ]).length === 1,
  "sanitize keeps valid listing object URL",
);

const detail = readFileSync(resolve("app/[locale]/anunt/[id]/AnuntClient.tsx"), "utf8");
assert(detail.includes("sanitizeListingImageUrls"), "detail sanitizes gallery URLs");
assert(detail.includes("hasListingImages"), "detail gates gallery on real images");
assert(detail.includes("gallery.imagesUnavailable"), "detail shows neutral unavailable copy");
assert(
  detail.includes("imageLightboxOpen && hasListingImages"),
  "lightbox only when images exist",
);

const category = readFileSync(
  resolve("app/[locale]/categorii/[slug]/CategorieClient.tsx"),
  "utf8",
);
assert(
  category.includes(`.order("${PUBLIC_LISTING_SORT_PRIMARY}", { ascending: false })`),
  "category retains effective_sort_at ordering",
);

const auctions = readFileSync(resolve("app/[locale]/licitatii/page.tsx"), "utf8");
assert(
  auctions.includes(`.order("${PUBLIC_LISTING_SORT_PRIMARY}", { ascending: false })`),
  "auctions retain effective_sort_at ordering",
);
assert(auctions.includes('const FALLBACK_IMAGE = ""'), "auctions use empty fallback constant");

const anunturi = readFileSync(resolve("app/[locale]/anunturi/AnunturiClient.tsx"), "utf8");
assert(anunturi.includes('const FALLBACK_IMAGE = ""'), "anunturi use empty fallback constant");

const cauta = readFileSync(resolve("app/[locale]/cauta/page.tsx"), "utf8");
assert(cauta.includes('const FALLBACK_IMAGE = ""'), "search uses empty fallback constant");

console.log("OK image-honesty");
