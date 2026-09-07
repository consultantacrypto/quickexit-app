import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  captureAttribution,
  hasAnalyticsConsent,
  setAnalyticsConsent,
  trackEvent,
} from "../lib/analytics";
import { stripReservedAnalyticsParams } from "../lib/analyticsParams";
import { listingDraftAnalyticsParams } from "../lib/listingDraft";
import { toEvaluationTrackingEventParams } from "../lib/evaluationTracking";
import {
  googleConsentUpdateFromPreferences,
  buildConsentPreferences,
} from "../lib/consentPreferences";
import { GTAG_HOST, TIKTOK_HOST, injectGtagOnce } from "../lib/consentTags";
import {
  resetFunnelOnceGateForTests,
  sanitizeFunnelParams,
  trackFunnelEvent,
} from "../lib/funnelAnalytics";

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

const createdScripts: Array<{ src: string; attrs: Record<string, string> }> = [];
const localStorage = memoryStorage();
const sessionStorage = memoryStorage();
const gtagCalls: unknown[][] = [];
let cookieStore = "";
let lastGtagOnload: unknown = null;

Object.defineProperty(globalThis, "document", {
  value: {
    createElement(tag: string) {
      const el: {
        tagName: string;
        async: boolean;
        src: string;
        onload: null | (() => void);
        setAttribute(name: string, value: string): void;
        attrs: Record<string, string>;
      } = {
        tagName: tag,
        async: false,
        src: "",
        onload: null,
        attrs: {},
        setAttribute(name, value) {
          this.attrs[name] = value;
        },
      };
      return el;
    },
    head: {
      appendChild(el: { src: string; attrs: Record<string, string>; onload?: (() => void) | null }) {
        createdScripts.push({ src: el.src, attrs: el.attrs });
        if (el.onload) lastGtagOnload = el.onload;
        return el;
      },
    },
    get cookie() {
      return cookieStore;
    },
    set cookie(value: string) {
      cookieStore = String(value);
    },
    querySelector(selector: string) {
      const match = selector.match(/data-qe-tag="([^"]+)"/);
      if (match) {
        return createdScripts.find((s) => s.attrs["data-qe-tag"] === match[1]) ?? null;
      }
      return null;
    },
    getElementsByTagName() {
      return [];
    },
  },
  configurable: true,
});

Object.defineProperty(globalThis, "window", {
  value: {
    localStorage,
    sessionStorage,
    location: {
      href: "http://localhost:3000/ro/pune-anunt?utm_source=google&utm_medium=cpc&utm_campaign=sprite",
      pathname: "/ro/pune-anunt",
      search: "?utm_source=google&utm_medium=cpc&utm_campaign=sprite",
      hostname: "localhost",
    },
    gtag: (...args: unknown[]) => {
      gtagCalls.push(args);
    },
    dispatchEvent() {
      return true;
    },
  },
  configurable: true,
});

const helper = readFileSync("lib/funnelAnalytics.ts", "utf8");
assert(helper.includes('"funnel_source"'), "helper allowlists funnel_source");
assert(helper.includes('RESERVED_TRAFFIC_KEYS'), "helper strips reserved traffic keys");
assert(helper.includes("RESERVED_ANALYTICS_PARAM_KEYS"), "helper reuses the central reserved-key list");
assert(readFileSync("lib/analyticsParams.ts", "utf8").includes('"source"'), "central reserved list includes source");

const stripped = sanitizeFunnelParams({
  source: "listing_detail",
  medium: "cpc",
  campaign: "rolex",
  funnel_source: "listing_detail",
  utm_source: "google",
  gclid: "CLICK",
  listing_id: "abc",
});
assert(stripped.funnel_source === "listing_detail", "funnel_source survives sanitize");
assert(!("source" in stripped), "source does not survive sanitize");
assert(!("medium" in stripped), "medium does not survive sanitize");
assert(!("campaign" in stripped), "campaign does not survive sanitize");
assert(!("utm_source" in stripped), "UTM is not copied as a custom funnel param");
assert(!("gclid" in stripped), "gclid is not copied");

const denied = googleConsentUpdateFromPreferences(null);
assert(
  denied.analytics_storage === "denied" &&
    denied.ad_storage === "denied" &&
    denied.ad_user_data === "denied" &&
    denied.ad_personalization === "denied",
  "absent preferences map to full Consent Mode denial",
);
assert(
  googleConsentUpdateFromPreferences(
    buildConsentPreferences({ analytics: true, marketing: true }),
  ).ad_personalization === "denied",
  "accept-all still denies ad_personalization",
);

gtagCalls.length = 0;
assert(injectGtagOnce(null) === true, "absent consent loads gtag once");
assert(gtagCalls[0]?.[0] === "consent" && gtagCalls[0]?.[1] === "default", "default precedes config/event");
assert(!gtagCalls.some((call) => call[0] === "config"), "no config before onload");
assert(createdScripts.filter((script) => script.src.includes(GTAG_HOST)).length === 1, "one gtag.js");
assert(!createdScripts.some((script) => script.src.includes(TIKTOK_HOST)), "absent consent has no TikTok script");
assert(injectGtagOnce(null) === false, "second inject is a no-op");

resetFunnelOnceGateForTests();
assert(
  trackFunnelEvent("publish_page_view", { locale: "ro", source: "listing_detail" }) === true,
  "cookieless funnel allowed",
);
assert(typeof lastGtagOnload === "function", "gtag onload is registered for cookieless config");
(lastGtagOnload as () => void)();
const defaultIdx = gtagCalls.findIndex((call) => call[0] === "consent" && call[1] === "default");
const configIdx = gtagCalls.findIndex((call) => call[0] === "config");
const eventIdx = gtagCalls.findIndex((call) => call[0] === "event");
assert(defaultIdx === 0, "consent default is the first gtag call");
assert(configIdx > defaultIdx, "config is after consent default");
assert(eventIdx > configIdx, "events are after config");
const cookieless = gtagCalls.find((call) => call[0] === "event" && call[1] === "publish_page_view")?.[2] as
  | Record<string, unknown>
  | undefined;
assert(cookieless && !("source" in cookieless), "cookieless payload has no reserved source");
assert(cookieless && !("utm_source" in cookieless), "cookieless payload has no persisted UTM");
assert(localStorage.getItem("quickexit_attribution") === null, "absent consent stores no UTM");
assert(cookieStore === "", "absent consent writes no cookies");

setAnalyticsConsent("granted");
assert(hasAnalyticsConsent(), "analytics grant");
captureAttribution();
const stored = JSON.parse(localStorage.getItem("quickexit_attribution") || "{}") as Record<string, string>;
assert(stored.utm_source === "google", "granted stores utm_source");
assert(stored.utm_medium === "cpc", "granted stores utm_medium");
assert(stored.utm_campaign === "sprite", "granted stores utm_campaign");
assert(Object.keys(stored).every((key) => key.startsWith("utm_")), "stored keys stay in the UTM namespace");

resetFunnelOnceGateForTests();
gtagCalls.length = 0;
assert(
  trackFunnelEvent("listing_view", {
    locale: "ro",
    source: "listing_detail",
    funnel_source: "listing_detail",
    medium: "cpc",
    campaign: "sprite",
  }) === true,
  "granted listing_view fires",
);
const granted = gtagCalls.find((call) => call[0] === "event" && call[1] === "listing_view")?.[2] as
  | Record<string, unknown>
  | undefined;
assert(granted?.funnel_source === "listing_detail", "granted payload uses funnel_source");
assert(!("source" in (granted ?? {})), "granted payload has no reserved source");
assert(!("medium" in (granted ?? {})), "granted payload has no reserved medium");
assert(!("campaign" in (granted ?? {})), "granted payload has no reserved campaign");
assert(granted?.utm_source === "google", "granted payload keeps utm_source");

resetFunnelOnceGateForTests();
gtagCalls.length = 0;
trackEvent("click_post_listing", {
  source: "home_hero",
  medium: "cpc",
  campaign: "sprite",
  campaign_id: "123",
  term: "exit",
  content: "hero",
  gclid: "CLICK",
  dclid: "DCLICK",
  interaction_source: "home_hero",
});
const tracked = gtagCalls.find((call) => call[0] === "event" && call[1] === "click_post_listing")?.[2] as
  | Record<string, unknown>
  | undefined;
assert(tracked?.interaction_source === "home_hero", "central path keeps interaction_source");
assert(!("source" in (tracked ?? {})), "central path strips source");
assert(!("medium" in (tracked ?? {})), "central path strips medium");
assert(!("campaign" in (tracked ?? {})), "central path strips campaign");
assert(!("campaign_id" in (tracked ?? {})), "central path strips campaign_id");
assert(!("term" in (tracked ?? {})), "central path strips term");
assert(!("content" in (tracked ?? {})), "central path strips content");
assert(!("gclid" in (tracked ?? {})), "central path strips gclid");
assert(!("dclid" in (tracked ?? {})), "central path strips dclid");

const reservedStripped = stripReservedAnalyticsParams({
  source: "listing_detail",
  utm_source: "google",
  funnel_source: "listing_detail",
  interaction_source: "home_hero",
  gclid: "x",
});
assert(!("source" in reservedStripped), "stripReserved drops source");
assert(reservedStripped.utm_source === "google", "stripReserved keeps utm_source");
assert(reservedStripped.funnel_source === "listing_detail", "stripReserved keeps funnel_source");
assert(reservedStripped.interaction_source === "home_hero", "stripReserved keeps interaction_source");

const evalParams = toEvaluationTrackingEventParams(
  { source: "evaluation", selected_price_type: "market" },
  { source: "should_strip", category: "auto" },
);
assert(evalParams.interaction_source === "evaluation", "evaluation helper emits interaction_source");
assert(!("source" in evalParams), "evaluation helper does not emit reserved source");

const draftParams = listingDraftAnalyticsParams(
  { step: 1, category: "Auto & Moto", selectedPackage: "standard", version: 2 },
  "session_restore",
  "session",
);
assert(draftParams.interaction_source === "session", "draft helper emits interaction_source");
assert(!("source" in draftParams), "draft helper does not emit reserved source");

const publish = readFileSync("app/[locale]/pune-anunt/PuneAnuntClient.tsx", "utf8");
const listing = readFileSync("app/[locale]/anunt/[id]/AnuntClient.tsx", "utf8");
assert(publish.includes('funnel_source: "publish_form"'), "publish uses funnel_source");
assert(listing.includes('funnel_source: "listing_detail"'), "listing uses funnel_source");
assert(!/\bsource:\s*"publish_form"\s+as const/.test(publish), "publish no longer types source as funnel origin");
assert(!/\bsource:\s*"listing_detail"\s+as const/.test(listing), "listing no longer types source as funnel origin");

const middleware = readFileSync("middleware.ts", "utf8");
assert(middleware.includes("createMiddleware"), "locale middleware is next-intl");
assert(!middleware.includes("searchParams.delete"), "middleware does not strip query keys");
assert(!middleware.includes("utm_source"), "middleware does not special-case UTM deletion");

const docs = readFileSync("docs/analytics-events.md", "utf8");
assert(docs.includes("funnel_source"), "docs rename funnel_source");
assert(docs.includes("Advanced Consent Mode"), "docs name Advanced Consent Mode");
assert(docs.includes("ad_personalization rămâne denied") || docs.includes("ad_personalization"), "docs keep personalization denied");
assert(docs.includes("Nu pretindem") || docs.includes("nu transformă toate clickurile"), "docs do not promise full GA4 sessions");

const ro = JSON.parse(readFileSync("messages/ro.json", "utf8")) as {
  Consent: Record<string, string>;
  CookiesPolicy: Record<string, string>;
};
const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
  Consent: Record<string, string>;
  CookiesPolicy: Record<string, string>;
};
assert(ro.Consent.bannerBody.includes("Google Ads prin GA4"), "RO banner discloses GA4→Ads");
assert(en.Consent.bannerBody.includes("Google Ads conversion measurement through GA4"), "EN banner discloses GA4→Ads");
assert(ro.Consent.marketingHelp.includes("nu instalăm un tag AW-"), "RO does not claim an AW- install");
assert(en.Consent.marketingHelp.includes("do not install an AW- tag"), "EN does not claim an AW- install");
assert(ro.Consent.acceptAll.length > 8 && ro.Consent.rejectOptional.length > 8, "RO accept/reject remain comparable labels");
assert(en.Consent.acceptAll.length > 8 && en.Consent.rejectOptional.length > 8, "EN accept/reject remain comparable labels");

const layout = readFileSync("app/[locale]/layout.tsx", "utf8");
assert(!layout.includes("AW-"), "layout does not install AW-");
assert(!layout.includes("googletagmanager.com/gtm.js"), "layout does not install GTM");
assert(!layout.includes("googleadservices.com"), "layout does not install ads conversion js");

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

const forbiddenPayload = [
  /eventParams=\{\{\s*source:/,
  /eventParams=\{\{\s*medium:/,
  /eventParams=\{\{\s*campaign:/,
];
const forbiddenLiteral = /\bsource:\s*"(listing_detail|home_hero|home_listings_section|home_capital_section|home_capital_fallback|home_capital_section_footer|sticky_bar|sidebar|evaluation_result|publish_form|pentru-vanzatori|pentru-investitori|ghid-exit-price|ghid-active-sub-pretul-pietei)"/;
for (const file of [...walkFiles("app"), ...walkFiles("lib")]) {
  if (file.includes("gaData") || file.includes("leadAgent") || file.includes("stripeWebhook")) continue;
  const text = readFileSync(file, "utf8");
  for (const re of forbiddenPayload) {
    assert(!re.test(text), `${file} still has reserved eventParams key`);
  }
  if (file.replace(/\\/g, "/").includes("lib/evaluationTracking.ts")) continue;
  if (file.replace(/\\/g, "/").includes("lib/evaluationDraft.ts")) continue;
  if (file.replace(/\\/g, "/").includes("lib/listingDraft.ts")) continue;
  assert(!forbiddenLiteral.test(text), `${file} still has reserved analytics source literal`);
}

console.log("OK measurement-attribution");
