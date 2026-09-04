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
    querySelector(selector: string) {
      if (selector.includes("gtag")) {
        return createdScripts.some((s) => s.attrs["data-qe-tag"] === "gtag")
          ? createdScripts[0]
          : null;
      }
      if (selector.includes("tiktok")) {
        return createdScripts.some((s) => s.attrs["data-qe-tag"] === "tiktok")
          ? createdScripts[0]
          : null;
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

const modeMarketing = googleConsentUpdateFromPreferences(
  buildConsentPreferences({ analytics: false, marketing: true }),
);
assert(modeMarketing.analytics_storage === "denied", "marketing-only keeps analytics_storage denied");
assert(modeMarketing.ad_storage === "granted", "ad_storage granted only with marketing");

createdScripts.length = 0;
assert(
  injectGtagIfAllowed(buildConsentPreferences({ analytics: false, marketing: true })) === false,
  "gtag is not injected without analytics",
);
assert(createdScripts.length === 0, "no gtag script without analytics");
assert(
  injectTikTokIfAllowed(buildConsentPreferences({ analytics: true, marketing: false })) === false,
  "TikTok is not injected without marketing",
);

assert(
  injectGtagIfAllowed(buildConsentPreferences({ analytics: true, marketing: false })) === true,
  "gtag injects after analytics grant",
);
assert(createdScripts.some((s) => s.src.includes(GTAG_HOST)), "gtag.js host is googletagmanager");

createdScripts.length = 0;
assert(
  injectTikTokIfAllowed(buildConsentPreferences({ analytics: false, marketing: true })) === true,
  "TikTok injects after marketing grant",
);
assert(createdScripts.some((s) => s.src.includes(TIKTOK_HOST)), "TikTok host is analytics.tiktok.com");

localStorage.clear();
applyConsentPreferences({ analytics: false, marketing: true });
assert(!hasAnalyticsConsent(), "marketing-only has no analytics consent");
assert(hasMarketingConsent(), "marketing-only has marketing consent");
captureAttribution();
assert(!localStorage.getItem("quickexit_attribution"), "marketing-only stores no analytics UTM");
resetFunnelOnceGateForTests();
gtagCalls.length = 0;
assert(trackFunnelEvent("publish_page_view", { locale: "ro", source: "publish_form" }) === false, "marketing-only blocks funnel");
assert(gtagCalls.filter((c) => c[0] === "event").length === 0, "marketing-only sends no GA4 events");

applyConsentPreferences({ analytics: true, marketing: false });
resetFunnelOnceGateForTests();
gtagCalls.length = 0;
ttqCalls.length = 0;
assert(trackFunnelEvent("listing_started", { locale: "ro", source: "publish_form" }) === true, "analytics-only allows funnel");
assert(
  gtagCalls.filter((c) => c[0] === "event").length === 0,
  "events stay queued until gtag config onload",
);
assert(typeof lastGtagOnload === "function", "gtag script onload is registered");
(lastGtagOnload as () => void)();
assert(gtagCalls.some((c) => c[0] === "event" && c[1] === "listing_started"), "analytics-only sends GA4");
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
assert(ro.CookiesPolicy.marketingBody.includes("TikTok Pixel"), "RO marketing describes TikTok");
assert(ro.CookiesPolicy.marketingBody.includes("AW-"), "RO marketing discloses no AW- tag");

sessionStorage.setItem("tt_sessionId", "pixel");
sessionStorage.setItem("tt_appInfo", "pixel");
sessionStorage.setItem("quickExitListingDraft", '{"keep":"draft"}');
localStorage.setItem("unrelated_app_key", "keep");
applyConsentPreferences({ analytics: false, marketing: false });
assert(!sessionStorage.getItem("tt_sessionId"), "first-party TikTok session keys are removed");
assert(!sessionStorage.getItem("tt_appInfo"), "tt_appInfo is removed");
assert(sessionStorage.getItem("quickExitListingDraft") === '{"keep":"draft"}', "revoke does not clear listing draft");
assert(localStorage.getItem("unrelated_app_key") === "keep", "revoke does not clear unrelated storage");

const footer = readFileSync("app/components/Footer.tsx", "utf8");
assert(footer.includes("cookieSettings"), "footer exposes cookie settings without redesign");

const stripeCheckout = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
const stripeWebhook = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
assert(stripeCheckout.includes("export async function POST"), "checkout API untouched structurally");
assert(stripeWebhook.includes("export async function POST"), "webhook API still present");

console.log("OK consent-tags");
