/**
 * Anonymous wallet-catalog measurement. No IP, no email, no user id.
 * The route inserts only when WALLET_AFFILIATE_EVENTS_ENABLED is exactly "true"
 * and the Supabase host is not production. The flag is off unless the environment sets it.
 * Destination URLs are not stored: a click is brand + product slug.
 */

import {
  LISTING_TRAFFIC_DEDUP_MS,
  LISTING_TRAFFIC_PRODUCTION_SUPABASE_HOST,
  LISTING_TRAFFIC_UTM_KEYS,
  isVisitSessionId,
  sanitizeListingReferrer,
  sanitizeListingUtmValue,
  type ListingTrafficUtm,
} from "./listingTraffic";

export const WALLET_AFFILIATE_EVENTS_ENABLED_ENV = "WALLET_AFFILIATE_EVENTS_ENABLED";
export const MAX_WALLET_AFFILIATE_BODY_BYTES = 2_048;

export type WalletAffiliateEventType = "pageview" | "click";

export type WalletAffiliateEvent = {
  eventType: WalletAffiliateEventType;
  sessionId: string;
  path: string;
  brand: string | null;
  productSlug: string | null;
  utm: ListingTrafficUtm;
  referrer: string | null;
};

export type WalletAffiliateInsert = {
  event_type: WalletAffiliateEventType;
  session_id: string;
  path: string;
  brand: string | null;
  product_slug: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
};

export type WalletAffiliateStore = {
  findRecent(filter: {
    sessionId: string;
    path: string;
    eventType: WalletAffiliateEventType;
    brand: string | null;
    productSlug: string | null;
    sinceIso: string;
  }): Promise<{ found: boolean; error: boolean }>;
  insert(row: WalletAffiliateInsert): Promise<{ error: boolean }>;
};

const BRAND_RE = /^[a-z0-9-]{1,40}$/;
const PRODUCT_SLUG_RE = /^[a-z0-9-]{1,80}$/;
const WALLET_PATH_RE = /^\/(ro|en)\/wallets(\/[a-z0-9-]{1,80})?$/;

function readUtm(source: Record<string, unknown>): ListingTrafficUtm {
  const utm: ListingTrafficUtm = {};
  for (const key of LISTING_TRAFFIC_UTM_KEYS) {
    const value = sanitizeListingUtmValue(source[key]);
    if (value) utm[key] = value;
  }
  return utm;
}

function readSlug(value: unknown, pattern: RegExp): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!pattern.test(trimmed)) return undefined;
  return trimmed;
}

export function parseWalletCatalogPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim().split("#")[0]?.split("?")[0] ?? "";
  if (!path || path.length > 160) return null;
  if (!WALLET_PATH_RE.test(path)) return null;
  return path;
}

/**
 * Inserts are refused unless the flag is exactly "true".
 * The production project is refused even then: Preview may point at it, and this
 * change must not write there.
 */
export function walletAffiliateWriteAllowed(env: {
  enabledFlag?: string | null;
  supabaseUrl?: string | null;
}): boolean {
  if (env.enabledFlag !== "true") return false;
  const raw = String(env.supabaseUrl ?? "").trim();
  if (!raw) return false;
  let hostname: string;
  try {
    hostname = new URL(raw).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!hostname || hostname === LISTING_TRAFFIC_PRODUCTION_SUPABASE_HOST) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return true;
  return hostname.endsWith(".supabase.co");
}

export function parseWalletAffiliateBody(
  raw: unknown,
): { ok: true; event: WalletAffiliateEvent } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "invalid_body" };
  }
  const body = raw as Record<string, unknown>;
  const eventType = body.event_type;
  if (eventType !== "pageview" && eventType !== "click") {
    return { ok: false, reason: "invalid_event" };
  }
  if (!isVisitSessionId(body.session_id)) {
    return { ok: false, reason: "invalid_session" };
  }
  const path = parseWalletCatalogPath(body.path);
  if (!path) return { ok: false, reason: "invalid_path" };

  const brand = readSlug(body.brand, BRAND_RE);
  const productSlug = readSlug(body.product_slug, PRODUCT_SLUG_RE);
  if (brand === undefined || productSlug === undefined) {
    return { ok: false, reason: "invalid_product" };
  }
  if (eventType === "click" && (!brand || !productSlug)) {
    return { ok: false, reason: "invalid_product" };
  }

  return {
    ok: true,
    event: {
      eventType,
      sessionId: body.session_id,
      path,
      brand,
      productSlug,
      utm: readUtm(body),
      referrer: sanitizeListingReferrer(body.referrer),
    },
  };
}

export function toWalletAffiliateInsert(event: WalletAffiliateEvent): WalletAffiliateInsert {
  return {
    event_type: event.eventType,
    session_id: event.sessionId,
    path: event.path,
    brand: event.brand,
    product_slug: event.productSlug,
    utm_source: event.utm.utm_source ?? null,
    utm_medium: event.utm.utm_medium ?? null,
    utm_campaign: event.utm.utm_campaign ?? null,
    utm_content: event.utm.utm_content ?? null,
    utm_term: event.utm.utm_term ?? null,
    referrer: event.referrer,
  };
}

export async function recordWalletAffiliateEvent(
  store: WalletAffiliateStore,
  event: WalletAffiliateEvent,
  now: Date = new Date(),
): Promise<"inserted" | "duplicate" | "failed"> {
  const sinceIso = new Date(now.getTime() - LISTING_TRAFFIC_DEDUP_MS).toISOString();
  let recent = { found: false, error: false };
  try {
    recent = await store.findRecent({
      sessionId: event.sessionId,
      path: event.path,
      eventType: event.eventType,
      brand: event.brand,
      productSlug: event.productSlug,
      sinceIso,
    });
  } catch {
    recent = { found: false, error: true };
  }
  if (recent.found) return "duplicate";
  try {
    const inserted = await store.insert(toWalletAffiliateInsert(event));
    return inserted.error ? "failed" : "inserted";
  } catch {
    return "failed";
  }
}
