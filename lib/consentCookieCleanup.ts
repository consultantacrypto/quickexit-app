export const APPROVED_QUICKEXIT_COOKIE_HOSTS = [
  "www.quickexit.ro",
  "quickexit.ro",
] as const;

const PAST_EXPIRES = "Thu, 01 Jan 1970 00:00:00 GMT";

function normalizeHostname(hostname: string): string {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

/**
 * Domain attributes used when expiring first-party tracking cookies.
 * `null` means host-only (no Domain attribute).
 * Root-domain targets are allowlisted for QuickExit production hosts only.
 */
export function trackingCookieExpiryDomains(
  hostname: string,
): ReadonlyArray<string | null> {
  const host = normalizeHostname(hostname);
  if (host === "www.quickexit.ro" || host === "quickexit.ro") {
    return [
      null,
      "www.quickexit.ro",
      ".www.quickexit.ro",
      "quickexit.ro",
      ".quickexit.ro",
    ];
  }
  return [null];
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
