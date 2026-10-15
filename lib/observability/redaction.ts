/**
 * Sentry beforeSend / breadcrumb sanitization.
 * Strip secrets, auth material, KYC payloads, and unnecessary PII.
 */

const SENSITIVE_KEY_RE =
  /^(authorization|cookie|set-cookie|x-api-key|x-supabase-.*|stripe-signature|password|passwd|secret|token|access_token|refresh_token|service_role|service-role|apikey|api_key|phone|address|full_address|ssn|card|cvc|cvv|iban|kyc|vendor_data|didit|bearer)$/i;

const SENSITIVE_SUBSTRING_RE =
  /(authorization|cookie|password|secret|token|service[_-]?role|stripe[_-]?signature|refresh[_-]?token|access[_-]?token|api[_-]?key|bearer\s|sk_live|sk_test|whsec_|eyJ[A-Za-z0-9_-]{10,})/i;

const REDACTED = "[Redacted]";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function redactString(value: string): string {
  if (!value) return value;
  if (SENSITIVE_SUBSTRING_RE.test(value)) return REDACTED;
  // Long JWT-like or key-like blobs
  if (value.length > 80 && /^[A-Za-z0-9._\-+/=]+$/.test(value)) {
    return REDACTED;
  }
  return value;
}

export function redactDeep(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[Truncated]";
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactDeep(item, depth + 1));
  }
  if (!isPlainObject(value)) return String(value);

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = redactDeep(nested, depth + 1);
  }
  return out;
}

const HEADER_DENY = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-supabase-auth",
  "stripe-signature",
]);

/**
 * Mutates a Sentry event in place for privacy. Returns null to drop.
 * Accepts SDK ErrorEvent via unknown cast — only known fields are touched.
 */
export function sanitizeSentryEvent<T>(event: T): T | null {
  const e = event as {
    request?: {
      headers?: Record<string, string>;
      cookies?: unknown;
      data?: unknown;
    };
    user?: {
      id?: string | number;
      email?: string | null;
      ip_address?: string | null;
      username?: string | null;
    };
    extra?: Record<string, unknown>;
    contexts?: Record<string, unknown>;
    breadcrumbs?: {
      values?: Array<{ data?: Record<string, unknown>; message?: string }>;
    };
  };

  if (e.request?.headers) {
    const nextHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(e.request.headers)) {
      if (HEADER_DENY.has(key.toLowerCase())) {
        nextHeaders[key] = REDACTED;
      } else {
        nextHeaders[key] = redactString(String(value));
      }
    }
    e.request.headers = nextHeaders;
  }

  if (e.request) {
    if (e.request.cookies) {
      e.request.cookies = REDACTED;
    }
    if (e.request.data !== undefined) {
      e.request.data = redactDeep(e.request.data);
    }
  }

  if (e.user) {
    const rawId = e.user.id;
    const id =
      typeof rawId === "string" && rawId.trim()
        ? rawId.trim()
        : typeof rawId === "number"
          ? String(rawId)
          : undefined;
    e.user = id ? { id } : {};
  }

  if (e.extra) {
    e.extra = redactDeep(e.extra) as Record<string, unknown>;
  }

  if (e.contexts) {
    e.contexts = redactDeep(e.contexts) as Record<string, unknown>;
  }

  if (e.breadcrumbs?.values) {
    for (const crumb of e.breadcrumbs.values) {
      if (crumb.data) {
        crumb.data = redactDeep(crumb.data) as Record<string, unknown>;
      }
      if (typeof crumb.message === "string") {
        crumb.message = redactString(crumb.message);
      }
    }
  }

  return event;
}

export function sanitizeBreadcrumbData(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!data) return data;
  return redactDeep(data) as Record<string, unknown>;
}
