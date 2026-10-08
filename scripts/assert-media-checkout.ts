/**
 * Phase 2D — combined listing + Media Stripe checkout assertions (no live Stripe, no Production DB).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertListingAndMediaCurrencyCompatible,
  buildCombinedListingMediaLineItems,
  buildCombinedMediaCheckoutMetadata,
  buildListingOnlyLineItems,
  buildMediaCheckoutIdempotencyKey,
  buildMediaCheckoutLineItem,
  isMediaCheckoutEnabled,
  mediaStripeProductName,
  parseCheckoutMediaPackage,
} from "../lib/mediaCheckout";
import {
  quoteMediaPackage,
  resolveMediaCheckoutEligibility,
} from "../lib/mediaPricing";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const prevFlag = process.env.MEDIA_CHECKOUT_ENABLED;
delete process.env.MEDIA_CHECKOUT_ENABLED;
delete process.env.NEXT_PUBLIC_MEDIA_CHECKOUT_ENABLED;
assert(!isMediaCheckoutEnabled(), "flag default off");
process.env.MEDIA_CHECKOUT_ENABLED = "true";
assert(isMediaCheckoutEnabled(), "flag on via MEDIA_CHECKOUT_ENABLED");
delete process.env.MEDIA_CHECKOUT_ENABLED;
process.env.NEXT_PUBLIC_MEDIA_CHECKOUT_ENABLED = "1";
assert(isMediaCheckoutEnabled(), "flag on via NEXT_PUBLIC");
delete process.env.NEXT_PUBLIC_MEDIA_CHECKOUT_ENABLED;
if (prevFlag !== undefined) process.env.MEDIA_CHECKOUT_ENABLED = prevFlag;

assert(parseCheckoutMediaPackage(undefined) === null, "absent → null");
assert(parseCheckoutMediaPackage(null) === null, "null → null");
assert(parseCheckoutMediaPackage("") === null, "empty → null");
assert(parseCheckoutMediaPackage("stories_4") === "stories_4", "stories_4");
assert(parseCheckoutMediaPackage("stories_8") === "stories_8", "stories_8");
assert(parseCheckoutMediaPackage("featured") === "featured", "featured");
assert(parseCheckoutMediaPackage("STORIES_4") === "invalid", "reject case");
assert(parseCheckoutMediaPackage("vip") === "invalid", "reject unknown");
assert(parseCheckoutMediaPackage(199) === "invalid", "reject number");

const listingPriceId = "price_test_listing_urgent";
const listingOnly = buildListingOnlyLineItems(listingPriceId);
assert(listingOnly.length === 1, "listing-only one line item");
assert(listingOnly[0]?.price === listingPriceId && listingOnly[0]?.quantity === 1, "listing price id");
assert(!("price_data" in (listingOnly[0] ?? {})), "listing-only no price_data");

const q4 = quoteMediaPackage(75_000, "stories_4");
assert(q4.amountRon === 299 && q4.tier === "50k_100k", "server quote stories_4");
const q8 = quoteMediaPackage(75_000, "stories_8");
assert(q8.amountRon === 499, "server quote stories_8");
const qF = quoteMediaPackage(75_000, "featured");
assert(qF.amountRon === 899, "server quote featured");

const mediaLine = buildMediaCheckoutLineItem(q4, "en");
assert(mediaLine.quantity === 1, "media qty 1");
assert(mediaLine.price_data?.currency === "ron", "media currency ron");
assert(mediaLine.price_data?.unit_amount === 29900, "media bani");
assert(
  mediaLine.price_data?.product_data?.name === "QuickExit Media — 4 Stories",
  "media product name",
);

const combined = buildCombinedListingMediaLineItems(listingPriceId, q8, "ro");
assert(combined.length === 2, "combined two line items");
assert(combined[0]?.price === listingPriceId, "line1 listing price");
assert(combined[1]?.price_data?.unit_amount === 49900, "line2 media bani");

const baseMeta = {
  type: "listing",
  listingId: "listing-uuid",
  demandId: "",
  userId: "user-uuid",
  priceId: listingPriceId,
  packageId: "urgent",
  saleMethod: "direct",
};
const combinedMeta = buildCombinedMediaCheckoutMetadata(baseMeta, {
  mediaOrderId: "media-order-uuid",
  mediaPackage: "featured",
  mediaTier: "50k_100k",
});
assert(combinedMeta.mediaOrderId === "media-order-uuid", "meta mediaOrderId");
assert(combinedMeta.mediaPackage === "featured", "meta mediaPackage");
assert(combinedMeta.mediaTier === "50k_100k", "meta mediaTier");
assert(combinedMeta.listingId === "listing-uuid", "listing meta preserved");
assert(combinedMeta.priceId === listingPriceId, "listing priceId preserved");
assert(!("amount" in combinedMeta), "no client amount in metadata");

const idemA = buildMediaCheckoutIdempotencyKey({
  listingId: "L1",
  listingPackageId: "urgent",
  mediaOrderId: "MO1",
});
const idemB = buildMediaCheckoutIdempotencyKey({
  listingId: "L1",
  listingPackageId: "urgent",
  mediaOrderId: "MO2",
});
assert(idemA !== idemB, "cancelled order gets new idempotency key");
assert(idemA.includes("MO1"), "idem includes media order id");

assert(assertListingAndMediaCurrencyCompatible().ok, "ron/ron compatible");
assert(mediaStripeProductName("featured", "en").includes("Featured"), "featured name");

const ownerListing = {
  user_id: "u1",
  status: "pending_payment",
  is_seed: false,
  exit_price: 75_000,
  listing_kind: "specific_asset",
  details: { pricing_mode: "fixed_price" },
};
assert(
  resolveMediaCheckoutEligibility({
    userId: "u1",
    mediaPackage: null,
    listing: ownerListing,
  }).eligible,
  "null media eligible listing-only",
);
assert(
  resolveMediaCheckoutEligibility({
    userId: "u1",
    mediaPackage: "stories_4",
    listing: ownerListing,
  }).eligible,
  "stories_4 eligible",
);
assert(
  !resolveMediaCheckoutEligibility({
    userId: "u1",
    mediaPackage: "stories_4",
    listing: { ...ownerListing, listing_kind: "catalog_offer" },
  }).eligible,
  "catalog rejected",
);
assert(
  !resolveMediaCheckoutEligibility({
    userId: "u1",
    mediaPackage: "stories_4",
    listing: {
      ...ownerListing,
      details: { pricing_mode: "price_on_request" },
      exit_price: null,
    },
  }).eligible,
  "POR rejected",
);
assert(
  resolveMediaCheckoutEligibility({
    userId: "u1",
    mediaPackage: "featured",
    listing: {
      ...ownerListing,
      details: { pricing_mode: "fixed_price", sale_method: "auction" },
      crypto_payment_mode: "accepts_crypto",
      crypto_assets: ["USDT"],
    },
  }).eligible,
  "auction + crypto still eligible for Media",
);

const route = readFileSync(resolve("app/api/stripe/checkout/route.ts"), "utf8");
assert(route.includes("parseCheckoutMediaPackage"), "route parses mediaPackage");
assert(route.includes("preparePendingMediaOrder"), "route creates media order");
assert(route.includes("buildCombinedListingMediaLineItems"), "route combined line items");
assert(route.includes("MEDIA_CHECKOUT_DISABLED"), "flag gate");
assert(route.includes("MEDIA_PRICE_CHANGED"), "price change error");
assert(route.includes('payment_method_types = ["card"]'), "listing-only keeps card");
assert(route.includes("idempotencyKey"), "combined idempotency");
assert(route.includes("sessions.expire"), "orphan session expire");
assert(route.includes("cancelMediaOrderAfterFailure"), "cancel on stripe fail");
assert(!route.includes("automatic_tax"), "no automatic_tax");
assert(!route.includes("markMediaPaid"), "no media fulfillment helper");
assert(!route.includes('payment_status: "paid"'), "no media paid write in checkout");

const webhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
assert(!webhook.includes("markMediaPaid"), "webhook no premature markMediaPaid helper name");
assert(webhook.includes("mediaOrderId") || webhook.includes("markMediaOrderPaid"), "2E media fulfillment present");

const legacyWebhook = readFileSync(resolve("app/api/webhook/route.ts"), "utf8");
assert(!legacyWebhook.includes("mediaPackage"), "legacy webhook untouched");

const client = readFileSync(resolve("app/[locale]/pune-anunt/PuneAnuntClient.tsx"), "utf8");
assert(client.includes("mediaPackage: mediaForCheckout"), "client sends mediaPackage");
assert(client.includes("expectedMediaAmountRon"), "non-authoritative fingerprint");
assert(client.includes("NEXT_PUBLIC_MEDIA_CHECKOUT_ENABLED"), "client flag");
assert(client.includes("mediaBlocksCheckout"), "fail-closed when flag off");
assert(client.includes("media_checkout_attached"), "optional analytics");

assert(
  route.includes("never attach Media") || route.includes("ignore any mediaPackage"),
  "demand ignores media",
);

const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8"));
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"));
assert(ro.PostListing?.checkoutErrors?.mediaPriceChanged, "ro MEDIA_PRICE_CHANGED copy");
assert(en.PostListing?.checkoutErrors?.mediaCheckoutDisabled, "en disabled copy");

console.log("OK media-checkout-phase-2d");
