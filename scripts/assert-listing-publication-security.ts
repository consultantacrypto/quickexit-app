/**
 * Static asserts for listings publication security hotfix.
 * No network / no DB writes.
 * Run: npx tsx scripts/assert-listing-publication-security.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const migration = readFileSync(
  resolve("supabase/migrations/20261024180000_listings_protect_publication_fields.sql"),
  "utf8",
);
assert(migration.includes("listings_protect_publication_fields"), "migration defines guard");
assert(migration.includes("QEX:publication_forbidden"), "migration uses forbid code");
assert(migration.includes("pending_payment"), "migration requires pending_payment insert");
assert(migration.includes("SET DEFAULT 'pending_payment'"), "migration sets safe default");
assert(
  migration.includes("jwt_role NOT IN ('authenticated', 'anon')"),
  "migration bypasses only non-user jwt roles",
);
assert(!/isHqAdminEmail|HQ_ADMIN|auth\.jwt\(\)\s*->>\s*'email'/.test(migration), "migration does not use email as privilege");
assert(!migration.includes("user-provided"), "no user claim privilege wording");
assert(migration.includes("expires_at"), "guards expires_at");
assert(migration.includes("is_seed"), "guards is_seed");
assert(migration.includes("paid"), "guards paid when present");
assert(
  migration.includes("OLD.status = 'suspended' AND NEW.status = 'active'"),
  "resume only from suspended",
);
assert(
  migration.includes("OLD.expires_at IS NOT NULL AND OLD.expires_at > now()"),
  "resume requires unexpired window",
);

const rollback = readFileSync(
  resolve("docs/internal/sql/h4b-proposed/listings-protect-publication-fields.ROLLBACK.sql"),
  "utf8",
);
assert(rollback.includes("DROP TRIGGER IF EXISTS listings_protect_publication_fields"), "rollback drops trigger");
assert(rollback.includes("DROP FUNCTION IF EXISTS public.listings_protect_publication_fields"), "rollback drops function");

const statusRoute = readFileSync(resolve("app/api/listings/[id]/status/route.ts"), "utf8");
assert(statusRoute.includes("invalid_status_transition"), "status API rejects invalid transitions");
assert(statusRoute.includes("missing_publication_window"), "status API requires expiry window on resume");
assert(statusRoute.includes('currentStatus !== "suspended"'), "status API activates only from suspended");
assert(statusRoute.includes('currentStatus !== "active"'), "status API suspends only from active");
assert(!statusRoute.includes("SERVICE_ROLE"), "status API does not use service role");
assert(!statusRoute.includes("SUPABASE_SERVICE_ROLE"), "status API no service role env");

const hqAuth = readFileSync(resolve("lib/hqAdminAuth.ts"), "utf8");
assert(hqAuth.includes("createServiceRoleClient"), "HQ auth creates service role after allowlist");
assert(hqAuth.includes("isHqAdminEmail"), "HQ allowlist checked before service role");
assert(
  hqAuth.indexOf("isHqAdminEmail") < hqAuth.indexOf("createServiceRoleClient"),
  "allowlist precedes service-role client",
);

const adminActions = readFileSync(resolve("app/actions/adminActions.ts"), "utf8");
assert(adminActions.includes("adminForcePublish"), "Force Publish present");
assert(adminActions.includes("assertAdminAndGetServiceClient"), "Force Publish uses HQ service client");
assert(adminActions.includes('status: "active"'), "Force Publish sets active");

const forceRoute = readFileSync(resolve("app/api/admin/force-activate/route.ts"), "utf8");
assert(forceRoute.includes("assertHqAdminFromBearer"), "Force Activate HQ gated");
assert(forceRoute.includes("forceActivate(auth.supabase"), "Force Activate uses auth.supabase (service role)");

const webhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
assert(webhook.includes("SUPABASE_SERVICE_ROLE_KEY"), "Stripe webhook uses service role");
assert(webhook.includes("activateRow"), "Stripe webhook activates via activateRow");

const bump = readFileSync(resolve("scripts/assert-listing-admin-bump.ts"), "utf8");
assert(bump.includes("hq_bump_listing"), "Admin Bump assert retained");

console.log("OK listing-publication-security");
