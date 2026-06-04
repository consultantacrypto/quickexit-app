/**
 * Sursă unică pentru URL + anon key Supabase.
 * NU folosi NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_SITE_URL aici — doar variabilele Supabase.
 */

export function getSupabaseProjectUrl(): string {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

  if (!url) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL lipsește. Setează https://<project-ref>.supabase.co (nu URL-ul site-ului)."
    );
  }

  if (!/\.supabase\.co\b/i.test(url)) {
    throw new Error(
      `[supabase] NEXT_PUBLIC_SUPABASE_URL invalid: "${url}". Trebuie să fie domeniul proiectului Supabase (*.supabase.co), nu quickexit.ro sau BASE_URL.`
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
