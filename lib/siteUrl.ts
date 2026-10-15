import { safeInternalPath } from "@/lib/authRedirect";

/** Domeniu producție — SEO/metadate + Stripe success pe Production. */
export const PRODUCTION_SITE_URL = "https://www.quickexit.ro";

function normalizeOrigin(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function configuredSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    ""
  );
}

function isLocalDevelopment(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  const base = configuredSiteUrl().toLowerCase();
  return (
    base.includes("localhost") ||
    base.includes("127.0.0.1") ||
    base.includes("[::1]")
  );
}

/** Staging / Preview host — never Production www/apex. */
function isStagingConfiguredOrigin(raw: string): boolean {
  const v = raw.toLowerCase();
  if (!v) return false;
  if (v.includes("www.quickexit.ro")) return false;
  if (v === "https://quickexit.ro" || v === "http://quickexit.ro") return false;
  return (
    v.includes("quickexit-staging.vercel.app") ||
    v.includes("staging.quickexit.ro") ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.QE_STAGING_SITE === "1"
  );
}

/**
 * URL absolut pentru SEO, JSON-LD, Stripe (server).
 * Production: always www.quickexit.ro.
 * Staging/Preview: honor NEXT_PUBLIC_SITE_URL / BASE_URL when non-Production.
 * Localhost: NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_SITE_URL.
 */
export function getSiteUrl(): string {
  if (isLocalDevelopment()) {
    return normalizeOrigin(configuredSiteUrl() || "http://localhost:3000");
  }
  const configured = configuredSiteUrl();
  if (configured && isStagingConfiguredOrigin(configured)) {
    return normalizeOrigin(configured);
  }
  return PRODUCTION_SITE_URL;
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

function isLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function getLocalDevOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** Originea pentru redirect-uri auth: în browser = domeniul curent; pe server = dev/staging/prod. */
export function getAuthOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "development") {
    return getLocalDevOrigin();
  }
  const configured = configuredSiteUrl();
  if (configured && isStagingConfiguredOrigin(configured)) {
    return normalizeOrigin(configured);
  }
  return PRODUCTION_SITE_URL;
}

/** Locale din path-ul curent (next-intl) sau explicit; fallback ro. */
export function resolveAuthLocale(locale?: string): "ro" | "en" {
  if (locale === "en" || locale === "ro") return locale;
  if (typeof window !== "undefined") {
    const first = window.location.pathname.split("/").filter(Boolean)[0];
    if (first === "en" || first === "ro") return first;
  }
  return "ro";
}

/**
 * URL de callback Supabase (PKCE / OAuth / magic link).
 * Include prefixul de locale (/ro|/en) și rămâne pe același origin ca utilizatorul.
 */
export function getAuthCallbackUrl(next = "/dashboard", locale?: string): string {
  const resolvedLocale = resolveAuthLocale(locale);
  // safeInternalPath — startsWith("/") alone allows //host open redirects.
  const safeNext = safeInternalPath(next, "/dashboard");
  const qs = `next=${encodeURIComponent(safeNext)}`;
  const callbackPath = `/${resolvedLocale}/auth/callback?${qs}`;

  // În browser: întotdeauna origin-ul curent (localhost:3000 în dev, nu quickexit.ro).
  if (typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/+$/, "")}${callbackPath}`;
  }

  const origin = getAuthOrigin();
  return `${origin}${callbackPath}`;
}

/** Origin din request (route handlers) — preferă host-ul request-ului; localhost nu cade pe producție. */
export function resolveRedirectOrigin(request: Request): string {
  try {
    const url = new URL(request.url);
    return url.origin.replace(/\/+$/, "");
  } catch {
    if (process.env.NODE_ENV === "development") {
      return getLocalDevOrigin();
    }
    return PRODUCTION_SITE_URL;
  }
}
