/**
 * Pure HQ admin allowlist helpers — safe for any runtime.
 * Fail-closed: missing / empty / invalid HQ_ADMIN_EMAILS → [].
 * Never falls back to a hardcoded identity.
 *
 * Optional Preview/Staging additive list: HQ_STAGING_ADDITIONAL_EMAILS.
 * Applied only when Supabase project host is Staging AND Vercel deployment
 * context is explicitly non-Production. Ignored on Production deployments
 * even if the variable is accidentally set.
 */

/** Minimal email-shaped check (server allowlist only). */
const EMAIL_LIKE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STAGING_SUPABASE_HOST = "nlnzlswjjplofpkhoxtr.supabase.co";
const PRODUCTION_SUPABASE_HOST = "geywuzwbzecknokvnins.supabase.co";

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
 * True only when additive Staging HQ emails may be merged.
 * Requires exact Staging Supabase host + non-Production Vercel env.
 * Does not trust QE_STAGING_SITE or NODE_ENV alone.
 */
export function isHqStagingAdditionalAllowlistEligible(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const vercelEnv = String(env.VERCEL_ENV ?? "")
    .trim()
    .toLowerCase();
  // Trustworthy deployment context: Vercel must classify this runtime.
  // Missing VERCEL_ENV (local/unknown) or production → fail closed for additive list.
  if (vercelEnv !== "preview" && vercelEnv !== "development") {
    return false;
  }

  const rawUrl = String(env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  if (!rawUrl) return false;

  let hostname = "";
  try {
    hostname = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (hostname !== STAGING_SUPABASE_HOST) return false;
  // Defense: reject any URL that also embeds the Production project host.
  if (rawUrl.toLowerCase().includes(PRODUCTION_SUPABASE_HOST)) return false;

  return true;
}

/** Additive emails — empty unless Staging host + non-Production Vercel context. */
export function getHqStagingAdditionalEmails(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  if (!isHqStagingAdditionalAllowlistEligible(env)) return [];
  return parseHqAdminEmails(env.HQ_STAGING_ADDITIONAL_EMAILS);
}

/** Effective HQ allowlist: primary ∪ eligible Staging additive. */
export function getEffectiveHqAdminEmails(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const primary = parseHqAdminEmails(env.HQ_ADMIN_EMAILS);
  const additional = getHqStagingAdditionalEmails(env);
  if (additional.length === 0) return primary;

  const seen = new Set(primary);
  const out = [...primary];
  for (const email of additional) {
    if (seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/**
 * Canonical membership check. Empty effective allowlist always denies.
 * Does not reveal allowlist contents.
 */
export function isHqAdminEmail(email: string | undefined | null): boolean {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  const allowlist = getEffectiveHqAdminEmails();
  if (allowlist.length === 0) return false;
  return allowlist.includes(normalized);
}
