/**
 * Re-export client browser — păstrează importurile existente `@/lib/supabase`.
 * URL: NEXT_PUBLIC_SUPABASE_URL | Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export { supabase } from "@/lib/supabase/client";
export { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
