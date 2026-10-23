/**
 * First-party acquisition attribution for QuickExit.
 *
 * Stored in the first-party cookie `qe_attr` (and a localStorage mirror) so
 * in-app browsers can keep a touch when third-party cookies are blocked.
 * The `/go/<code>` redirect sets the cookie on the server before the homepage
 * loads. This store is separate from the consent-gated GA key
 * `quickexit_attribution`.
 *
 * GDPR / consent: these fields are operational first-party records (which
 * channel a signup, listing, offer, inquiry, or payment came from). This
 * module does not forward them to Google or TikTok tags. Whether the cookie
 * needs consent or can rely on legitimate interest is a decision for the
 * operator and counsel — this code does not make that legal call. Client GA
 * events stay behind the existing analytics consent gate.
 */

export const ATTRIBUTION_COOKIE_NAME = "qe_attr";
export const ATTRIBUTION_LOCAL_STORAGE_KEY = "qe_attr";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
export const ATTRIBUTION_FIELD_MAX = 120;

export const CLICK_ID_KEYS = ["gclid", "fbclid", "ttclid"] as const;
export type ClickIdKey = (typeof CLICK_ID_KEYS)[number];

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type AttributionTouch = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  ttclid?: string;
  referrer?: string;
  landing_path?: string;
  captured_at?: string;
};

export type AttributionSnapshot = {
  v: 1;
  first?: AttributionTouch;
  last?: AttributionTouch;
  heard_from?: string;
  heard_from_detail?: string | null;
};

export const HEARD_FROM_OPTIONS = [
  { id: "youtube_mihai_daniel", label: "YouTube Mihai Daniel" },
  { id: "youtube_quickexit", label: "YouTube QuickExit" },
  { id: "tiktok_mihai_daniel", label: "TikTok Mihai Daniel" },
  { id: "tiktok_quickexit", label: "TikTok QuickExit" },
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X/Twitter" },
  { id: "google", label: "Google" },
  { id: "referral", label: "Recomandare de la cineva" },
  { id: "other", label: "Altceva" },
] as const;

export type HeardFromId = (typeof HEARD_FROM_OPTIONS)[number]["id"];

const HEARD_FROM_IDS = new Set<string>(HEARD_FROM_OPTIONS.map((option) => option.id));

const UTM_VALUE_RE = /^[a-zA-Z0-9._\- ]+$/;
const CLICK_ID_VALUE_RE = /^[A-Za-z0-9._-]{1,120}$/;
const CLICK_ID_IN_TEXT = /gclid|fbclid|ttclid|msclkid|wbraid|gbraid/i;
const PATH_RE = /^\/[A-Za-z0-9._\-/]*$/;

const META_TOUCH_FIELDS = [
  ["source", "utm_source"],
  ["medium", "utm_medium"],
  ["campaign", "utm_campaign"],
  ["content", "utm_content"],
  ["term", "utm_term"],
  ["referrer", "referrer"],
  ["landing", "landing_path"],
  ["gclid", "gclid"],
  ["fbclid", "fbclid"],
  ["ttclid", "ttclid"],
] as const;

export const PAID_MEDIUMS = new Set([
  "cpc",
  "ppc",
  "paid",
  "paid_social",
  "paidsocial",
  "display",
  "cpm",
  "cpv",
]);

export function sanitizeUtmValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, ATTRIBUTION_FIELD_MAX);
  if (!trimmed) return undefined;
  if (trimmed.includes("@") || trimmed.includes("://")) return undefined;
  if (CLICK_ID_IN_TEXT.test(trimmed)) return undefined;
  if (!UTM_VALUE_RE.test(trimmed)) return undefined;
  return trimmed;
}

export function sanitizeClickId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, ATTRIBUTION_FIELD_MAX);
  if (!trimmed || trimmed.includes("@")) return undefined;
  if (!CLICK_ID_VALUE_RE.test(trimmed)) return undefined;
  return trimmed;
}

export function sanitizeLandingPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const path = value.trim().split("#")[0]?.split("?")[0] ?? "";
  if (!path.startsWith("/")) return undefined;
  if (path.includes("@") || path.includes("://")) return undefined;
  if (CLICK_ID_IN_TEXT.test(path)) return undefined;
  if (!PATH_RE.test(path)) return undefined;
  return path.slice(0, ATTRIBUTION_FIELD_MAX);
}

export function isOwnReferrerHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === "quickexit.ro" ||
    normalized === "www.quickexit.ro" ||
    normalized.endsWith(".quickexit.ro") ||
    normalized === "localhost" ||
    normalized === "127.0.0.1"
  );
}

export function sanitizeReferrer(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (isOwnReferrerHost(url.hostname)) return undefined;
    const path = url.pathname && url.pathname !== "/" ? url.pathname.slice(0, 80) : "";
    const compact = `${url.protocol}//${url.hostname.toLowerCase()}${path}`.slice(0, 180);
    if (compact.includes("@")) return undefined;
    return compact;
  } catch {
    return undefined;
  }
}

export function touchHasCampaignSignal(touch: AttributionTouch | undefined): boolean {
  if (!touch) return false;
  if (UTM_KEYS.some((key) => Boolean(touch[key]))) return true;
  return CLICK_ID_KEYS.some((key) => Boolean(touch[key]));
}

export function touchHasSignal(touch: AttributionTouch | undefined): boolean {
  if (!touch) return false;
  return touchHasCampaignSignal(touch) || Boolean(touch.referrer);
}

export function touchIsRecordable(touch: AttributionTouch | undefined): boolean {
  if (!touch) return false;
  return touchHasSignal(touch) || Boolean(touch.landing_path);
}

export function sanitizeTouch(raw: unknown): AttributionTouch | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const record = raw as Record<string, unknown>;
  const touch: AttributionTouch = {};
  for (const key of UTM_KEYS) {
    const value = sanitizeUtmValue(record[key]);
    if (value) touch[key] = value;
  }
  for (const key of CLICK_ID_KEYS) {
    const value = sanitizeClickId(record[key]);
    if (value) touch[key] = value;
  }
  const referrer = sanitizeReferrer(record.referrer);
  if (referrer) touch.referrer = referrer;
  const landing = sanitizeLandingPath(record.landing_path);
  if (landing) touch.landing_path = landing;
  if (typeof record.captured_at === "string" && /^\d{4}-\d{2}-\d{2}T/.test(record.captured_at)) {
    touch.captured_at = record.captured_at.trim().slice(0, 40);
  }
  return touchIsRecordable(touch) ? touch : undefined;
}

export function isHeardFromId(value: unknown): value is HeardFromId {
  return typeof value === "string" && HEARD_FROM_IDS.has(value);
}

export function heardFromLabel(id: string | null | undefined): string {
  const match = HEARD_FROM_OPTIONS.find((option) => option.id === id);
  return match?.label ?? (id ? id : "—");
}

export function parseHeardFrom(
  value: unknown,
  detail: unknown,
): { heard_from: HeardFromId; heard_from_detail: string | null } | null {
  if (!isHeardFromId(value)) return null;
  const text =
    typeof detail === "string"
      ? detail.replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 200)
      : "";
  if (value === "other") {
    if (text.length < 2) return null;
    return { heard_from: value, heard_from_detail: text };
  }
  if (value === "referral") {
    return { heard_from: value, heard_from_detail: text.length > 0 ? text : null };
  }
  return { heard_from: value, heard_from_detail: null };
}

export function sanitizeSnapshot(raw: unknown): AttributionSnapshot | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const first = sanitizeTouch(record.first);
  const last = sanitizeTouch(record.last);
  const parsedHeard = parseHeardFrom(record.heard_from, record.heard_from_detail);
  if (!first && !last && !parsedHeard) return null;
  const snapshot: AttributionSnapshot = { v: 1 };
  if (first) snapshot.first = first;
  if (last) snapshot.last = last;
  if (parsedHeard) {
    snapshot.heard_from = parsedHeard.heard_from;
    snapshot.heard_from_detail = parsedHeard.heard_from_detail;
  }
  return snapshot;
}

export function parseStoredAttribution(raw: string | null | undefined): AttributionSnapshot | null {
  if (!raw) return null;
  const attempts = [raw];
  try {
    attempts.push(decodeURIComponent(raw));
  } catch {
    // raw value was not encoded
  }
  for (const candidate of attempts) {
    try {
      const parsed = sanitizeSnapshot(JSON.parse(candidate));
      if (parsed) return parsed;
    } catch {
      // try the next encoding
    }
  }
  return null;
}

export function absorbTouch(
  stored: AttributionSnapshot | null | undefined,
  incoming: AttributionTouch | null | undefined,
  now = new Date().toISOString(),
): AttributionSnapshot {
  const base: AttributionSnapshot = {
    v: 1,
    first: stored?.first,
    last: stored?.last,
    heard_from: stored?.heard_from,
    heard_from_detail: stored?.heard_from_detail ?? null,
  };
  if (!incoming || !touchIsRecordable(incoming)) return base;
  const stamped: AttributionTouch = {
    ...incoming,
    captured_at: incoming.captured_at || now,
  };
  if (!base.first || !touchIsRecordable(base.first)) {
    base.first = stamped;
  }
  if (touchHasSignal(stamped) || !base.last) {
    base.last = stamped;
  }
  return base;
}

function touchTime(touch: AttributionTouch | undefined): number {
  const parsed = Date.parse(touch?.captured_at || "");
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function mergeSnapshots(
  ...parts: Array<AttributionSnapshot | null | undefined>
): AttributionSnapshot {
  const out: AttributionSnapshot = { v: 1 };
  for (const part of parts) {
    if (!part) continue;
    if (part.first && touchIsRecordable(part.first)) {
      const current = touchTime(out.first);
      const incoming = touchTime(part.first);
      if (
        !out.first ||
        (Number.isFinite(incoming) && (!Number.isFinite(current) || incoming < current))
      ) {
        out.first = part.first;
      }
    }
    if (part.last && touchIsRecordable(part.last)) {
      const current = touchTime(out.last);
      const incoming = touchTime(part.last);
      if (
        !out.last ||
        !Number.isFinite(current) ||
        (Number.isFinite(incoming) && incoming >= current)
      ) {
        out.last = part.last;
      }
    }
    if (!out.heard_from && part.heard_from) {
      const parsed = parseHeardFrom(part.heard_from, part.heard_from_detail);
      if (parsed) {
        out.heard_from = parsed.heard_from;
        out.heard_from_detail = parsed.heard_from_detail;
      }
    }
  }
  return out;
}

export function sourceLabelFromTouch(touch: AttributionTouch | null | undefined): string {
  if (!touch) return "unknown";
  if (touch.utm_source) return touch.utm_source.trim().toLowerCase();
  if (touch.gclid) return "google_ads";
  if (touch.fbclid) return "facebook";
  if (touch.ttclid) return "tiktok";
  if (touch.referrer) {
    try {
      return new URL(touch.referrer).hostname.replace(/^www\./, "");
    } catch {
      return "referral";
    }
  }
  if (touch.landing_path) return "direct";
  return "unknown";
}

export function isPaidMedium(medium: string | null | undefined): boolean {
  if (!medium) return false;
  return PAID_MEDIUMS.has(medium.trim().toLowerCase());
}

export function attributionDbFields(snapshot: AttributionSnapshot | null | undefined): {
  attribution_first: AttributionTouch | null;
  attribution_last: AttributionTouch | null;
  heard_from: string | null;
  heard_from_detail: string | null;
} {
  return {
    attribution_first: snapshot?.first ?? null,
    attribution_last: snapshot?.last ?? null,
    heard_from: snapshot?.heard_from ?? null,
    heard_from_detail: snapshot?.heard_from_detail ?? null,
  };
}

export function isOptionalAttributionColumnError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  if (code === "42703" || code === "PGRST204") return true;
  const message = String(error.message || "").toLowerCase();
  return (
    message.includes("attribution_first") ||
    message.includes("attribution_last") ||
    message.includes("heard_from") ||
    message.includes("sold_at")
  );
}

export function isMissingRelationError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  if (code === "42P01" || code === "PGRST205" || code === "PGRST204") return true;
  const message = String(error.message || "").toLowerCase();
  return message.includes("does not exist") || message.includes("could not find the table");
}

export function touchToMetadata(
  prefix: "ft" | "lt",
  touch: AttributionTouch | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!touch) return out;
  for (const [suffix, key] of META_TOUCH_FIELDS) {
    const value = touch[key];
    if (typeof value === "string" && value) {
      out[`${prefix}_${suffix}`] = value.slice(0, ATTRIBUTION_FIELD_MAX);
    }
  }
  return out;
}

export function metadataToTouch(
  metadata: Record<string, string | undefined | null> | null | undefined,
  prefix: "ft" | "lt",
): AttributionTouch | undefined {
  if (!metadata) return undefined;
  const raw: Record<string, unknown> = {};
  for (const [suffix, key] of META_TOUCH_FIELDS) {
    const value = metadata[`${prefix}_${suffix}`];
    if (typeof value === "string" && value) raw[key] = value;
  }
  return sanitizeTouch(raw);
}

export function attributionMetadata(
  snapshot: AttributionSnapshot | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {
    ...touchToMetadata("ft", snapshot?.first),
    ...touchToMetadata("lt", snapshot?.last),
  };
  if (snapshot?.heard_from) out.heard_from = snapshot.heard_from.slice(0, 80);
  if (snapshot?.heard_from_detail) {
    out.heard_from_detail = snapshot.heard_from_detail.slice(0, ATTRIBUTION_FIELD_MAX);
  }
  return out;
}

export function snapshotFromMetadata(
  metadata: Record<string, string | undefined | null> | null | undefined,
): AttributionSnapshot {
  const first = metadataToTouch(metadata, "ft");
  const last = metadataToTouch(metadata, "lt");
  const heard = parseHeardFrom(metadata?.heard_from, metadata?.heard_from_detail);
  const snapshot: AttributionSnapshot = { v: 1 };
  if (first) snapshot.first = first;
  if (last) snapshot.last = last;
  if (heard) {
    snapshot.heard_from = heard.heard_from;
    snapshot.heard_from_detail = heard.heard_from_detail;
  }
  return snapshot;
}

export function gaClientIdFromCookieHeader(cookieHeader: string | null | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match?.[1]) return undefined;
  let raw = match[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  const parts = raw.split(".");
  if (parts.length < 4) return undefined;
  const clientId = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  if (!/^\d+\.\d+$/.test(clientId)) return undefined;
  return clientId;
}

export function readAttributionFromCookieHeader(
  cookieHeader: string | null | undefined,
): AttributionSnapshot | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)qe_attr=([^;]*)/);
  if (!match?.[1]) return null;
  return parseStoredAttribution(match[1]);
}

export function attributionCookieJson(snapshot: AttributionSnapshot): string {
  return JSON.stringify(sanitizeSnapshot(snapshot) ?? { v: 1 });
}

export function cookieOptionsForAttribution(protocol: string): {
  path: string;
  maxAge: number;
  sameSite: "lax";
  secure: boolean;
  httpOnly: false;
} {
  return {
    path: "/",
    maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: protocol === "https:" || protocol === "https",
    httpOnly: false,
  };
}

export function readAttributionSnapshot(): AttributionSnapshot {
  if (typeof window === "undefined") return { v: 1 };
  const fromCookie = readAttributionFromCookieHeader(
    typeof document !== "undefined" ? document.cookie : "",
  );
  let fromStorage: AttributionSnapshot | null = null;
  try {
    fromStorage = parseStoredAttribution(
      window.localStorage.getItem(ATTRIBUTION_LOCAL_STORAGE_KEY),
    );
  } catch {
    fromStorage = null;
  }
  return mergeSnapshots(fromCookie, fromStorage);
}

export function writeAttributionSnapshot(snapshot: AttributionSnapshot): void {
  if (typeof window === "undefined") return;
  const raw = attributionCookieJson(snapshot);
  try {
    window.localStorage.setItem(ATTRIBUTION_LOCAL_STORAGE_KEY, raw);
  } catch {
    // storage may be blocked in some in-app browsers
  }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${encodeURIComponent(raw)}; Path=/; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  } catch {
    // cookie write is best-effort
  }
}

export function rememberSelfReport(
  heardFrom: string,
  detail: string | null,
): AttributionSnapshot | null {
  const parsed = parseHeardFrom(heardFrom, detail);
  if (!parsed) return null;
  const next: AttributionSnapshot = {
    ...readAttributionSnapshot(),
    v: 1,
    heard_from: parsed.heard_from,
    heard_from_detail: parsed.heard_from_detail,
  };
  writeAttributionSnapshot(next);
  return next;
}

export function touchFromLocation(
  href: string,
  referrer?: string | null,
  now = new Date().toISOString(),
): AttributionTouch | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const touch: AttributionTouch = {
    landing_path: sanitizeLandingPath(url.pathname),
    captured_at: now,
  };
  for (const key of UTM_KEYS) {
    const value = sanitizeUtmValue(url.searchParams.get(key));
    if (value) touch[key] = value;
  }
  for (const key of CLICK_ID_KEYS) {
    const value = sanitizeClickId(url.searchParams.get(key));
    if (value) touch[key] = value;
  }
  if (referrer) {
    const safe = sanitizeReferrer(referrer);
    if (safe) touch.referrer = safe;
  }
  return touchIsRecordable(touch) ? touch : null;
}

export function captureLandingAttribution(now = new Date().toISOString()): void {
  if (typeof window === "undefined") return;
  let referrer: string | undefined;
  try {
    referrer = document.referrer || undefined;
  } catch {
    referrer = undefined;
  }
  const incoming = touchFromLocation(window.location.href, referrer, now);
  if (!incoming) return;
  const stored = readAttributionSnapshot();
  if (
    !touchHasCampaignSignal(incoming) &&
    !incoming.referrer &&
    stored.first &&
    touchIsRecordable(stored.first)
  ) {
    return;
  }
  if (
    !touchHasCampaignSignal(incoming) &&
    stored.first &&
    touchHasSignal(stored.first)
  ) {
    return;
  }
  writeAttributionSnapshot(absorbTouch(stored, incoming, now));
}
