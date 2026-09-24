import { readFileSync } from "node:fs";
import {
  EMPTY_CRYPTO_PAYMENT,
  listingAcceptsCrypto,
  parseCryptoPayment,
  sortCryptoAssets,
} from "../lib/cryptoPayment";
import { buildListingDraft, DEFAULT_LISTING_FORM_DATA, parseListingDraftJson } from "../lib/listingDraft";
import {
  buildPublicSearchPath,
  filterPublicSearchListings,
  parsePublicListingSearchParams,
} from "../lib/publicListings";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const none = parseCryptoPayment("none", []);
assert(none.ok && none.value.mode === "none" && none.value.assets.length === 0, "none + empty");
assert(!parseCryptoPayment("none", ["btc"]).ok, "none rejects assets");
assert(!parseCryptoPayment("full", []).ok, "full requires an asset");
assert(!parseCryptoPayment("partial", ["doge"]).ok, "unknown asset rejected");
assert(!parseCryptoPayment("full", ["btc", "btc"]).ok, "duplicate rejected");
assert(!parseCryptoPayment("full", [null]).ok, "null asset rejected");

const mixed = parseCryptoPayment("negotiable", ["SOL", "usdc", "btc"]);
assert(mixed.ok, "mixed case accepted");
if (mixed.ok) {
  assert(mixed.value.assets.join(",") === "btc,sol,usdc", "stored lexicographic order");
  assert(sortCryptoAssets(mixed.value.assets).join(",") === mixed.value.assets.join(","), "already sorted");
}
assert(listingAcceptsCrypto({ crypto_payment_mode: "partial" }), "partial is a badge");
assert(!listingAcceptsCrypto({ crypto_payment_mode: "none" }), "legacy none has no badge");
assert(!listingAcceptsCrypto({}), "missing mode has no badge");
assert(EMPTY_CRYPTO_PAYMENT.assets.length === 0, "empty default");

const legacy = parseListingDraftJson(
  JSON.stringify(
    buildListingDraft({
      step: 1,
      category: "Auto & Moto",
      adTitle: "Vechi",
      description: "",
      exitPrice: "",
      pricingMode: null,
      isExitPriceManuallyEdited: false,
      manualMarketPrice: "",
      marketPrice: 0,
      analyzedItems: 0,
      saleStrategy: "standard",
      selectedPackage: "standard",
      formData: DEFAULT_LISTING_FORM_DATA,
    }),
  ),
);
assert(legacy.ok, "new draft parses");
if (legacy.ok) {
  assert(legacy.draft.cryptoPaymentMode === "none", "default mode none");
  assert(legacy.draft.cryptoAssets.length === 0, "default assets empty");
}

const rawLegacy = JSON.parse(JSON.stringify(legacy.ok ? legacy.draft : {})) as Record<string, unknown>;
delete rawLegacy.cryptoPaymentMode;
delete rawLegacy.cryptoAssets;
const oldShape = parseListingDraftJson(JSON.stringify(rawLegacy));
assert(oldShape.ok && oldShape.ok && oldShape.draft.cryptoPaymentMode === "none", "old draft stays none");

const parsed = parsePublicListingSearchParams({ crypto: "1", q: "bmw" });
assert(parsed.crypto === true, "crypto=1 is a search filter");
assert(parsePublicListingSearchParams({}).crypto === false, "crypto filter defaults off");
assert(buildPublicSearchPath({ crypto: true, q: "bmw" }).includes("crypto=1"), "search path keeps crypto");

const rows = filterPublicSearchListings(
  [
    { id: "11111111-1111-4111-8111-111111111111", status: "active", is_seed: false, title: "A", crypto_payment_mode: "none", crypto_assets: [] },
    { id: "22222222-2222-4222-8222-222222222222", status: "active", is_seed: false, title: "B", crypto_payment_mode: "full", crypto_assets: ["btc"] },
  ],
  { crypto: true },
);
assert(rows.length === 1 && rows[0]?.title === "B", "filter keeps crypto listings");

const sql = readFileSync("docs/internal/sql/listing-crypto-payment.sql", "utf8");
assert(sql.includes("NEEXECUTAT"), "sql marked unexecuted");
assert(sql.includes("ADD COLUMN crypto_payment_mode text NOT NULL DEFAULT 'none'"), "mode column");
assert(sql.includes("ADD COLUMN crypto_assets text[] NOT NULL DEFAULT '{}'"), "assets column");
assert(!sql.includes("ADD COLUMN IF NOT EXISTS crypto_"), "no IF NOT EXISTS on crypto columns");
assert(!sql.includes("accepts_crypto"), "no redundant boolean");
assert(sql.includes("listings_crypto_payment_check"), "check constraint");
assert(sql.includes("crypto_assets[1] < crypto_assets[2]"), "duplicate guard");

console.log("OK crypto-payment");
