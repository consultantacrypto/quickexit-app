import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";

/**
 * Browser Supabase client — SSR-compatible cookies (shared with server getUser).
 * createBrowserClient is a singleton by default; same URL + anon key as before.
 */
export const supabase = createBrowserClient(
  getSupabaseProjectUrl(),
  getSupabaseAnonKey()
);
