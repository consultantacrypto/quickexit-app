/**
 * Static + unit asserts for Admin Bump V1.
 * Run: npx tsx scripts/assert-listing-admin-bump.ts
 */
import { readFileSync } from "node:fs";
import { HQ_LISTING_COLUMNS } from "../lib/hqOverview";
import {
  evaluateListingBumpEligibility,
  PUBLIC_LISTING_SORT_PRIMARY,
  PUBLIC_LISTING_SORT_TIEBREAK,
} from "../lib/listingRank";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const migration = readFileSync(
  "supabase/migrations/20261021140000_listing_admin_bump_v1.sql",
  "utf8",
);
assert(migration.includes("bumped_at"), "migration has bumped_at");
assert(migration.includes("effective_sort_at"), "migration has effective_sort_at");
assert(migration.includes("listing_bump_events"), "migration has audit table");
assert(migration.includes("listings_protect_rank_columns"), "migration has rank protect trigger");
assert(migration.includes("hq_bump_listing"), "migration has atomic RPC");
assert(migration.includes("GRANT EXECUTE") && migration.includes("service_role"), "RPC service_role only");
assert(migration.includes("ROLLBACK"), "migration documents rollback");

const actions = readFileSync("app/actions/adminActions.ts", "utf8");
assert(actions.includes("adminBumpListing"), "adminBumpListing exported");
assert(actions.includes("assertHqAdminFromAccessToken"), "HQ auth used");
assert(actions.includes('rpc("hq_bump_listing"'), "uses atomic RPC");
assert(actions.includes("evaluateListingBumpEligibility"), "eligibility checked");

const hq = readFileSync("app/[locale]/hq-admin/page.tsx", "utf8");
assert(hq.includes("adminBumpListing"), "HQ imports bump action");
assert(hq.includes("Adu primul"), "RO label present");
assert(hq.includes("bumpingListingId"), "pending disabled state");
assert(hq.includes("MOVE TO TOP"), "EN confirmation copy present");

const surfaces: Array<{ path: string; label: string }> = [
  { path: "app/[locale]/page.tsx", label: "home" },
  { path: "lib/publicListings.ts", label: "search" },
  { path: "app/[locale]/anunturi/page.tsx", label: "anunturi" },
  { path: "app/[locale]/categorii/[slug]/CategorieClient.tsx", label: "category" },
  { path: "lib/listingSeo.ts", label: "listingSeo" },
  { path: "app/sitemap.ts", label: "sitemap" },
];

for (const { path, label } of surfaces) {
  const src = readFileSync(path, "utf8");
  assert(
    src.includes(`.order("${PUBLIC_LISTING_SORT_PRIMARY}", { ascending: false })`),
    `${label} orders by effective_sort_at`,
  );
  assert(
    src.includes(`.order("${PUBLIC_LISTING_SORT_TIEBREAK}", { ascending: false })`),
    `${label} id tie-break`,
  );
}

const home = readFileSync("app/[locale]/page.tsx", "utf8");
assert(
  home.includes('.order("expires_at", { ascending: true })'),
  "home auction rail still deadline-ordered",
);

// HQ overview data contract must expose availability for bump eligibility UI.
assert(
  HQ_LISTING_COLUMNS.split(",").map((c) => c.trim()).includes("availability_status"),
  "HQ_LISTING_COLUMNS includes availability_status",
);
assert(
  HQ_LISTING_COLUMNS.includes("is_seed") && HQ_LISTING_COLUMNS.includes("status"),
  "HQ_LISTING_COLUMNS retains status and is_seed",
);

// Eligibility unit cases (including overview-shaped rows)
assert(
  evaluateListingBumpEligibility({
    status: "active",
    is_seed: false,
    availability_status: "available",
  }).ok,
  "overview-shaped active available eligible",
);
assert(
  evaluateListingBumpEligibility({
    status: "active",
    is_seed: false,
    availability_status: "needs_confirmation",
  }).ok,
  "needs_confirmation eligible",
);
assert(
  !evaluateListingBumpEligibility({
    status: "active",
    is_seed: false,
  }).ok,
  "overview row missing availability_status denied",
);
assert(
  !evaluateListingBumpEligibility({
    status: "suspended",
    is_seed: false,
    availability_status: "available",
  }).ok,
  "suspended denied",
);
assert(
  !evaluateListingBumpEligibility({
    status: "active",
    is_seed: true,
    availability_status: "available",
  }).ok,
  "seed denied",
);
assert(
  !evaluateListingBumpEligibility({
    status: "active",
    is_seed: false,
    availability_status: "sold",
  }).ok,
  "sold denied",
);
assert(
  !evaluateListingBumpEligibility({
    status: "admin_removed",
    is_seed: false,
    availability_status: "available",
  }).ok,
  "admin_removed denied",
);
assert(
  !evaluateListingBumpEligibility({
    status: "active",
    is_seed: false,
    availability_status: "unavailable",
  }).ok,
  "unavailable denied",
);

console.log("OK listing-admin-bump");
