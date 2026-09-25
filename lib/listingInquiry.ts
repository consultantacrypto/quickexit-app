import { getClientIp } from "@/lib/evaluateSafety";
import { normalizePhone } from "@/lib/financingLead";
import { isInventoryInquirable } from "@/lib/listingInventory";

export const LISTING_INQUIRY_CONSENT_VERSION = "2026-08";
export const MAX_INQUIRY_MESSAGE_LENGTH = 2_000;
export const MAX_INQUIRY_BODY_BYTES = 4_096;
export const INQUIRY_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const INQUIRY_RATE_LIMIT_MAX = 5;
export const INQUIRY_DEDUP_WINDOW_MS = 15 * 60 * 1000;
export const INQUIRY_DEDUP_WINDOW_SECONDS = 900;
export const POSTGRES_UNIQUE_VIOLATION = "23505";
export const INQUIRY_DB_ERROR_PREFIX = "QEX:";
export const HQ_INQUIRY_MAX_PAGE_SIZE = 50;
export const HQ_INQUIRY_DEFAULT_VIEW = "fallback" as const;
export const SELLER_INQUIRY_STATUSES = ["seen", "closed"] as const;
export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

/**
 * Instance-local Map burst limiter only. Not authoritative across Vercel isolates.
 * Authoritative duplicate/rate enforcement is database advisory locks + rolling counts.
 */
export const INQUIRY_RATE_LIMIT_SCOPE = "instance-local-supplemental" as const;
export const INQUIRY_AUTHORITATIVE_RATE_SCOPE = "database-advisory-lock" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const HQ_INQUIRY_STATUSES = ["new", "seen", "closed", "hq_handling"] as const;
export const HQ_INQUIRY_PATCH_ALLOWED_KEYS = ["id", "status"] as const;
export const HQ_INQUIRY_VIEWS = ["fallback", "all"] as const;
export const HQ_FALLBACK_NOTIFICATION_STATUSES = [
  "pending",
  "sending",
  "failed",
  "skipped_no_provider",
  "skipped_disabled",
  "skipped_missing_recipient",
] as const;

export type InquiryStatus = (typeof HQ_INQUIRY_STATUSES)[number];
export type SellerInquiryStatus = (typeof SELLER_INQUIRY_STATUSES)[number];
export type HqInquiryView = (typeof HQ_INQUIRY_VIEWS)[number];
export type InquiryLocale = "ro" | "en";

export type InquiryNotificationStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "skipped_no_provider"
  | "skipped_disabled"
  | "skipped_missing_recipient";

export type ValidatedListingInquiry = {
  listingId: string;
  phone: string;
  message: string | null;
  consent: true;
  locale: InquiryLocale;
};

export type InquiryValidationResult =
  | { ok: true; data: ValidatedListingInquiry }
  | { ok: false; status: number; error_code: string; message: string };

export type HqInquiryPatchResult =
  | { ok: true; id: string; status: InquiryStatus }
  | { ok: false; status: number; error: string; error_code: string };

export type HqInquiryListQuery =
  | {
      ok: true;
      view: HqInquiryView;
      limit: number;
      cursor: string | null;
    }
  | { ok: false; status: number; error_code: string; error: string };

type RateBucket = { count: number; resetAt: number };
const ipRateLimitStore = new Map<string, RateBucket>();
const userRateLimitStore = new Map<string, RateBucket>();

export function isListingInquiryId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === "string" && (HQ_INQUIRY_STATUSES as readonly string[]).includes(value);
}

export function isSellerInquiryStatus(value: unknown): value is SellerInquiryStatus {
  return typeof value === "string" && (SELLER_INQUIRY_STATUSES as readonly string[]).includes(value);
}

export function isInquiryLocale(value: unknown): value is InquiryLocale {
  return value === "ro" || value === "en";
}

export function isPostgresUniqueViolation(code: string | undefined | null): boolean {
  return code === POSTGRES_UNIQUE_VIOLATION;
}

export function isPublicInquirableListing(
  listing:
    | {
        status?: unknown;
        is_seed?: unknown;
        expires_at?: unknown;
        user_id?: unknown;
        listing_kind?: unknown;
        availability_status?: unknown;
      }
    | null
    | undefined,
): boolean {
  return isInventoryInquirable(listing);
}

export function sanitizeInquiryMessage(raw: unknown): string | null {
  if (raw == null) return null;
  const text = String(raw)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.slice(0, MAX_INQUIRY_MESSAGE_LENGTH);
}

export function isSafePublicInquiryError(errorCode: string): boolean {
  return [
    "auth_required",
    "origin_rejected",
    "invalid_listing",
    "invalid_phone",
    "consent_required",
    "validation_error",
    "message_too_long",
    "listing_unavailable",
    "own_listing",
    "rate_limited",
    "duplicate_inquiry",
    "table_missing",
    "persist_failed",
    "server_error",
    "invalid_status",
    "forbidden",
    "not_found",
  ].includes(errorCode);
}

export function publicInquiryErrorMessage(errorCode: string, locale: InquiryLocale): string {
  const ro: Record<string, string> = {
    auth_required: "Autentifică-te pentru a solicita detalii.",
    origin_rejected: "Cererea nu a putut fi validată.",
    invalid_listing: "Anunț invalid.",
    invalid_phone: "Introdu un număr de telefon valid.",
    consent_required: "Este necesar acordul pentru contact.",
    validation_error: "Datele trimise sunt invalide.",
    message_too_long: "Mesajul este prea lung.",
    listing_unavailable: "Anunțul nu este disponibil.",
    own_listing: "Nu poți solicita detalii la anunțul tău.",
    rate_limited: "Prea multe solicitări. Încearcă mai târziu.",
    duplicate_inquiry: "Ai trimis deja o solicitare recentă pentru acest anunț.",
    table_missing: "Solicitarea nu a putut fi înregistrată.",
    persist_failed: "Solicitarea nu a putut fi înregistrată.",
    server_error: "Solicitarea nu a putut fi înregistrată.",
    invalid_status: "Status invalid.",
    forbidden: "Nu poți modifica această solicitare.",
    not_found: "Solicitarea nu a fost găsită.",
  };
  const en: Record<string, string> = {
    auth_required: "Sign in to request details.",
    origin_rejected: "The request could not be validated.",
    invalid_listing: "Invalid listing.",
    invalid_phone: "Enter a valid phone number.",
    consent_required: "Contact consent is required.",
    validation_error: "The submitted data is invalid.",
    message_too_long: "The message is too long.",
    listing_unavailable: "This listing is not available.",
    own_listing: "You cannot request details on your own listing.",
    rate_limited: "Too many requests. Please try again later.",
    duplicate_inquiry: "You already sent a recent request for this listing.",
    table_missing: "We couldn't record your request.",
    persist_failed: "We couldn't record your request.",
    server_error: "We couldn't record your request.",
    invalid_status: "Invalid status.",
    forbidden: "You cannot update this request.",
    not_found: "Request not found.",
  };
  const table = locale === "en" ? en : ro;
  return table[errorCode] ?? table.server_error;
}

export function validateListingInquiryBody(
  listingId: string,
  rawBody: unknown,
): InquiryValidationResult {
  if (!isListingInquiryId(listingId)) {
    return {
      ok: false,
      status: 400,
      error_code: "invalid_listing",
      message: publicInquiryErrorMessage("invalid_listing", "ro"),
    };
  }

  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      message: publicInquiryErrorMessage("validation_error", "ro"),
    };
  }

  const body = rawBody as Record<string, unknown>;
  const locale: InquiryLocale = isInquiryLocale(body.locale) ? body.locale : "ro";
  const phone = normalizePhone(body.phone);
  if (!phone) {
    return {
      ok: false,
      status: 400,
      error_code: "invalid_phone",
      message: publicInquiryErrorMessage("invalid_phone", locale),
    };
  }

  if (body.consent !== true) {
    return {
      ok: false,
      status: 400,
      error_code: "consent_required",
      message: publicInquiryErrorMessage("consent_required", locale),
    };
  }

  if (body.message != null && String(body.message).length > MAX_INQUIRY_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      error_code: "message_too_long",
      message: publicInquiryErrorMessage("message_too_long", locale),
    };
  }

  return {
    ok: true,
    data: {
      listingId: listingId.trim(),
      phone,
      message: sanitizeInquiryMessage(body.message),
      consent: true,
      locale,
    },
  };
}

export function parseHqInquiryPatch(rawBody: unknown): HqInquiryPatchResult {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return {
      ok: false,
      status: 400,
      error: "Body JSON invalid.",
      error_code: "validation_error",
    };
  }

  const record = rawBody as Record<string, unknown>;
  const keys = Object.keys(record);
  const extra = keys.filter(
    (key) => !(HQ_INQUIRY_PATCH_ALLOWED_KEYS as readonly string[]).includes(key),
  );
  if (extra.length > 0) {
    return { ok: false, status: 400, error: "Câmpuri nepermise.", error_code: "validation_error" };
  }

  if (!isListingInquiryId(record.id) || !isInquiryStatus(record.status)) {
    return {
      ok: false,
      status: 400,
      error: "Status sau identificator invalid.",
      error_code: "invalid_status",
    };
  }

  return { ok: true, id: record.id.trim(), status: record.status };
}

export function parseHqInquiryListQuery(searchParams: URLSearchParams): HqInquiryListQuery {
  const viewRaw = (searchParams.get("view") ?? HQ_INQUIRY_DEFAULT_VIEW).trim();
  if (!(HQ_INQUIRY_VIEWS as readonly string[]).includes(viewRaw)) {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      error: "Parametru view invalid.",
    };
  }

  const limitRaw = searchParams.get("limit");
  let limit = HQ_INQUIRY_MAX_PAGE_SIZE;
  if (limitRaw != null && limitRaw !== "") {
    const parsed = Number(limitRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > HQ_INQUIRY_MAX_PAGE_SIZE) {
      return {
        ok: false,
        status: 400,
        error_code: "validation_error",
        error: "Parametru limit invalid.",
      };
    }
    limit = parsed;
  }

  const cursorRaw = searchParams.get("cursor");
  let cursor: string | null = null;
  if (cursorRaw != null && cursorRaw !== "") {
    const asDate = new Date(cursorRaw);
    if (Number.isNaN(asDate.getTime())) {
      return {
        ok: false,
        status: 400,
        error_code: "validation_error",
        error: "Parametru cursor invalid.",
      };
    }
    cursor = asDate.toISOString();
  }

  return { ok: true, view: viewRaw as HqInquiryView, limit, cursor };
}

export function parseSellerInquiryStatusBody(
  rawBody: unknown,
): { ok: true; status: SellerInquiryStatus } | { ok: false; status: number; error_code: string } {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return { ok: false, status: 400, error_code: "validation_error" };
  }
  const record = rawBody as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "status" || !isSellerInquiryStatus(record.status)) {
    return { ok: false, status: 400, error_code: "invalid_status" };
  }
  return { ok: true, status: record.status };
}

export function canSellerTransitionInquiry(
  current: string | null | undefined,
  next: string,
): boolean {
  if (current === "closed") return false;
  if (next === "seen") return current === "new";
  if (next === "closed") return current === "new" || current === "seen";
  return false;
}

export function wouldViolateDuplicateWindow(
  existingCreatedAt: Date[],
  now: Date,
  windowMs = INQUIRY_DEDUP_WINDOW_MS,
): boolean {
  const cutoff = now.getTime() - windowMs;
  return existingCreatedAt.some((created) => created.getTime() > cutoff);
}

export function wouldViolateHourlyCap(
  existingCreatedAt: Date[],
  now: Date,
  max = INQUIRY_RATE_LIMIT_MAX,
  windowMs = INQUIRY_RATE_LIMIT_WINDOW_MS,
): boolean {
  const cutoff = now.getTime() - windowMs;
  const count = existingCreatedAt.filter((created) => created.getTime() > cutoff).length;
  return count >= max;
}

export function extractInquiryDbErrorCode(error: {
  code?: string | null;
  message?: string | null;
} | null): string | null {
  if (!error) return null;
  const message = String(error.message ?? "");
  const prefixed = message.match(/QEX:([a-z_]+)/i);
  if (prefixed?.[1]) return prefixed[1].toLowerCase();
  if (isPostgresUniqueViolation(error.code)) return "duplicate_inquiry";
  if (error.code === "42P01" || /listing_inquiries/i.test(message)) return "table_missing";
  return null;
}

export function mapInquiryWriteError(error: {
  code?: string | null;
  message?: string | null;
} | null): { status: number; error_code: string } {
  const mapped = extractInquiryDbErrorCode(error);
  if (mapped === "duplicate_inquiry") return { status: 429, error_code: "duplicate_inquiry" };
  if (mapped === "rate_limited") return { status: 429, error_code: "rate_limited" };
  if (mapped === "listing_unavailable") return { status: 404, error_code: "listing_unavailable" };
  if (mapped === "own_listing") return { status: 403, error_code: "own_listing" };
  if (mapped === "auth_required") return { status: 401, error_code: "auth_required" };
  if (mapped === "forbidden") return { status: 403, error_code: "forbidden" };
  if (mapped === "invalid_status") return { status: 400, error_code: "invalid_status" };
  if (mapped === "not_found") return { status: 404, error_code: "not_found" };
  if (mapped === "table_missing") return { status: 503, error_code: "table_missing" };
  return { status: 500, error_code: "persist_failed" };
}

export function resolveRequestOrigin(headers: Headers): string | null {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host")?.split(",")[0]?.trim();
  if (!host) return null;
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const isLoopback =
    host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
  const proto = forwardedProto === "http" || forwardedProto === "https"
    ? forwardedProto
    : isLoopback
      ? "http"
      : "https";
  try {
    return new URL(`${proto}://${host}`).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function isSameOriginMutationRequest(headers: Headers): boolean {
  const originHeader = headers.get("origin")?.trim();
  if (!originHeader) return false;
  let origin: string;
  try {
    origin = new URL(originHeader).origin.toLowerCase();
  } catch {
    return false;
  }
  const requestOrigin = resolveRequestOrigin(headers);
  return Boolean(requestOrigin && origin === requestOrigin);
}

export function inquirySuccessCopy(): { titleKey: "recorded"; ro: string; en: string } {
  return {
    titleKey: "recorded",
    ro: "Solicitarea ta a fost înregistrată.",
    en: "Your request was recorded.",
  };
}

function hitRateLimit(
  store: Map<string, RateBucket>,
  key: string,
): { allowed: true } | { allowed: false } {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + INQUIRY_RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (bucket.count >= INQUIRY_RATE_LIMIT_MAX) {
    return { allowed: false };
  }
  bucket.count += 1;
  return { allowed: true };
}

export function checkInquiryRateLimit(input: {
  ip: string;
  userId: string;
}): { allowed: true } | { allowed: false } {
  const ipResult = hitRateLimit(ipRateLimitStore, `ip:${input.ip || "unknown"}`);
  if (!ipResult.allowed) return ipResult;
  return hitRateLimit(userRateLimitStore, `user:${input.userId}`);
}

export function inquiryNeedsHqFallback(
  notificationStatus: InquiryNotificationStatus,
): boolean {
  return notificationStatus !== "sent";
}

export { getClientIp };
