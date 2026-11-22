import { LISTING_TRAFFIC_UTM_KEYS, sanitizeListingUtmValue, type ListingTrafficUtm } from "./listingTraffic";
import { readOrCreateVisitSessionId } from "./listingTrafficSession";
import { parseWalletCatalogPath } from "./walletAffiliateTraffic";

const SENT_KEY = "quickexit_wallet_affiliate_sent";
const DEDUP_MS = 10 * 60 * 1000;

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function browserStore(): KeyValueStore | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "";
}

function utmFromSearch(search: string): ListingTrafficUtm {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const utm: ListingTrafficUtm = {};
  for (const key of LISTING_TRAFFIC_UTM_KEYS) {
    const value = sanitizeListingUtmValue(params.get(key));
    if (value) utm[key] = value;
  }
  return utm;
}

function wasSent(store: KeyValueStore, key: string, now: number): boolean {
  try {
    const raw = store.getItem(SENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const at = (parsed as Record<string, unknown>)[key];
    return typeof at === "number" && now - at < DEDUP_MS;
  } catch {
    return false;
  }
}

function markSent(store: KeyValueStore, key: string, now: number): void {
  try {
    const raw = store.getItem(SENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    const next =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? { ...(parsed as Record<string, number>) }
        : {};
    next[key] = now;
    store.setItem(SENT_KEY, JSON.stringify(next));
  } catch {
    // measurement must not break the click
  }
}

function send(body: Record<string, string | null>): void {
  const payload = JSON.stringify(body);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/traffic/wallet-click", blob)) return;
    }
  } catch {
    // fall through to fetch
  }
  void fetch("/api/traffic/wallet-click", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: payload,
  }).catch(() => {
    // measurement must never surface to the page
  });
}

function utmFields(utm: ListingTrafficUtm): Record<string, string | null> {
  return {
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    utm_content: utm.utm_content ?? null,
    utm_term: utm.utm_term ?? null,
  };
}

export function reportWalletPageview(): void {
  try {
    const store = browserStore();
    if (!store || typeof window === "undefined") return;
    const path = parseWalletCatalogPath(window.location.pathname);
    if (!path) return;
    const sessionId = readOrCreateVisitSessionId(store, createSessionId);
    if (!sessionId) return;
    const now = Date.now();
    const dedupKey = `pageview:${path}`;
    if (wasSent(store, dedupKey, now)) return;
    markSent(store, dedupKey, now);
    const utm = utmFromSearch(window.location.search || "");
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    send({
      event_type: "pageview",
      session_id: sessionId,
      path,
      brand: null,
      product_slug: null,
      ...utmFields(utm),
      referrer: referrer || null,
    });
  } catch {
    // never block rendering
  }
}

export function reportWalletClick(input: { brandSlug: string; slug: string }): void {
  try {
    const store = browserStore();
    if (!store || typeof window === "undefined") return;
    const path = parseWalletCatalogPath(window.location.pathname);
    if (!path) return;
    const sessionId = readOrCreateVisitSessionId(store, createSessionId);
    if (!sessionId) return;
    const now = Date.now();
    const dedupKey = `click:${path}:${input.brandSlug}:${input.slug}`;
    if (wasSent(store, dedupKey, now)) return;
    markSent(store, dedupKey, now);
    const utm = utmFromSearch(window.location.search || "");
    send({
      event_type: "click",
      session_id: sessionId,
      path,
      brand: input.brandSlug,
      product_slug: input.slug,
      ...utmFields(utm),
      referrer: null,
    });
  } catch {
    // never block the outbound link
  }
}
