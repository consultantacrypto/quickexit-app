import { readFileSync } from "node:fs";
import {
  resetConsentedPageViewGateForTests,
  revokeAnalyticsConsent,
  sanitizePageViewPath,
  setAnalyticsConsent,
  trackConsentedPageView,
} from "../lib/analytics";
import { applyConsentTags } from "../lib/consentTags";
import { readConsentPreferences } from "../lib/consentPreferences";

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
const localStorage = memoryStorage();
const sessionStorage = memoryStorage();
let cookieStore = "";

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
    localStorage,
    sessionStorage,
    location: {
      href: "http://localhost:3000/ro?utm_source=google&email=x@y.com&gclid=CLICKID",
      pathname: "/ro",
      search: "?utm_source=google&email=x@y.com&gclid=CLICKID",
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

function pageViewEvents(): unknown[][] {
  return gtagCalls.filter((call) => call[0] === "event" && call[1] === "page_view");
}

function pageViewPaths(): string[] {
  return pageViewEvents().map((call) => {
    const params = call[2] as { page_path?: string } | undefined;
    return String(params?.page_path ?? "");
  });
}

resetConsentedPageViewGateForTests();

assert(sanitizePageViewPath("/ro/pune-anunt") === "/ro/pune-anunt", "safe pathname kept");
assert(sanitizePageViewPath("/ro?email=x@y.com&gclid=CLICK") === "/ro", "query is stripped");
assert(sanitizePageViewPath("/ro#gclid=CLICK") === "/ro", "hash is stripped");
assert(sanitizePageViewPath("/ro/user@host") === undefined, "email-like path rejected");
assert(sanitizePageViewPath("ro/pune-anunt") === undefined, "relative path rejected");
assert(
  sanitizePageViewPath("/ro/gclid-landing") === undefined,
  "click-id token in path rejected",
);

assert(trackConsentedPageView("/ro") === false, "absent consent does not send");
assert(pageViewEvents().length === 0, "absent consent has no page_view");

setAnalyticsConsent("denied");
assert(trackConsentedPageView("/ro") === false, "denied consent does not send");
assert(pageViewEvents().length === 0, "denied consent has no page_view");

setAnalyticsConsent("granted");
applyConsentTags(readConsentPreferences());
gtagCalls.length = 0;
resetConsentedPageViewGateForTests();

assert(trackConsentedPageView("/ro") === true, "accept sends current page_view");
assert(pageViewEvents().length === 1, "accept sends exactly one page_view");
assert(pageViewPaths()[0] === "/ro", "accept page_view uses current path");
const acceptPayload = pageViewEvents()[0]?.[2] as Record<string, unknown> | undefined;
assert(acceptPayload?.page_path === "/ro", "payload has page_path");
assert(!("gclid" in (acceptPayload ?? {})), "page_view has no gclid");
assert(!("email" in (acceptPayload ?? {})), "page_view has no email");
assert(!String(JSON.stringify(acceptPayload)).includes("@"), "page_view has no PII marker");
assert(
  !("page_location" in (acceptPayload ?? {})),
  "page_view omits full URL that could carry query PII",
);

assert(trackConsentedPageView("/ro") === false, "same-route rerender is suppressed");
assert(pageViewEvents().length === 1, "same-route rerender does not duplicate page_view");
assert(trackConsentedPageView("/ro") === false, "Strict Mode remount does not duplicate");
assert(pageViewEvents().length === 1, "Strict Mode remount keeps a single page_view");

assert(trackConsentedPageView("/ro/anunturi") === false, "internal navigation does not send");
assert(pageViewEvents().length === 1, "internal navigation keeps a single explicit page_view");
assert(pageViewPaths()[0] === "/ro", "internal navigation does not replace the grant path");
assert(trackConsentedPageView("/ro/tarife") === false, "later client route does not send");
assert(pageViewEvents().length === 1, "later client route does not add page_view");

revokeAnalyticsConsent();
const afterRevoke = pageViewEvents().length;
assert(trackConsentedPageView("/ro/evaluare") === false, "revoked consent blocks page_view");
assert(trackConsentedPageView("/ro/capital-disponibil") === false, "post-revoke navigation is blocked");
assert(pageViewEvents().length === afterRevoke, "revoked navigations send no page_view");

setAnalyticsConsent("granted");
applyConsentTags(readConsentPreferences());
assert(trackConsentedPageView("/ro/anunturi") === true, "re-grant sends current page_view");
assert(pageViewEvents().length === afterRevoke + 1, "re-grant sends exactly one page_view");
assert(pageViewPaths()[afterRevoke] === "/ro/anunturi", "re-grant page_view uses current path");
assert(trackConsentedPageView("/ro/anunturi") === false, "re-grant remount does not duplicate");
assert(trackConsentedPageView("/ro") === false, "post-regrant navigation does not send");
assert(pageViewEvents().length === afterRevoke + 1, "post-regrant navigation stays at one page_view");

const consentTags = readFileSync("lib/consentTags.ts", "utf8");
assert(
  consentTags.includes("send_page_view: false"),
  "gtag config keeps send_page_view false",
);

const tracker = readFileSync("app/components/ConsentedPageViewTracker.tsx", "utf8");
assert(tracker.includes('from "next/navigation"'), "tracker uses App Router pathname");
assert(tracker.includes("usePathname"), "tracker listens to App Router navigation");
assert(tracker.includes("trackConsentedPageView(pathname)"), "tracker sends consented page_view");
assert(tracker.includes("preferences?.analytics !== true"), "tracker requires analytics grant");
assert(
  tracker.includes("trackConsentedPageView();"),
  "tracker rearms the consent-cycle gate on revoke",
);
assert(!tracker.includes("pageview("), "tracker does not use gtag config pageview helper");
assert(!tracker.includes("ttq"), "tracker does not touch TikTok");
assert(!tracker.includes("@vercel/analytics"), "tracker does not add Vercel Analytics");

const layout = readFileSync("app/[locale]/layout.tsx", "utf8");
assert(layout.includes("ConsentedPageViewTracker"), "layout mounts the page_view tracker");
assert(!layout.includes("googletagmanager.com"), "layout still does not load gtag.js");
assert(!layout.includes("analytics.tiktok.com"), "layout still does not load TikTok");
assert(!layout.includes("@vercel/analytics"), "layout does not add Vercel Analytics");

const analytics = readFileSync("lib/analytics.ts", "utf8");
assert(analytics.includes("trackConsentedPageView"), "consented page_view helper exists");
assert(analytics.includes('dispatchGtagEvent(') && analytics.includes('"page_view"'), "helper dispatches GA4 page_view");
assert(analytics.includes("consentedPageViewSentThisCycle"), "helper uses a per-consent-cycle gate");
assert(!analytics.includes("lastConsentedPageViewPath"), "helper does not dedupe by last pathname");
assert(!analytics.includes('eventName: "purchase"'), "helper does not add purchase");

console.log("OK consented-page-view");
