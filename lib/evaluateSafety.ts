/**
 * Safety helpers for POST /api/evaluate.
 *
 * Rate limiting uses an in-memory Map — best-effort only on serverless (Vercel):
 * limits are per isolate, not global across all instances.
 */

export const ALLOWED_EVALUATE_CATEGORIES = [
  "auto",
  "imobiliare",
  "lux",
  "business",
  "gadgets",
  "foto",
] as const;

export type EvaluateCategoryKey = (typeof ALLOWED_EVALUATE_CATEGORIES)[number];

export const MAX_EVALUATE_BODY_BYTES = 8_192;
export const MAX_EVALUATE_TEXT_LENGTH = 200;

/** Per-IP window (best-effort on serverless). */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 12;

type RateBucket = { count: number; resetAt: number };

const rateLimitStore = new Map<string, RateBucket>();

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

export function checkEvaluateRateLimit(ip: string): { allowed: true } | { allowed: false } {
  const now = Date.now();
  const bucket = rateLimitStore.get(ip);

  if (!bucket || now >= bucket.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function sanitizeEvaluateText(value: unknown, maxLen = MAX_EVALUATE_TEXT_LENGTH): string {
  if (value === null || value === undefined) return "";
  const raw = String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return raw.slice(0, maxLen);
}

function pickBodyField(body: Record<string, unknown>, key: string): unknown {
  const details = (body.details as Record<string, unknown> | undefined) ?? {};
  const extra = (body.extraDetails as Record<string, unknown> | undefined) ?? {};
  if (body[key] !== undefined && body[key] !== null && String(body[key]).trim() !== "") {
    return body[key];
  }
  if (details[key] !== undefined && details[key] !== null && String(details[key]).trim() !== "") {
    return details[key];
  }
  if (extra[key] !== undefined && extra[key] !== null && String(extra[key]).trim() !== "") {
    return extra[key];
  }
  return undefined;
}

export function resolveEvaluateCategoryKey(input: unknown): EvaluateCategoryKey | null {
  if (typeof input !== "string") return null;
  const catInput = input.toLowerCase().trim();
  if (!catInput) return null;

  if ((ALLOWED_EVALUATE_CATEGORIES as readonly string[]).includes(catInput)) {
    return catInput as EvaluateCategoryKey;
  }

  if (catInput.includes("imobil")) return "imobiliare";
  if (catInput.includes("lux") || catInput.includes("ceas")) return "lux";
  if (catInput.includes("afacer") || catInput.includes("business")) return "business";
  if (catInput.includes("gadget") || catInput.includes("phone") || catInput.includes("laptop")) {
    return "gadgets";
  }
  if (catInput.includes("foto") || catInput.includes("audio")) return "foto";
  if (catInput.includes("auto") || catInput.includes("moto")) return "auto";

  return null;
}

const REQUIRED_FIELDS: Record<EvaluateCategoryKey, string[]> = {
  auto: ["make", "model", "year"],
  imobiliare: ["surface", "location"],
  lux: ["brand", "model"],
  business: ["industry", "revenue"],
  gadgets: ["brand", "model"],
  foto: ["brand", "model"],
};

export function validateEvaluateMinimumFields(
  body: Record<string, unknown>,
  catKey: EvaluateCategoryKey,
): { ok: true } | { ok: false; message: string } {
  const missing: string[] = [];

  for (const field of REQUIRED_FIELDS[catKey]) {
    if (field === "industry") {
      const industry = pickBodyField(body, "industry") ?? pickBodyField(body, "domain");
      if (!industry) missing.push("domeniu");
      continue;
    }

    const value = pickBodyField(body, field);
    if (value === undefined || value === null || String(value).trim() === "") {
      missing.push(field);
    }
  }

  if (missing.length === 0) return { ok: true };

  return {
    ok: false,
    message: `Completează câmpurile obligatorii: ${missing.join(", ")}.`,
  };
}

const TEXT_KEYS = [
  "make",
  "model",
  "brand",
  "location",
  "industry",
  "title",
  "category",
] as const;

export function sanitizeEvaluationBody(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...body };

  for (const key of TEXT_KEYS) {
    if (key in sanitized) {
      sanitized[key] = sanitizeEvaluateText(sanitized[key]);
    }
  }

  if (sanitized.details && typeof sanitized.details === "object") {
    const details = { ...(sanitized.details as Record<string, unknown>) };
    for (const [k, v] of Object.entries(details)) {
      if (typeof v === "string") details[k] = sanitizeEvaluateText(v);
    }
    sanitized.details = details;
  }

  if (sanitized.extraDetails && typeof sanitized.extraDetails === "object") {
    const extra = { ...(sanitized.extraDetails as Record<string, unknown>) };
    for (const [k, v] of Object.entries(extra)) {
      if (typeof v === "string") extra[k] = sanitizeEvaluateText(v);
    }
    sanitized.extraDetails = extra;
  }

  return sanitized;
}

export const SERP_API_TIMEOUT_MS = 12_000;
export const GEMINI_API_TIMEOUT_MS = 12_000;

export const INSUFFICIENT_PRICE_DATA_LABEL = "insufficient_price_data";

export const INSUFFICIENT_PRICE_WARNING =
  "Nu am găsit suficiente prețuri interpretabile în sursele publice pentru o estimare automată sigură.";

export type EvaluationPriceSnapshot = {
  estimated_market_price: number;
  quick_exit_price: number;
  strong_exit_price: number;
  liquidation_price: number;
  confidence_score: number;
  data_quality_label: string;
  warnings: string[];
};

export function hasUsableEvaluationPrices(prices: EvaluationPriceSnapshot): boolean {
  return (
    prices.estimated_market_price > 0 ||
    prices.quick_exit_price > 0 ||
    prices.strong_exit_price > 0 ||
    prices.liquidation_price > 0
  );
}

export function applyInsufficientPriceDataNormalization<T extends EvaluationPriceSnapshot>(
  payload: T,
): T {
  if (hasUsableEvaluationPrices(payload)) {
    return payload;
  }

  const warnings = payload.warnings.includes(INSUFFICIENT_PRICE_WARNING)
    ? payload.warnings
    : [...payload.warnings, INSUFFICIENT_PRICE_WARNING];

  return {
    ...payload,
    data_quality_label: INSUFFICIENT_PRICE_DATA_LABEL,
    confidence_score: Math.min(payload.confidence_score, 20),
    warnings,
  };
}

export function withEvaluateTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
