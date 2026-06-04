import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";

/** Client browser — auth OAuth, magic link, queries cu RLS (anon key). */
export const supabase = createClient(
  getSupabaseProjectUrl(),
  getSupabaseAnonKey()
);
