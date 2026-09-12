import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const dashboard = readFileSync(resolve("app/[locale]/dashboard/page.tsx"), "utf8");
const sellerRoute = readFileSync(resolve("app/api/listing-inquiries/[id]/status/route.ts"), "utf8");
const inquiryClient = readFileSync(resolve("app/[locale]/anunt/[id]/AnuntClient.tsx"), "utf8");
const inquiryRoute = readFileSync(resolve("app/api/listings/[id]/inquiry/route.ts"), "utf8");
const hqUi = readFileSync(resolve("app/[locale]/hq-admin/page.tsx"), "utf8");
const hqRoute = readFileSync(resolve("app/api/hq/inquiries/route.ts"), "utf8");
const hqAuth = readFileSync(resolve("lib/hqAdminAuth.ts"), "utf8");
const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8")) as {
  Dashboard: { inquiries: { authRequired: string; updateFailed: string } };
};
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8")) as {
  Dashboard: { inquiries: { authRequired: string; updateFailed: string } };
};

const updateStart = dashboard.indexOf("const updateInquiryStatus");
assert(updateStart >= 0, "updateInquiryStatus exists");
const updateFn = dashboard.slice(updateStart, dashboard.indexOf("const handleOfferAction"));

assert(updateFn.includes("supabase.auth.getSession()"), "1 seller PATCH reads current session immediately");
assert(updateFn.includes("session?.access_token"), "1 seller PATCH requires access token");
assert(
  updateFn.includes('Authorization: `Bearer ${accessToken}`'),
  "1 seller PATCH sends Bearer access token",
);
assert(updateFn.includes('credentials: "same-origin"'), "1 seller PATCH stays same-origin");

const tokenGuard = updateFn.indexOf("if (!session?.access_token)");
const fetchCall = updateFn.indexOf("fetch(`/api/listing-inquiries/${inquiryId}/status`");
assert(tokenGuard >= 0 && fetchCall > tokenGuard, "2 missing seller session does not call status API");
assert(updateFn.slice(tokenGuard, fetchCall).includes("return;"), "2 missing seller session returns before fetch");
assert(
  updateFn.slice(tokenGuard, fetchCall).includes('tDash("inquiries.authRequired")'),
  "2 missing seller session requests authentication",
);

assert(sellerRoute.includes("extractBearerToken"), "3 server reads Authorization Bearer");
assert(sellerRoute.includes("if (!bearer)"), "3 missing Authorization is rejected");
assert(sellerRoute.includes('jsonError(401, "auth_required"'), "3 invalid/missing auth is 401");
assert(sellerRoute.includes("supabase.auth.getUser()"), "3 server verifies user from token via getUser");
assert(!sellerRoute.includes("createServerSupabaseClient"), "3 seller API does not trust cookie session fallback");
assert(sellerRoute.includes("createUserClient(bearer)"), "3 seller API uses token-scoped anon client");

const hqGetStart = hqUi.indexOf("const fetchHqInquiries");
const hqGetFn = hqUi.slice(hqGetStart, hqUi.indexOf("const loadAdminData"));
assert(hqGetFn.includes("supabase.auth.getSession()"), "4 HQ GET reads current session");
assert(hqGetFn.includes('if (!accessToken)'), "4 HQ GET missing session does not fetch");
assert(hqGetFn.includes('Authorization: `Bearer ${accessToken}`'), "4 HQ GET sends Bearer");
assert(hqGetFn.includes('credentials: "same-origin"'), "4 HQ GET stays same-origin");

const hqPatchStart = hqUi.indexOf('fetch("/api/hq/inquiries"');
assert(hqPatchStart >= 0, "4 HQ PATCH fetch exists");
const hqPatchWindow = hqUi.slice(hqUi.lastIndexOf("onClick={async () => {", hqPatchStart), hqUi.indexOf("finally", hqPatchStart));
assert(hqPatchWindow.includes("supabase.auth.getSession()"), "4 HQ PATCH reads current session");
assert(hqPatchWindow.includes('if (!accessToken)'), "4 HQ PATCH missing session does not fetch");
assert(hqPatchWindow.includes("Reautentifică-te"), "4 HQ PATCH missing session requests auth");
assert(hqPatchWindow.includes('Authorization: `Bearer ${accessToken}`'), "4 HQ PATCH sends Bearer");
assert(hqPatchWindow.includes('credentials: "same-origin"'), "4 HQ PATCH stays same-origin");
assert(!hqPatchWindow.includes("role"), "4 HQ PATCH body does not send HQ role");
assert(!hqPatchWindow.includes("seller_id"), "4 HQ PATCH body does not send seller_id");

assert(hqRoute.includes("assertHqAdminFromBearer(extractBearerToken(req))"), "4 HQ API authorizes from Bearer");
assert(hqAuth.includes("auth.getUser()"), "4 HQ verifies token with getUser");
assert(hqAuth.includes("getHqAdminEmails"), "4 HQ role is server allowlist, not body");
assert(!hqRoute.includes("createServerSupabaseClient"), "4 HQ inquiries API does not use cookie session fallback");

assert(!updateFn.includes("trackEvent("), "5 seller status PATCH has no analytics");
assert(!updateFn.includes("console."), "5 seller status PATCH does not log session or token");
assert(!updateFn.includes("payload.error"), "5 seller UI errors omit buyer-facing API copy");
assert(!updateFn.includes("payload?.error"), "5 seller UI errors omit payload.error");
assert(updateFn.includes('tDash("inquiries.updateFailed")'), "5 seller failures use dashboard copy");
assert(
  ro.Dashboard.inquiries.authRequired.startsWith("Autentifică-te"),
  "5 Romanian dashboard auth error is Romanian",
);
assert(
  !ro.Dashboard.inquiries.updateFailed.includes("Sign in"),
  "5 Romanian updateFailed is not English buyer copy",
);
assert(
  en.Dashboard.inquiries.authRequired.includes("Sign in"),
  "5 English dashboard auth error stays on dashboard copy",
);
assert(!/console\.(?:log|warn|error)\([\s\S]{0,200}bearer/.test(sellerRoute), "5 server logs omit bearer");
assert(!/console\.(?:log|warn|error)\([\s\S]{0,200}access_token/.test(sellerRoute), "5 server logs omit access_token");
assert(!/console\.(?:log|warn|error)\([\s\S]{0,200}Authorization/.test(sellerRoute), "5 server logs omit Authorization");

assert(sellerRoute.includes('supabase.rpc("listing_inquiries_seller_set_status"'), "6 seller status uses protected RPC");
assert(!sellerRoute.includes(".update({ status"), "6 seller status does not patch listing_inquiries directly");
assert(!sellerRoute.includes("seller_id"), "6 seller identity is not taken from the body");
assert(!sellerRoute.includes("buyer_id"), "6 buyer identity is not taken from the body");

const submitStart = inquiryClient.indexOf("const submitListingInquiry");
const submitFn = inquiryClient.slice(submitStart, inquiryClient.indexOf("const renderConversionPanel"));
assert(submitFn.includes('Authorization: `Bearer ${accessToken}`'), "7 inquiry POST still sends Bearer");
assert(submitFn.includes("supabase.auth.getSession()"), "7 inquiry POST still reads session");
assert(inquiryRoute.includes("extractBearerToken"), "7 inquiry POST still requires Bearer");
assert(inquiryRoute.includes("supabase.auth.getUser()"), "7 inquiry POST still verifies getUser");
assert(!inquiryRoute.includes("createServerSupabaseClient"), "7 inquiry POST still has no cookie fallback");

console.log("OK listing-inquiry-status-auth");
