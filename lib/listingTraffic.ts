/**
 * Anonymous listing-visit measurement. No IP, no email, no phone.
 * Pure helpers only — the route decides whether a write is allowed.
 */

export const LISTING_TRAFFIC_PRODUCTION_SUPABASE_HOST =
  "geywuzwbzecknokvnins.supabase.co";

export const LISTING_TRAFFIC_DEDUP_MS = 10 * 60 * 1000;
export const LISTING_TRAFFIC_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const LISTING_TRAFFIC_RATE_LIMIT_MAX = 30;
export const MAX_LISTING_TRAFFIC_BODY_BYTES = 2_048;
export const MAX_LISTING_TRAFFIC_UTM_LENGTH = 120;
export const MAX_LISTING_TRAFFIC_REFERRER_LENGTH = 200;

export const LISTING_TRAFFIC_UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type ListingTrafficUtmKey = (typeof LISTING_TRAFFIC_UTM_KEYS)[number];
export type ListingTrafficUtm = Partial<Record<ListingTrafficUtmKey, string>>;
export type ListingTrafficEventType = "pageview" | "lead";
export type ListingTrafficConversion = "offer" | "inquiry" | "financing";

export type ListingTrafficEvent = {
  eventType: ListingTrafficEventType;
  conversion: ListingTrafficConversion | null;
  sessionId: string;
  path: string;
  listingId: string;
  utm: ListingTrafficUtm;
  referrer: string | null;
};

export type ListingTrafficInsert = {
  event_type: ListingTrafficEventType;
  conversion: ListingTrafficConversion | null;
  session_id: string;
  path: string;
  listing_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
};

export type ListingTrafficStore = {
  findRecent(filter: {
    sessionId: string;
    path: string;
    eventType: ListingTrafficEventType;
    conversion: ListingTrafficConversion | null;
    sinceIso: string;
  }): Promise<{ found: boolean; error: boolean }>;
  insert(row: ListingTrafficInsert): Promise<{ error: boolean }>;
};

const SESSION_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LISTING_PATH_RE = /^\/(ro|en)\/anunt\/([A-Za-z0-9_-]{1,80})$/;
const UTM_VALUE_RE = /^[a-zA-Z0-9._\- ]+$/;
const CLICK_ID_RE = /gclid|fbclid|ttclid|msclkid|wbraid|gbraid|dclid|twclid/i;

type RateBucket = { count: number; resetAt: number };

export function isVisitSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_RE.test(value);
}

export function sanitizeListingUtmValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_LISTING_TRAFFIC_UTM_LENGTH);
  if (!trimmed) return undefined;
  if (trimmed.includes("@") || trimmed.includes("://")) return undefined;
  if (CLICK_ID_RE.test(trimmed)) return undefined;
  if (!UTM_VALUE_RE.test(trimmed)) return undefined;
  return trimmed;
}

export function sanitizeListingReferrer(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 1_000) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
  const safe = `${parsed.origin}${pathname}`.slice(0, MAX_LISTING_TRAFFIC_REFERRER_LENGTH);
  if (!safe || safe.includes("@")) return null;
  return safe;
}

export function parseListingPath(
  value: unknown,
): { path: string; listingId: string } | null {
  if (typeof value !== "string") return null;
  const path = value.trim().split("#")[0]?.split("?")[0] ?? "";
  if (!path || path.length > 160) return null;
  const match = LISTING_PATH_RE.exec(path);
  if (!match?.[1] || !match[2]) return null;
  return { path: `/${match[1]}/anunt/${match[2]}`, listingId: match[2] };
}

function readUtm(source: Record<string, unknown>): ListingTrafficUtm {
  const utm: ListingTrafficUtm = {};
  for (const key of LISTING_TRAFFIC_UTM_KEYS) {
    const value = sanitizeListingUtmValue(source[key]);
    if (value) utm[key] = value;
  }
  return utm;
}

export function hasListingUtm(utm: ListingTrafficUtm | null | undefined): boolean {
  if (!utm) return false;
  return LISTING_TRAFFIC_UTM_KEYS.some((key) => Boolean(utm[key]));
}

export function parseListingTrafficBody(
  raw: unknown,
): { ok: true; event: ListingTrafficEvent } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "invalid_body" };
  }
  const body = raw as Record<string, unknown>;
  const eventType = body.event_type;
  if (eventType !== "pageview" && eventType !== "lead") {
    return { ok: false, reason: "invalid_event" };
  }
  if (!isVisitSessionId(body.session_id)) {
    return { ok: false, reason: "invalid_session" };
  }
  const listing = parseListingPath(body.path);
  if (!listing) return { ok: false, reason: "invalid_path" };

  let conversion: ListingTrafficConversion | null = null;
  if (eventType === "pageview") {
    if (body.conversion != null && body.conversion !== "") {
      return { ok: false, reason: "invalid_conversion" };
    }
  } else {
    if (
      body.conversion !== "offer" &&
      body.conversion !== "inquiry" &&
      body.conversion !== "financing"
    ) {
      return { ok: false, reason: "invalid_conversion" };
    }
    conversion = body.conversion;
  }

  const utm = readUtm(body);
  if (!hasListingUtm(utm)) return { ok: false, reason: "missing_utm" };

  return {
    ok: true,
    event: {
      eventType,
      conversion,
      sessionId: body.session_id,
      path: listing.path,
      listingId: listing.listingId,
      utm,
      referrer: eventType === "pageview" ? sanitizeListingReferrer(body.referrer) : null,
    },
  };
}

export function toListingTrafficInsert(event: ListingTrafficEvent): ListingTrafficInsert {
  return {
    event_type: event.eventType,
    conversion: event.conversion,
    session_id: event.sessionId,
    path: event.path,
    listing_id: event.listingId,
    utm_source: event.utm.utm_source ?? null,
    utm_medium: event.utm.utm_medium ?? null,
    utm_campaign: event.utm.utm_campaign ?? null,
    utm_content: event.utm.utm_content ?? null,
    utm_term: event.utm.utm_term ?? null,
    referrer: event.referrer,
  };
}

export function listingTrafficSupabaseHost(rawUrl: string | null | undefined): string | null {
  const url = String(rawUrl ?? "").trim();
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Production Supabase is writable only from the Vercel production runtime.
 * Preview and local runs that still point at quickexit-db do not insert.
 * A different Supabase host (staging or loopback) stays writable so a
 * dedicated target can be checked without touching production.
 */
export function listingTrafficWriteAllowed(env: {
  vercelEnv?: string | null;
  supabaseUrl?: string | null;
}): boolean {
  const host = listingTrafficSupabaseHost(env.supabaseUrl);
  if (!host) return false;
  if (host === LISTING_TRAFFIC_PRODUCTION_SUPABASE_HOST) {
    return env.vercelEnv === "production";
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
  return host.endsWith(".supabase.co");
}

export function takeListingTrafficRateLimit(
  store: Map<string, RateBucket>,
  key: string,
  now: number,
): boolean {
  if (store.size > 5_000) {
    for (const [bucketKey, bucket] of store) {
      if (now >= bucket.resetAt) store.delete(bucketKey);
    }
  }
  const bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + LISTING_TRAFFIC_RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= LISTING_TRAFFIC_RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
}

export async function recordListingTrafficEvent(
  store: ListingTrafficStore,
  event: ListingTrafficEvent,
  now: Date = new Date(),
): Promise<"inserted" | "duplicate" | "failed"> {
  const sinceIso = new Date(now.getTime() - LISTING_TRAFFIC_DEDUP_MS).toISOString();
  let recent = { found: false, error: false };
  try {
    recent = await store.findRecent({
      sessionId: event.sessionId,
      path: event.path,
      eventType: event.eventType,
      conversion: event.conversion,
      sinceIso,
    });
  } catch {
    recent = { found: false, error: true };
  }
  if (recent.found) return "duplicate";
  try {
    const inserted = await store.insert(toListingTrafficInsert(event));
    return inserted.error ? "failed" : "inserted";
  } catch {
    return "failed";
  }
}
