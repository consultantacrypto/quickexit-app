import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ATTRIBUTION_STORAGE_KEY,
  ATTRIBUTION_UTM_KEYS,
  MAX_ATTR_FIELD_LENGTH,
  appendAttributionParams,
  captureAttribution,
  clearAnalyticsAttribution,
  getAnalyticsConsent,
  hasAnalyticsConsent,
  revokeAnalyticsConsent,
  sanitizeUtmValue,
  setAnalyticsConsent,
} from "../lib/analytics";
import { CONSENT_PREFERENCES_STORAGE_KEY } from "../lib/consentPreferences";
import {
  BUYER_FUNNEL_EVENTS,
  FUNNEL_EVENTS,
  FUNNEL_LEGACY_EQUIVALENTS,
  FUNNEL_RECOMMENDED_KEY_EVENTS,
  SELLER_FUNNEL_EVENTS,
  funnelUtmParams,
  isBlockedFabricatedPurchaseEvent,
  isFunnelEventName,
  looksLikePiiKey,
  resetFunnelOnceGateForTests,
  sanitizeFunnelParams,
  trackFunnelEvent,
} from "../lib/funnelAnalytics";
import { LISTING_DRAFT_STORAGE_KEY } from "../lib/listingDraft";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

const gtagCalls: unknown[][] = [];
const sessionStorage = memoryStorage();
const localStorage = memoryStorage();
let cookieStore = "";

function setLocation(href: string, pathname: string, search: string) {
  (globalThis.window as { location: { href: string; pathname: string; search: string } }).location = {
    href,
    pathname,
    search,
  };
}

Object.defineProperty(globalThis, "document", {
  value: {
    get cookie() {
      return cookieStore;
    },
    set cookie(value: string) {
      cookieStore = String(value);
    },
  },
  configurable: true,
});

Object.defineProperty(globalThis, "window", {
  value: {
    sessionStorage,
    localStorage,
    location: {
      href: "http://localhost:3000/ro/pune-anunt?utm_source=google&utm_medium=cpc&utm_campaign=spring&utm_content=hero&utm_term=exit&email=x@y.com&gclid=CLICKID",
      pathname: "/ro/pune-anunt",
      search:
        "?utm_source=google&utm_medium=cpc&utm_campaign=spring&utm_content=hero&utm_term=exit&email=x@y.com&gclid=CLICKID",
    },
    gtag: (...args: unknown[]) => {
      gtagCalls.push(args);
    },
  },
  configurable: true,
});

assert(SELLER_FUNNEL_EVENTS.includes("publish_page_view"), "seller publish_page_view");
assert(SELLER_FUNNEL_EVENTS.includes("listing_started"), "seller listing_started");
assert(SELLER_FUNNEL_EVENTS.includes("listing_step_1_complete"), "seller step 1");
assert(SELLER_FUNNEL_EVENTS.includes("listing_step_2_complete"), "seller step 2");
assert(SELLER_FUNNEL_EVENTS.includes("listing_step_3_complete"), "seller step 3");
assert(SELLER_FUNNEL_EVENTS.includes("begin_checkout"), "seller begin_checkout");
assert(BUYER_FUNNEL_EVENTS.includes("listing_view"), "buyer listing_view");
assert(BUYER_FUNNEL_EVENTS.includes("request_details_click"), "buyer request_details_click");
assert(BUYER_FUNNEL_EVENTS.includes("offer_started"), "buyer offer_started");
assert(BUYER_FUNNEL_EVENTS.includes("offer_submitted"), "buyer offer_submitted");
assert(!(FUNNEL_EVENTS as readonly string[]).includes("purchase"), "no purchase in funnel set");
assert(!isFunnelEventName("purchase"), "purchase is not a funnel event");
assert(isBlockedFabricatedPurchaseEvent("purchase"), "purchase is blocked");
assert(
  isBlockedFabricatedPurchaseEvent("checkout_listing_success"),
  "success-URL purchase alias is blocked from helper",
);

for (const eventName of FUNNEL_EVENTS) {
  assert(eventName in FUNNEL_LEGACY_EQUIVALENTS, `legacy mapping exists for ${eventName}`);
}
assert(FUNNEL_LEGACY_EQUIVALENTS.publish_page_view.legacy.includes("gtag_config_page_view"), "page view maps to gtag config");
assert(FUNNEL_LEGACY_EQUIVALENTS.listing_started.legacy.includes("start_post_listing"), "listing_started maps to start_post_listing");
assert(FUNNEL_LEGACY_EQUIVALENTS.listing_step_1_complete.legacy.includes("listing_step_completed"), "step 1 maps to listing_step_completed");
assert(FUNNEL_LEGACY_EQUIVALENTS.listing_step_2_complete.legacy.includes("listing_step_completed"), "step 2 maps to listing_step_completed");
assert(FUNNEL_LEGACY_EQUIVALENTS.listing_step_3_complete.legacy.includes("listing_step_completed"), "step 3 maps to listing_step_completed");
assert(FUNNEL_LEGACY_EQUIVALENTS.begin_checkout.legacy.includes("checkout_listing_started"), "begin_checkout maps to checkout_listing_started");
assert(FUNNEL_LEGACY_EQUIVALENTS.listing_view.legacy.includes("view_listing"), "listing_view maps to view_listing");
assert(FUNNEL_LEGACY_EQUIVALENTS.request_details_click.legacy.includes("click_listing_offer"), "request_details maps to click_listing_offer");
assert(FUNNEL_LEGACY_EQUIVALENTS.offer_started.legacy.length === 0, "offer_started has no legacy equivalent");
assert(FUNNEL_LEGACY_EQUIVALENTS.offer_submitted.legacy.includes("submit_listing_offer"), "offer_submitted maps to submit_listing_offer");
assert(
  JSON.stringify(FUNNEL_RECOMMENDED_KEY_EVENTS) ===
    JSON.stringify([
      "listing_step_1_complete",
      "listing_step_3_complete",
      "begin_checkout",
      "offer_submitted",
    ]),
  "recommended key events match the initial funnel",
);
assert(FUNNEL_LEGACY_EQUIVALENTS.listing_step_1_complete.recommendedKeyEvent, "step 1 is a recommended key event");
assert(!FUNNEL_LEGACY_EQUIVALENTS.listing_step_2_complete.recommendedKeyEvent, "step 2 is not a recommended key event");
assert(FUNNEL_LEGACY_EQUIVALENTS.begin_checkout.countingMethod.includes("retry"), "failed checkout retry is documented");

assert(looksLikePiiKey("email"), "email key is PII");
assert(looksLikePiiKey("listing_id"), "listing_id is PII for funnel helper");
assert(looksLikePiiKey("userId"), "userId is PII");
assert(looksLikePiiKey("adTitle"), "title is PII");
assert(looksLikePiiKey("description"), "description is PII");

const dirty = sanitizeFunnelParams({
  locale: "ro",
  category: "Auto & Moto",
  step: 2,
  source: "publish_form",
  sale_strategy: "direct",
  email: "seller@example.com",
  phone: "0712345678",
  title: "BMW secret",
  description: "free text",
  listing_id: "50e8decd-635a-46f7-908e-2ac1fddf8ac6",
  user_id: "user-1",
  value: 79,
  currency: "RON",
  amount: 79,
});
assert(dirty.locale === "ro", "locale kept");
assert(dirty.category === "auto", "category mapped to enum");
assert(dirty.step === 2, "step kept");
assert(dirty.source === "publish_form", "source kept");
assert(dirty.sale_strategy === "direct", "sale_strategy kept");
assert(!("email" in dirty), "email stripped");
assert(!("listing_id" in dirty), "listing_id stripped");
assert(!("value" in dirty), "value stripped");
assert(!("currency" in dirty), "currency stripped");
assert(!("amount" in dirty), "amount stripped");
assert(!("title" in dirty), "title stripped");

assert(sanitizeUtmValue("google") === "google", "plain UTM kept");
assert(sanitizeUtmValue("a".repeat(200))?.length === MAX_ATTR_FIELD_LENGTH, "oversized UTM truncated");
assert(sanitizeUtmValue("hello@world") === undefined, "email-like UTM rejected");
assert(sanitizeUtmValue("https://evil.example") === undefined, "URL UTM rejected");
assert(sanitizeUtmValue("gclid_abc") === undefined, "click id UTM rejected");
assert(sanitizeUtmValue("fbclid-test") === undefined, "fbclid UTM rejected");

assert(getAnalyticsConsent() === null, "consent starts absent");
assert(!hasAnalyticsConsent(), "absent is not granted");

resetFunnelOnceGateForTests();
gtagCalls.length = 0;
captureAttribution();
assert(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) === null, "absent consent stores no attribution");
assert(sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) === null, "absent consent does not use sessionStorage");
assert(cookieStore === "", "absent consent writes no cookies");
assert(trackFunnelEvent("publish_page_view", { locale: "ro", source: "publish_form" }) === false, "absent consent blocks funnel");
assert(gtagCalls.filter((call) => call[0] === "event").length === 0, "absent consent dispatches zero gtag events");

setAnalyticsConsent("denied");
gtagCalls.length = 0;
captureAttribution();
assert(getAnalyticsConsent() === "denied", "denied persisted");
assert(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) === null, "denied consent stores no attribution");
assert(trackFunnelEvent("publish_page_view", { locale: "ro", source: "publish_form" }) === false, "denied consent blocks funnel");
assert(gtagCalls.filter((call) => call[0] === "event").length === 0, "denied consent dispatches zero gtag events");
assert(
  trackFunnelEvent("publish_page_view", { locale: "ro", source: "publish_form" }) === false,
  "denied first calls do not consume the once-gate",
);

sessionStorage.setItem(LISTING_DRAFT_STORAGE_KEY, '{"keep":"draft"}');
localStorage.setItem("unrelated_app", "keep-me");
setAnalyticsConsent("granted");
assert(hasAnalyticsConsent(), "granted consent");
const stored = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}") as Record<
  string,
  string
>;
assert(stored.utm_source === "google", "granted stores utm_source");
assert(stored.utm_medium === "cpc", "granted stores utm_medium");
assert(stored.utm_campaign === "spring", "granted stores utm_campaign");
assert(stored.utm_content === "hero", "granted stores utm_content");
assert(stored.utm_term === "exit", "granted stores utm_term");
assert(Object.keys(stored).every((key) => (ATTRIBUTION_UTM_KEYS as readonly string[]).includes(key)), "only UTM keys stored");
assert(!("referrer" in stored), "referrer is not stored");
assert(!("landing_path" in stored), "landing_path is not stored");
assert(!("gclid" in stored), "click id is not stored");
assert(!JSON.stringify(stored).includes("@"), "attribution has no email");
assert(!JSON.stringify(stored).includes("CLICKID"), "attribution has no click id value");
assert(cookieStore === "", "granted consent still writes no cookies");

captureAttribution();
const storedAgain = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}") as Record<
  string,
  string
>;
assert(storedAgain.utm_source === "google", "first-touch UTM is not overwritten");

const utmOnly = appendAttributionParams({ locale: "ro" }, "utm_only");
assert(
  Object.keys(utmOnly).every(
    (key) => key === "locale" || (ATTRIBUTION_UTM_KEYS as readonly string[]).includes(key),
  ),
  "utm_only uses canonical utm_* keys only",
);
assert(!("attribution_utm_source" in utmOnly), "attribution_utm_* namespace is removed");
assert(!("attribution_referrer" in utmOnly), "referrer omitted in utm_only");
assert(ATTRIBUTION_UTM_KEYS.length === 5, "exactly five UTM keys");

const utm = funnelUtmParams();
assert(Object.keys(utm).every((key) => (ATTRIBUTION_UTM_KEYS as readonly string[]).includes(key)), "funnel UTM keys only");
assert(!JSON.stringify(utm).includes("@"), "UTM payload has no email");

resetFunnelOnceGateForTests();
gtagCalls.length = 0;
assert(trackFunnelEvent("publish_page_view", { locale: "ro", source: "publish_form" }) === true, "first page view fires");
assert(trackFunnelEvent("publish_page_view", { locale: "ro", source: "publish_form" }) === false, "duplicate page view suppressed");
assert(trackFunnelEvent("publish_page_view", { locale: "ro", source: "publish_form" }) === false, "Strict Mode remount does not duplicate page view");
assert(trackFunnelEvent("purchase", { locale: "ro" }) === false, "purchase is not fabricated");
assert(
  trackFunnelEvent("listing_started", {
    locale: "ro",
    category: "auto",
    source: "publish_form",
    sale_strategy: "direct",
    listing_id: "abc",
    email: "a@b.c",
  }) === true,
  "listing_started fires",
);
assert(trackFunnelEvent("listing_step_1_complete", { locale: "ro", category: "auto", step: 1, source: "publish_form" }) === true, "step 1 complete fires once");
assert(trackFunnelEvent("listing_step_1_complete", { locale: "ro", category: "auto", step: 1, source: "publish_form" }) === false, "step 1 complete is not duplicated");
assert(trackFunnelEvent("listing_view", { locale: "ro", category: "auto", source: "listing_detail" }) === true, "listing_view fires once");
assert(trackFunnelEvent("listing_view", { locale: "ro", category: "auto", source: "listing_detail" }) === false, "listing_view Strict Mode remount suppressed");
assert(trackFunnelEvent("offer_started", { locale: "ro", category: "auto", source: "listing_detail" }) === true, "offer_started on modal open");
assert(trackFunnelEvent("offer_started", { locale: "ro", category: "auto", source: "listing_detail" }) === false, "closing/reopening does not duplicate offer_started once-gate");
assert(
  trackFunnelEvent("offer_submitted", { locale: "ro", category: "auto", source: "listing_detail" }, { skipOnce: true }) === true,
  "offer_submitted can fire after insert",
);
assert(
  trackFunnelEvent("begin_checkout", { locale: "ro", category: "auto", source: "publish_form" }, { skipOnce: true }) === true,
  "begin_checkout retry is allowed with skipOnce",
);
assert(
  trackFunnelEvent("begin_checkout", { locale: "ro", category: "auto", source: "publish_form" }, { skipOnce: true }) === true,
  "failed checkout may be retried",
);

const sent = gtagCalls.filter((call) => call[0] === "event");
assert(sent.some((call) => call[1] === "publish_page_view"), "publish_page_view reached gtag");
assert(sent.some((call) => call[1] === "listing_started"), "listing_started reached gtag");
assert(!sent.some((call) => call[1] === "purchase"), "no purchase gtag event");
const sample = sent.find((call) => call[1] === "listing_started");
assert(sample, "listing_started sample exists");
for (const call of sent) {
  const payload = JSON.stringify(call[2] ?? {});
  assert(!payload.includes("listing_id"), "gtag payload has no listing_id");
  assert(!payload.includes("@"), "gtag payload has no email");
  assert(!payload.toLowerCase().includes("bmw secret"), "gtag payload has no free text title");
  assert(!payload.includes("0712345678"), "gtag payload has no phone");
  assert(!payload.includes("attribution_utm_"), "gtag payload has a single UTM namespace");
}

revokeAnalyticsConsent();
assert(getAnalyticsConsent() === "denied", "revoke persists denied");
assert(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) === null, "revoke removes helper attribution");
assert(sessionStorage.getItem(LISTING_DRAFT_STORAGE_KEY) === '{"keep":"draft"}', "revoke does not clear publish draft");
assert(localStorage.getItem("unrelated_app") === "keep-me", "revoke does not clear unrelated app data");
assert(localStorage.getItem(CONSENT_PREFERENCES_STORAGE_KEY), "revoke writes versioned preferences");
assert(!localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY), "legacy consent key is not left granted");
gtagCalls.length = 0;
resetFunnelOnceGateForTests();
assert(trackFunnelEvent("listing_started", { locale: "ro", source: "publish_form" }) === false, "revoked consent blocks future funnel events");
assert(gtagCalls.filter((call) => call[0] === "event").length === 0, "revoked consent dispatches zero events");
clearAnalyticsAttribution();

setLocation(
  `http://localhost:3000/ro/pune-anunt?utm_source=${"z".repeat(200)}&utm_medium=cpc`,
  "/ro/pune-anunt",
  `?utm_source=${"z".repeat(200)}&utm_medium=cpc`,
);
localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
setAnalyticsConsent("granted");
const truncated = JSON.parse(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}") as Record<
  string,
  string
>;
assert(truncated.utm_source?.length === MAX_ATTR_FIELD_LENGTH, "oversized utm_source truncated in store");
assert(truncated.utm_medium === "cpc", "valid companion UTM kept");

setLocation(
  "http://localhost:3000/ro/pune-anunt?utm_source=hello@world&utm_medium=gclid_abc",
  "/ro/pune-anunt",
  "?utm_source=hello@world&utm_medium=gclid_abc",
);
localStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
captureAttribution();
assert(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) === null, "malformed UTM is not stored");

const publish = readFileSync("app/[locale]/pune-anunt/PuneAnuntClient.tsx", "utf8");
const ro = JSON.parse(readFileSync("messages/ro.json", "utf8")) as {
  PostListing: { step2: { intro: string } };
};
assert(publish.includes('trackFunnelEvent("publish_page_view"'), "publish_page_view instrumented");
assert(publish.includes('trackFunnelEvent("listing_started"'), "listing_started instrumented");
assert(publish.includes('trackFunnelEvent("listing_step_1_complete"'), "step 1 complete instrumented");
assert(publish.includes('trackFunnelEvent("listing_step_2_complete"'), "step 2 complete instrumented");
assert(publish.includes('trackFunnelEvent("listing_step_3_complete"'), "step 3 complete instrumented");
assert(publish.includes('trackFunnelEvent("begin_checkout"'), "begin_checkout instrumented");
assert(publish.includes("/api/stripe/checkout"), "existing checkout request unchanged");
assert(
  publish.indexOf('trackFunnelEvent("begin_checkout"') < publish.indexOf('fetch("/api/stripe/checkout"'),
  "begin_checkout is immediately before checkout fetch",
);
assert(publish.includes("skipOnce: true"), "failed checkout retry uses skipOnce");
assert(publish.includes("trackListingStepCompleted(2)"), "step 2 complete uses existing leave-step-2 path");
assert(publish.includes('tPost("step2.intro")'), "step 2 copy uses i18n encouragement key");
assert(
  ro.PostListing.step2.intro.includes("Pozele reale și descrierea sinceră"),
  "RO step 2 copy still treats photos/description as optional encouragement",
);

const listing = readFileSync("app/[locale]/anunt/[id]/AnuntClient.tsx", "utf8");
assert(listing.includes('trackFunnelEvent("listing_view"'), "listing_view instrumented");
assert(listing.includes("listingViewOnceRef"), "listing_view has Strict Mode once-ref");
assert(listing.includes('trackFunnelEvent("request_details_click"'), "request_details_click instrumented");
assert(listing.includes('trackFunnelEvent("offer_started"'), "offer_started instrumented");
assert(listing.includes('trackFunnelEvent("offer_submitted"'), "offer_submitted instrumented");
assert(
  listing.indexOf("if (error) throw error") < listing.indexOf('trackFunnelEvent("offer_submitted"'),
  "offer_submitted fires only after insert succeeds",
);
assert(!listing.includes('trackFunnelEvent("purchase"'), "listing does not fabricate purchase");
assert(!listing.includes("/api/listings/"), "Phase 2B inquiry route unused");
assert(!existsSync(resolve("lib/listingInquiry.ts")), "Phase 2B helper absent");
assert(!existsSync(resolve("docs/internal/sql/listing-inquiries.sql")), "Phase 2B SQL absent");

const layout = readFileSync("app/[locale]/layout.tsx", "utf8");
assert(!layout.includes("googletagmanager.com"), "layout does not load gtag.js before consent");
assert(!layout.includes("analytics.tiktok.com"), "layout does not load TikTok before consent");
assert(layout.includes("ConsentProvider"), "consent provider wraps the app");
assert(!publish.includes("pageview("), "publish does not duplicate gtag page_view");

const analyticsSrc = readFileSync("lib/analytics.ts", "utf8");
assert(analyticsSrc.includes("hasAnalyticsConsent()"), "capture/track require consent");
assert(!analyticsSrc.includes("landing_path"), "helper no longer persists landing_path");
assert(!analyticsSrc.includes("first_seen_at"), "helper no longer persists first_seen_at");

const docs = readFileSync("docs/analytics-events.md", "utf8");
assert(docs.includes("Canonical ↔ legacy mapping"), "docs include legacy mapping");
assert(docs.includes("listing_step_1_complete"), "docs list step 1");
assert(docs.includes("do not count both") || docs.includes("Nu importa ambele"), "docs warn against double Ads conversions");
assert(docs.includes("Nu există eveniment `purchase`") || docs.includes("nu fabrică purchase"), "docs confirm no purchase yet");
assert(docs.includes("fotografiile și descrierea sunt **opționale**"), "docs record step-2 optional photos/description");
assert(!docs.includes("Key events în GA4 din acest sprint") || docs.includes("nu marcat acum"), "docs do not claim GA4 was marked");

const guard = readFileSync("lib/publishDraftGuard.ts", "utf8");
assert(guard.includes("Step 2 has no persisted required fields"), "step 2 validation is not invented for analytics");

console.log("OK funnel-analytics");
console.log(
  "SAMPLE listing_started",
  JSON.stringify(sample?.[2] ?? {}, null, 2),
);
