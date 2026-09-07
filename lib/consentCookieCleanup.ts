export const APPROVED_QUICKEXIT_COOKIE_HOSTS = [
  "www.quickexit.ro",
  "quickexit.ro",
] as const;

const PAST_EXPIRES = "Thu, 01 Jan 1970 00:00:00 GMT";

/** Hostnames that are public suffixes. Never used as a Domain attribute. */
const PUBLIC_SUFFIXES = new Set([
  "com",
  "org",
  "net",
  "edu",
  "gov",
  "io",
  "app",
  "dev",
  "co",
  "uk",
  "ro",
  "vercel.app",
  "now.sh",
  "github.io",
  "netlify.app",
  "pages.dev",
  "web.app",
  "firebaseapp.com",
  "herokuapp.com",
  "azurewebsites.net",
  "cloudfront.net",
]);

function normalizeHostname(hostname: string): string {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");
}

function isIpAddress(host: string): boolean {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true;
  if (host.includes(":") && /^[0-9a-f:]+$/i.test(host)) return true;
  return false;
}

function isLocalhostOrIp(host: string): boolean {
  return host === "localhost" || host === "::1" || isIpAddress(host);
}

function stripLeadingDot(domain: string): string {
  return domain.replace(/^\./, "");
}

export function isForbiddenExpiryDomain(domain: string): boolean {
  const stripped = stripLeadingDot(String(domain || "").trim().toLowerCase());
  if (!stripped) return true;
  if (PUBLIC_SUFFIXES.has(stripped)) return true;
  return false;
}

function isNormalDnsHostname(host: string): boolean {
  if (!host || !host.includes(".")) return false;
  if (isLocalhostOrIp(host)) return false;
  if (isForbiddenExpiryDomain(host)) return false;
  return true;
}

function pushUnique(
  list: Array<string | null>,
  value: string | null,
): void {
  if (value != null && isForbiddenExpiryDomain(value)) return;
  if (list.includes(value)) return;
  list.push(value);
}

/**
 * Domain attributes used when expiring first-party tracking cookies.
 * `null` means host-only (no Domain attribute).
 * Normal DNS hosts expire the exact hostname and dotted exact hostname.
 * Root-domain targets are allowlisted for QuickExit production hosts only.
 */
export function trackingCookieExpiryDomains(
  hostname: string,
): ReadonlyArray<string | null> {
  const host = normalizeHostname(hostname);
  const domains: Array<string | null> = [null];
  if (!isNormalDnsHostname(host)) {
    return domains;
  }
  pushUnique(domains, host);
  pushUnique(domains, `.${host}`);
  if (host === "www.quickexit.ro" || host === "quickexit.ro") {
    pushUnique(domains, "www.quickexit.ro");
    pushUnique(domains, ".www.quickexit.ro");
    pushUnique(domains, "quickexit.ro");
    pushUnique(domains, ".quickexit.ro");
  }
  return domains;
}

export function buildTrackingCookieExpiryAssignments(
  name: string,
  hostname: string,
): string[] {
  const trimmed = String(name || "").trim();
  if (!trimmed) return [];
  const assignments: string[] = [];
  for (const domain of trackingCookieExpiryDomains(hostname)) {
    const base = `${trimmed}=; Path=/; Max-Age=0; Expires=${PAST_EXPIRES}`;
    if (domain == null) {
      assignments.push(base);
      assignments.push(`${base}; SameSite=Lax`);
      continue;
    }
    if (isForbiddenExpiryDomain(domain)) continue;
    assignments.push(`${base}; Domain=${domain}`);
  }
  return assignments;
}

export function isAnalyticsTrackingCookieName(name: string): boolean {
  return /^_ga($|_)/i.test(name) || /^_gid$/i.test(name);
}

export function isGoogleAdsClickCookieName(name: string): boolean {
  return /^_gcl_/i.test(name);
}

export function isTikTokTrackingCookieName(name: string): boolean {
  return /^(_tt|_ttp)/i.test(name) || /^tt_/i.test(name);
}

export function isAnalyticsTrackingStorageKey(key: string): boolean {
  if (/^(quickexit|quickExit)/i.test(key)) return false;
  return isAnalyticsTrackingCookieName(key);
}

export function isMarketingTrackingStorageKey(key: string): boolean {
  if (/^(quickexit|quickExit)/i.test(key)) return false;
  return (
    isGoogleAdsClickCookieName(key) ||
    isTikTokTrackingCookieName(key) ||
    /tiktok/i.test(key)
  );
}

export function readDocumentCookieNames(raw: string): string[] {
  return String(raw || "")
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter(Boolean);
}
