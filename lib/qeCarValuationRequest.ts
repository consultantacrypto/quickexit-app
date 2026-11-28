/**
 * Request orchestration for POST /api/evaluate/qe.
 * No SerpAPI and no Gemini. Persistence is injected so tests never touch a database.
 */
import { getClientIp, MAX_EVALUATE_BODY_BYTES, sanitizeEvaluateText } from "@/lib/evaluateSafety";
import {
  QE_VALUATION_CONSENT_VERSION,
  buildQePublicBody,
  qeEmailPurpose,
  buildValuationReportSubject,
  buildValuationReportText,
  comparablesFromListings,
  isQeValuationTier3Enabled,
  isValuationReportEmailEnabled,
  normalizeBaseModel,
  normalizeMake,
  selectQeTier,
  type QeListingRow,
  type QeValuation,
  type QeValuationEmailDelivery,
  type QeValuationEmailPurpose,
  type QeValuationEmailStatus,
} from "@/lib/qeCarValuation";

export const QE_VALUATION_RATE_LIMIT_MAX = 12;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_EQUIPMENT_LENGTH = 500;
const MAX_EMAIL_LENGTH = 200;

type RateBucket = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateBucket>();

export function resetQeValuationRateLimitForTests(): void {
  rateLimitStore.clear();
}

export function checkQeValuationRateLimit(ip: string, now = Date.now()): { allowed: boolean } {
  const bucket = rateLimitStore.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (bucket.count >= QE_VALUATION_RATE_LIMIT_MAX) return { allowed: false };
  bucket.count += 1;
  return { allowed: true };
}

export type QeValuationDeps = {
  now?: () => number;
  env?: Record<string, string | undefined>;
  checkRateLimit: (ip: string) => { allowed: boolean };
  verifyTurnstile: (
    token: string | undefined,
    ip: string,
  ) => Promise<{ ok: boolean; reason?: string }>;
  fetchListings: () => Promise<{ ok: true; rows: QeListingRow[] } | { ok: false }>;
  probeStorage: () => Promise<"ready" | "missing" | "error">;
  findRecentRequest: (email: string) => Promise<boolean>;
  insertLead: (input: {
    email: string;
    make: string;
    model: string;
    year: number;
    km: number;
    valuation: QeValuation;
    purpose: QeValuationEmailPurpose;
  }) => Promise<{ ok: true; id: string } | { ok: false }>;
  insertRequest: (input: {
    make: string;
    model: string;
    year: number;
    km: number;
    equipment: string | null;
    valuation: QeValuation;
    email: string | null;
    consent: boolean;
    consentAt: string | null;
    leadId: string | null;
    purpose: QeValuationEmailPurpose | null;
  }) => Promise<{ ok: true } | { ok: false; missing?: boolean }>;
  sendReport: (input: { to: string; subject: string; text: string }) => Promise<"sent" | "failed" | "disabled">;
};

export type QeValuationOutcome = {
  status: number;
  body: Record<string, unknown>;
};

function fail(status: number, message: string): QeValuationOutcome {
  return { status, body: { success: false, message } };
}

function isValidEmail(email: string): boolean {
  if (email.length > MAX_EMAIL_LENGTH) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function honeypotFilled(body: Record<string, unknown>): boolean {
  for (const key of ["website", "company_website"] as const) {
    const value = body[key];
    if (typeof value === "string" && value.trim() !== "") return true;
  }
  return false;
}

function parseRequiredInt(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export async function runQeCarValuation(
  input: { rawText: string; ip: string },
  deps: QeValuationDeps,
): Promise<QeValuationOutcome> {
  if (input.rawText.length > MAX_EVALUATE_BODY_BYTES) {
    return fail(413, "Date trimise prea voluminoase. Verifică formularul.");
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(input.rawText) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fail(400, "Format de date invalid.");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, "Format de date invalid.");
  }

  if (!deps.checkRateLimit(input.ip).allowed) {
    return fail(429, "Prea multe evaluări din această adresă. Încearcă din nou în câteva minute.");
  }

  if (honeypotFilled(body)) {
    return { status: 200, body: { success: true } };
  }

  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken.trim() : undefined;
  const turnstile = await deps.verifyTurnstile(turnstileToken, input.ip);
  if (!turnstile.ok) {
    console.warn("[qe-valuation] turnstile blocked", { reason: turnstile.reason ?? "blocked" });
    return fail(403, "Verificarea de securitate nu a reușit. Te rugăm să reîncerci.");
  }

  const make = sanitizeEvaluateText(body.make, 80);
  const model = sanitizeEvaluateText(body.model, 80);
  const equipment = sanitizeEvaluateText(body.equipment ?? body.dotare, MAX_EQUIPMENT_LENGTH);
  const now = deps.now?.() ?? Date.now();
  const maxYear = new Date(now).getUTCFullYear() + 1;
  const year = parseRequiredInt(body.year, 1950, maxYear);
  const km = parseRequiredInt(body.km ?? body.vehicle_km, 0, 2_000_000);

  if (!make || !model || !normalizeMake(make) || !normalizeBaseModel(model) || year === null || km === null) {
    return fail(400, "Completează marca, modelul, anul și kilometrajul.");
  }

  const emailRaw = sanitizeEvaluateText(body.email, MAX_EMAIL_LENGTH).toLowerCase();
  let email: string | null = null;
  if (emailRaw) {
    if (!isValidEmail(emailRaw)) return fail(400, "Email invalid.");
    if (body.consent !== true) {
      return fail(400, "Bifează consimțământul ca să continuăm.");
    }
    if (body.consent_version !== QE_VALUATION_CONSENT_VERSION) {
      return fail(400, "Consimțământul nu este la versiunea curentă. Reîncarcă pagina.");
    }
    email = emailRaw;
  }

  const listings = await deps.fetchListings();
  if (!listings.ok) {
    return fail(503, "Nu am putut citi anunțurile QuickExit. Încearcă din nou.");
  }

  const env = deps.env ?? process.env;
  const valuation = selectQeTier({
    comparables: comparablesFromListings(listings.rows),
    makeKey: normalizeMake(make),
    modelKey: normalizeBaseModel(model),
    year,
    km,
    tier3Enabled: isQeValuationTier3Enabled(env),
  });

  const purpose = qeEmailPurpose(valuation.sufficient);
  if (email && body.purpose !== purpose) {
    return fail(400, "Scopul consimțământului nu corespunde rezultatului. Reîncarcă pagina.");
  }

  const emailState = await persistValuation({
    deps,
    env,
    make,
    model,
    year,
    km,
    equipment,
    email,
    valuation,
    purpose,
    now,
  });

  return {
    status: 200,
    body: buildQePublicBody({
      valuation,
      equipment,
      emailStatus: emailState.status,
      emailDelivery: emailState.delivery,
    }),
  };
}

async function persistValuation(input: {
  deps: QeValuationDeps;
  env: Record<string, string | undefined>;
  make: string;
  model: string;
  year: number;
  km: number;
  equipment: string;
  email: string | null;
  valuation: QeValuation;
  purpose: QeValuationEmailPurpose;
  now: number;
}): Promise<{ status: QeValuationEmailStatus; delivery: QeValuationEmailDelivery }> {
  if (!input.email) {
    const storage = await input.deps.probeStorage();
    if (storage === "ready") {
      await input.deps.insertRequest({
        make: input.make,
        model: input.model,
        year: input.year,
        km: input.km,
        equipment: input.equipment || null,
        valuation: input.valuation,
        email: null,
        consent: false,
        consentAt: null,
        leadId: null,
        purpose: null,
      });
    }
    return { status: "not_requested", delivery: "not_requested" };
  }

  const storage = await input.deps.probeStorage();
  if (storage !== "ready") {
    return { status: "unavailable", delivery: "unavailable" };
  }

  const recent = await input.deps.findRecentRequest(input.email);
  if (!recent) {
    const lead = await input.deps.insertLead({
      email: input.email,
      make: input.make,
      model: input.model,
      year: input.year,
      km: input.km,
      valuation: input.valuation,
      purpose: input.purpose,
    });
    if (!lead.ok) return { status: "unavailable", delivery: "unavailable" };

    const stored = await input.deps.insertRequest({
      make: input.make,
      model: input.model,
      year: input.year,
      km: input.km,
      equipment: input.equipment || null,
      valuation: input.valuation,
      email: input.email,
      consent: true,
      consentAt: new Date(input.now).toISOString(),
      leadId: lead.id,
      purpose: input.purpose,
    });
    if (!stored.ok) return { status: "unavailable", delivery: "unavailable" };
  } else {
    return { status: "accepted", delivery: "stored" };
  }

  if (input.purpose !== "report" || !isValuationReportEmailEnabled(input.env)) {
    return { status: "accepted", delivery: "disabled" };
  }

  const sendResult = await input.deps.sendReport({
    to: input.email,
    subject: buildValuationReportSubject(input.make, input.model),
    text: buildValuationReportText({
      make: input.make,
      model: input.model,
      year: input.year,
      km: input.km,
      equipment: input.equipment,
      valuation: input.valuation,
    }),
  });

  if (sendResult === "sent") return { status: "sent", delivery: "sent" };
  return { status: "accepted", delivery: "failed" };
}

export { getClientIp };
