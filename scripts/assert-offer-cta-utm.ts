/**
 * Offer-first listing CTA, ?oferta=1 deep link, and listing_offers UTM insert.
 * CI-safe: no network, no database.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isOfferFirstListingCta } from "../lib/listingCta";
import { isListingOfferDeepLink } from "../lib/offerDeepLink";
import { mergeOfferUtm } from "../lib/offerAttribution";
import {
  insertListingOfferRow,
  isMissingOfferUtmColumnError,
} from "../lib/listingOfferInsert";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

assert(
  isOfferFirstListingCta({ ctaMode: "normal", canUseClassicOfferFlow: true }),
  "priced direct listing leads with the offer",
);
assert(
  isOfferFirstListingCta({ ctaMode: "auto_financing", canUseClassicOfferFlow: true }),
  "financed auto listing still leads with the offer",
);
assert(
  !isOfferFirstListingCta({ ctaMode: "normal", canUseClassicOfferFlow: false }),
  "price-on-request stays on the inquiry CTA",
);
assert(
  !isOfferFirstListingCta({ ctaMode: "auction", canUseClassicOfferFlow: true }),
  "auction primary CTA unchanged",
);
assert(
  !isOfferFirstListingCta({ ctaMode: "catalog_offer", canUseClassicOfferFlow: true }),
  "catalog primary CTA unchanged",
);
assert(
  !isOfferFirstListingCta({ ctaMode: "on_order", canUseClassicOfferFlow: true }),
  "on-order primary CTA unchanged",
);

assert(isListingOfferDeepLink("?oferta=1&utm_source=yt", ""), "query oferta=1 opens");
assert(
  isListingOfferDeepLink("?utm_source=yt&utm_medium=social&oferta=1", ""),
  "oferta=1 is detected beside UTMs",
);
assert(isListingOfferDeepLink("", "#oferta"), "hash oferta opens");
assert(isListingOfferDeepLink("?utm_source=yt", "#oferta"), "hash oferta keeps query UTMs untouched");
assert(!isListingOfferDeepLink("?oferta=0", ""), "oferta=0 does not open");
assert(!isListingOfferDeepLink("", "#oferta-extra"), "unrelated hash does not open");
assert(!isListingOfferDeepLink("", ""), "plain listing URL does not open");

const merged = mergeOfferUtm(
  { utm_source: "yt", utm_medium: "social", utm_campaign: "qe_offer" },
  { utm_source: "google", utm_content: "listing-slug", utm_term: "shorts" },
);
assert(merged.utm_source === "yt", "current URL UTM wins over stored");
assert(merged.utm_medium === "social", "URL medium kept");
assert(merged.utm_campaign === "qe_offer", "URL campaign kept");
assert(merged.utm_content === "listing-slug", "stored content fills a gap");
assert(merged.utm_term === "shorts", "stored term fills a gap");
assert(Object.keys(mergeOfferUtm({}, {})).length === 0, "empty attribution stays empty");

assert(
  isMissingOfferUtmColumnError({
    code: "PGRST204",
    message: "Could not find the 'utm' column of 'listing_offers' in the schema cache",
  }),
  "schema-cache miss is retryable",
);
assert(
  isMissingOfferUtmColumnError({
    code: "42703",
    message: 'column "utm" of relation "listing_offers" does not exist',
  }),
  "undefined column is retryable",
);
assert(
  !isMissingOfferUtmColumnError({ code: "42501", message: "new row violates row-level security policy" }),
  "RLS failures are not retried",
);
assert(
  !isMissingOfferUtmColumnError({ code: "23502", message: "null value in column buyer_phone" }),
  "unrelated column errors are not retried",
);

async function main() {
const attempts: Record<string, unknown>[] = [];
const missing = await insertListingOfferRow(
  async (row) => {
    attempts.push(row);
    if ("utm" in row) {
      return {
        error: {
          code: "PGRST204",
          message: "Could not find the 'utm' column of 'listing_offers' in the schema cache",
        },
      };
    }
    return { error: null };
  },
  { listing_id: "listing", status: "new", offer_price: 10 },
  { utm_source: "yt", utm_campaign: "qe_offer" },
);
assert(missing.error === null, "missing utm column falls back to the original insert");
assert(attempts.length === 2, "fallback inserts once without utm");
assert("utm" in attempts[0]!, "first attempt carries utm");
assert(!("utm" in attempts[1]!), "retry omits utm");

attempts.length = 0;
const kept = await insertListingOfferRow(
  async (row) => {
    attempts.push(row);
    return { error: { code: "42501", message: "new row violates row-level security policy" } };
  },
  { listing_id: "listing", status: "new" },
  { utm_source: "tt" },
);
assert(kept.error?.code === "42501", "RLS error is returned");
assert(attempts.length === 1, "RLS error does not drop utm and retry");

attempts.length = 0;
const plain = await insertListingOfferRow(
  async (row) => {
    attempts.push(row);
    return { error: null };
  },
  { listing_id: "listing", status: "accepted_exit_price" },
  {},
);
assert(plain.error === null, "offer without attribution still inserts");
assert(!("utm" in attempts[0]!), "empty attribution omits the column");

const listing = readFileSync(resolve("app/[locale]/anunt/[id]/AnuntClient.tsx"), "utf8");
assert(listing.includes("isOfferFirstListingCta"), "detail page uses offer-first CTA");
assert(listing.includes('t("detailV2.cta.primaryMakeOffer")'), "primary copy is the make-offer key");
assert(listing.includes("isListingOfferDeepLink"), "detail page reads oferta deep link");
assert(listing.includes('openOfferModal("deep_link")'), "deep link opens the offer modal");
assert(listing.includes("insertListingOfferRow"), "both offer inserts go through the tolerant helper");
assert(listing.includes('status: "accepted_exit_price"'), "accept-exit-price insert remains");
assert(listing.includes("openInquiryModal"), "inquiry flow remains");
assert(!listing.includes("listing_distribution"), "listing page does not rewrite share UTMs");

const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8")) as {
  ListingDetail: { detailV2: { cta: Record<string, string> } };
};
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8")) as {
  ListingDetail: { detailV2: { cta: Record<string, string> } };
};
assert(ro.ListingDetail.detailV2.cta.primaryMakeOffer === "Fă o ofertă", "RO primary copy");
assert(en.ListingDetail.detailV2.cta.primaryMakeOffer === "Make an offer", "EN primary copy");
assert(ro.ListingDetail.detailV2.cta.primaryRequestDetails === "Solicită detalii", "RO inquiry copy kept");
assert(en.ListingDetail.detailV2.cta.primaryRequestDetails === "Request details", "EN inquiry copy kept");
assert(ro.ListingDetail.detailV2.cta.primaryAuction === "Trimite ofertă", "RO auction copy unchanged");
assert(en.ListingDetail.detailV2.cta.primaryCatalogOffer.length > 0, "EN catalog copy unchanged");

const share = readFileSync(resolve("lib/socialShare.ts"), "utf8");
assert(share.includes('utm_campaign", "listing_distribution"') || share.includes("listing_distribution"), "share links keep listing_distribution");

const migration = readFileSync(
  resolve("supabase/migrations/20261031120000_listing_offers_utm.sql"),
  "utf8",
);
assert(migration.includes("ADD COLUMN IF NOT EXISTS utm jsonb"), "migration adds nullable utm jsonb");
assert(!/DROP POLICY/i.test(migration), "migration does not replace insert policies");
assert(!/CREATE POLICY/i.test(migration), "migration does not add an insert policy");
assert(!/WITH CHECK/i.test(migration), "migration does not change the anon insert check");

console.log("OK offer-cta-utm");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
