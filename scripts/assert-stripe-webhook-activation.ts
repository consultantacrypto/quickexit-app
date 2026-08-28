import {
  CANONICAL_STRIPE_WEBHOOK_URL,
  assertListingSaleIntentForFulfillment,
  classifyAlreadyActiveFulfillment,
  classifyPaidSessionAmount,
  classifyWebhookProbeStatus,
  expectedMinorAmountForPriceId,
  listingFulfillmentHttpStatus,
  mergeStripeFulfillmentIntoDetails,
  storedCheckoutSessionId,
} from "../lib/stripeListingFulfillment";
import { getExpiryIsoForPackage, getPackageByPriceId } from "../lib/stripePackages";
import { validatePersistedSaleIntent } from "../lib/listingSaleStrategy";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const PROVEN_PRICE = "price_1Tcnd15kC4Bm6VY18e9Fa5qd";
const pkg = getPackageByPriceId(PROVEN_PRICE);
assert(pkg?.packageId === "standard", "proven price maps to standard");
assert(pkg?.amountRon === 79, "proven price is 79 RON");
assert(pkg?.duration.kind === "days" && pkg.duration.value === 14, "proven price is 14 days");
assert(expectedMinorAmountForPriceId(PROVEN_PRICE) === 7900, "7900 minor units");

assert(CANONICAL_STRIPE_WEBHOOK_URL === "https://www.quickexit.ro/api/stripe/webhook", "canonical www webhook URL");

assert(classifyWebhookProbeStatus(307) === "redirect", "307 is redirect");
assert(classifyWebhookProbeStatus(400) === "direct", "400 unsigned is direct");
assert(classifyWebhookProbeStatus(200) === "direct", "200 is direct");

assert(classifyPaidSessionAmount({ amountTotal: 7900, currency: "ron", expectedAmount: 7900 }) === "ok", "paid amount ok");
assert(
  classifyPaidSessionAmount({ amountTotal: 9900, currency: "ron", expectedAmount: 7900 }) === "amount_mismatch",
  "wrong amount",
);
assert(
  classifyPaidSessionAmount({ amountTotal: 7900, currency: "eur", expectedAmount: 7900 }) === "currency_mismatch",
  "wrong currency",
);
assert(expectedMinorAmountForPriceId("price_does_not_exist") === null, "unknown price");

assert(listingFulfillmentHttpStatus("missing_listing_id") === 422, "missing listingId is non-success");
assert(listingFulfillmentHttpStatus("object_not_found") === 500, "zero-row/unknown listing retryable");
assert(listingFulfillmentHttpStatus("zero_row_update") === 500, "zero-row update retryable");
assert(listingFulfillmentHttpStatus("ambiguous_update") === 500, "ambiguous update retryable");
assert(listingFulfillmentHttpStatus("activation_failed") === 500, "db failure retryable");
assert(listingFulfillmentHttpStatus("amount_mismatch") === 422, "wrong amount non-success");
assert(listingFulfillmentHttpStatus("unknown_price_id") === 500, "unknown price retryable");
assert(listingFulfillmentHttpStatus("conflicting_session") === 409, "conflicting session is error");
assert(listingFulfillmentHttpStatus("test_mode") === 400, "test mode rejected");
assert(listingFulfillmentHttpStatus("incompatible_sale_intent") === 422, "sale-intent mismatch rejected");
assert(listingFulfillmentHttpStatus("not_paid") === 200, "unpaid completed session acknowledged without fulfillment");

const sessionA = "cs_live_a1rCZ2TihHzIIZ4f22D8jPz3os00QU2dGElUmqQmA5Mhh3Tjvxf2082BOQ";
const sessionB = "cs_live_otherSessionxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
assert(classifyAlreadyActiveFulfillment(null, sessionA) === "idempotent", "active without stored session is idempotent");
assert(classifyAlreadyActiveFulfillment(sessionA, sessionA) === "idempotent", "same session idempotent");
assert(classifyAlreadyActiveFulfillment(sessionA, sessionB) === "conflicting_session", "conflicting session");

const merged = mergeStripeFulfillmentIntoDetails(
  { package: "standard", strategy: "standard", pricing_mode: "evaluated", brand: "keep-me" },
  {
    event_id: "evt_1U99Dx5kC4Bm6VY13M284XLx",
    checkout_session_id: sessionA,
    payment_intent_id: "pi_3U99Du5kC4Bm6VY10QZDfJ8F",
    amount: 7900,
    currency: "ron",
    price_id: PROVEN_PRICE,
    fulfilled_at: "2026-08-28T16:05:12.521Z",
    result: "activated",
  },
);
assert(merged.package === "standard", "merge does not overwrite package");
assert(merged.brand === "keep-me", "merge does not overwrite listing content");
assert(storedCheckoutSessionId(merged) === sessionA, "stored session readable");

const directIntent = assertListingSaleIntentForFulfillment({
  sale_strategy: "standard",
  details: { package: "standard", strategy: "standard", pricing_mode: "evaluated" },
});
assert(directIntent.ok, "direct standard listing accepted");
const directState = validatePersistedSaleIntent({
  sale_strategy: "standard",
  details: { package: "standard", strategy: "standard", pricing_mode: "evaluated" },
});
assert(directState.ok && directState.state.saleMethod === "direct", "remains direct/non-auction");

const auctionIntent = validatePersistedSaleIntent({
  sale_strategy: "auction",
  details: { package: "auction", strategy: "licitatie", sale_method: "auction", pricing_mode: "fixed_price" },
});
assert(auctionIntent.ok && auctionIntent.state.saleMethod === "auction", "auction remains auction when explicit");

const badPair = assertListingSaleIntentForFulfillment({
  sale_strategy: "standard",
  details: { package: "standard", sale_method: "auction", strategy: "licitatie" },
});
assert(!badPair.ok, "incompatible sale-method/package rejected");

const now = new Date("2026-08-28T16:05:12.521Z");
const expiry = getExpiryIsoForPackage(pkg!, now);
assert(expiry === "2026-09-11T16:05:12.521Z", `14-day expiry from activation, got ${expiry}`);

console.log("PASS assert-stripe-webhook-activation");
