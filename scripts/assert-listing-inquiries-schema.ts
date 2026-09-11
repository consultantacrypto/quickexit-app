import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const sql = readFileSync(resolve("docs/internal/sql/listing-inquiries.sql"), "utf8");

assert(/^BEGIN;/m.test(sql), "migration is transactional (BEGIN)");
assert(/^COMMIT;/m.test(sql), "migration is transactional (COMMIT)");
assert(/Rollback \(manual/.test(sql), "rollback plan documented");
assert(/Independent from Stripe/.test(sql), "independent from Stripe");
assert(!/DROP TABLE public\.(listings|profiles)/i.test(sql), "no destructive drop of product tables");
assert(!/^\s*TRUNCATE\b/im.test(sql), "no truncate");
assert(!/ALTER TABLE public\.profiles/.test(sql), "does not alter profiles");
assert(!/ADD COLUMN IF NOT EXISTS phone/.test(sql), "does not add profiles.phone");

assert(/CREATE TABLE IF NOT EXISTS public\.seller_contacts/.test(sql), "seller_contacts table");
assert(/user_id uuid PRIMARY KEY REFERENCES auth\.users/.test(sql), "seller_contacts pk references auth.users");
assert(/REVOKE ALL ON public\.seller_contacts FROM anon/.test(sql), "seller_contacts anon revoked");
assert(/seller_contacts_select_own/.test(sql), "seller_contacts owner select");
assert(/user_id = auth\.uid\(\)/.test(sql), "owner-only predicate");
assert(/GRANT SELECT, INSERT, UPDATE ON public\.seller_contacts TO authenticated/.test(sql), "seller_contacts grants");
assert(!/GRANT .+ ON public\.seller_contacts TO anon/.test(sql), "no seller_contacts anon grant");

for (const column of [
  "id",
  "listing_id",
  "buyer_id",
  "seller_id",
  "buyer_phone",
  "message",
  "status",
  "notification_status",
  "consent_version",
  "created_at",
  "updated_at",
]) {
  assert(sql.includes(column), `schema includes ${column}`);
}

assert(/ENABLE ROW LEVEL SECURITY/.test(sql), "RLS enabled");
assert(/FORCE ROW LEVEL SECURITY/.test(sql), "RLS forced");
assert(/REVOKE ALL ON public\.listing_inquiries FROM anon/.test(sql), "anon revoked");
assert(/REVOKE ALL ON public\.listing_inquiries FROM authenticated/.test(sql), "authenticated privileges reset before least-privilege grant");
assert(/GRANT SELECT, INSERT ON public\.listing_inquiries TO authenticated/.test(sql), "authenticated select/insert only");
assert(/GRANT EXECUTE ON FUNCTION public\.listing_inquiries_seller_set_status/.test(sql), "seller RPC execute grant");
assert(/pg_advisory_xact_lock/.test(sql), "transaction advisory locks");
assert(/interval '15 minutes'/.test(sql), "rolling 15-minute duplicate");
assert(/interval '1 hour'/.test(sql), "rolling hourly cap");
assert(/hourly_count >= 5/.test(sql), "max 5 per hour");
assert(/NEW\.consent_version := '2026-08'/.test(sql), "trigger owns consent_version");
assert(/listing_inquiries_consent_version_value/.test(sql), "consent_version SQL constraint");
assert(/listing_inquiries_seller_set_status/.test(sql), "seller status RPC");
assert(/IF auth\.uid\(\) IS NULL/.test(sql), "fail closed without auth.uid");
assert(!/GRANT .+UPDATE.+ ON public\.listing_inquiries/.test(sql), "no listing_inquiries update grant");
assert(/FOR INSERT/.test(sql) && /buyer_id = auth\.uid\(\)/.test(sql), "buyer insert self only");
assert(/seller_id = auth\.uid\(\)/.test(sql), "seller can read own inquiries");
assert(/listing_inquiries_assign_ownership/.test(sql), "ownership trigger present");
assert(/NEW\.seller_id := listing_owner/.test(sql), "seller_id derived server-side");
assert(/SET search_path = public, pg_temp/.test(sql), "security definer search_path pinned");
assert(/listing_inquiries_buyer_listing_window_uidx/.test(sql), "atomic 15-minute unique index");
assert(/floor\(extract\(epoch FROM \(created_at AT TIME ZONE 'UTC'\)\) \/ 900\)/.test(sql), "900s epoch bucket");
assert(/'sending'/.test(sql), "sending notification status for CAS");
assert(/listing_inquiries_seller_id_created_idx/.test(sql), "seller index");
assert(/listing_inquiries_listing_id_created_idx/.test(sql), "listing index");
assert(/listing_inquiries_status_created_idx/.test(sql), "status index");
assert(/listing_inquiries_created_at_idx/.test(sql), "created_at index");
assert(!/ON public\.listing_inquiries\s+FOR UPDATE/.test(sql), "no listing_inquiries update policy");
assert(!/TO anon/.test(sql.split("REVOKE")[0] ?? sql), "no anon grant before revoke");

console.log("OK listing-inquiries-schema");
