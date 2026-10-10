import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { safeInternalPath } from "../lib/authRedirect";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

// --- E. safe internal redirect ---

assert(safeInternalPath("/dashboard") === "/dashboard", "accepts /dashboard");
assert(safeInternalPath("/ro/hq-admin") === "/ro/hq-admin", "accepts locale path");
assert(safeInternalPath("//evil.com") === "/dashboard", "rejects //evil.com");
assert(safeInternalPath("//evil.com/phish") === "/dashboard", "rejects //evil.com/phish");
assert(safeInternalPath("\\\\evil") === "/dashboard", "rejects backslash unc");
assert(safeInternalPath("/\\evil") === "/dashboard", "rejects /\\evil");
assert(safeInternalPath("https://evil.com") === "/dashboard", "rejects absolute https");
assert(safeInternalPath("http://evil.com") === "/dashboard", "rejects absolute http");
assert(safeInternalPath("evil.com") === "/dashboard", "rejects bare host");
assert(safeInternalPath(null) === "/dashboard", "null -> fallback");
assert(safeInternalPath(undefined, "/home") === "/home", "undefined uses custom fallback");
assert(
  safeInternalPath("/%2F%2Fevil.com") === "/dashboard",
  "rejects encoded protocol-relative"
);
assert(safeInternalPath("/path@evil") === "/dashboard", "rejects @ userinfo trick");

// --- A–D, F: architecture ---

const browserClient = readFileSync(resolve("lib/supabase/client.ts"), "utf8");
const serverClient = readFileSync(resolve("lib/supabase/server.ts"), "utf8");
const mwHelper = readFileSync(resolve("lib/supabase/middleware.ts"), "utf8");
const middleware = readFileSync(resolve("middleware.ts"), "utf8");
const callbackRoute = readFileSync(
  resolve("app/[locale]/auth/callback/route.ts"),
  "utf8"
);
const unauthorized = readFileSync(
  resolve("app/components/HqAdminUnauthorized.tsx"),
  "utf8"
);
const siteUrl = readFileSync(resolve("lib/siteUrl.ts"), "utf8");
const authModal = readFileSync(resolve("app/components/AuthModal.tsx"), "utf8");
const pageAuth = readFileSync(resolve("lib/hqAdminPageAuth.ts"), "utf8");

assert(
  browserClient.includes("createBrowserClient") &&
    browserClient.includes('@supabase/ssr'),
  "A. browser client uses createBrowserClient from @supabase/ssr"
);
assert(
  !browserClient.includes('from "@supabase/supabase-js"') &&
    !/createClient\s*\(/.test(browserClient),
  "A. browser client no longer uses plain createClient"
);
assert(
  !browserClient.includes("SERVICE_ROLE") &&
    !browserClient.includes("service_role"),
  "no service-role in browser client"
);

assert(
  serverClient.includes("createServerClient") &&
    serverClient.includes('@supabase/ssr') &&
    serverClient.includes("cookies()"),
  "B. server client uses createServerClient + cookies()"
);
assert(
  pageAuth.includes("createServerSupabaseClient") &&
    pageAuth.includes("getUser"),
  "F. HQ page auth uses server getUser path"
);
assert(
  !pageAuth.includes("getSession()"),
  "F. HQ page auth does not authorize via getSession"
);

assert(
  mwHelper.includes("createServerClient") &&
    mwHelper.includes("getUser()") &&
    mwHelper.includes("setAll"),
  "C. middleware helper refreshes via getUser + setAll cookies"
);
assert(
  middleware.includes("createMiddleware") &&
    middleware.includes("refreshSupabaseSession") &&
    middleware.includes("handleI18nRouting"),
  "C. middleware composes next-intl + Supabase refresh"
);
assert(
  middleware.includes('matcher: ["/((?!api|trpc|_next|_vercel|.*\\\\..*).*)"]') ||
    middleware.includes("(?!api|trpc|_next|_vercel"),
  "L. API routes still excluded from middleware matcher"
);

assert(
  callbackRoute.includes("exchangeCodeForSession") &&
    callbackRoute.includes("createServerClient") &&
    callbackRoute.includes("safeInternalPath"),
  "D. auth callback exchanges code server-side with safe next"
);
assert(
  !existsSync(resolve("app/[locale]/auth/callback/page.tsx")),
  "D. client-only callback page removed"
);

assert(
  siteUrl.includes("safeInternalPath") &&
    authModal.includes("safeInternalPath"),
  "H. callback URL builders use safeInternalPath"
);

// --- G/H. HQ unauthorized copy ---

assert(
  unauthorized.includes("Sign in required") &&
    unauthorized.includes("Please sign in to continue.") &&
    unauthorized.includes("Autentificare necesară") &&
    unauthorized.includes("Conectează-te pentru a continua."),
  "H. anon HQ copy is sign-in required (not access denied)"
);
assert(
  unauthorized.includes("Access denied.") &&
    unauthorized.includes("Acces refuzat."),
  "G. forbidden still says access denied"
);

const anonBlock = unauthorized.slice(
  unauthorized.indexOf('variant === "anon"'),
  unauthorized.indexOf('variant === "error"')
);
assert(
  !anonBlock.includes("Access denied.") &&
    !anonBlock.includes("Acces refuzat."),
  "H. anon block must not show access denied"
);

console.log("PASS assert-supabase-ssr-session");
