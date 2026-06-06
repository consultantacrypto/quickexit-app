import { routing } from "./routing";

const localePattern = routing.locales.join("|");
const LOCALE_PREFIX_RE = new RegExp(`^/(${localePattern})(?=/|$)`);

/**
 * Ensures internal app paths are locale-free before passing them to next-intl Link.
 * Prevents double prefixes like /ro/ro/anunt/id when a path already includes /ro.
 */
export function normalizeAppPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutLocale = withLeadingSlash.replace(LOCALE_PREFIX_RE, "");
  const normalized = withoutLocale.replace(/\/{2,}/g, "/");

  return normalized.length > 0 ? normalized : "/";
}

export function listingDetailPath(id: string): string {
  const cleanId = String(id ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  return normalizeAppPath(`/anunt/${cleanId}`);
}

export function demandOfferPath(id: string): string {
  const cleanId = String(id ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  return normalizeAppPath(`/trimite-oferta/${cleanId}`);
}

export function categoryPath(slug: string): string {
  const cleanSlug = String(slug ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  return normalizeAppPath(`/categorii/${cleanSlug}`);
}
