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
import {
  buildListingWhatsAppHref,
  isListingMobileCtaEligible,
} from "../lib/listingWhatsApp";

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

assert(isListingMobileCtaEligible({ status: "active", availability_status: "available" }), "active available listing shows the mobile bar");
assert(
  isListingMobileCtaEligible({ status: "active", availability_status: "needs_confirmation" }),
  "needs_confirmation stays eligible",
);
assert(isListingMobileCtaEligible({ status: "active" }), "missing availability follows the public page");
assert(!isListingMobileCtaEligible({ status: "active", availability_status: "sold" }), "sold listing hides the bar");
assert(!isListingMobileCtaEligible({ status: "sold", availability_status: "available" }), "inactive status hides the bar");
assert(listing.includes("isListingMobileCtaEligible"), "detail page gates the mobile bar");
assert(listing.includes("StickyContactBar"), "listing page renders the mobile bar");
assert(listing.includes('t("detailV2.cta.primaryMakeOffer")'), "sticky label reuses the make-offer copy");
assert(
  listing.includes('interaction_source: "listing_detail"'),
  "page offer button keeps its listing_detail click",
);
const stickyHandler = listing.slice(
  listing.indexOf("const onMobileMakeOffer"),
  listing.indexOf("const renderTitle"),
);
assert(stickyHandler.includes('trackEvent("click_listing_offer_sticky"'), "sticky offer has its own event");
assert(
  !stickyHandler.includes('trackEvent("click_listing_offer"'),
  "sticky handler does not emit the page offer event",
);
assert(
  (listing.match(/trackEvent\("click_listing_offer"/g) ?? []).length >= 2,
  "page offer clicks still use click_listing_offer",
);

const sticky = readFileSync(resolve("app/[locale]/anunt/[id]/StickyContactBar.tsx"), "utf8");
assert(sticky.includes("env(safe-area-inset-bottom"), "bar pads for the bottom safe area");
assert(sticky.includes("lg:hidden"), "bar hides at the desktop sidebar breakpoint");
assert(sticky.includes("bannerVisible"), "bar yields to the cookie banner");
assert(sticky.includes("buildListingWhatsAppHref"), "WhatsApp link is built from configured digits");
assert(!sticky.includes("40731409099"), "bar does not hardcode the operator number");

const listingId = "490d41f9-0480-4785-8818-ae458847bf4b";
const href = buildListingWhatsAppHref({
  title: "Zeekr 8X Ultra — încărcător",
  listingUrl: `https://www.quickexit.ro/ro/anunt/${listingId}`,
  listingId,
  exitPrice: 82820,
  locale: "ro",
});
assert(typeof href === "string" && href.startsWith("https://wa.me/"), "whatsapp href uses wa.me");
const encodedText = href!.slice(href!.indexOf("text=") + 5);
assert(encodedText.includes("%0A"), "newlines are percent-encoded");
assert(encodedText.includes("%E2%82%AC"), "euro sign is percent-encoded");
assert(encodedText.includes("%C3%AE"), "diacritic î is percent-encoded");
assert(!encodedText.includes(" "), "prefill text is encoded, not left raw");
const prefilled = decodeURIComponent(encodedText);
assert(prefilled.includes("Zeekr 8X Ultra — încărcător"), "prefilled message includes the listing title");
assert(prefilled.includes("€82.820"), "prefilled price matches the Romanian listing format");
assert(prefilled.includes(`ID: ${listingId}`), "prefilled message includes the listing id");
assert(
  prefilled.includes(
    `https://www.quickexit.ro/ro/anunt/${listingId}?utm_source=whatsapp&utm_medium=mobile_sticky_bar&utm_campaign=listing_cta`,
  ),
  "prefilled link keeps getSiteUrl path plus sticky UTM",
);
assert(prefilled.split("\n")[0] === "Zeekr 8X Ultra — încărcător", "title is the first line");
assert(!prefilled.includes("%0A") && prefilled.includes("\n"), "decoded message uses real newlines");

const withoutPrice = buildListingWhatsAppHref({
  title: "Anunț fără preț",
  listingUrl: "https://www.quickexit.ro/ro/anunt/x",
  listingId: "x",
  exitPrice: null,
  locale: "ro",
});
const withoutPriceText = decodeURIComponent(withoutPrice!.slice(withoutPrice!.indexOf("text=") + 5));
assert(!withoutPriceText.includes("€"), "missing exit price is omitted");
assert(withoutPriceText.includes("ID: x"), "id remains when price is omitted");
assert(withoutPriceText.includes("utm_campaign=listing_cta"), "utm remains when price is omitted");
assert(
  buildListingWhatsAppHref({
    title: "Anunț",
    listingUrl: "https://www.quickexit.ro/ro/anunt/x",
    whatsappUrl: "",
  }) === null,
  "missing configured number hides WhatsApp",
);
assert(
  buildListingWhatsAppHref({
    title: "Anunț",
    listingUrl: "https://www.quickexit.ro/ro/anunt/x",
    whatsappUrl: "https://example.com/not-whatsapp",
  }) === null,
  "non wa.me config hides WhatsApp",
);

console.log("OK offer-cta-utm");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
