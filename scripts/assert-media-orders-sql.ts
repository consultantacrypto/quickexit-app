/**
 * Static review of docs/internal/sql/media-orders.sql (Phase 2B.1).
 * Does not connect to any database. Runtime DB validation remains separate.
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

const sql = readFileSync(resolve("docs/internal/sql/media-orders.sql"), "utf8");

assert(sql.includes("CREATE TABLE IF NOT EXISTS public.media_orders"), "creates media_orders");
assert(
  /listing_id uuid NOT NULL REFERENCES public\.listings \(id\) ON DELETE RESTRICT/.test(sql),
  "listing_id ON DELETE RESTRICT (no silent paid-history erase)",
);
assert(!/listing_id uuid NOT NULL REFERENCES public\.listings \(id\) ON DELETE CASCADE/.test(sql), "listing_id must not CASCADE");
assert(
  /user_id uuid NOT NULL REFERENCES auth\.users \(id\) ON DELETE RESTRICT/.test(sql),
  "user_id ON DELETE RESTRICT",
);

assert(sql.includes("CHECK (package IN ('stories_4', 'stories_8', 'featured'))"), "package check");
assert(
  sql.includes("CHECK (value_tier IN ('under_50k', '50k_100k', '100k_500k', 'over_500k'))"),
  "value_tier check",
);
assert(
  sql.includes("CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled'))"),
  "payment_status check",
);
assert(sql.includes("'needs_info'"), "editorial needs_info");
assert(sql.includes("'rejected'"), "editorial rejected");
assert(sql.includes("CHECK (source IN ('publish_checkout', 'post_publish'))"), "source check");
assert(sql.includes("CHECK (amount_ron > 0)"), "amount positive");
assert(sql.includes("CHECK (listing_value_eur_snapshot > 0)"), "value positive");
assert(sql.includes("CHECK (currency = 'ron')"), "currency ron");

assert(sql.includes("media_orders_set_updated_at"), "updated_at function");
assert(sql.includes("media_orders_updated_at_trigger"), "updated_at trigger");
assert(sql.includes("media_orders_listing_id_idx"), "listing_id index");
assert(sql.includes("media_orders_user_id_idx"), "user_id index");
assert(sql.includes("media_orders_stripe_checkout_session_id_idx"), "session index");
assert(sql.includes("media_orders_payment_editorial_status_idx"), "status pair index");
assert(sql.includes("media_orders_created_at_idx"), "created_at index");
assert(sql.includes("media_orders_one_active_per_listing_idx"), "partial unique active order");
assert(
  /WHERE payment_status IN \('pending', 'paid'\)/.test(sql),
  "partial unique covers pending+paid only",
);

assert(sql.includes("ENABLE ROW LEVEL SECURITY"), "rls enable");
assert(sql.includes("FORCE ROW LEVEL SECURITY"), "rls force");
assert(sql.includes("GRANT SELECT ON public.media_orders TO authenticated"), "owner select grant");
assert(!/GRANT INSERT ON public\.media_orders TO authenticated/.test(sql), "no client insert grant");
assert(!/GRANT UPDATE ON public\.media_orders TO authenticated/.test(sql), "no client update grant");
assert(!/GRANT DELETE ON public\.media_orders TO authenticated/.test(sql), "no client delete grant");
assert(sql.includes("media_orders_owner_select"), "owner select policy");
assert(!/FOR INSERT/.test(sql), "no insert policy");
assert(!/FOR UPDATE/.test(sql), "no update policy");
assert(!/FOR DELETE/.test(sql), "no delete policy");
assert(sql.includes("Do not apply to Production"), "production warning present");

console.log("OK media-orders-sql");
console.log("listing_delete_strategy=ON DELETE RESTRICT");
console.log("user_fk=ON DELETE RESTRICT");
console.log("partial_unique=pending|paid per listing_id");
console.log("runtime_db_validation=pending (no local Docker / no staging Supabase)");
