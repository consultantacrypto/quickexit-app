/**
 * Static QuickExit Media examples — real published clips only.
 * No invented views/likes/dates. Thumbnails use YouTube poster URLs for owned Shorts.
 */

export const MEDIA_EXAMPLE_CATEGORIES = [
  "real_estate",
  "automotive",
  "watches_luxury",
  "businesses",
] as const;

export type MediaExampleCategory = (typeof MEDIA_EXAMPLE_CATEGORIES)[number];

export const MEDIA_EXAMPLE_PLATFORMS = ["tiktok", "youtube"] as const;
export type MediaExamplePlatform = (typeof MEDIA_EXAMPLE_PLATFORMS)[number];

export type MediaExample = {
  id: string;
  category: MediaExampleCategory;
  platform: MediaExamplePlatform;
  videoUrl: string;
  /** Neutral editorial title key suffix under Media.examples.titles.* */
  titleKey: string;
  assetName: string | null;
  /** YouTube poster when available; null for TikTok-only fallback styling. */
  thumbnail: string | null;
  /** Extracted YouTube id for lite embed — null for TikTok. */
  youtubeId: string | null;
  listingId: string | null;
  active: boolean;
  sortOrder: number;
};

export const MEDIA_DEFAULT_CATEGORY: MediaExampleCategory = "real_estate";

/** Official YouTube poster for a Shorts/video id — no scraped TikTok metadata. */
export function youtubePosterUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function extractYoutubeId(url: string): string | null {
  const trimmed = url.trim();
  const shorts = trimmed.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i);
  if (shorts?.[1]) return shorts[1];
  const watch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (watch?.[1]) return watch[1];
  const youtu = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (youtu?.[1]) return youtu[1];
  return null;
}

/**
 * Map public listing.category labels to Media example tabs.
 * Returns null when no safe mapping exists.
 */
export function mapListingCategoryToMediaExample(
  category: unknown,
): MediaExampleCategory | null {
  if (typeof category !== "string") return null;
  const raw = category.trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("imobil")) return "real_estate";
  if (raw.includes("auto") || raw.includes("moto")) return "automotive";
  if (raw.includes("lux") || raw.includes("ceas")) return "watches_luxury";
  if (raw.includes("afacer") || raw.includes("business")) return "businesses";
  return null;
}

export function resolveInitialMediaCategory(
  listingCategory: unknown,
): MediaExampleCategory {
  return mapListingCategoryToMediaExample(listingCategory) ?? MEDIA_DEFAULT_CATEGORY;
}

function ytExample(
  partial: Omit<MediaExample, "platform" | "thumbnail" | "youtubeId" | "active"> & {
    videoUrl: string;
  },
): MediaExample {
  const youtubeId = extractYoutubeId(partial.videoUrl);
  if (!youtubeId) {
    throw new Error(`Invalid YouTube Shorts URL for ${partial.id}`);
  }
  return {
    ...partial,
    platform: "youtube",
    youtubeId,
    thumbnail: youtubePosterUrl(youtubeId),
    active: true,
  };
}

function ttExample(
  partial: Omit<MediaExample, "platform" | "thumbnail" | "youtubeId" | "active"> & {
    videoUrl: string;
    /** Same-story YouTube poster used as visual stand-in (no TikTok scrape). */
    posterYoutubeId: string;
  },
): MediaExample {
  return {
    id: partial.id,
    category: partial.category,
    platform: "tiktok",
    videoUrl: partial.videoUrl,
    titleKey: partial.titleKey,
    assetName: partial.assetName,
    thumbnail: youtubePosterUrl(partial.posterYoutubeId),
    youtubeId: null,
    listingId: partial.listingId,
    active: true,
    sortOrder: partial.sortOrder,
  };
}

/**
 * Eight real QuickExit published examples (4 categories × TikTok + YouTube Shorts).
 * Extensible: add rows without changing gallery structure.
 */
export const MEDIA_EXAMPLES: readonly MediaExample[] = [
  ttExample({
    id: "real-estate-tiktok",
    category: "real_estate",
    videoUrl: "https://www.tiktok.com/@quickexitro/video/7692107130370854166",
    titleKey: "realEstate",
    assetName: null,
    listingId: null,
    sortOrder: 10,
    posterYoutubeId: "b2wJ04bEJJs",
  }),
  ytExample({
    id: "real-estate-youtube",
    category: "real_estate",
    videoUrl: "https://youtube.com/shorts/b2wJ04bEJJs?feature=share",
    titleKey: "realEstate",
    assetName: null,
    listingId: null,
    sortOrder: 11,
  }),
  ttExample({
    id: "automotive-tiktok",
    category: "automotive",
    videoUrl: "https://www.tiktok.com/@quickexitro/video/7663091797320650006",
    titleKey: "automotive",
    assetName: null,
    listingId: null,
    sortOrder: 20,
    posterYoutubeId: "KH__KGaZui0",
  }),
  ytExample({
    id: "automotive-youtube",
    category: "automotive",
    videoUrl: "https://youtube.com/shorts/KH__KGaZui0?feature=share",
    titleKey: "automotive",
    assetName: null,
    listingId: null,
    sortOrder: 21,
  }),
  ttExample({
    id: "watches-tiktok",
    category: "watches_luxury",
    videoUrl: "https://www.tiktok.com/@quickexitro/video/7691729893960322326",
    titleKey: "watchesLuxury",
    assetName: null,
    listingId: null,
    sortOrder: 30,
    posterYoutubeId: "HMjAE3x3Wko",
  }),
  ytExample({
    id: "watches-youtube",
    category: "watches_luxury",
    videoUrl: "https://youtube.com/shorts/HMjAE3x3Wko?feature=share",
    titleKey: "watchesLuxury",
    assetName: null,
    listingId: null,
    sortOrder: 31,
  }),
  ttExample({
    id: "businesses-tiktok",
    category: "businesses",
    videoUrl: "https://www.tiktok.com/@quickexitro/video/7685296565824556290",
    titleKey: "businesses",
    assetName: null,
    listingId: null,
    sortOrder: 40,
    posterYoutubeId: "VpioLWUOnHI",
  }),
  ytExample({
    id: "businesses-youtube",
    category: "businesses",
    videoUrl: "https://youtube.com/shorts/VpioLWUOnHI?feature=share",
    titleKey: "businesses",
    assetName: null,
    listingId: null,
    sortOrder: 41,
  }),
] as const;

export function getActiveMediaExamples(): MediaExample[] {
  return MEDIA_EXAMPLES.filter((item) => item.active).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function getMediaExamplesByCategory(
  category: MediaExampleCategory,
): MediaExample[] {
  return getActiveMediaExamples().filter((item) => item.category === category);
}
