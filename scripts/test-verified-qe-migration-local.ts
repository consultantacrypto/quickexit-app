/**
 * Apply the Verificat QE migration on a local Postgres cluster only.
 * Uses the listings table from the repo bootstrap, then the new migration.
 * Does not open a network connection and does not touch Supabase.
 *
 * Run: npx tsx scripts/test-verified-qe-migration-local.ts
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(".");
const db = "verified_qe_local";
const seller = "11111111-1111-4111-8111-111111111111";
const admin = "22222222-2222-4222-8222-222222222222";
const existingA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const existingB = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const pageIds = [1, 2, 3, 4, 5].map((n) => `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb${n}`);

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function psql(database: string, sql: string, file?: string): { status: number; stdout: string; stderr: string } {
  const args = ["-u", "postgres", "psql", "-d", database, "-v", "ON_ERROR_STOP=1", "-X"];
  if (file) args.push("-f", file);
  else args.push("-t", "-A", "-v", "ON_ERROR_STOP=1");
  const result = spawnSync("sudo", args, {
    encoding: "utf8",
    input: file ? undefined : sql,
    cwd: root,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: `${result.stderr ?? ""}\n${result.stdout ?? ""}`,
  };
}

function execOk(database: string, sql: string): string {
  const result = psql(database, sql);
  if (result.status !== 0) fail(`SQL failed:\n${sql}\n${result.stderr}`);
  return result.stdout.trim();
}

function execFile(file: string) {
  const result = psql(db, "", file);
  if (result.status !== 0) fail(`file failed ${file}\n${result.stderr}`);
}

function expectError(sql: string, pattern: RegExp) {
  const result = psql(db, sql);
  if (result.status === 0) fail(`expected SQL to fail:\n${sql}`);
  if (!pattern.test(result.stderr)) {
    fail(`error did not match ${pattern}:\n${result.stderr}`);
  }
}

function ensureRole(name: string, extra = "NOLOGIN") {
  const exists = execOk("postgres", `SELECT 1 FROM pg_roles WHERE rolname = '${name}'`);
  if (exists !== "1") {
    const created = psql("postgres", `CREATE ROLE ${name} ${extra}`);
    if (created.status !== 0) fail(`create role ${name}: ${created.stderr}`);
  }
}

console.log("preparing local database", db);
psql("postgres", `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db}' AND pid <> pg_backend_pid()`);
const dropped = psql("postgres", `DROP DATABASE IF EXISTS ${db}`);
if (dropped.status !== 0) fail(dropped.stderr);
const created = psql("postgres", `CREATE DATABASE ${db}`);
if (created.status !== 0) fail(created.stderr);

ensureRole("anon");
ensureRole("authenticated");
ensureRole("service_role", "NOLOGIN BYPASSRLS");

execOk(
  db,
  `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN coalesce(current_setting('request.jwt.claims', true), '') = '' THEN NULL::jsonb
    ELSE current_setting('request.jwt.claims', true)::jsonb
  END;
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon, authenticated, service_role;
`,
);
execFile(resolve(root, "supabase/migrations/20261010120000_h4b0_security_schema_bootstrap.sql"));
execOk(
  db,
  `
INSERT INTO auth.users (id) VALUES ('${seller}'), ('${admin}');
INSERT INTO public.listings (id, user_id, title, status)
VALUES
  ('${existingA}', '${seller}', 'Existing one', 'active'),
  ('${existingB}', '${seller}', 'Existing two', 'active');
`,
);

execFile(resolve(root, "supabase/migrations/20261127120000_listing_verified_qe.sql"));
execFile(resolve(root, "supabase/migrations/20261127120000_listing_verified_qe.sql"));

const defaults = execOk(
  db,
  `SELECT count(*) FROM public.listings WHERE verified_qe = false AND verified_docs = false AND verified_vin = false AND verified_photos = false AND verified_at IS NULL AND verified_by IS NULL`,
);
assert(defaults === "2", `existing rows stay unverified, got ${defaults}`);

execOk(db, `SELECT set_config('request.jwt.claims', '', false)`);
expectError(
  `UPDATE public.listings SET verified_qe = true, verified_docs = true, verified_vin = false, verified_photos = true, verified_at = now(), verified_by = '${admin}' WHERE id = '${existingA}'`,
  /listings_verified_qe_complete/,
);
expectError(
  `UPDATE public.listings SET verified_qe = true, verified_docs = true, verified_vin = true, verified_photos = true, verified_at = now(), verified_by = NULL WHERE id = '${existingA}'`,
  /listings_verified_qe_complete/,
);
expectError(
  `UPDATE public.listings SET verified_qe = true, verified_docs = true, verified_vin = true, verified_photos = true, verified_at = NULL, verified_by = '${admin}' WHERE id = '${existingA}'`,
  /listings_verified_qe_complete/,
);
const stillFalse = execOk(db, `SELECT verified_qe FROM public.listings WHERE id = '${existingA}'`);
assert(stillFalse === "f", "rejected CHECK writes leave the row unverified");

execOk(
  db,
  `
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.listings TO anon, authenticated, service_role;
GRANT UPDATE ON public.listings TO authenticated, service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verified_qe_test_select ON public.listings;
CREATE POLICY verified_qe_test_select ON public.listings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS verified_qe_test_update ON public.listings;
CREATE POLICY verified_qe_test_update ON public.listings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
`,
);

const anonRead = execOk(
  db,
  `SET ROLE anon; SELECT verified_qe::text FROM public.listings WHERE id = '${existingA}'; RESET ROLE;`,
);
assert(anonRead.includes("false"), `anon can read the badge, got ${anonRead}`);
expectError(
  `SET ROLE anon; UPDATE public.listings SET verified_qe = true WHERE id = '${existingA}';`,
  /permission denied|42501/i,
);

execOk(db, `SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', false)`);
const renamed = execOk(
  db,
  `SET ROLE authenticated; UPDATE public.listings SET title = 'Existing one edited' WHERE id = '${existingA}'; SELECT title FROM public.listings WHERE id = '${existingA}'; RESET ROLE;`,
);
assert(renamed.includes("Existing one edited"), "authenticated can still edit ordinary columns");
expectError(
  `SET ROLE authenticated; SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', false); UPDATE public.listings SET verified_qe = true, verified_docs = true, verified_vin = true, verified_photos = true, verified_at = now(), verified_by = '${admin}' WHERE id = '${existingA}';`,
  /QEX:verified_qe_forbidden/,
);
expectError(
  `SET ROLE authenticated; SELECT * FROM public.hq_set_listing_verified_qe('${existingA}', '${admin}', true, true, true, true);`,
  /permission denied/i,
);

execOk(db, `SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false)`);
expectError(
  `SET ROLE service_role; SELECT * FROM public.hq_set_listing_verified_qe('${existingA}', '${admin}', true, true, false, true);`,
  /QEX:verified_qe_incomplete/,
);
const granted = execOk(
  db,
  `SET ROLE service_role; SELECT verified_qe::text || '|' || verified_docs::text || '|' || verified_vin::text || '|' || verified_photos::text || '|' || (verified_at IS NOT NULL)::text || '|' || verified_by::text FROM public.hq_set_listing_verified_qe('${existingA}', '${admin}', true, true, true, true); RESET ROLE;`,
);
assert(granted.includes(`true|true|true|true|true|${admin}`), `grant did not persist actor and checks: ${granted}`);

const revoked = execOk(
  db,
  `SET ROLE service_role; SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false); SELECT verified_qe::text || '|' || (verified_at IS NULL)::text || '|' || (verified_by IS NULL)::text || '|' || verified_docs::text FROM public.hq_set_listing_verified_qe('${existingA}', '${admin}', false, false, false, false); RESET ROLE;`,
);
assert(revoked.includes("false|true|true|false"), `revoke did not clear the badge: ${revoked}`);

execOk(db, `SELECT set_config('request.jwt.claims', '', false); RESET ROLE;`);
const extraValues = pageIds
  .map((id, index) => `('${id}', '${seller}', 'Page ${index}', 'active')`)
  .join(",\n");
execOk(db, `INSERT INTO public.listings (id, user_id, title, status) VALUES ${extraValues}`);
execOk(db, `SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false)`);
for (const id of pageIds.slice(0, 4)) {
  execOk(
    db,
    `SET ROLE service_role; SELECT verified_qe FROM public.hq_set_listing_verified_qe('${id}', '${admin}', true, true, true, true); RESET ROLE;`,
  );
}
const verifiedCount = execOk(db, `SELECT count(*) FROM public.listings WHERE verified_qe = true`);
assert(verifiedCount === "4", `expected 4 verified rows, got ${verifiedCount}`);
const page = execOk(
  db,
  `SELECT id FROM public.listings WHERE verified_qe = true ORDER BY id ASC LIMIT 2 OFFSET 2`,
);
const pageRows = page.split("\n").filter(Boolean);
assert(pageRows.length === 2, `page size 2 at offset 2 returned ${pageRows.length}`);
assert(pageRows[0] !== pageIds[0], "offset skips the first verified id");
const unverifiedLeft = execOk(db, `SELECT count(*) FROM public.listings WHERE verified_qe = false`);
assert(unverifiedLeft === "3", `unverified rows remain ${unverifiedLeft}`);

execFile(resolve(root, "docs/internal/sql/listing-verified-qe.ROLLBACK.sql"));
const columns = execOk(
  db,
  `SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'listings' AND column_name LIKE 'verified%'`,
);
assert(columns === "0", "rollback removes verified columns");
const titles = execOk(db, `SELECT count(*) FROM public.listings`);
assert(titles === "7", "rollback keeps listing rows");
const title = execOk(db, `SELECT title FROM public.listings WHERE id = '${existingA}'`);
assert(title === "Existing one edited", "rollback keeps ordinary listing data");

execFile(resolve(root, "supabase/migrations/20261127120000_listing_verified_qe.sql"));
const afterReapply = execOk(db, `SELECT count(*) FROM public.listings WHERE verified_qe = false`);
assert(afterReapply === "7", "reapply after rollback defaults every row to false");

console.log("OK verified-qe migration local");
console.log("defaults", defaults);
console.log("grant", granted.trim());
console.log("revoke", revoked.trim());
console.log("page", pageRows.join(","));
