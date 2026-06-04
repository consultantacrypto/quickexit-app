import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";

/** Client server (App Router) — citește/scrie sesiunea din cookie-uri pe Vercel. */
export async function createServerSupabaseClient() {
  const supabaseUrl = getSupabaseProjectUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Setarea cookie-urilor poate eșua în unele Server Components; route handlers OK.
        }
      },
    },
  });
}
