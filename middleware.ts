import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";
import { refreshSupabaseSession } from "./lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Channel links stay outside locale routing so bios can use /go/<code>.
  const path = request.nextUrl.pathname;
  if (path === "/go" || path.startsWith("/go/")) {
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
