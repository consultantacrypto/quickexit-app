/**
 * Pure HQ admin allowlist helpers — safe for any runtime.
 * Fail-closed: missing / empty / invalid HQ_ADMIN_EMAILS → [].
 * Never falls back to a hardcoded identity.
 */

/** Minimal email-shaped check (server allowlist only). */
const EMAIL_LIKE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseHqAdminEmails(raw: string | undefined | null): string[] {
  if (raw == null) return [];
  const trimmed = String(raw).trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of trimmed.split(",")) {
    const email = part.trim().toLowerCase();
    if (!email || !EMAIL_LIKE_RE.test(email)) continue;
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/** Server-env allowlist from HQ_ADMIN_EMAILS. Empty when unset/invalid. */
export function getHqAdminEmails(): string[] {
  return parseHqAdminEmails(process.env.HQ_ADMIN_EMAILS);
}

/**
 * Canonical membership check. Empty allowlist always denies.
 * Does not reveal allowlist contents.
 */
export function isHqAdminEmail(email: string | undefined | null): boolean {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  const allowlist = getHqAdminEmails();
  if (allowlist.length === 0) return false;
  return allowlist.includes(normalized);
}
