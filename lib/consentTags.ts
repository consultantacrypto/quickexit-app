import {
  GA_MEASUREMENT_ID,
  TIKTOK_PIXEL_ID,
} from "@/lib/analytics";
import {
  googleConsentUpdateFromPreferences,
  type ConsentPreferences,
} from "@/lib/consentPreferences";

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
  const payload = GA_MEASUREMENT_ID ? { ...params, send_to: GA_MEASUREMENT_ID } : params;
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
  const gtagLoaded = gtagScriptIsPresent();
  const tiktokLoaded = tiktokScriptIsPresent();
  if (previous?.analytics && !next.analytics && gtagLoaded) return true;
  if (previous?.marketing && !next.marketing && tiktokLoaded) return true;
  return false;
}

export function applyGoogleConsentUpdate(prefs: ConsentPreferences | null): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  try {
    window.gtag("consent", "update", googleConsentUpdateFromPreferences(prefs));
  } catch {
    // never crash the app
  }
}

function isFirstPartyTikTokStorageKey(key: string): boolean {
  if (/^(quickexit|quickExit)/i.test(key)) return false;
  return /^tt_/i.test(key) || /^_tt/i.test(key) || /tiktok/i.test(key);
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
  if (typeof document === "undefined" || typeof window === "undefined") return;
  let raw = "";
  try {
    raw = document.cookie || "";
  } catch {
    raw = "";
  }
  const names = raw
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => /^_tt/i.test(name));
  const host = window.location.hostname;
  const expire = "Thu, 01 Jan 1970 00:00:00 GMT";
  for (const name of names) {
    const variants = [
      `${name}=; expires=${expire}; path=/; Max-Age=0`,
      `${name}=; expires=${expire}; path=/; Max-Age=0; domain=${host}`,
      `${name}=; expires=${expire}; path=/; Max-Age=0; SameSite=Lax`,
    ];
    if (host && host !== "localhost") {
      variants.push(`${name}=; expires=${expire}; path=/; Max-Age=0; domain=.${host}`);
    }
    for (const cookie of variants) {
      try {
        document.cookie = cookie;
      } catch {
        // ignore
      }
    }
  }
  clearFirstPartyTikTokStorage();
}

export function injectGtagIfAllowed(prefs: ConsentPreferences): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (!prefs.analytics) return false;
  if (!GA_MEASUREMENT_ID) return false;
  if (typeof document.createElement !== "function") {
    ensureGtagStub();
    applyGoogleConsentUpdate(prefs);
    markGtagConfigReady();
    return false;
  }
  if (gtagScriptIsPresent()) {
    applyGoogleConsentUpdate(prefs);
    // The script tag can exist before gtag.js onload has run config.
    // Marking ready here flushed events into dataLayer before `config`,
    // and gtag dropped them (no /g/collect).
    return false;
  }

  ensureGtagStub();
  window.gtag?.("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
  applyGoogleConsentUpdate(prefs);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://${GTAG_HOST}/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.setAttribute(GTAG_SCRIPT_ATTR, GTAG_SCRIPT_VALUE);
  script.onload = () => {
    try {
      window.gtag?.("js", new Date());
      applyGoogleConsentUpdate(prefs);
      window.gtag?.("config", GA_MEASUREMENT_ID, { send_page_view: false });
      markGtagConfigReady();
    } catch {
      markGtagConfigReady();
    }
  };
  document.head.appendChild(script);
  return true;
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

export function applyConsentTags(prefs: ConsentPreferences): void {
  if (prefs.analytics) {
    injectGtagIfAllowed(prefs);
  } else {
    applyGoogleConsentUpdate(prefs);
  }
  if (prefs.marketing) {
    injectTikTokIfAllowed(prefs);
  } else if (typeof window !== "undefined") {
    try {
      window.ttq?.revokeConsent?.();
    } catch {
      // ignore
    }
    clearFirstPartyTikTokCookies();
  }
}

export function optionalTagHosts(): string[] {
  return [GTAG_HOST, "www.google-analytics.com", "google-analytics.com", TIKTOK_HOST, "analytics.tiktok.com"];
}
