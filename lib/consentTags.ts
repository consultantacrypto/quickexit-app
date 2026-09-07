import {
  GA_MEASUREMENT_ID,
  TIKTOK_PIXEL_ID,
} from "@/lib/analytics";
import { stripReservedAnalyticsParams } from "@/lib/analyticsParams";
import {
  googleConsentUpdateFromPreferences,
  readConsentPreferences,
  type ConsentPreferences,
} from "@/lib/consentPreferences";
import {
  buildTrackingCookieExpiryAssignments,
  isAnalyticsTrackingCookieName,
  isAnalyticsTrackingStorageKey,
  isGoogleAdsClickCookieName,
  isMarketingTrackingStorageKey,
  isTikTokTrackingCookieName,
  readDocumentCookieNames,
} from "@/lib/consentCookieCleanup";

export const GTAG_SCRIPT_ATTR = "data-qe-tag";
export const GTAG_SCRIPT_VALUE = "gtag";
export const TIKTOK_SCRIPT_VALUE = "tiktok";
export const GTAG_HOST = "www.googletagmanager.com";
export const TIKTOK_HOST = "analytics.tiktok.com";

type PendingGtagEvent = {
  name: string;
  params: Record<string, string | number | boolean | null | undefined>;
};

let gtagConfigReady = false;
const pendingGtagEvents: PendingGtagEvent[] = [];

function markGtagConfigReady(): void {
  gtagConfigReady = true;
  const queued = pendingGtagEvents.splice(0);
  for (const item of queued) {
    try {
      window.gtag?.("event", item.name, item.params);
    } catch {
      // ignore
    }
  }
}

function ensureGtagStub(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === "function") return;
  // Official gtag signature uses Arguments, not a rest-parameter Array.
  // Consent Mode ICS ignores Array payloads (usedDefault stays false).
  window.gtag = function gtagStub() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
}

export function dispatchGtagEvent(
  name: string,
  params: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  const clean = stripReservedAnalyticsParams(params);
  const payload = GA_MEASUREMENT_ID ? { ...clean, send_to: GA_MEASUREMENT_ID } : clean;
  if (!gtagConfigReady) {
    pendingGtagEvents.push({ name, params: payload });
    return;
  }
  window.gtag("event", name, payload);
}

export function gtagScriptIsPresent(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return Boolean(
      document.querySelector?.(`script[${GTAG_SCRIPT_ATTR}="${GTAG_SCRIPT_VALUE}"]`),
    );
  } catch {
    return false;
  }
}

export function tiktokScriptIsPresent(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return Boolean(
      document.querySelector?.(`script[${GTAG_SCRIPT_ATTR}="${TIKTOK_SCRIPT_VALUE}"]`),
    );
  } catch {
    return false;
  }
}

export function shouldReloadToUnloadTags(
  previous: ConsentPreferences | null,
  next: ConsentPreferences,
): boolean {
  const tiktokLoaded = tiktokScriptIsPresent();
  // Keep gtag.js loaded for Advanced Consent Mode cookieless pings.
  if (previous?.marketing && !next.marketing && tiktokLoaded) return true;
  return false;
}

let consentDefaultSent = false;

export function googleConsentDefaultWasSent(): boolean {
  return consentDefaultSent;
}

export function applyGoogleConsentUpdate(prefs: ConsentPreferences | null): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  try {
    const update = googleConsentUpdateFromPreferences(prefs);
    window.gtag("consent", "update", update);
    window.gtag("set", "ads_data_redaction", update.ad_storage === "denied");
  } catch {
    // never crash the app
  }
}

export function ensureGoogleConsentDefault(): void {
  if (typeof window === "undefined") return;
  ensureGtagStub();
  if (typeof window.gtag !== "function") return;
  if (consentDefaultSent) return;
  try {
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });
    window.gtag("set", "ads_data_redaction", true);
    consentDefaultSent = true;
  } catch {
    // never crash the app
  }
}

function expireMatchingCookies(predicate: (name: string) => boolean): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  let raw = "";
  try {
    raw = document.cookie || "";
  } catch {
    raw = "";
  }
  const names = readDocumentCookieNames(raw).filter(predicate);
  const host = window.location.hostname;
  for (const name of names) {
    for (const assignment of buildTrackingCookieExpiryAssignments(name, host)) {
      try {
        document.cookie = assignment;
      } catch {
        // ignore
      }
    }
  }
}

export function clearFirstPartyGoogleStorage(): void {
  if (typeof window === "undefined") return;
  try {
    clearStorageKeysMatching(window.localStorage, isAnalyticsTrackingStorageKey);
    clearStorageKeysMatching(window.sessionStorage, isAnalyticsTrackingStorageKey);
  } catch {
    // ignore
  }
}

/** First-party GA cookies (_ga, _ga_*, _gid) only. Cannot delete .google.com. */
export function clearFirstPartyGoogleCookies(): void {
  expireMatchingCookies(isAnalyticsTrackingCookieName);
  clearFirstPartyGoogleStorage();
}

function isFirstPartyTikTokStorageKey(key: string): boolean {
  return isMarketingTrackingStorageKey(key) && !isGoogleAdsClickCookieName(key);
}

function isFirstPartyTikTokCookieName(name: string): boolean {
  return isTikTokTrackingCookieName(name);
}

function clearFirstPartyGoogleAdsClickCookies(): void {
  expireMatchingCookies(isGoogleAdsClickCookieName);
  if (typeof window === "undefined") return;
  try {
    clearStorageKeysMatching(window.localStorage, isGoogleAdsClickCookieName);
    clearStorageKeysMatching(window.sessionStorage, isGoogleAdsClickCookieName);
  } catch {
    // ignore
  }
}

function clearStorageKeysMatching(
  storage: Storage | undefined,
  predicate: (key: string) => boolean,
): void {
  if (!storage) return;
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) keys.push(key);
    }
  } catch {
    return;
  }
  for (const key of keys) {
    if (!predicate(key)) continue;
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/** First-party origin storage written by the TikTok pixel. Cannot touch .tiktok.com. */
export function clearFirstPartyTikTokStorage(): void {
  if (typeof window === "undefined") return;
  try {
    clearStorageKeysMatching(window.localStorage, isFirstPartyTikTokStorageKey);
    clearStorageKeysMatching(window.sessionStorage, isFirstPartyTikTokStorageKey);
  } catch {
    // ignore
  }
}

/** First-party QuickExit/localhost cookies only. Cannot delete .tiktok.com cookies. */
export function clearFirstPartyTikTokCookies(): void {
  expireMatchingCookies(isFirstPartyTikTokCookieName);
  clearFirstPartyTikTokStorage();
}

export function injectGtagOnce(prefs: ConsentPreferences | null = null): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!GA_MEASUREMENT_ID) return false;
  ensureGoogleConsentDefault();
  if (typeof document.createElement !== "function") {
    applyGoogleConsentUpdate(prefs);
    markGtagConfigReady();
    return false;
  }
  if (gtagScriptIsPresent()) {
    applyGoogleConsentUpdate(prefs);
    return false;
  }

  applyGoogleConsentUpdate(prefs);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://${GTAG_HOST}/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.setAttribute(GTAG_SCRIPT_ATTR, GTAG_SCRIPT_VALUE);
  script.onload = () => {
    try {
      window.gtag?.("js", new Date());
      applyGoogleConsentUpdate(readConsentPreferences());
      window.gtag?.("config", GA_MEASUREMENT_ID, { send_page_view: false });
      markGtagConfigReady();
    } catch {
      markGtagConfigReady();
    }
  };
  document.head.appendChild(script);
  return true;
}

/** @deprecated use injectGtagOnce — gtag loads once for cookieless Consent Mode pings. */
export function injectGtagIfAllowed(prefs: ConsentPreferences): boolean {
  return injectGtagOnce(prefs);
}

export function injectTikTokIfAllowed(prefs: ConsentPreferences): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!prefs.marketing) return false;
  if (!TIKTOK_PIXEL_ID) return false;
  if (typeof document.createElement !== "function") return false;
  if (tiktokScriptIsPresent()) return false;

  type TikTokQueue = {
    methods: string[];
    setAndDefer: (target: TikTokQueue, method: string) => void;
    load?: (id: string) => void;
    page?: () => void;
    grantConsent?: () => void;
    _i?: Record<string, unknown[]>;
    _t?: Record<string, number>;
    _o?: Record<string, unknown>;
    _u?: string;
    [key: string]: unknown;
  };

  const w = window as Window & { TiktokAnalyticsObject?: string; ttq?: TikTokQueue };
  w.TiktokAnalyticsObject = "ttq";
  const existing = w.ttq;
  const ttq: TikTokQueue = existing ?? {
    methods: [],
    setAndDefer: () => undefined,
  };
  w.ttq = ttq;
  ttq.methods = [
    "page",
    "track",
    "identify",
    "instances",
    "debug",
    "on",
    "off",
    "once",
    "ready",
    "alias",
    "group",
    "enableCookie",
    "disableCookie",
    "holdConsent",
    "revokeConsent",
    "grantConsent",
  ];
  ttq.setAndDefer = function setAndDefer(target: TikTokQueue, method: string) {
    target[method] = function queued(...args: unknown[]) {
      const bucket = target as TikTokQueue & { push?: unknown[] };
      if (Array.isArray(bucket)) {
        bucket.push([method, ...args]);
        return;
      }
      if (!bucket.push) bucket.push = [];
      (bucket.push as unknown[]).push([method, ...args]);
    };
  };
  for (const method of ttq.methods) {
    ttq.setAndDefer(ttq, method);
  }
  ttq.load = function load(id: string) {
    ttq._i = ttq._i || {};
    ttq._i[id] = [];
    ttq._u = `https://${TIKTOK_HOST}/i18n/pixel/events.js`;
    ttq._t = ttq._t || {};
    ttq._t[id] = +new Date();
    ttq._o = ttq._o || {};
    const node = document.createElement("script");
    node.type = "text/javascript";
    node.async = true;
    node.src = `https://${TIKTOK_HOST}/i18n/pixel/events.js?sdkid=${id}&lib=ttq`;
    node.setAttribute(GTAG_SCRIPT_ATTR, TIKTOK_SCRIPT_VALUE);
    const first = document.getElementsByTagName("script")[0];
    if (first?.parentNode) {
      first.parentNode.insertBefore(node, first);
    } else {
      document.head.appendChild(node);
    }
  };

  ttq.load(TIKTOK_PIXEL_ID);
  if (typeof ttq.grantConsent === "function") ttq.grantConsent();
  if (typeof ttq.page === "function") ttq.page();
  return true;
}

export function clearDeniedCategoryTracking(prefs: ConsentPreferences | null): void {
  if (!prefs?.analytics) {
    clearFirstPartyGoogleCookies();
  }
  if (!prefs?.marketing) {
    clearFirstPartyGoogleAdsClickCookies();
    clearFirstPartyTikTokCookies();
  }
}

export function applyConsentTags(prefs: ConsentPreferences | null): void {
  injectGtagOnce(prefs);
  if (prefs?.marketing) {
    injectTikTokIfAllowed(prefs);
  } else if (typeof window !== "undefined") {
    try {
      window.ttq?.revokeConsent?.();
    } catch {
      // ignore
    }
  }
  // Re-run on every init so a prior revoke on www still clears .quickexit.ro cookies.
  clearDeniedCategoryTracking(prefs);
}

export function optionalTagHosts(): string[] {
  return [GTAG_HOST, "www.google-analytics.com", "google-analytics.com", TIKTOK_HOST, "analytics.tiktok.com"];
}
