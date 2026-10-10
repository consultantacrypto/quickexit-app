import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";

/**
 * Refresh Supabase auth cookies onto an existing NextResponse (e.g. next-intl).
 * Must call getUser() so expired sessions are refreshed and written back.
 */
export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const supabase = createServerClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    }
  );

  // Authoritative refresh — do not use getSession() for auth decisions.
  await supabase.auth.getUser();

  return response;
}
