import { readFileSync } from "node:fs";
import {
  applyConsentPreferences,
  captureAttribution,
  hasAnalyticsConsent,
  hasMarketingConsent,
  trackEvent,
} from "../lib/analytics";
import {
  CONSENT_PREFERENCES_STORAGE_KEY,
  CONSENT_PREFERENCES_VERSION,
  LEGACY_ANALYTICS_CONSENT_STORAGE_KEY,
  buildConsentPreferences,
  googleConsentUpdateFromPreferences,
  migrateLegacyAnalyticsConsentValue,
  parseConsentPreferences,
  readConsentPreferences,
} from "../lib/consentPreferences";
import {
  GTAG_HOST,
  TIKTOK_HOST,
  injectGtagIfAllowed,
  injectGtagOnce,
  injectTikTokIfAllowed,
} from "../lib/consentTags";
import { trackFunnelEvent, resetFunnelOnceGateForTests } from "../lib/funnelAnalytics";

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
const ttqCalls: unknown[][] = [];
let lastGtagOnload: unknown = null;
const cookieJar = new Map<string, string>();

Object.defineProperty(globalThis, "document", {
  value: {
    createElement(tag: string) {
      const el: {
        tagName: string;
        async: boolean;
        src: string;
        type: string;
        onload: null | (() => void);
        setAttribute(name: string, value: string): void;
        attrs: Record<string, string>;
      } = {
        tagName: tag,
        async: false,
        src: "",
        type: "",
        onload: null,
        attrs: {},
        setAttribute(name: string, value: string) {
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
      return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(value: string) {
      const [pair] = String(value).split(";");
      const eq = pair.indexOf("=");
      const name = (eq >= 0 ? pair.slice(0, eq) : pair).trim();
      const cookieValue = eq >= 0 ? pair.slice(eq + 1).trim() : "";
      if (!name) return;
      if (/Max-Age=0/i.test(value) || /expires=Thu, 01 Jan 1970/i.test(value)) {
        cookieJar.delete(name);
        return;
      }
      cookieJar.set(name, cookieValue);
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
      href: "http://localhost:3000/ro/pune-anunt?utm_source=google&utm_medium=cpc",
      pathname: "/ro/pune-anunt",
      search: "?utm_source=google&utm_medium=cpc",
      hostname: "localhost",
    },
    gtag: (...args: unknown[]) => {
      gtagCalls.push(args);
    },
    ttq: {
      track: (...args: unknown[]) => {
        ttqCalls.push(args);
      },
    },
    dispatchEvent() {
      return true;
    },
  },
  configurable: true,
});

const grantedLegacy = migrateLegacyAnalyticsConsentValue("granted");
assert(grantedLegacy?.analytics === true, "legacy granted enables analytics");
assert(grantedLegacy?.marketing === false, "legacy granted does not enable marketing");
const deniedLegacy = migrateLegacyAnalyticsConsentValue("denied");
assert(deniedLegacy?.analytics === false && deniedLegacy?.marketing === false, "legacy denied disables both");
assert(migrateLegacyAnalyticsConsentValue(null) === null, "absent legacy stays unset");

assert(parseConsentPreferences({ version: 1, timestamp: 1, necessary: true, analytics: true }) === null, "missing marketing is invalid");
assert(parseConsentPreferences("granted") === null, "legacy string is not a preferences object");

localStorage.setItem(LEGACY_ANALYTICS_CONSENT_STORAGE_KEY, "granted");
const migrated = readConsentPreferences();
assert(migrated?.analytics === true, "read migrates granted analytics");
assert(migrated?.marketing === false, "read migrates without marketing");
assert(!localStorage.getItem(LEGACY_ANALYTICS_CONSENT_STORAGE_KEY), "legacy key removed after migrate");
const storedPrefs = JSON.parse(localStorage.getItem(CONSENT_PREFERENCES_STORAGE_KEY) || "null");
assert(storedPrefs?.version === CONSENT_PREFERENCES_VERSION, "versioned object persisted");
assert(storedPrefs?.necessary === true, "necessary stays true");

const modeDenied = googleConsentUpdateFromPreferences(
  buildConsentPreferences({ analytics: false, marketing: false }),
);
assert(modeDenied.analytics_storage === "denied", "analytics_storage denied");
assert(modeDenied.ad_storage === "denied", "ad_storage denied");
assert(modeDenied.ad_user_data === "denied", "ad_user_data denied");
assert(modeDenied.ad_personalization === "denied", "ad_personalization denied");

const modeAnalytics = googleConsentUpdateFromPreferences(
  buildConsentPreferences({ analytics: true, marketing: false }),
);
assert(modeAnalytics.analytics_storage === "granted", "analytics_storage granted");
assert(modeAnalytics.ad_storage === "denied", "ads remain denied without marketing");
assert(modeAnalytics.ad_user_data === "denied", "analytics-only keeps ad_user_data denied");
assert(modeAnalytics.ad_personalization === "denied", "analytics-only keeps ad_personalization denied");

const modeMarketing = googleConsentUpdateFromPreferences(
  buildConsentPreferences({ analytics: false, marketing: true }),
);
assert(modeMarketing.analytics_storage === "denied", "marketing-only keeps analytics_storage denied");
assert(modeMarketing.ad_storage === "granted", "ad_storage granted only with marketing");
assert(modeMarketing.ad_user_data === "granted", "ad_user_data granted only with marketing");
assert(modeMarketing.ad_personalization === "denied", "ad_personalization stays denied with marketing");

const modeAcceptAll = googleConsentUpdateFromPreferences(
  buildConsentPreferences({ analytics: true, marketing: true }),
);
assert(modeAcceptAll.analytics_storage === "granted", "accept-all grants analytics_storage");
assert(modeAcceptAll.ad_storage === "granted", "accept-all grants ad_storage");
assert(modeAcceptAll.ad_user_data === "granted", "accept-all grants ad_user_data");
assert(modeAcceptAll.ad_personalization === "denied", "accept-all still denies ad_personalization");

createdScripts.length = 0;
gtagCalls.length = 0;
assert(injectGtagOnce(null) === true, "gtag injects once with absent consent for cookieless pings");
assert(createdScripts.filter((s) => s.src.includes(GTAG_HOST)).length === 1, "exactly one gtag.js script");
assert(gtagCalls[0]?.[0] === "consent" && gtagCalls[0]?.[1] === "default", "first gtag call is consent default");
const defaultParams = gtagCalls[0]?.[2] as Record<string, unknown>;
assert(defaultParams.analytics_storage === "denied", "default analytics_storage denied");
assert(defaultParams.ad_storage === "denied", "default ad_storage denied");
assert(defaultParams.ad_user_data === "denied", "default ad_user_data denied");
assert(defaultParams.ad_personalization === "denied", "default ad_personalization denied");
assert(!gtagCalls.some((c) => c[0] === "config"), "config is not sent before script onload");
assert(injectGtagOnce(null) === false, "absent consent does not inject gtag a second time");
assert(
  injectGtagIfAllowed(buildConsentPreferences({ analytics: false, marketing: true })) === false,
  "gtag is not injected a second time after a later preference",
);
assert(
  injectTikTokIfAllowed(buildConsentPreferences({ analytics: true, marketing: false })) === false,
  "TikTok is not injected without marketing",
);
assert(
  injectTikTokIfAllowed(buildConsentPreferences({ analytics: false, marketing: true })) === true,
  "TikTok injects after marketing grant",
);
assert(createdScripts.some((s) => s.src.includes(TIKTOK_HOST)), "TikTok host is analytics.tiktok.com");
assert(createdScripts.filter((s) => s.src.includes(GTAG_HOST)).length === 1, "TikTok inject does not duplicate gtag");

localStorage.clear();
applyConsentPreferences({ analytics: false, marketing: true });
assert(!hasAnalyticsConsent(), "marketing-only has no analytics consent");
assert(hasMarketingConsent(), "marketing-only has marketing consent");
captureAttribution();
assert(!localStorage.getItem("quickexit_attribution"), "marketing-only stores no analytics UTM");
resetFunnelOnceGateForTests();
gtagCalls.length = 0;
assert(
  trackFunnelEvent("publish_page_view", { locale: "ro", funnel_source: "publish_form" }) === true,
  "marketing-only allows cookieless funnel",
);
assert(
  gtagCalls.filter((c) => c[0] === "event").length === 0,
  "cookieless events stay queued until gtag config onload",
);

applyConsentPreferences({ analytics: true, marketing: false });
resetFunnelOnceGateForTests();
gtagCalls.length = 0;
ttqCalls.length = 0;
assert(
  trackFunnelEvent("listing_started", { locale: "ro", funnel_source: "publish_form" }) === true,
  "analytics-only allows funnel",
);
assert(
  gtagCalls.filter((c) => c[0] === "event").length === 0,
  "events stay queued until gtag config onload",
);
assert(typeof lastGtagOnload === "function", "gtag script onload is registered");
(lastGtagOnload as () => void)();
const onloadConfigIdx = gtagCalls.findIndex((c) => c[0] === "config");
const onloadEventIdx = gtagCalls.findIndex((c) => c[0] === "event");
assert(onloadConfigIdx >= 0, "config runs on gtag onload");
assert(onloadConfigIdx < onloadEventIdx, "consent/config precede queued events");
assert(
  gtagCalls.some(
    (c) =>
      c[0] === "consent" &&
      c[1] === "update" &&
      (c[2] as { analytics_storage?: string }).analytics_storage === "granted",
  ),
  "onload applies the current analytics grant, not the inject-time denial",
);
assert(gtagCalls.some((c) => c[0] === "event" && c[1] === "listing_started"), "analytics-only sends GA4");
const listingStarted = gtagCalls.find((c) => c[0] === "event" && c[1] === "listing_started")?.[2] as
  | Record<string, unknown>
  | undefined;
assert(listingStarted?.funnel_source === "publish_form", "analytics-only payload uses funnel_source");
assert(!("source" in (listingStarted ?? {})), "analytics-only payload has no reserved source");
trackEvent("view_listing", { category: "auto" });
assert(ttqCalls.length === 0, "analytics-only sends no TikTok events");

const layout = readFileSync("app/[locale]/layout.tsx", "utf8");
assert(!layout.includes("googletagmanager.com"), "layout has no gtag.js");
assert(!layout.includes("analytics.tiktok.com"), "layout has no TikTok pixel");
assert(!layout.includes("next/script"), "layout does not import Script for tags");

const banner = readFileSync("app/components/ConsentBanner.tsx", "utf8");
assert(banner.includes("acceptAll"), "accept all action");
assert(banner.includes("rejectOptional"), "reject optional action");
assert(banner.includes("openPreferences"), "customize action");
assert(banner.includes('type="checkbox"'), "preference toggles");

const ro = JSON.parse(readFileSync("messages/ro.json", "utf8")) as {
  Consent: Record<string, string>;
  CookiesPolicy: Record<string, string>;
  Footer: { legal: { cookieSettings: string } };
};
const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
  Consent: Record<string, string>;
  CookiesPolicy: Record<string, string>;
  Footer: { legal: { cookieSettings: string } };
};
assert(ro.Consent.bannerTitle === "Confidențialitatea ta contează", "RO banner title");
assert(ro.Consent.acceptAll === "Acceptă toate", "RO accept");
assert(ro.Consent.rejectOptional === "Respinge opționale", "RO reject");
assert(ro.Consent.customize === "Personalizează", "RO customize");
assert(en.Consent.bannerTitle === "Your privacy matters", "EN banner title");
assert(en.Consent.acceptAll === "Accept all", "EN accept");
assert(en.Consent.rejectOptional === "Reject optional", "EN reject");
assert(en.Consent.customize === "Customize", "EN customize");
assert(ro.Footer.legal.cookieSettings === "Setări cookies", "RO footer control");
assert(en.Footer.legal.cookieSettings === "Cookie settings", "EN footer control");
assert(ro.CookiesPolicy.disclaimer.includes("Nu este o certificare legală"), "RO no legal certification claim");
assert(en.CookiesPolicy.disclaimer.includes("not a legal certification"), "EN no legal certification claim");
assert(ro.CookiesPolicy.necessaryBody.includes("24"), "RO necessary retention");
assert(en.CookiesPolicy.marketingBody.includes("TikTok Pixel"), "EN marketing describes TikTok");
assert(en.CookiesPolicy.marketingBody.includes("AW-"), "EN marketing discloses no AW- tag");
assert(en.CookiesPolicy.marketingBody.includes("GA4 linked to Google Ads"), "EN marketing explains GA4→Ads measurement");
assert(en.Consent.bannerBody.includes("Google Ads conversion measurement through GA4"), "EN banner explains Ads measurement");
assert(en.Consent.marketingHelp.includes("GA4 linked to Google Ads"), "EN marketing help explains GA4→Ads");
assert(en.CookiesPolicy.analyticsBody.includes("do not claim this data is anonymous"), "EN does not claim anonymous data");
assert(en.CookiesPolicy.changeBody.includes("TikTok was already loaded"), "EN change copy reloads only for TikTok");
assert(ro.CookiesPolicy.marketingBody.includes("TikTok Pixel"), "RO marketing describes TikTok");
assert(ro.CookiesPolicy.marketingBody.includes("AW-"), "RO marketing discloses no AW- tag");
assert(ro.CookiesPolicy.marketingBody.includes("GA4 conectat la Google Ads"), "RO marketing explains GA4→Ads measurement");
assert(ro.Consent.bannerBody.includes("măsurarea conversiilor Google Ads prin GA4"), "RO banner explains Ads measurement");
assert(ro.CookiesPolicy.analyticsBody.includes("Nu pretindem că datele sunt anonime"), "RO does not claim anonymous data");
assert(ro.CookiesPolicy.changeBody.includes("doar dacă TikTok"), "RO change copy reloads only for TikTok");

cookieJar.set("_ga", "GA1.1.test");
cookieJar.set("_ga_G-8LLK172SCX", "GS1.1.test");
cookieJar.set("_gid", "GA1.1.test");
cookieJar.set("_gcl_au", "1.1.test");
cookieJar.set("_ttp", "tiktok-ttp");
cookieJar.set("_tt_enable_cookie", "1");
cookieJar.set("tt_pixel", "1");
localStorage.setItem("_ga", "google-storage");
localStorage.setItem("_ga_G-8LLK172SCX", "google-storage-id");
sessionStorage.setItem("tt_sessionId", "pixel");
sessionStorage.setItem("tt_appInfo", "pixel");
sessionStorage.setItem("_tt_enable_cookie", "1");
sessionStorage.setItem("quickExitListingDraft", '{"keep":"draft"}');
localStorage.setItem("unrelated_app_key", "keep");
applyConsentPreferences({ analytics: false, marketing: false });
assert(!cookieJar.has("_ga"), "revoke clears first-party _ga cookie");
assert(!cookieJar.has("_ga_G-8LLK172SCX"), "revoke clears first-party _ga_* cookie");
assert(!cookieJar.has("_gid"), "revoke clears first-party _gid cookie");
assert(!cookieJar.has("_gcl_au"), "revoke clears first-party _gcl_* cookie");
assert(!cookieJar.has("_ttp"), "revoke clears first-party _ttp cookie");
assert(!cookieJar.has("_tt_enable_cookie"), "revoke clears first-party _tt_enable_cookie");
assert(!cookieJar.has("tt_pixel"), "revoke clears first-party tt_* cookie");
assert(!localStorage.getItem("_ga"), "revoke clears first-party Google storage");
assert(!localStorage.getItem("_ga_G-8LLK172SCX"), "revoke clears first-party _ga_* storage");
assert(!sessionStorage.getItem("tt_sessionId"), "first-party TikTok session keys are removed");
assert(!sessionStorage.getItem("tt_appInfo"), "tt_appInfo is removed");
assert(!sessionStorage.getItem("_tt_enable_cookie"), "_tt_enable_cookie storage is removed");
assert(sessionStorage.getItem("quickExitListingDraft") === '{"keep":"draft"}', "revoke does not clear listing draft");
assert(localStorage.getItem("unrelated_app_key") === "keep", "revoke does not clear unrelated storage");

const footer = readFileSync("app/components/Footer.tsx", "utf8");
assert(footer.includes("cookieSettings"), "footer exposes cookie settings without redesign");

const stripeCheckout = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
const stripeWebhook = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
assert(stripeCheckout.includes("export async function POST"), "checkout API untouched structurally");
assert(stripeWebhook.includes("export async function POST"), "webhook API still present");

console.log("OK consent-tags");
