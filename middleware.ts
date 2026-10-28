import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";
import { refreshSupabaseSession } from "./lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // /bmk and /dealeri are public unprefixed URLs (rewritten to /ro/...).
  // next-intl must not redirect them to /ro/bmk or /ro/dealeri.
  if (
    pathname === "/bmk" ||
    pathname === "/bmk/" ||
    pathname === "/dealeri" ||
    pathname === "/dealeri/"
  ) {
    return NextResponse.next();
  }

  // Locale routing first (redirects / rewrites), then attach refreshed auth cookies.
  const response = handleI18nRouting(request);
  return refreshSupabaseSession(request, response);
}

export const config = {
  // Unchanged: API routes intentionally excluded (Bearer auth semantics preserved).
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
