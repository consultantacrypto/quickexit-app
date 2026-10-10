import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HQ_DEMAND_COLUMNS,
  HQ_LISTING_COLUMNS,
  HQ_OVERVIEW_LIMITS,
  HQ_PROFILE_COLUMNS,
  HQ_VALUATION_COLUMNS,
  parseHqRiskResolutionBody,
  isHqUuid,
} from "../lib/hqOverview";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const overview = readFileSync(resolve("app/api/hq/overview/route.ts"), "utf8");
const riskRoute = readFileSync(resolve("app/api/hq/risk-resolutions/route.ts"), "utf8");
const hqPage = readFileSync(resolve("app/[locale]/hq-admin/page.tsx"), "utf8");
const adminActions = readFileSync(resolve("app/actions/adminActions.ts"), "utf8");
const hqAuth = readFileSync(resolve("lib/hqAdminAuth.ts"), "utf8");
const mediaOrders = readFileSync(resolve("app/api/hq/media-orders/route.ts"), "utf8");
const leads = readFileSync(resolve("app/api/hq/leads/route.ts"), "utf8");
const inquiries = readFileSync(resolve("app/api/hq/inquiries/route.ts"), "utf8");
const kycStart = readFileSync(resolve("app/api/kyc/start/route.ts"), "utf8");
const stripeWebhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");

// --- A. HQ overview auth + columns ---

assert(overview.includes("assertHqAdminFromBearer"), "A overview uses bearer HQ auth");
assert(overview.includes("extractBearerToken"), "A overview extracts Bearer");
assert(
  overview.indexOf("assertHqAdminFromBearer") < overview.indexOf('.from("listings")'),
  "A service-role query after auth (listings follows auth)"
);
assert(overview.includes("HQ_LISTING_COLUMNS"), "A explicit listing columns");
assert(overview.includes("HQ_DEMAND_COLUMNS"), "A explicit demand columns");
assert(overview.includes("HQ_LISTING_OFFER_COLUMNS"), "A explicit listing offer columns");
assert(overview.includes("HQ_DEMAND_OFFER_COLUMNS"), "A explicit demand offer columns");
assert(overview.includes("HQ_PROFILE_COLUMNS"), "A explicit profile columns");
assert(overview.includes("HQ_VALUATION_COLUMNS"), "A explicit valuation columns");
assert(overview.includes("HQ_RISK_RESOLUTION_COLUMNS"), "A explicit risk columns");
assert(!/\.select\(\s*["']\*["']\s*\)/.test(overview), "A overview avoids select(*)");
assert(
  overview.includes("HQ_OVERVIEW_LIMITS.listings") &&
    HQ_OVERVIEW_LIMITS.listings === 200,
  "A preserves listing limit via HQ_OVERVIEW_LIMITS"
);
assert(
  overview.includes('auth.status === 403 ? "forbidden" : "auth_required"') ||
    (overview.includes("auth_required") && overview.includes("forbidden")),
  "A maps 401/403"
);

assert(HQ_LISTING_COLUMNS.includes("title") && !HQ_LISTING_COLUMNS.includes("*"), "columns explicit");
assert(HQ_DEMAND_COLUMNS.includes("buyer_id"), "demands include buyer_id for orphan risk");
assert(HQ_PROFILE_COLUMNS.includes("kyc_status") && !HQ_PROFILE_COLUMNS.includes("email"), "profiles no email");

// Production schema contract (H4A.1) — must not reintroduce invalid columns.
assert(
  !/(^|,\s*)location(,|$)/.test(HQ_LISTING_COLUMNS),
  "listings must NOT select location (column absent in Production)"
);
assert(
  !HQ_LISTING_COLUMNS.includes("discount_percentage"),
  "listings must NOT select discount_percentage (absent in Production)"
);
assert(
  HQ_LISTING_COLUMNS.includes("details") && HQ_LISTING_COLUMNS.includes("discount"),
  "listings must select details + discount"
);
assert(
  !/(^|,\s*)created_at(,|$)/.test(HQ_VALUATION_COLUMNS),
  "valuation_reports must NOT select created_at (absent in Production)"
);
assert(
  HQ_VALUATION_COLUMNS.includes("generated_at"),
  "valuation_reports must select generated_at"
);
assert(
  hqPage.includes("generated_at") && !/valuationReports\.forEach[\s\S]*?detected_at:\s*r\.created_at/.test(hqPage),
  "HQ risk UI uses valuation generated_at"
);

// --- B. Risk resolutions ---

assert(riskRoute.includes("assertHqAdminFromBearer"), "B risk POST uses HQ bearer auth");
assert(riskRoute.includes("parseHqRiskResolutionBody"), "B validates payload");
assert(riskRoute.includes("resolved_by: auth.userId"), "B admin identity from server");
assert(!riskRoute.includes("resolved_by: body"), "B no client resolved_by");
assert(hqAuth.includes("userId: user.id"), "B auth result exposes userId");

const rejectResolvedBy = parseHqRiskResolutionBody({
  risk_key: "k",
  risk_type: "t",
  severity: "high",
  title: "T",
  resolved_by: "attacker-uuid",
});
assert(!rejectResolvedBy.ok, "B rejects client resolved_by");

const rejectBadSeverity = parseHqRiskResolutionBody({
  risk_key: "k",
  risk_type: "t",
  severity: "ultra",
  title: "T",
});
assert(!rejectBadSeverity.ok, "B rejects arbitrary severity");

const acceptOk = parseHqRiskResolutionBody({
  risk_key: "active_seed_listing_x",
  risk_type: "listing_seed_active_public",
  severity: "critical",
  title: "Seed activ",
  entity_table: "listings",
  entity_id: "11111111-1111-4111-8111-111111111111",
  note: "done",
});
assert(acceptOk.ok, "B accepts valid risk body");

assert(
  !hqPage.includes('from("admin_risk_resolutions")'),
  "B no browser admin_risk_resolutions access"
);
assert(hqPage.includes("/api/hq/risk-resolutions"), "B client posts to risk API");

// --- C. Listing moderation ---

assert(adminActions.includes("adminSoftHideListing"), "C soft-hide listing server action");
assert(
  adminActions.includes('status: "admin_removed"') &&
    adminActions.includes("adminSoftHideListing"),
  "C listing soft-hide sets admin_removed only"
);
assert(adminActions.includes("isHqUuid"), "C validates listing id");
assert(!hqPage.includes('.from("listings").update'), "C no browser listings update");
assert(hqPage.includes("adminSoftHideListing"), "C client uses soft-hide action");

assert(isHqUuid("11111111-1111-4111-8111-111111111111"), "uuid ok");
assert(!isHqUuid("not-a-uuid"), "uuid reject");
assert(!isHqUuid("//evil"), "uuid reject evil");

// --- D. Demand moderation ---

assert(adminActions.includes("adminSoftHideDemand"), "D soft-hide demand server action");
assert(
  adminActions.includes('status: "suspended"') && adminActions.includes("adminSoftHideDemand"),
  "D demand soft-hide sets suspended only"
);
assert(!hqPage.includes('.from("demands").update'), "D no browser demands update");
assert(hqPage.includes("adminSoftHideDemand"), "D client uses demand soft-hide");

// --- E. Client cleanup ---

assert(hqPage.includes("/api/hq/overview"), "E client loads overview API");
assert(!hqPage.includes('.from("listings")'), "E no browser listings from()");
assert(!hqPage.includes('.from("demands")'), "E no browser demands from()");
assert(!hqPage.includes('.from("listing_offers")'), "E no browser listing_offers");
assert(!hqPage.includes('.from("demand_offers")'), "E no browser demand_offers");
assert(!hqPage.includes('.from("profiles")'), "E no browser profiles");
assert(!hqPage.includes('.from("valuation_reports")'), "E no browser valuation_reports");
assert(!hqPage.includes("select(\"*\")"), "E no select(*) in main HQ");

// --- F. Regression surfaces unchanged ---

assert(mediaOrders.includes("assertHqAdminFromBearer"), "F media HQ still bearer");
assert(leads.includes("assertHqAdminFromBearer"), "F leads still bearer");
assert(inquiries.includes("assertHqAdminFromBearer"), "F inquiries still bearer");
assert(kycStart.includes("decideKycStartAuth") || kycStart.includes("kyc"), "F kyc route present");
assert(stripeWebhook.includes("constructEvent") || stripeWebhook.includes("stripe"), "F stripe webhook present");

console.log("PASS assert-hq-overview-server");
