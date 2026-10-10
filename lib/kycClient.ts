import { supabase } from "@/lib/supabase";
import { isSafeKycRedirectUrl } from "@/lib/kycRedirectSafety";

export { isSafeKycRedirectUrl } from "@/lib/kycRedirectSafety";

/**
 * Headers for /api/kyc/start — Bearer when session is in localStorage (Vercel-friendly).
 * User identity is derived server-side; do not send userId in the body.
 */
export async function buildKycStartRequestInit(): Promise<RequestInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  };
}

export type StartKycResult =
  | { ok: true; redirected: true }
  | {
      ok: false;
      error:
        | "authentication_required"
        | "identity_mismatch"
        | "kyc_provider_error"
        | "invalid_redirect_url"
        | "network_error"
        | string;
    };

/**
 * Single account-KYC initiation path for all UI surfaces.
 * POSTs to authenticated /api/kyc/start, then redirects only to a server-returned HTTPS URL.
 * Never falls back to a shared/generic provider URL.
 */
export async function startKycVerification(): Promise<StartKycResult> {
  try {
    const res = await fetch("/api/kyc/start", await buildKycStartRequestInit());

    let data: { url?: unknown; error?: unknown } = {};
    try {
      data = (await res.json()) as { url?: unknown; error?: unknown };
    } catch {
      data = {};
    }

    if (!res.ok) {
      const code =
        typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : "kyc_provider_error";
      return { ok: false, error: code };
    }

    const url = typeof data.url === "string" ? data.url.trim() : "";
    if (!url || !isSafeKycRedirectUrl(url)) {
      return { ok: false, error: "invalid_redirect_url" };
    }

    window.location.href = url;
    return { ok: true, redirected: true };
  } catch {
    return { ok: false, error: "network_error" };
  }
}
