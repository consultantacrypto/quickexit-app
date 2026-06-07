import "server-only";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 8_000;

export type TurnstileVerifyReason =
  | "missing_token"
  | "invalid_token"
  | "missing_secret"
  | "verify_error";

export type TurnstileVerifyResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: TurnstileVerifyReason };

export function isEvaluateTurnstileEnabled(): boolean {
  return process.env.EVALUATE_TURNSTILE_ENABLED === "true";
}

function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
  );
}

export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  if (!isEvaluateTurnstileEnabled()) {
    return { ok: true, skipped: true };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (isProductionRuntime()) {
      return { ok: false, reason: "missing_secret" };
    }
    return { ok: true, skipped: true };
  }

  const normalizedToken = typeof token === "string" ? token.trim() : "";
  if (!normalizedToken) {
    return { ok: false, reason: "missing_token" };
  }

  try {
    const params = new URLSearchParams();
    params.set("secret", secret);
    params.set("response", normalizedToken);
    if (remoteIp && remoteIp !== "unknown") {
      params.set("remoteip", remoteIp.slice(0, 64));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      return { ok: false, reason: "verify_error" };
    }

    const payload = (await response.json()) as { success?: boolean };
    if (payload.success === true) {
      return { ok: true };
    }

    return { ok: false, reason: "invalid_token" };
  } catch {
    return { ok: false, reason: "verify_error" };
  }
}
