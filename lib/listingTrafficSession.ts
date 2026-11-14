import {
  LISTING_TRAFFIC_DEDUP_MS,
  LISTING_TRAFFIC_UTM_KEYS,
  hasListingUtm,
  isVisitSessionId,
  sanitizeListingUtmValue,
  type ListingTrafficConversion,
  type ListingTrafficEventType,
  type ListingTrafficUtm,
} from "@/lib/listingTraffic";

export const VISIT_SESSION_STORAGE_KEY = "quickexit_visit_session";
export const VISIT_UTM_STORAGE_KEY = "quickexit_visit_utm";
export const VISIT_SENT_STORAGE_KEY = "quickexit_visit_sent";

type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function browserSessionStore(): KeyValueStore | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readOrCreateVisitSessionId(
  store: KeyValueStore,
  createId: () => string,
): string | null {
  try {
    const existing = store.getItem(VISIT_SESSION_STORAGE_KEY);
    if (isVisitSessionId(existing)) return existing;
    const next = createId();
    if (!isVisitSessionId(next)) return null;
    store.setItem(VISIT_SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function readVisitUtmFromStore(store: KeyValueStore): ListingTrafficUtm {
  try {
    const raw = store.getItem(VISIT_UTM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const source = parsed as Record<string, unknown>;
    const utm: ListingTrafficUtm = {};
    for (const key of LISTING_TRAFFIC_UTM_KEYS) {
      const value = sanitizeListingUtmValue(source[key]);
      if (value) utm[key] = value;
    }
    return utm;
  } catch {
    return {};
  }
}

/** First-touch within the tab. Existing keys are kept. */
export function rememberVisitUtm(store: KeyValueStore, incoming: ListingTrafficUtm): void {
  try {
    const existing = readVisitUtmFromStore(store);
    const next: ListingTrafficUtm = { ...existing };
    let changed = false;
    for (const key of LISTING_TRAFFIC_UTM_KEYS) {
      if (next[key]) continue;
      const value = sanitizeListingUtmValue(incoming[key]);
      if (!value) continue;
      next[key] = value;
      changed = true;
    }
    if (!changed || !hasListingUtm(next)) return;
    const stored: ListingTrafficUtm = {};
    for (const key of LISTING_TRAFFIC_UTM_KEYS) {
      if (next[key]) stored[key] = next[key];
    }
    store.setItem(VISIT_UTM_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // session attribution is best-effort
  }
}

export function readVisitSessionUtm(): ListingTrafficUtm {
  const store = browserSessionStore();
  if (!store) return {};
  return readVisitUtmFromStore(store);
}

function sentKey(
  eventType: ListingTrafficEventType,
  path: string,
  conversion: ListingTrafficConversion | null,
): string {
  return `${eventType}|${conversion ?? ""}|${path}`;
}

function readSentMap(store: KeyValueStore): Record<string, number> {
  try {
    const raw = store.getItem(VISIT_SENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function wasVisitSentRecently(
  store: KeyValueStore,
  eventType: ListingTrafficEventType,
  path: string,
  conversion: ListingTrafficConversion | null,
  now: number,
): boolean {
  const at = readSentMap(store)[sentKey(eventType, path, conversion)];
  return typeof at === "number" && now - at < LISTING_TRAFFIC_DEDUP_MS;
}

export function markVisitSent(
  store: KeyValueStore,
  eventType: ListingTrafficEventType,
  path: string,
  conversion: ListingTrafficConversion | null,
  now: number,
): void {
  try {
    const map = readSentMap(store);
    map[sentKey(eventType, path, conversion)] = now;
    const fresh: Record<string, number> = {};
    for (const [key, at] of Object.entries(map)) {
      if (now - at < LISTING_TRAFFIC_DEDUP_MS) fresh[key] = at;
    }
    store.setItem(VISIT_SENT_STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // duplicate protection is also enforced on the server
  }
}
