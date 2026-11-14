import {
  LISTING_TRAFFIC_UTM_KEYS,
  hasListingUtm,
  parseListingPath,
  sanitizeListingUtmValue,
  type ListingTrafficConversion,
  type ListingTrafficUtm,
} from "@/lib/listingTraffic";
import {
  markVisitSent,
  readOrCreateVisitSessionId,
  readVisitUtmFromStore,
  rememberVisitUtm,
  wasVisitSentRecently,
} from "@/lib/listingTrafficSession";

function browserStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
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

function mergedUtm(store: Storage, search: string): ListingTrafficUtm {
  const urlUtm = utmFromSearch(search);
  const stored = readVisitUtmFromStore(store);
  const utm: ListingTrafficUtm = {};
  for (const key of LISTING_TRAFFIC_UTM_KEYS) {
    const value = urlUtm[key] || stored[key];
    if (value) utm[key] = value;
  }
  return utm;
}

function sendListingTraffic(body: Record<string, string | null>): void {
  void fetch("/api/traffic/listing-visit", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    // measurement must never surface to the page
  });
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "";
}

export function reportListingPageview(): void {
  try {
    const store = browserStore();
    if (!store || typeof window === "undefined") return;
    const utm = utmFromSearch(window.location.search || "");
    if (!hasListingUtm(utm)) return;
    const listing = parseListingPath(window.location.pathname);
    if (!listing) return;
    rememberVisitUtm(store, utm);
    const sessionId = readOrCreateVisitSessionId(store, createSessionId);
    if (!sessionId) return;
    const now = Date.now();
    if (wasVisitSentRecently(store, "pageview", listing.path, null, now)) return;
    markVisitSent(store, "pageview", listing.path, null, now);
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    sendListingTraffic({
      event_type: "pageview",
      conversion: null,
      session_id: sessionId,
      path: listing.path,
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
      utm_content: utm.utm_content ?? null,
      utm_term: utm.utm_term ?? null,
      referrer: referrer || null,
    });
  } catch {
    // never block rendering
  }
}

export function reportListingTrafficLead(conversion: ListingTrafficConversion): void {
  try {
    const store = browserStore();
    if (!store || typeof window === "undefined") return;
    const listing = parseListingPath(window.location.pathname);
    if (!listing) return;
    const utm = mergedUtm(store, window.location.search || "");
    if (!hasListingUtm(utm)) return;
    const sessionId = readOrCreateVisitSessionId(store, createSessionId);
    if (!sessionId) return;
    const now = Date.now();
    if (wasVisitSentRecently(store, "lead", listing.path, conversion, now)) return;
    markVisitSent(store, "lead", listing.path, conversion, now);
    sendListingTraffic({
      event_type: "lead",
      conversion,
      session_id: sessionId,
      path: listing.path,
      utm_source: utm.utm_source ?? null,
      utm_medium: utm.utm_medium ?? null,
      utm_campaign: utm.utm_campaign ?? null,
      utm_content: utm.utm_content ?? null,
      utm_term: utm.utm_term ?? null,
      referrer: null,
    });
  } catch {
    // never block the form result
  }
}
