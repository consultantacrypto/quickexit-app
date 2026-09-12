import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const client = readFileSync(resolve("app/[locale]/anunt/[id]/AnuntClient.tsx"), "utf8");
const route = readFileSync(resolve("app/api/listings/[id]/inquiry/route.ts"), "utf8");

const submitStart = client.indexOf("const submitListingInquiry");
assert(submitStart >= 0, "submitListingInquiry exists");
const submitFn = client.slice(submitStart, client.indexOf("const renderConversionPanel"));
assert(submitFn.includes("supabase.auth.getSession()"), "submit reads current session immediately");
assert(submitFn.includes("session?.access_token"), "submit requires access token");

const tokenGuard = submitFn.indexOf("if (!session?.access_token)");
const fetchCall = submitFn.indexOf("fetch(`/api/listings/${adData.id}/inquiry`");
assert(tokenGuard >= 0 && fetchCall > tokenGuard, "missing session does not call inquiry API");
assert(submitFn.slice(tokenGuard, fetchCall).includes("setShowAuthModal(true)"), "missing session reopens auth");
assert(submitFn.slice(tokenGuard, fetchCall).includes("return;"), "missing session returns before fetch");

assert(submitFn.includes('Authorization: `Bearer ${accessToken}`'), "authenticated submit sends Bearer access token");
assert(submitFn.includes('credentials: "same-origin"'), "inquiry fetch stays same-origin");

const analytics = submitFn.slice(submitFn.indexOf("trackEvent("));
assert(!analytics.includes("accessToken"), "analytics omit access token");
assert(!analytics.includes("access_token"), "analytics omit access_token");
assert(!analytics.includes("session"), "analytics omit session");
assert(!submitFn.includes("console."), "submit does not log session or token");

assert(route.includes("extractBearerToken"), "server reads Authorization Bearer");
assert(route.includes('if (!bearer)'), "missing Authorization is rejected");
assert(route.includes('jsonError(401, "auth_required"'), "invalid/missing auth is 401");
assert(route.includes("supabase.auth.getUser()"), "server verifies user from token via getUser");
assert(!route.includes("createServerSupabaseClient"), "inquiry API does not trust cookie session fallback");
assert(!route.includes("buyer_id:"), "insert still omits client buyer id");
assert(!/console\.(?:log|warn|error)\([\s\S]{0,200}bearer/.test(route), "server logs omit bearer");
assert(!/console\.(?:log|warn|error)\([\s\S]{0,200}access_token/.test(route), "server logs omit access_token");
assert(!/console\.(?:log|warn|error)\([\s\S]{0,200}Authorization/.test(route), "server logs omit Authorization");

console.log("OK listing-inquiry-auth");
