import { categoryPath } from "@/src/i18n/paths";
import { normalizeSaleType } from "@/utils/normalizeSaleType";

export const HOME_WORLD_DEFS = [
  { slug: "auto", category: "Auto & Moto", labelKey: "auto" },
  { slug: "imobiliare", category: "Imobiliare", labelKey: "realEstate" },
  { slug: "lux", category: "Lux & Ceasuri", labelKey: "luxury" },
] as const;

export type HomeWorldSlug = (typeof HOME_WORLD_DEFS)[number]["slug"];

export type HomeListingRow = {
  id?: string | null;
  title?: string | null;
  images?: unknown;
  category?: string | null;
  sale_strategy?: string | null;
  status?: string | null;
  is_seed?: boolean | null;
  created_at?: string | null;
  market_price?: unknown;
  exit_price?: unknown;
  discount?: unknown;
  deal_score?: unknown;
  offer_count?: number | null;
  highest_offer?: number | string | null;
  expires_at?: string | null;
  details?: unknown;
};

export function firstListingImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  for (const item of images) {
    if (typeof item === "string" && item.trim().length > 0) {
      return item.trim();
    }
  }
  return null;
}

export function isPublicNonSeedListing(item: HomeListingRow): boolean {
  const id = typeof item.id === "string" ? item.id.trim() : "";
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const statusOk = item.status == null || item.status === "active";
  const seedOk = item.is_seed == null || item.is_seed === false;
  return Boolean(id) && Boolean(title) && statusOk && seedOk;
}

export function isNormalSaleListing(item: HomeListingRow): boolean {
  return isPublicNonSeedListing(item) && normalizeSaleType(item.sale_strategy) !== "auction";
}

export type LiveHomeWorld = {
  slug: HomeWorldSlug;
  category: string;
  labelKey: (typeof HOME_WORLD_DEFS)[number]["labelKey"];
  href: string;
  image: string | null;
  title: string | null;
};

export function liveHomeWorlds(listings: HomeListingRow[]): LiveHomeWorld[] {
  return HOME_WORLD_DEFS.flatMap((world) => {
    const inWorld = listings.filter(
      (item) => isPublicNonSeedListing(item) && item.category === world.category,
    );
    if (inWorld.length === 0) return [];

    const withImage =
      inWorld.find((item) => firstListingImage(item.images)) ?? inWorld[0];

    return [
      {
        slug: world.slug,
        category: world.category,
        labelKey: world.labelKey,
        href: categoryPath(world.slug),
        image: firstListingImage(withImage?.images),
        title: typeof withImage?.title === "string" ? withImage.title.trim() : null,
      },
    ];
  });
}

export function viewAllAssetsHref(listings: HomeListingRow[]): string | null {
  const worlds = liveHomeWorlds(listings);
  if (worlds.length === 0) return null;

  let best = worlds[0];
  let bestCount = 0;
  for (const world of worlds) {
    const normalCount = listings.filter(
      (item) => isNormalSaleListing(item) && item.category === world.category,
    ).length;
    const totalCount = listings.filter(
      (item) => isPublicNonSeedListing(item) && item.category === world.category,
    ).length;
    const score = normalCount > 0 ? normalCount : totalCount;
    if (score > bestCount) {
      best = world;
      bestCount = score;
    }
  }
  return best.href;
}
