/**
 * URL-uri absolute pentru SEO, Stripe, Supabase Auth.
 * Prioritate: NEXT_PUBLIC_BASE_URL → NEXT_PUBLIC_SITE_URL.
 * Nu folosim NEXT_PUBLIC_VERCEL_URL și nu hardcodăm domenii Vercel.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";
  return raw.replace(/\/+$/, "");
}

/** Originea pentru redirect-uri auth: în browser = domeniul curent; pe server = env. */
export function getAuthOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  return getSiteUrl();
}

/**
 * URL de callback Supabase (PKCE / OAuth / magic link).
 * Rămâne pe același origin ca utilizatorul — evită redirect forțat pe *.vercel.app.
 */
export function getAuthCallbackUrl(next = "/dashboard"): string {
  const origin = getAuthOrigin();
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  const qs = `next=${encodeURIComponent(safeNext)}`;
  if (origin) {
    return `${origin}/auth/callback?${qs}`;
  }
  return `/auth/callback?${qs}`;
}

/** Origin din request (route handlers) — agnostic la domeniu. */
export function resolveRedirectOrigin(request: Request): string {
  try {
    return new URL(request.url).origin.replace(/\/+$/, "");
  } catch {
    return getSiteUrl();
  }
}
