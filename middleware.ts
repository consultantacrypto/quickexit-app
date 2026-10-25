import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";
import { refreshSupabaseSession } from "./lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // /bmk is the public token page (rewritten to /ro/bmk). next-intl must not
  // redirect it to /ro/bmk. Logo files under /bmk/*.png are already outside
  // this matcher because the path contains a dot.
  if (pathname === "/bmk" || pathname === "/bmk/") {
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
