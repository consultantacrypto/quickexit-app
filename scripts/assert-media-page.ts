import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MEDIA_FAQ_IDS,
  MEDIA_HOW_STEPS,
  MEDIA_PACKAGE_ORDER,
} from "../lib/mediaContent";
import {
  extractYoutubeId,
  getActiveMediaExamples,
  getMediaExamplesByCategory,
  mapListingCategoryToMediaExample,
  MEDIA_EXAMPLE_CATEGORIES,
  MEDIA_EXAMPLES,
  resolveInitialMediaCategory,
} from "../lib/mediaExamples";
import {
  formatMediaPriceRon,
  MEDIA_DISPLAY_PRICES_RON,
  resolveMediaDisplayPricing,
  resolveMediaValueTier,
} from "../lib/mediaPricing";
import { mediaPath } from "../src/i18n/paths";
import { staticAndCategorySitemapPaths } from "../lib/sitemapEntries";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

assert(resolveMediaValueTier(49_999) === "under_50k", "under 50k");
assert(resolveMediaValueTier(50_000) === "50_100k", "50k boundary");
assert(MEDIA_DISPLAY_PRICES_RON.over_500k.featured === 1799, "featured top tier");
assert(formatMediaPriceRon(1299, "ro").includes("RON"), "ron label");

assert(
  resolveMediaDisplayPricing({
    status: "active",
    is_seed: false,
    exit_price: 75_000,
    listing_kind: "specific_asset",
    details: { pricing_mode: "fixed_price" },
  }).eligible,
  "eligible fixed listing",
);
assert(
  !resolveMediaDisplayPricing({
    status: "active",
    is_seed: false,
    exit_price: 75_000,
    listing_kind: "catalog_offer",
    details: { pricing_mode: "fixed_price" },
  }).eligible,
  "catalog not eligible",
);

assert(MEDIA_PACKAGE_ORDER.length === 3, "three packages");
assert(MEDIA_HOW_STEPS.length === 5, "five how steps");
assert(MEDIA_FAQ_IDS.includes("views"), "views faq");
assert(MEDIA_FAQ_IDS.includes("featuredWeekly"), "featured faq");

assert(MEDIA_EXAMPLES.length === 8, "eight real examples");
assert(
  MEDIA_EXAMPLES.every((item) => item.active && item.videoUrl.startsWith("https://")),
  "all examples active https",
);
assert(
  MEDIA_EXAMPLES.filter((item) => item.platform === "tiktok").length === 4,
  "four tiktok",
);
assert(
  MEDIA_EXAMPLES.filter((item) => item.platform === "youtube").length === 4,
  "four youtube",
);
assert(
  MEDIA_EXAMPLES.every((item) => item.platform !== "youtube" || item.youtubeId),
  "youtube ids present",
);
assert(
  extractYoutubeId("https://youtube.com/shorts/b2wJ04bEJJs?feature=share") === "b2wJ04bEJJs",
  "shorts id parse",
);
assert(getActiveMediaExamples().length === 8, "active list");
assert(getMediaExamplesByCategory("automotive").length === 2, "auto pair");
assert(MEDIA_EXAMPLE_CATEGORIES.length === 4, "four categories");

assert(mapListingCategoryToMediaExample("Imobiliare") === "real_estate", "imobiliare map");
assert(mapListingCategoryToMediaExample("Auto & Moto") === "automotive", "auto map");
assert(mapListingCategoryToMediaExample("Lux & Ceasuri") === "watches_luxury", "lux map");
assert(mapListingCategoryToMediaExample("Afaceri de vânzare") === "businesses", "business map");
assert(mapListingCategoryToMediaExample("Gadgets") === null, "unknown map");
assert(resolveInitialMediaCategory("Auto & Moto") === "automotive", "initial auto");
assert(resolveInitialMediaCategory(null) === "real_estate", "default real estate");

assert(mediaPath() === "/media", "media path");
assert(staticAndCategorySitemapPaths().includes("/media"), "sitemap includes /media");

const page = readFileSync(resolve("app/[locale]/media/page.tsx"), "utf8");
assert(!page.includes("/api/stripe"), "no stripe checkout on media page");
assert(page.includes("buildPageMetadata"), "seo helper");
assert(page.includes("FAQPage"), "faq json-ld");
assert(!page.includes("VideoObject"), "no VideoObject");
assert(page.includes("MediaExamplesGallery"), "category gallery");

const gallery = readFileSync(
  resolve("app/[locale]/media/MediaExamplesGallery.tsx"),
  "utf8",
);
assert(gallery.includes("aspect-[9/16]"), "reserved 9:16");
assert(gallery.includes("hasMarketingConsent"), "consent gate");
assert(gallery.includes("openTiktok"), "tiktok path");
assert(gallery.includes('"use client"'), "client island");

const nextConfig = readFileSync(resolve("next.config.ts"), "utf8");
assert(nextConfig.includes("i.ytimg.com"), "youtube poster host allowed");

const examplesLib = readFileSync(resolve("lib/mediaExamples.ts"), "utf8");
assert(examplesLib.includes("7692107130370854166"), "real estate tiktok id");
assert(examplesLib.includes("b2wJ04bEJJs"), "real estate youtube id");
assert(examplesLib.includes("KH__KGaZui0"), "auto youtube id");
assert(examplesLib.includes("HMjAE3x3Wko"), "watches youtube id");
assert(examplesLib.includes("VpioLWUOnHI"), "business youtube id");

const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8"));
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"));
assert(ro.Media?.examples?.categories?.real_estate === "Imobiliare", "ro category");
assert(en.Media?.examples?.categories?.real_estate === "Real Estate", "en category");
assert(ro.Media?.faq?.items?.views, "ro views faq");
assert(en.Media?.faq?.items?.appear, "en appear faq");
assert(ro.Dashboard?.promoteWithMedia, "ro dashboard cta");
assert(en.Footer?.platform?.media, "en footer media");

console.log("OK media-page");
