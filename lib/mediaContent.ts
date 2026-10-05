import type { MediaPackageId, MediaValueTier } from "@/lib/mediaPricing";

export const MEDIA_PACKAGE_ORDER: readonly MediaPackageId[] = [
  "stories_4",
  "stories_8",
  "featured",
] as const;

export const MEDIA_TIER_ORDER: readonly MediaValueTier[] = [
  "under_50k",
  "50_100k",
  "100_500k",
  "over_500k",
] as const;

export const MEDIA_HOW_STEPS = [
  "list",
  "research",
  "angles",
  "produce",
  "distribute",
] as const;

export const MEDIA_FAQ_IDS = [
  "views",
  "sale",
  "appear",
  "featuredWeekly",
  "pricing",
  "whatIsMedia",
] as const;

export type MediaFaqId = (typeof MEDIA_FAQ_IDS)[number];
