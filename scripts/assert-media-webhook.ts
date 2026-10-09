/**
 * Phase 2E — combined Media webhook fulfillment pure assertions (no live Stripe).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPackageByPriceId, getPriceIdForPackageId } from "../lib/stripePackages";
import {
  classifyPaidSessionAmount,
  expectedMinorAmountForPriceId,
  listingFulfillmentHttpStatus,
} from "../lib/stripeListingFulfillment";
import {
  classifyCombinedPaidSessionAmount,
  classifyListingLineItems,
  classifyMediaOrderForAsyncFailure,
  classifyMediaOrderForPaidFulfillment,
  classifyUnexpectedMediaStructure,
  expectedCombinedMinorAmount,
  extractMediaOrderIdFromMetadata,
  extractMediaPackageFromMetadata,
  isAsyncPaymentFailedEvent,
  isCombinedCheckoutFulfillmentEvent,
  shouldRejectTestModeEvent,
  type MediaOrderFulfillmentRow,
} from "../lib/mediaWebhookFulfillment";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const listingPriceId = getPriceIdForPackageId("standard");
assert(Boolean(listingPriceId), "standard price id configured");
const pkg = getPackageByPriceId(listingPriceId!);
assert(pkg?.packageId === "standard", "standard package maps");
assert(typeof pkg?.amountRon === "number" && pkg.amountRon > 0, "standard amount positive");
const listingMinor = expectedMinorAmountForPriceId(listingPriceId!);
assert(listingMinor === Math.round(pkg!.amountRon * 100), "listing minor units");

// --- events ---
assert(isCombinedCheckoutFulfillmentEvent("checkout.session.completed"), "completed is fulfill");
assert(
  isCombinedCheckoutFulfillmentEvent("checkout.session.async_payment_succeeded"),
  "async succeeded is fulfill",
);
assert(!isCombinedCheckoutFulfillmentEvent("checkout.session.async_payment_failed"), "failed not fulfill");
assert(isAsyncPaymentFailedEvent("checkout.session.async_payment_failed"), "async failed detect");
assert(!isAsyncPaymentFailedEvent("checkout.session.completed"), "completed not async failed");

// --- metadata routing ---
assert(extractMediaOrderIdFromMetadata({}) === null, "no media id");
assert(extractMediaOrderIdFromMetadata({ mediaOrderId: "mo-1" }) === "mo-1", "mediaOrderId");
assert(extractMediaPackageFromMetadata({ mediaPackage: "stories_4" }) === "stories_4", "pkg meta");
assert(extractMediaPackageFromMetadata({ mediaPackage: "vip" }) === null, "bad pkg meta");

// --- listing-only amount preserved ---
assert(
  classifyPaidSessionAmount({
    amountTotal: listingMinor!,
    currency: "ron",
    expectedAmount: listingMinor!,
  }) === "ok",
  "listing-only ok",
);
assert(
  classifyPaidSessionAmount({
    amountTotal: listingMinor! + 29900,
    currency: "ron",
    expectedAmount: listingMinor!,
  }) === "amount_mismatch",
  "listing-only rejects combined total",
);

// --- combined amounts for all packages ---
const packages = [
  { id: "stories_4" as const, amountRon: 299 },
  { id: "stories_8" as const, amountRon: 499 },
  { id: "featured" as const, amountRon: 899 },
];
for (const p of packages) {
  const expected = expectedCombinedMinorAmount({
    listingPriceId: listingPriceId!,
    mediaAmountRon: p.amountRon,
  });
  assert(expected === listingMinor! + p.amountRon * 100, `combined bani ${p.id}`);
  assert(
    classifyCombinedPaidSessionAmount({
      amountTotal: expected!,
      currency: "ron",
      listingPriceId: listingPriceId!,
      mediaAmountRon: p.amountRon,
      mediaCurrency: "ron",
    }) === "ok",
    `combined ok ${p.id}`,
  );
  assert(
    classifyCombinedPaidSessionAmount({
      amountTotal: expected! + 1,
      currency: "ron",
      listingPriceId: listingPriceId!,
      mediaAmountRon: p.amountRon,
      mediaCurrency: "ron",
    }) === "amount_mismatch",
    `combined mismatch ${p.id}`,
  );
}
assert(
  classifyCombinedPaidSessionAmount({
    amountTotal: listingMinor! + 29900,
    currency: "eur",
    listingPriceId: listingPriceId!,
    mediaAmountRon: 299,
    mediaCurrency: "ron",
  }) === "currency_mismatch",
  "session currency",
);
assert(
  classifyCombinedPaidSessionAmount({
    amountTotal: listingMinor! + 29900,
    currency: "ron",
    listingPriceId: listingPriceId!,
    mediaAmountRon: 299,
    mediaCurrency: "eur",
  }) === "media_currency_mismatch",
  "media currency",
);

// --- line item resolution (not first-item assumption) ---
const mixed = [
  { priceId: null as string | null, unitAmount: 29900, quantity: 1 },
  { priceId: listingPriceId!, unitAmount: listingMinor!, quantity: 1 },
];
const found = classifyListingLineItems({
  lineItems: mixed,
  expectedListingPriceId: listingPriceId!,
});
assert(found.ok && found.otherLineCount === 1, "listing found when Media is first");
assert(
  !classifyListingLineItems({
    lineItems: [
      { priceId: listingPriceId!, unitAmount: listingMinor!, quantity: 1 },
      { priceId: listingPriceId!, unitAmount: listingMinor!, quantity: 1 },
    ],
    expectedListingPriceId: listingPriceId!,
  }).ok,
  "ambiguous listing lines rejected",
);
assert(
  !classifyListingLineItems({
    lineItems: [{ priceId: "price_other", unitAmount: 100, quantity: 1 }],
    expectedListingPriceId: listingPriceId!,
  }).ok,
  "missing listing line rejected",
);

assert(
  classifyUnexpectedMediaStructure({
    mediaOrderId: null,
    lineItems: mixed,
    expectedListingPriceId: listingPriceId!,
  }) === "unexpected_media_line_items",
  "Media-shaped without mediaOrderId rejected",
);
assert(
  classifyUnexpectedMediaStructure({
    mediaOrderId: "mo-1",
    lineItems: mixed,
    expectedListingPriceId: listingPriceId!,
  }) === "ok",
  "with mediaOrderId ok",
);
assert(
  classifyUnexpectedMediaStructure({
    mediaOrderId: null,
    lineItems: [{ priceId: listingPriceId!, unitAmount: listingMinor!, quantity: 1 }],
    expectedListingPriceId: listingPriceId!,
  }) === "ok",
  "listing-only structure ok",
);

// --- media order classification ---
const baseOrder: MediaOrderFulfillmentRow = {
  id: "mo-1",
  listing_id: "L1",
  user_id: "U1",
  package: "stories_4",
  amount_ron: 299,
  currency: "ron",
  payment_status: "pending",
  editorial_status: "queued",
  stripe_checkout_session_id: "cs_test_1",
  stripe_payment_intent_id: null,
  paid_at: null,
};

assert(
  classifyMediaOrderForPaidFulfillment({
    order: baseOrder,
    listingId: "L1",
    userId: "U1",
    sessionId: "cs_test_1",
    metadataPackage: "stories_4",
  }).ok,
  "pending ok",
);
assert(
  classifyMediaOrderForPaidFulfillment({
    order: { ...baseOrder, payment_status: "paid", paid_at: "2026-01-01" },
    listingId: "L1",
    sessionId: "cs_test_1",
  }).ok,
  "already paid idempotent",
);
assert(
  !classifyMediaOrderForPaidFulfillment({
    order: null,
    listingId: "L1",
    sessionId: "cs_test_1",
  }).ok,
  "missing order",
);
assert(
  !classifyMediaOrderForPaidFulfillment({
    order: { ...baseOrder, listing_id: "L2" },
    listingId: "L1",
    sessionId: "cs_test_1",
  }).ok,
  "listing mismatch",
);
assert(
  !classifyMediaOrderForPaidFulfillment({
    order: { ...baseOrder, stripe_checkout_session_id: "cs_other" },
    listingId: "L1",
    sessionId: "cs_test_1",
  }).ok,
  "session mismatch",
);
assert(
  !classifyMediaOrderForPaidFulfillment({
    order: { ...baseOrder, payment_status: "cancelled" },
    listingId: "L1",
    sessionId: "cs_test_1",
  }).ok,
  "cancelled rejected",
);
assert(
  !classifyMediaOrderForPaidFulfillment({
    order: { ...baseOrder, payment_status: "refunded" },
    listingId: "L1",
    sessionId: "cs_test_1",
  }).ok,
  "refunded rejected",
);
assert(
  !classifyMediaOrderForPaidFulfillment({
    order: baseOrder,
    listingId: "L1",
    sessionId: "cs_test_1",
    metadataPackage: "featured",
  }).ok,
  "package metadata mismatch",
);

const asyncPending = classifyMediaOrderForAsyncFailure({
  order: baseOrder,
  listingId: "L1",
  sessionId: "cs_test_1",
});
assert(asyncPending.action === "mark_failed", "async fail marks pending");
assert(
  classifyMediaOrderForAsyncFailure({
    order: { ...baseOrder, payment_status: "paid" },
    listingId: "L1",
    sessionId: "cs_test_1",
  }).action === "noop",
  "never downgrade paid",
);

// --- test mode gate ---
const prevAllow = process.env.STRIPE_WEBHOOK_ALLOW_TEST_EVENTS;
const prevVercel = process.env.VERCEL_ENV;
delete process.env.STRIPE_WEBHOOK_ALLOW_TEST_EVENTS;
delete process.env.VERCEL_ENV;
assert(shouldRejectTestModeEvent(false) === true, "test rejected by default");
assert(shouldRejectTestModeEvent(true) === false, "live never rejected by test gate");
process.env.STRIPE_WEBHOOK_ALLOW_TEST_EVENTS = "true";
assert(shouldRejectTestModeEvent(false) === false, "test allowed outside production");
process.env.VERCEL_ENV = "production";
assert(shouldRejectTestModeEvent(false) === true, "test never allowed on Vercel production");
if (prevAllow === undefined) delete process.env.STRIPE_WEBHOOK_ALLOW_TEST_EVENTS;
else process.env.STRIPE_WEBHOOK_ALLOW_TEST_EVENTS = prevAllow;
if (prevVercel === undefined) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = prevVercel;

// --- http statuses ---
assert(listingFulfillmentHttpStatus("media_fulfillment_failed") === 500, "media fail retryable");
assert(listingFulfillmentHttpStatus("amount_mismatch") === 422, "amount still 422");
assert(listingFulfillmentHttpStatus("media_session_mismatch") === 422, "session mismatch 422");
assert(listingFulfillmentHttpStatus("not_paid") === 200, "unpaid ack");

// --- route / legacy untouched ---
const helper = readFileSync(resolve("lib/mediaWebhookFulfillment.ts"), "utf8");
assert(helper.includes("async_payment_succeeded"), "helper knows async succeeded");
assert(helper.includes("async_payment_failed"), "helper knows async failed");

const route = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
assert(route.includes("isCombinedCheckoutFulfillmentEvent"), "fulfillment event helper");
assert(route.includes("isAsyncPaymentFailedEvent"), "async failed helper");
assert(route.includes("markMediaOrderPaid"), "media paid helper");
assert(route.includes("notifyMediaHqPaidQueued"), "3B HQ notify after paid");
assert(route.includes('paid.outcome === "updated"'), "notify only on newly paid");
assert(route.includes("classifyCombinedPaidSessionAmount"), "combined amount");
assert(route.includes("shouldRejectTestModeEvent"), "safe test gate");
assert(!route.includes("isMediaCheckoutEnabled"), "fulfillment not gated on UI flag");
assert(route.includes("Listing activation"), "listing-first order comment");

const legacy = readFileSync(resolve("app/api/webhook/route.ts"), "utf8");
assert(!legacy.includes("mediaOrderId"), "legacy webhook untouched for Media");
assert(!legacy.includes("media_orders"), "legacy no media_orders");

const checkout = readFileSync(resolve("app/api/stripe/checkout/route.ts"), "utf8");
assert(checkout.includes("preparePendingMediaOrder"), "2D checkout still present");

console.log("OK media-webhook-phase-2e");
