/**
 * Verificat QE — auth, checklist, missing-column tolerance, search pagination.
 * No database and no network.
 *
 * Run: npx tsx scripts/assert-verified-qe.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  buildPublicSearchPath,
  filterPublicSearchListings,
  parsePublicListingSearchParams,
  PUBLIC_SEARCH_PAGE_SIZE,
} from "../lib/publicListings";
import {
  isMissingVerifiedQeColumnError,
  queryToleratingMissingVerifiedQe,
  readVerifiedQe,
  resetVerifiedQeColumnProbe,
  withVerifiedQeField,
} from "../lib/verifiedQe";
import {
  executeVerifiedQeMutation,
  mapVerifiedQeWriteError,
  planVerifiedQeMutation,
  type VerifiedQePlan,
} from "../lib/verifiedQeAdmin";

const root = resolve(".");

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const ADMIN = "22222222-2222-4222-8222-222222222222";
const LISTING = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

async function main() {

async function runMutation(
  authorization: string | null,
  body: unknown,
  auth:
    | { ok: false; status: number; error: string }
    | { ok: true; userId: string },
) {
  const applied: VerifiedQePlan[] = [];
  const result = await executeVerifiedQeMutation(authorization, body, {
    authenticate: async () => {
      if (!auth.ok) return auth;
      return {
        ok: true,
        userId: auth.userId,
        apply: async (plan) => {
          applied.push(plan);
          return {
            ok: true,
            listing: {
              id: plan.listingId,
              verified_qe: plan.grant,
              verified_docs: plan.grant,
              verified_vin: plan.grant,
              verified_photos: plan.grant,
              verified_at: plan.grant ? "2026-11-27T12:00:00.000Z" : null,
            },
          };
        },
      };
    },
  });
  return { result, applied };
}

const unauth = await runMutation(null, { id: LISTING, action: "grant", docs: true, vin: true, photos: true }, {
  ok: false,
  status: 401,
  error: "authentication_required",
});
assert(unauth.result.status === 401, "no auth is refused");
assert(unauth.applied.length === 0, "no auth does not write");
assert(unauth.result.body.error_code === "auth_required", "no auth error code");

const forbidden = await runMutation("token", { id: LISTING, action: "grant", docs: true, vin: true, photos: true }, {
  ok: false,
  status: 403,
  error: "access_denied",
});
assert(forbidden.result.status === 403, "non-admin is refused");
assert(forbidden.applied.length === 0, "non-admin does not write");

for (const checks of [
  { docs: false, vin: true, photos: true },
  { docs: true, vin: false, photos: true },
  { docs: true, vin: true, photos: false },
  { docs: false, vin: false, photos: false },
]) {
  const incomplete = await runMutation(
    "token",
    { id: LISTING, action: "grant", ...checks, verified_by: "attacker" },
    { ok: true, userId: ADMIN },
  );
  assert(incomplete.result.status === 400, `incomplete checks refused ${JSON.stringify(checks)}`);
  assert(incomplete.result.body.error_code === "incomplete_checks", "incomplete error code");
  assert(incomplete.applied.length === 0, "incomplete checks do not write");
}

const granted = await runMutation(
  "token",
  { id: LISTING, action: "grant", docs: true, vin: true, photos: true, verified_by: "attacker", verified_at: "2000-01-01" },
  { ok: true, userId: ADMIN },
);
assert(granted.result.status === 200, "three checks grant");
assert(granted.applied.length === 1, "grant writes once");
assert(granted.applied[0]?.grant === true, "grant flag");
assert(granted.applied[0]?.actorUserId === ADMIN, "actor is the current admin, not the body");
assert(granted.applied[0]?.docs && granted.applied[0]?.vin && granted.applied[0]?.photos, "all three checks stored");
assert(granted.result.body.success === true, "grant success body");

const revoked = await runMutation(
  "token",
  { id: LISTING, action: "revoke", docs: false, vin: false, photos: false },
  { ok: true, userId: ADMIN },
);
assert(revoked.result.status === 200, "revoke succeeds");
assert(revoked.applied.length === 1 && revoked.applied[0]?.grant === false, "revoke clears the badge");
assert(revoked.applied[0]?.actorUserId === ADMIN, "revoke still attributes the admin");

const badId = planVerifiedQeMutation({
  actorUserId: ADMIN,
  body: { id: "not-a-uuid", action: "grant", docs: true, vin: true, photos: true },
});
assert(!badId.ok && badId.error_code === "invalid_id", "bad listing id refused");

assert(
  mapVerifiedQeWriteError({ code: "PGRST202", message: "Could not find the function public.hq_set_listing_verified_qe" }).error_code ===
    "schema_missing",
  "missing function is schema_missing, not a public 500",
);
assert(
  mapVerifiedQeWriteError({ code: "23514", message: "QEX:verified_qe_incomplete" }).status === 400,
  "SQL incomplete check is a refusal",
);

resetVerifiedQeColumnProbe();
let runs = 0;
const missing = await queryToleratingMissingVerifiedQe(async (fields) => {
  runs += 1;
  if (fields.includes("verified_qe")) {
    return {
      data: null,
      error: { code: "PGRST204", message: "Could not find the 'verified_qe' column of 'listings' in the schema cache" },
    };
  }
  return { data: [{ id: LISTING, title: "Same as before" }], error: null, count: 1 };
}, "id,title");
assert(missing.columnMissing, "missing column is detected");
assert(runs === 2, "missing column retries without the badge column");
assert(Array.isArray(missing.data) && missing.data[0]?.title === "Same as before", "retry keeps the current rows");
assert(readVerifiedQe(missing.data?.[0]) === false, "missing column renders no badge");

resetVerifiedQeColumnProbe();
runs = 0;
const emptyFilter = await queryToleratingMissingVerifiedQe(
  async () => {
    runs += 1;
    return {
      data: null,
      error: { code: "42703", message: 'column listings.verified_qe does not exist' },
    };
  },
  "id,title",
  { onMissing: "empty" },
);
assert(emptyFilter.columnMissing && emptyFilter.error === null, "verified filter without the column is an empty page");
assert(runs === 1, "verified filter does not fall back to unverified rows");
assert(emptyFilter.count === 0, "verified filter count is zero until the column exists");

resetVerifiedQeColumnProbe();
runs = 0;
const present = await queryToleratingMissingVerifiedQe(async (fields) => {
  runs += 1;
  assert(fields.endsWith(",verified_qe"), "present column stays on the select");
  return { data: [{ id: LISTING, verified_qe: true }], error: null };
}, "id");
await queryToleratingMissingVerifiedQe(async (fields) => {
  runs += 1;
  assert(fields.endsWith(",verified_qe"), "later queries keep the column once it exists");
  return { data: [], error: null };
}, "id");
assert(present.columnMissing === false && runs === 2, "present column does not retry");
assert(readVerifiedQe({ verified_qe: true }) === true, "true badge is read");
assert(readVerifiedQe({ verified_qe: false }) === false, "false badge stays off");
assert(readVerifiedQe({}) === false, "absent field stays off");

resetVerifiedQeColumnProbe();
runs = 0;
const other = await queryToleratingMissingVerifiedQe(async () => {
  runs += 1;
  return { data: null, error: { code: "57014", message: "canceling statement due to statement timeout" } };
}, "id,title");
assert(runs === 1 && other.error?.code === "57014", "unrelated errors are not treated as a missing badge column");
assert(isMissingVerifiedQeColumnError({ code: "42703", message: "column listings.exit_price does not exist" }) === false, "other missing columns are not swallowed");
assert(withVerifiedQeField("id,verified_qe") === "id,verified_qe", "column is not duplicated");

const parsed = parsePublicListingSearchParams({ verified: "1", q: "bmw", page: "2" });
assert(parsed.verified === true && parsed.page === 2 && parsed.q === "bmw", "verified filter parses with page");
assert(parsePublicListingSearchParams({}).verified === false, "verified filter defaults off");
const pageTwo = buildPublicSearchPath({ verified: true, q: "bmw", crypto: true }, 2);
assert(pageTwo.includes("verified=1") && pageTwo.includes("page=2") && pageTwo.includes("q=bmw"), "pagination keeps verified=1");
assert(!buildPublicSearchPath({ q: "bmw" }).includes("verified"), "default search URL omits the filter");
assert(buildPublicSearchPath({ verified: true, catalog: true }, 1) === "/cauta?catalog=1&verified=1", "verified filter resets to page 1");

const verifiedId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const plainId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const rows = [verifiedId, plainId, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3"].map((id, index) => ({
  id,
  title: `Row ${index}`,
  status: "active",
  is_seed: false,
  availability_status: "available",
  verified_qe: id === verifiedId,
}));
const onlyVerified = filterPublicSearchListings(rows, { verified: true });
assert(onlyVerified.length === 1 && onlyVerified[0]?.id === verifiedId, "JS filter keeps verified rows only");
const from = (2 - 1) * PUBLIC_SEARCH_PAGE_SIZE;
assert(onlyVerified.slice(from, from + PUBLIC_SEARCH_PAGE_SIZE).length === 0, "page 2 of a one-row verified set is empty");
assert(filterPublicSearchListings(rows, {}).length === 3, "without the filter every public row remains");

const migration = readFileSync(join(root, "supabase/migrations/20261127074048_listing_verified_qe.sql"), "utf8");
assert(migration.includes("ADD COLUMN IF NOT EXISTS verified_qe"), "verified_qe is idempotent");
assert(migration.includes("ADD COLUMN IF NOT EXISTS verified_docs"), "docs check column");
assert(migration.includes("ADD COLUMN IF NOT EXISTS verified_vin"), "vin check column");
assert(migration.includes("ADD COLUMN IF NOT EXISTS verified_photos"), "photos check column");
assert(migration.includes("ADD COLUMN IF NOT EXISTS verified_at"), "verified_at column");
assert(migration.includes("ADD COLUMN IF NOT EXISTS verified_by uuid"), "verified_by is the admin uuid");
assert(migration.includes("listings_verified_qe_complete"), "CHECK name");
assert(migration.includes("verified_docs = true") && migration.includes("verified_vin = true") && migration.includes("verified_photos = true"), "CHECK requires all three");
assert(migration.includes("verified_at IS NOT NULL") && migration.includes("verified_by IS NOT NULL"), "CHECK requires actor and time");
assert(migration.includes("DEFAULT false"), "existing rows default to unverified");
assert(migration.includes("QEX:verified_qe_forbidden"), "anon and authenticated cannot write");
assert(migration.includes("GRANT EXECUTE") && migration.includes("service_role"), "RPC is service role only");
assert(migration.includes("verified_at = now()"), "grant timestamp is database now()");
assert(migration.includes("ROLLBACK"), "rollback is documented in the migration");
assert(!migration.includes("CREATE EXTENSION"), "migration adds no external service");

const rollback = readFileSync(join(root, "docs/internal/sql/listing-verified-qe.ROLLBACK.sql"), "utf8");
assert(rollback.includes("DROP COLUMN IF EXISTS verified_qe"), "rollback drops the badge");
assert(rollback.includes("DROP FUNCTION IF EXISTS public.hq_set_listing_verified_qe"), "rollback drops the writer");
assert(rollback.includes("DROP TRIGGER IF EXISTS listings_protect_verified_qe_columns"), "rollback drops the guard");

const route = readFileSync(join(root, "app/api/hq/verified-qe/route.ts"), "utf8");
const authAt = route.indexOf("assertHqAdminFromBearer");
const writeAt = route.indexOf("hq_set_listing_verified_qe");
const listAt = route.indexOf('.from("listings")');
assert(authAt >= 0 && listAt > authAt && writeAt > authAt, "HQ auth runs before any listings read or write");
assert(route.includes("p_actor_user_id: plan.actorUserId"), "verified_by is the authenticated admin");
assert(!route.includes("verified_by:"), "response does not accept a client actor");

const adminUi = readFileSync(join(root, "app/[locale]/hq-admin/verificare/VerifiedQeAdminClient.tsx"), "utf8");
assert(adminUi.includes("Marchează Verificat QE"), "grant button copy");
assert(adminUi.includes("Retrage verificarea"), "revoke button copy");
assert(adminUi.includes("disabled={!checksComplete || busy}"), "grant stays disabled until all three checks");
assert(!adminUi.includes('.from("listings")'), "admin screen does not write listings from the browser");

const badge = readFileSync(join(root, "app/components/VerifiedQeBadge.tsx"), "utf8");
assert(badge.includes('aria-describedby={tipId}'), "badge exposes the tooltip to assistive tech");
assert(badge.includes('role="tooltip"'), "visible tooltip has a tooltip role");
assert(badge.includes('aria-expanded={open}'), "badge state is exposed");
assert(badge.includes("pointerType === \"touch\""), "tap path is separate from hover");
assert(badge.includes("bg-[#FFD100]") && badge.includes("border-black"), "badge uses the QE yellow and black outline");

const ro = readFileSync(join(root, "messages/ro.json"), "utf8");
const en = readFileSync(join(root, "messages/en.json"), "utf8");
assert(ro.includes("Verificat de QuickExit: acte, VIN și poze reale"), "Romanian tooltip");
assert(en.includes("Verified by QuickExit: documents, VIN and real photos"), "English tooltip");

const card = readFileSync(join(root, "app/components/AdCard.tsx"), "utf8");
assert(card.includes("{verifiedQe ? ("), "card badge is conditional");
assert(card.includes("<VerifiedQeBadge />"), "card uses the shared badge");

const search = readFileSync(join(root, "lib/publicListings.ts"), "utf8");
const eqAt = search.indexOf('query = query.eq("verified_qe", true)');
const rangeAt = search.indexOf("query = query.range(from, from + pageSize - 1)");
assert(eqAt > 0 && rangeAt > eqAt, "verified filter is applied before pagination range");
assert(search.includes('onMissing: "empty"'), "missing column does not drop the verified filter into all rows");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

const forbiddenWriters = [
  ...walk(join(root, "app/api/stripe")),
  ...walk(join(root, "app/api/webhook")),
  ...walk(join(root, "app/api/webhooks")),
  ...walk(join(root, "app/api/cron")),
];
for (const path of forbiddenWriters) {
  const src = readFileSync(path, "utf8");
  assert(!src.includes("verified_qe") && !src.includes("hq_set_listing_verified_qe"), `${path} does not grant the badge`);
}

console.log("OK verified-qe");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
