/** Domeniu producție — singura origine pentru SEO/metadate în afara localhost. */
export const PRODUCTION_SITE_URL = "https://www.quickexit.ro";

function isLocalDevelopment(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const base = (
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    ""
  ).toLowerCase();
  return (
    base.includes("localhost") ||
    base.includes("127.0.0.1") ||
    base.includes("[::1]")
  );
}

/**
 * URL absolut pentru SEO, JSON-LD, Stripe (server).
 * Producție: întotdeauna www.quickexit.ro — fără env (evită cache Vercel la build).
 * Localhost: NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_SITE_URL.
 */
export function getSiteUrl(): string {
  if (!isLocalDevelopment()) {
    return PRODUCTION_SITE_URL;
  }
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** @deprecated Folosește PRODUCTION_SITE_URL */
export const DEFAULT_SITE_URL = PRODUCTION_SITE_URL;

/** Cale sau URL relativ → URL absolut pe domeniul site-ului. */
export function toAbsoluteSiteUrl(pathOrUrl: string): string {
  const siteUrl = getSiteUrl();
  const trimmed = String(pathOrUrl || "").trim();
  if (!trimmed) return siteUrl;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${siteUrl}${trimmed}`;
  return `${siteUrl}/${trimmed}`;
}

/** Originea pentru redirect-uri auth: în browser = domeniul curent; pe server = getSiteUrl(). */
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
