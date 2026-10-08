/**
 * Sursă unică pentru URL + anon key Supabase.
 * NU folosi NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_SITE_URL aici — doar variabilele Supabase.
 *
 * Loopback (127.0.0.1 / localhost) is allowed ONLY outside Production builds
 * (NODE_ENV !== "production" and VERCEL_ENV !== "production").
 * Production and Production-like runtimes still require *.supabase.co.
 */

export function isSupabaseLoopbackAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.NODE_ENV !== "production";
}

export function isApprovedSupabaseProjectUrl(rawUrl: string): boolean {
  const url = String(rawUrl ?? "").trim();
  if (!url) return false;

  if (/\.supabase\.co\b/i.test(url)) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  if (!isSupabaseLoopbackAllowed()) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "[::1]";
  } catch {
    return false;
  }
}

export function getSupabaseProjectUrl(): string {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

  if (!url) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL lipsește. Setează https://<project-ref>.supabase.co (nu URL-ul site-ului)."
    );
  }

  if (!isApprovedSupabaseProjectUrl(url)) {
    throw new Error(
      `[supabase] NEXT_PUBLIC_SUPABASE_URL invalid: "${url}". ` +
        `Production necesită *.supabase.co. Loopback (127.0.0.1/localhost) este permis doar în development local.`
    );
  }

  return url.replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string {
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!key) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY lipsește."
    );
  }

  return key;
}
