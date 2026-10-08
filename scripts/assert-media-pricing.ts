import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildMediaOrderInsertSnapshot } from "../lib/mediaOrder";
import {
  getMediaPackagePriceRon,
  getMediaValueTier,
  MEDIA_PACKAGE_IDS,
  MEDIA_PRICES_RON,
  MediaPricingError,
  quoteMediaPackage,
  resolveMediaCheckoutEligibility,
  resolveMediaDisplayPricing,
  resolveMediaPublishUiEligibility,
  resolveMediaValueTier,
} from "../lib/mediaPricing";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function assertThrows(fn: () => unknown, code?: MediaPricingError["code"]) {
  try {
    fn();
    fail(`expected throw${code ? ` (${code})` : ""}`);
  } catch (error) {
    if (code) {
      assert(error instanceof MediaPricingError && error.code === code, `wrong error code: ${String(error)}`);
    }
  }
}

const boundaryCases: Array<{ value: number; tier: ReturnType<typeof getMediaValueTier> }> = [
  { value: 1, tier: "under_50k" },
  { value: 49_999, tier: "under_50k" },
  { value: 50_000, tier: "50k_100k" },
  { value: 100_000, tier: "50k_100k" },
  { value: 100_001, tier: "100k_500k" },
  { value: 500_000, tier: "100k_500k" },
  { value: 500_001, tier: "over_500k" },
];

for (const { value, tier } of boundaryCases) {
  assert(getMediaValueTier(value) === tier, `tier boundary ${value}`);
  assert(resolveMediaValueTier(value) === tier, `resolve tier boundary ${value}`);
  for (const pkg of MEDIA_PACKAGE_IDS) {
    const quote = quoteMediaPackage(value, pkg);
    assert(quote.tier === tier, `quote tier ${value}/${pkg}`);
    assert(quote.amountRon === MEDIA_PRICES_RON[tier][pkg], `quote amount ${value}/${pkg}`);
    assert(quote.currency === "ron", "currency ron");
    assert(quote.listingValueEur === value, "listing value snapshot");
    assert(
      getMediaPackagePriceRon(tier, pkg) === MEDIA_PRICES_RON[tier][pkg],
      `package price ${tier}/${pkg}`,
    );
  }
}

assertThrows(() => getMediaValueTier(0), "invalid_exit_price");
assertThrows(() => getMediaValueTier(-1), "invalid_exit_price");
assertThrows(() => getMediaValueTier(Number.NaN), "invalid_exit_price");
assertThrows(() => getMediaValueTier(Number.POSITIVE_INFINITY), "invalid_exit_price");
assertThrows(() => quoteMediaPackage(75_000, "invalid" as "featured"), "invalid_package");

const baseListing = {
  user_id: "11111111-1111-4111-8111-111111111111",
  is_seed: false,
  exit_price: 75_000,
  listing_kind: "specific_asset",
  details: { pricing_mode: "fixed_price" },
  crypto_payment_mode: "full",
  crypto_assets: ["btc", "eth"],
};

assert(
  resolveMediaCheckoutEligibility({
    userId: baseListing.user_id,
    mediaPackage: "stories_4",
    listing: { ...baseListing, status: "pending_payment" },
  }).eligible,
  "pending_payment eligible",
);

assert(
  resolveMediaCheckoutEligibility({
    userId: baseListing.user_id,
    mediaPackage: null,
    listing: { ...baseListing, status: "pending_payment" },
  }).eligible,
  "no media package eligible",
);

assert(
  resolveMediaCheckoutEligibility({
    userId: baseListing.user_id,
    mediaPackage: "featured",
    listing: {
      ...baseListing,
      status: "pending_payment",
      details: { pricing_mode: "fixed_price", package: "auction" },
    },
  }).eligible,
  "auction listing eligible",
);

assert(
  resolveMediaCheckoutEligibility({
    userId: baseListing.user_id,
    mediaPackage: "stories_8",
    listing: { ...baseListing, status: "pending_payment", is_seed: true },
  }).reason === "seed_listing",
  "seed blocked",
);

assert(
  resolveMediaCheckoutEligibility({
    userId: baseListing.user_id,
    mediaPackage: "stories_8",
    listing: { ...baseListing, status: "pending_payment", listing_kind: "catalog_offer" },
  }).reason === "catalog_offer",
  "catalog blocked",
);

assert(
  resolveMediaCheckoutEligibility({
    userId: baseListing.user_id,
    mediaPackage: "stories_8",
    listing: {
      ...baseListing,
      status: "pending_payment",
      details: { pricing_mode: "price_on_request" },
    },
  }).reason === "price_on_request",
  "price on request blocked",
);

assert(
  resolveMediaCheckoutEligibility({
    userId: baseListing.user_id,
    mediaPackage: "stories_8",
    listing: { ...baseListing, status: "pending_payment", exit_price: 0 },
  }).reason === "invalid_exit_price",
  "zero exit price blocked",
);

assert(
  resolveMediaCheckoutEligibility({
    userId: "22222222-2222-4222-8222-222222222222",
    mediaPackage: "stories_8",
    listing: { ...baseListing, status: "pending_payment" },
  }).reason === "not_owner",
  "wrong owner blocked",
);

assert(
  resolveMediaCheckoutEligibility({
    userId: baseListing.user_id,
    mediaPackage: "stories_8",
    listing: { ...baseListing, status: "active" },
  }).reason === "wrong_status",
  "active status blocked at checkout",
);

assert(
  resolveMediaDisplayPricing({ ...baseListing, status: "active" }).eligible,
  "display active eligible",
);

assert(
  !resolveMediaDisplayPricing({ ...baseListing, status: "pending_payment" }).eligible,
  "display pending not eligible",
);

assert(
  resolveMediaPublishUiEligibility({
    pricingMode: "fixed_price",
    exitPrice: 75_000,
  }).eligible,
  "publish ui eligible",
);
assert(
  resolveMediaPublishUiEligibility({
    pricingMode: "price_on_request",
    exitPrice: 75_000,
  }).reason === "price_on_request",
  "publish ui por blocked",
);

const quote = quoteMediaPackage(120_000, "featured");
const snapshot = buildMediaOrderInsertSnapshot({
  listingId: "33333333-3333-4333-8333-333333333333",
  userId: baseListing.user_id,
  quote,
  locale: "ro",
});
assert(snapshot.amount_ron === 1299, "snapshot amount");
assert(snapshot.value_tier === "100k_500k", "snapshot tier");
assert(snapshot.currency === "ron", "snapshot currency");
assert(snapshot.payment_status === "pending", "snapshot payment pending");
assert(snapshot.editorial_status === "queued", "snapshot editorial queued");

const migration = readFileSync(resolve("docs/internal/sql/media-orders.sql"), "utf8");
assert(migration.includes("CREATE TABLE IF NOT EXISTS public.media_orders"), "migration table");
assert(migration.includes("50k_100k"), "migration tier constraint");
assert(
  /listing_id uuid NOT NULL REFERENCES public\.listings \(id\) ON DELETE RESTRICT/.test(migration),
  "listing_id restrict",
);
assert(migration.includes("media_orders_one_active_per_listing_idx"), "partial unique index");
assert(migration.includes("media_orders_owner_select"), "owner select policy");
assert(!/GRANT INSERT ON public\.media_orders TO authenticated/.test(migration), "no client insert");

console.log("OK media-pricing");
