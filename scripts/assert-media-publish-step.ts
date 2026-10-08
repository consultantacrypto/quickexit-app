/**
 * Phase 2C — Media publish Step 4 UI / draft assertions (no Stripe, no DB).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildListingDraft,
  DEFAULT_LISTING_FORM_DATA,
  parseListingDraftJson,
} from "../lib/listingDraft";
import {
  quoteMediaPackage,
  resolveMediaPublishUiEligibility,
} from "../lib/mediaPricing";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const now = Date.now();

const baseDraft = buildListingDraft({
  timestamp: now,
  step: 4,
  category: "Auto & Moto",
  adTitle: "BMW 320d",
  description: "Test",
  exitPrice: "75000",
  pricingMode: "fixed_price",
  isExitPriceManuallyEdited: true,
  manualMarketPrice: "",
  marketPrice: 90000,
  analyzedItems: 3,
  saleStrategy: "standard",
  selectedPackage: "urgent",
  saleMethod: "direct",
  formData: { ...DEFAULT_LISTING_FORM_DATA, make: "BMW", model: "320d" },
});

assert(baseDraft.mediaPackage === null, "default mediaPackage null");

const withMedia = buildListingDraft({
  ...baseDraft,
  mediaPackage: "stories_8",
});
assert(withMedia.mediaPackage === "stories_8", "persist stories_8");

const roundTrip = parseListingDraftJson(JSON.stringify(withMedia), now);
assert(roundTrip.ok, "parse with media");
if (roundTrip.ok) {
  assert(roundTrip.draft.mediaPackage === "stories_8", "restore stories_8");
}

const legacyWithoutMedia = {
  ...withMedia,
};
delete (legacyWithoutMedia as { mediaPackage?: unknown }).mediaPackage;
const legacyParsed = parseListingDraftJson(JSON.stringify(legacyWithoutMedia), now);
assert(legacyParsed.ok, "legacy draft without mediaPackage still parses");
if (legacyParsed.ok) {
  assert(legacyParsed.draft.mediaPackage === null, "legacy defaults media null");
}

assert(
  resolveMediaPublishUiEligibility({
    pricingMode: "fixed_price",
    exitPrice: 75_000,
  }).eligible,
  "ui eligible fixed",
);
assert(
  !resolveMediaPublishUiEligibility({
    pricingMode: "price_on_request",
    exitPrice: 75_000,
  }).eligible,
  "ui ineligible por",
);
assert(
  !resolveMediaPublishUiEligibility({
    pricingMode: "fixed_price",
    exitPrice: "",
  }).eligible,
  "ui ineligible empty exit",
);

const q49 = quoteMediaPackage(49_999, "stories_4");
assert(q49.amountRon === 199 && q49.tier === "under_50k", "tier under 50k display");
const q50 = quoteMediaPackage(50_000, "stories_8");
assert(q50.amountRon === 499 && q50.tier === "50k_100k", "tier 50k display");
const q100 = quoteMediaPackage(100_000, "featured");
assert(q100.amountRon === 899 && q100.tier === "50k_100k", "100k inclusive lower");
const q101 = quoteMediaPackage(100_001, "featured");
assert(q101.amountRon === 1299 && q101.tier === "100k_500k", "100001 upper");

const listingFee = 179;
const total = listingFee + q50.amountRon;
assert(total === 678, "display total listing+media");

const client = readFileSync(resolve("app/[locale]/pune-anunt/PuneAnuntClient.tsx"), "utf8");
assert(client.includes("mediaAddon"), "media addon UI");
assert(client.includes("mediaBlocksCheckout"), "flag-off gate retained");
assert(client.includes("continueListingOnly"), "listing-only secondary CTA");
assert(client.includes('role="radiogroup"'), "radiogroup a11y");
assert(
  client.includes("mediaPackage: mediaForCheckout"),
  "checkout body includes mediaPackage when enabled",
);
assert(
  client.includes('type: "listing"') && client.includes("/api/stripe/checkout"),
  "still uses listing stripe checkout",
);

const checkoutRoute = readFileSync(resolve("app/api/stripe/checkout/route.ts"), "utf8");
assert(checkoutRoute.includes("mediaPackage"), "stripe checkout accepts mediaPackage");
assert(checkoutRoute.includes("media_orders") || checkoutRoute.includes("preparePendingMediaOrder"), "media order prepare");
assert(checkoutRoute.includes("isMediaCheckoutEnabled"), "feature flag gate");

const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8"));
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"));
assert(ro.PostListing?.mediaAddon?.title?.includes("QuickExit Media"), "ro media title");
assert(en.PostListing?.mediaAddon?.continueListingOnly?.includes("listing only"), "en continue CTA");
assert(ro.PostListing?.review?.total === "Total", "ro total label");

console.log("OK media-publish-step");
