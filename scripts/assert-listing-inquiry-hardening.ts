import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  INQUIRY_AUTHORITATIVE_RATE_SCOPE,
  INQUIRY_RATE_LIMIT_SCOPE,
  LISTING_INQUIRY_CONSENT_VERSION,
  canSellerTransitionInquiry,
  extractInquiryDbErrorCode,
  inquirySuccessCopy,
  isPublicInquirableListing,
  isSameOriginMutationRequest,
  mapInquiryWriteError,
  parseHqInquiryListQuery,
  parseSellerInquiryStatusBody,
  validateListingInquiryBody,
} from "../lib/listingInquiry";
import { canSellerSetInquiryStatus, SAMPLE_INQUIRY } from "../lib/listingInquiryRls";
import { hasEmailProviderConfig, isSellerEmailConfigured } from "../lib/notifySeller";
import {
  assertLocalSupabaseDbTarget,
  assertLocalSupabaseWriteTarget,
} from "./assert-local-supabase-target";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const listingId = "50e8decd-635a-46f7-908e-2ac1fddf8ac6";
const sellerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

assert(
  !isPublicInquirableListing({
    status: "inactive",
    is_seed: false,
    user_id: sellerId,
  }),
  "1 inactive listing rejected",
);
assert(
  !isPublicInquirableListing({
    status: "active",
    is_seed: true,
    user_id: sellerId,
  }),
  "1 seed listing rejected",
);
assert(
  !isPublicInquirableListing({
    status: "active",
    is_seed: false,
    user_id: sellerId,
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  }),
  "1 expired listing rejected",
);

const sql = readFileSync(resolve("docs/internal/sql/listing-inquiries.sql"), "utf8");
assert(sql.includes("pg_advisory_xact_lock"), "4 advisory lock in SQL");
assert(sql.includes("interval '15 minutes'"), "2 rolling 15-minute SQL rule");
assert(sql.includes("hourly_count >= 5"), "3 five-per-hour SQL rule");
assert(sql.includes("NEW.buyer_id := auth.uid()"), "5 buyer from auth.uid");
assert(sql.includes("NEW.seller_id := listing_owner"), "5 seller from listing");
assert(sql.includes(`NEW.consent_version := '${LISTING_INQUIRY_CONSENT_VERSION}'`), "6 trigger consent version");
assert(sql.includes("listing_inquiries_consent_version_value"), "6 SQL consent constraint");
assert(INQUIRY_AUTHORITATIVE_RATE_SCOPE === "database-advisory-lock", "rate authority is database");
assert(INQUIRY_RATE_LIMIT_SCOPE === "instance-local-supplemental", "instance map is supplemental");

const inquiryRoute = readFileSync(resolve("app/api/listings/[id]/inquiry/route.ts"), "utf8");
assert(inquiryRoute.includes("isSameOriginMutationRequest"), "7 same-origin gate");
assert(inquiryRoute.includes("extractBearerToken"), "inquiry requires Authorization Bearer");
assert(inquiryRoute.includes("supabase.auth.getUser()"), "inquiry verifies token with getUser");
assert(!inquiryRoute.includes("createServerSupabaseClient"), "inquiry does not use cookie session fallback");
assert(inquiryRoute.includes("consent_version: LISTING_INQUIRY_CONSENT_VERSION"), "6 server consent on insert");
assert(!inquiryRoute.includes("buyer_id:"), "5 insert omits client buyer_id");
assert(inquiryRoute.includes("{ success: true, persisted: true }"), "8 generic success object");
assert(!/jsonOk[\s\S]{0,220}notification_status/.test(inquiryRoute), "8 jsonOk omits notification_status");
assert(inquiryRoute.includes("NO_STORE_HEADERS"), "inquiry POST no-store");
assert(inquiryRoute.includes("listing_unavailable"), "1 listing_unavailable mapping");

assert(
  extractInquiryDbErrorCode({ message: "QEX:duplicate_inquiry" }) === "duplicate_inquiry",
  "maps QEX duplicate",
);
assert(mapInquiryWriteError({ message: "QEX:rate_limited" }).error_code === "rate_limited", "maps QEX rate_limited");
assert(
  mapInquiryWriteError({ message: "syntax error at or near SELECT" }).error_code === "persist_failed",
  "raw SQL is not returned as public code",
);

const previewOrigin = isSameOriginMutationRequest(
  new Headers({
    origin: "https://quickexit-git-feat.vercel.app",
    host: "quickexit-git-feat.vercel.app",
    "x-forwarded-proto": "https",
  }),
);
assert(previewOrigin, "7 preview host same-origin accepted");
const localhostOrigin = isSameOriginMutationRequest(
  new Headers({
    origin: "http://localhost:3000",
    host: "localhost:3000",
  }),
);
assert(localhostOrigin, "7 localhost same-origin accepted");

const spoofed = validateListingInquiryBody(listingId, {
  phone: "+40722123456",
  consent: true,
  consent_version: "attacker-1",
  locale: "en",
});
assert(spoofed.ok, "valid body");
if (spoofed.ok) {
  assert(!("consent_version" in spoofed.data), "6 client consent_version discarded");
  assert(spoofed.data.locale === "en", "locale bounded");
}

assert(!hasEmailProviderConfig({ env: { SMTP_HOST: "smtp.example.com" } }), "9 SMTP is not a provider");
assert(
  isSellerEmailConfigured({
    env: { RESEND_API_KEY: "re_test", RESEND_FROM: "QuickExit <alerts@example.com>" },
  }),
  "9 Resend config detected",
);

const notifySource = readFileSync(resolve("scripts/assert-notify-seller.ts"), "utf8");
assert(notifySource.includes("fetchImpl:"), "10 notification tests mock fetch");
assert(!notifySource.includes("api.resend.com"), "10 tests do not hardcode a live send");

const hqRoute = readFileSync(resolve("app/api/hq/inquiries/route.ts"), "utf8");
assert(hqRoute.includes("parseHqInquiryListQuery"), "12 HQ query validation");
assert(hqRoute.includes('.in("notification_status"'), "11 fallback filter in query");
assert(parseHqInquiryListQuery(new URLSearchParams()).ok, "11 default query parses");
if (parseHqInquiryListQuery(new URLSearchParams()).ok) {
  const q = parseHqInquiryListQuery(new URLSearchParams());
  assert(q.ok && q.view === "fallback", "11 default view fallback");
}

const dashboard = readFileSync(resolve("app/[locale]/dashboard/page.tsx"), "utf8");
assert(dashboard.includes('.eq("seller_id", user.id)'), "13 dashboard seller_id filter");
assert(dashboard.includes("/api/listing-inquiries/"), "14 seller status endpoint");
assert(dashboard.includes("if (!response.ok)"), "15 seller UI waits for PATCH");
assert(dashboard.includes('tDash("inquiries.updateFailed")'), "15 seller translated failure");
assert(!canSellerTransitionInquiry("closed", "new"), "14 closed is final");
assert(canSellerSetInquiryStatus("listingSeller", SAMPLE_INQUIRY, "closed"), "14 owner closed via RPC model");

const sellerRoute = readFileSync(resolve("app/api/listing-inquiries/[id]/status/route.ts"), "utf8");
assert(sellerRoute.includes("listing_inquiries_seller_set_status"), "14 RPC-backed seller status");
assert(sellerRoute.includes("extractBearerToken"), "seller status requires Authorization Bearer");
assert(sellerRoute.includes("supabase.auth.getUser()"), "seller status verifies token with getUser");
assert(!sellerRoute.includes("createServerSupabaseClient"), "seller status does not use cookie session fallback");
assert(sellerRoute.includes("isSameOriginMutationRequest"), "seller status same-origin");
assert(!parseSellerInquiryStatusBody({ status: "hq_handling" }).ok, "14 seller cannot set hq_handling");
assert(!parseSellerInquiryStatusBody({ status: "seen", buyer_id: listingId }).ok, "14 extra seller fields rejected");

const hqUi = readFileSync(resolve("app/[locale]/hq-admin/page.tsx"), "utf8");
assert(hqUi.includes('fetchHqInquiries("fallback"'), "11 HQ UI fallback");
assert(hqUi.includes("if (!res.ok)"), "15 HQ waits for PATCH");
assert(hqUi.includes("listingsMissingLocationOnly"), "17 HQ location tools retained");

const listingPublic = [
  readFileSync(resolve("lib/listingSeo.ts"), "utf8"),
  readFileSync(resolve("app/[locale]/anunt/[id]/page.tsx"), "utf8"),
].join("\n");
assert(!/buyer_phone/.test(listingPublic), "16 public listing HTML path has no buyer_phone");
assert(!listingPublic.includes("listing_inquiries"), "16 public listing page does not load inquiries");
const anuntClient = readFileSync(resolve("app/[locale]/anunt/[id]/AnuntClient.tsx"), "utf8");
assert(!anuntClient.includes("notification_status"), "8 listing UI has no provider status");

const modal = readFileSync(resolve("app/[locale]/anunt/[id]/ListingModals.tsx"), "utf8");
assert(modal.includes("isSubmittingInquiry"), "double-submit disabled while pending");
assert(modal.includes("successRecorded"), "generic success copy");
assert(!modal.includes("inquiryNotified"), "no provider status in modal");

assert(inquirySuccessCopy().titleKey === "recorded", "success is recorded not notified");

const locationSrc = readFileSync(resolve("lib/listingLocation.ts"), "utf8");
assert(locationSrc.includes("validateListingLocationInput"), "17 location helper unchanged presence");
const anunturi = readFileSync(resolve("app/[locale]/anunturi/page.tsx"), "utf8");
assert(anunturi.includes("parsePublicListingSearchParams") || anunturi.includes("listings"), "17 /anunturi still present");

assert(assertLocalSupabaseWriteTarget("http://127.0.0.1:54321") === "http://127.0.0.1:54321", "loopback API accepted");
try {
  assertLocalSupabaseWriteTarget("https://geywuzwbzecknokvnins.supabase.co");
  fail("production supabase.co must be rejected");
} catch (error) {
  assert(error instanceof Error && /blocked fragment|Production/i.test(error.message), "production API rejected");
}
try {
  assertLocalSupabaseDbTarget("postgresql://postgres@db.supabase.co:5432/postgres");
  fail("remote DB must be rejected");
} catch (error) {
  assert(error instanceof Error && /blocked fragment|loopback/i.test(error.message), "remote DB rejected");
}

console.log("OK listing-inquiry-hardening");
