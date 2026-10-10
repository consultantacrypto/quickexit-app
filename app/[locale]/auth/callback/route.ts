import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeInternalPath } from "@/lib/authRedirect";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";

/**
 * Server-side PKCE code exchange — writes Supabase auth cookies for SSR getUser().
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> }
) {
  const { locale: localeParam } = await context.params;
  const locale = localeParam === "en" ? "en" : "ro";
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"), "/dashboard");
  const origin = url.origin.replace(/\/+$/, "");
  const errorRedirect = NextResponse.redirect(
    `${origin}/${locale}?auth=error`
  );

  if (!code) {
    return errorRedirect;
  }

  const redirectTarget = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectTarget.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            redirectTarget.headers.set(key, value);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return errorRedirect;
  }

  return redirectTarget;
}
