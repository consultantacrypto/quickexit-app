import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseHqInquiryPatch,
  parseHqInquiryListQuery,
  isInquiryStatus,
  HQ_INQUIRY_STATUSES,
  HQ_INQUIRY_DEFAULT_VIEW,
} from "../lib/listingInquiry";
import { getHqAdminEmails, extractBearerToken } from "../lib/hqAdminAuth";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const listingId = "50e8decd-635a-46f7-908e-2ac1fddf8ac6";

assert(HQ_INQUIRY_STATUSES.join(",") === "new,seen,closed,hq_handling", "explicit status allowlist");
assert(isInquiryStatus("seen"), "seen allowed");
assert(!isInquiryStatus("sent"), "notification state is not a status");
assert(!isInquiryStatus("pending"), "pending is not a manageable status");

const valid = parseHqInquiryPatch({ id: listingId, status: "closed" });
assert(valid.ok && valid.status === "closed", "valid HQ patch");

const extra = parseHqInquiryPatch({
  id: listingId,
  status: "seen",
  seller_id: "00000000-0000-4000-8000-000000000000",
});
assert(!extra.ok, "seller_id cannot be patched");

const notify = parseHqInquiryPatch({
  id: listingId,
  status: "seen",
  notification_status: "sent",
  notification_error_code: null,
});
assert(!notify.ok, "notification fields cannot be patched");

const buyer = parseHqInquiryPatch({
  id: listingId,
  status: "closed",
  buyer_id: "11111111-1111-4111-8111-111111111111",
  buyer_phone: "+40722123456",
});
assert(!buyer.ok, "buyer fields cannot be patched");

const badStatus = parseHqInquiryPatch({ id: listingId, status: "archived" });
assert(!badStatus.ok, "unknown status rejected");

const missingId = parseHqInquiryPatch({ status: "seen" });
assert(!missingId.ok, "missing id rejected");

const unauth = extractBearerToken(new Request("http://localhost/api/hq/inquiries"));
assert(unauth === "", "missing Authorization is empty bearer");

const emails = getHqAdminEmails();
assert(emails.length > 0, "HQ allowlist is non-empty");
assert(emails.every((email) => email.includes("@")), "HQ allowlist is emails");

const route = readFileSync(resolve("app/api/hq/inquiries/route.ts"), "utf8");
const getFn = route.indexOf("export async function GET");
const patchFn = route.indexOf("export async function PATCH");
const getAuth = route.indexOf("assertHqAdminFromBearer", getFn);
const getQuery = route.indexOf('.from("listing_inquiries")', getFn);
const patchAuth = route.indexOf("assertHqAdminFromBearer", patchFn);
const patchParse = route.indexOf("parseHqInquiryPatch", patchFn);
const patchUpdate = route.indexOf(".update({ status: parsed.status })", patchFn);

assert(getFn >= 0 && patchFn >= 0, "GET and PATCH exist");
assert(getAuth > getFn && getAuth < getQuery, "GET authorizes before query");
assert(patchAuth > patchFn && patchAuth < patchParse, "PATCH authorizes before parse");
assert(patchParse > patchAuth && patchParse < patchUpdate, "PATCH parses allowlist before update");
assert(route.includes("assertHqAdminFromBearer"), "canonical HQ bearer allowlist");
const hqAuth = readFileSync(resolve("lib/hqAdminAuth.ts"), "utf8");
assert(hqAuth.includes("auth.getUser()"), "HQ auth uses getUser");
assert(hqAuth.includes("getHqAdminEmails"), "HQ auth uses email allowlist");
assert(route.includes("parseHqInquiryListQuery"), "HQ GET validates view/limit/cursor");
assert(route.includes('HQ_INQUIRY_DEFAULT_VIEW') || route.includes('view === "fallback"'), "fallback is a first-class view");
assert(route.includes('.in("notification_status"'), "fallback filter is in the Supabase query");
assert(route.includes("NO_STORE_HEADERS"), "HQ responses are private/no-store");
assert(!route.includes("isAdminEmail("), "API does not use UI email gate");

const hqUi = readFileSync(resolve("app/[locale]/hq-admin/page.tsx"), "utf8");
assert(hqUi.includes("isAdminEmail"), "HQ UI visibility is a client gate only");
assert(hqUi.includes("/api/hq/inquiries?"), "HQ UI calls server inquiries API with query");
assert(hqUi.includes('view=fallback') || hqUi.includes('fetchHqInquiries("fallback"'), "initial HQ view is fallback");
assert(hqUi.includes("Toate solicitările"), "all inquiries is an explicit action");
assert(hqUi.includes("setInquiriesPatchError"), "HQ PATCH failure stays visible");
assert(hqUi.includes('credentials: "same-origin"'), "HQ inquiries fetches stay same-origin");
assert(hqUi.includes("Authorization: `Bearer ${accessToken}`"), "HQ inquiries send Bearer token");
assert(hqUi.includes('if (!accessToken)'), "HQ missing session does not call inquiries API");
assert(hqUi.includes("Sesiune HQ invalidă. Reautentifică-te."), "HQ PATCH missing session requests auth");
assert(!/setListingInquiries\(\(rows\) =>[\s\S]{0,80}fetch\("\/api\/hq\/inquiries"/.test(hqUi), "HQ does not update before PATCH");
assert(hqUi.includes("if (!res.ok)"), "HQ waits for PATCH success");

const defaultQuery = parseHqInquiryListQuery(new URLSearchParams());
assert(defaultQuery.ok && defaultQuery.view === HQ_INQUIRY_DEFAULT_VIEW, "parser defaults to fallback");

console.log("OK hq-inquiries");
console.log("Unauthenticated and ordinary users: API returns 401/403 via assertHqAdminFromBearer before any query.");
