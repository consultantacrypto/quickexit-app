import type { ErrorEvent } from "@sentry/nextjs";

/** Intentional canaries — must never appear in post-redaction outbound events. */
export const REDACTION_CANARIES = {
  authorization: "Bearer CANARY_AUTH_TOKEN_DO_NOT_KEEP",
  cookie: "qe_session=CANARY_COOKIE_VALUE",
  setCookie: "qe_session=CANARY_SET_COOKIE",
  stripeSignature: "t=1,v1=CANARY_STRIPE_SIGNATURE",
  supabaseAccessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.CANARY_SUPABASE_ACCESS",
  serviceRole: "CANARY_SERVICE_ROLE_KEY_VALUE",
  password: "CANARY_PASSWORD_VALUE",
  phone: "CANARY_PHONE_0712345678",
  address: "CANARY_FULL_ADDRESS_STRADA_1",
  kycPayload: "CANARY_KYC_DOCUMENT_PAYLOAD",
  payment: "CANARY_CARD_PAN_4111111111111111",
  probeSecret: "CANARY_PROBE_SECRET_VALUE",
} as const;

const CANARY_VALUES = Object.values(REDACTION_CANARIES);

export type LiveRedactionAudit = {
  pass: boolean;
  environment: string | undefined;
  canary_leaks: string[];
  sensitive_header_leaks: string[];
  user_pii_leaks: string[];
  notes: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Inspect a post-beforeSend event (outbound payload) for canaries / sensitive residue.
 * Does not log secret values — only boolean / field-name findings.
 */
export function auditSanitizedEvent(
  event: ErrorEvent | null | undefined,
): LiveRedactionAudit {
  const notes: string[] = [];
  const canary_leaks: string[] = [];
  const sensitive_header_leaks: string[] = [];
  const user_pii_leaks: string[] = [];

  if (!event) {
    return {
      pass: false,
      environment: undefined,
      canary_leaks: ["event_missing"],
      sensitive_header_leaks: [],
      user_pii_leaks: [],
      notes: ["No sanitized event captured from beforeSend"],
    };
  }

  const serialized = JSON.stringify(event);
  for (const [name, value] of Object.entries(REDACTION_CANARIES)) {
    if (serialized.includes(value)) {
      canary_leaks.push(name);
    }
  }

  const headers = asRecord(event.request?.headers) ?? {};
  for (const key of Object.keys(headers)) {
    const lower = key.toLowerCase();
    const val = String(headers[key] ?? "");
    if (
      ["authorization", "cookie", "set-cookie", "stripe-signature"].includes(
        lower,
      ) &&
      val &&
      val !== "[Redacted]"
    ) {
      sensitive_header_leaks.push(lower);
    }
  }

  if (event.user?.email) user_pii_leaks.push("user.email");
  if (event.user?.ip_address) user_pii_leaks.push("user.ip_address");
  if (event.user?.username) user_pii_leaks.push("user.username");

  // Extra/context must not retain canary plaintext under sensitive keys.
  const extra = asRecord(event.extra) ?? {};
  for (const key of [
    "password",
    "phone",
    "address",
    "full_address",
    "service_role",
    "kyc",
    "authorization",
  ]) {
    const val = extra[key];
    if (typeof val === "string" && CANARY_VALUES.some((c) => val.includes(c))) {
      canary_leaks.push(`extra.${key}`);
    }
  }

  if (!event.exception && !event.message) {
    notes.push("event has no exception/message — still audited for leaks");
  }

  const pass =
    canary_leaks.length === 0 &&
    sensitive_header_leaks.length === 0 &&
    user_pii_leaks.length === 0;

  return {
    pass,
    environment:
      typeof event.environment === "string" ? event.environment : undefined,
    canary_leaks,
    sensitive_header_leaks,
    user_pii_leaks,
    notes,
  };
}
