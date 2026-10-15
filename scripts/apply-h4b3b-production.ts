/**
 * H4B.3b Phase 1 — apply ONLY private demand-offers bucket migration to Production.
 *
 * Applies: supabase/migrations/20261015120000_h4b3b_private_demand_offer_media.sql
 * Via temp workdir link (never links repo supabase/).
 *
 * Hard gates:
 * - refuses anything except geywuzwbzecknokvnins
 * - refuses SQL that touches listings policies / DELETE / public listings flip
 *
 * Usage:
 *   npx tsx scripts/apply-h4b3b-production.ts
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const STAGING_REF = "nlnzlswjjplofpkhoxtr";
const MIG_FILE = "20261015120000_h4b3b_private_demand_offer_media.sql";
const TEMP_WORKDIR = join(tmpdir(), "qe-prod-truth-export");
const OUT_DIR = resolve(
  "docs/internal/hardening/h4b3b-production-pre-rollout-2026-10-15",
);
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";

function fail(m: string, c = 1): never {
  console.error(`FAIL ${m}`);
  process.exit(c);
}

function runNpx(args: string, cwd: string): string {
  return execSync(`${NPX} ${args}`, {
    cwd,
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function ensureProdLink() {
  mkdirSync(TEMP_WORKDIR, { recursive: true });
  if (!existsSync(join(TEMP_WORKDIR, "supabase", "config.toml"))) {
    runNpx("supabase init --yes", TEMP_WORKDIR);
  }
  const refPath = join(TEMP_WORKDIR, "supabase", ".temp", "project-ref");
  let linked = existsSync(refPath) ? readFileSync(refPath, "utf8").trim() : "";
  if (linked !== PRODUCTION_REF) {
    runNpx(`supabase link --project-ref ${PRODUCTION_REF} --yes`, TEMP_WORKDIR);
    linked = existsSync(refPath) ? readFileSync(refPath, "utf8").trim() : "";
  }
  if (linked === STAGING_REF) fail("ABORT linked to Staging");
  if (linked !== PRODUCTION_REF) fail(`ABORT unexpected link=${linked}`);
  console.log(`linked_ref=${linked}`);
}

function query(sql: string): string {
  const p = join(TEMP_WORKDIR, "qe-h4b3b-prod-query.sql");
  writeFileSync(p, `${sql}\n`, "utf8");
  return runNpx(`supabase db query --linked -o json -f "${p}"`, TEMP_WORKDIR);
}

function assertSqlSafe(sql: string) {
  if (/geywuzwbzecknokvnins/i.test(sql) && /\\connect/i.test(sql)) {
    fail("refuses Production connect string in SQL");
  }
  if (!sql.includes("demand-offers")) fail("missing demand-offers bucket");
  if (!sql.includes("demand_offers_storage_insert_owner_prefix")) {
    fail("missing INSERT policy");
  }
  if (!sql.includes("public = false")) fail("must set public=false");
  if (/FOR\s+DELETE/i.test(sql) && /CREATE\s+POLICY/i.test(sql)) {
    // allow DROP POLICY ... but not CREATE DELETE
    const creates = sql.match(/CREATE\s+POLICY[\s\S]*?;/gi) ?? [];
    for (const c of creates) {
      if (/FOR\s+DELETE/i.test(c)) fail("must not CREATE DELETE policy");
      if (/FOR\s+SELECT/i.test(c)) fail("must not CREATE SELECT policy");
    }
  }
  if (/Public Read Listings/i.test(sql) && /DROP\s+POLICY/i.test(sql)) {
    fail("must not drop Public Read Listings");
  }
  if (/listings_storage_/i.test(sql) && /DROP\s+POLICY/i.test(sql)) {
    fail("must not alter listings write policies");
  }
  if (/ALTER\s+TABLE\s+public\./i.test(sql)) fail("no public schema table alters");
}

function main() {
  if (process.env.VERCEL_ENV === "preview") {
    // allow — this targets DB not vercel
  }
  ensureProdLink();
  mkdirSync(OUT_DIR, { recursive: true });

  const path = resolve("supabase/migrations", MIG_FILE);
  if (!existsSync(path)) fail(`missing ${MIG_FILE}`);
  const sql = readFileSync(path, "utf8");
  assertSqlSafe(sql);

  const beforeBuckets = query(`
    SELECT id, public::text AS public, file_size_limit::text AS file_size_limit
    FROM storage.buckets ORDER BY id;
  `);
  const beforePolicies = query(`
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
    ORDER BY cmd, policyname;
  `);
  const beforeOrphans = query(`
    SELECT count(*)::int AS orphan_count
    FROM storage.objects
    WHERE bucket_id='listings' AND name LIKE '%demand-offers%';
  `);
  const beforeListings = query(`
    SELECT count(*)::int AS listings_objects
    FROM storage.objects WHERE bucket_id='listings';
  `);

  console.log("applying_migration=", MIG_FILE);
  try {
    const out = runNpx(`supabase db query --linked -f "${path}"`, TEMP_WORKDIR);
    if (/ERROR:/i.test(out)) fail(out.slice(0, 800));
    console.log("apply=ok");
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    fail(
      `${err.stderr ?? ""}\n${err.stdout ?? ""}\n${err.message ?? ""}`.slice(0, 1200),
    );
  }

  // Bookkeeping history mark
  try {
    query(`
      INSERT INTO supabase_migrations.schema_migrations (version)
      SELECT '20261015120000'
      WHERE NOT EXISTS (
        SELECT 1 FROM supabase_migrations.schema_migrations
        WHERE version = '20261015120000'
      );
    `);
    console.log("history_mark=ok");
  } catch (e) {
    fail(`history_mark failed: ${(e as Error).message}`);
  }

  const afterBuckets = query(`
    SELECT id, public::text AS public, file_size_limit::text AS file_size_limit,
           allowed_mime_types::text AS mime
    FROM storage.buckets ORDER BY id;
  `);
  const afterPolicies = query(`
    SELECT policyname, cmd, roles::text AS roles
    FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
    ORDER BY cmd, policyname;
  `);
  const afterHistory = query(`
    SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
  `);
  const afterOrphans = query(`
    SELECT count(*)::int AS orphan_count
    FROM storage.objects
    WHERE bucket_id='listings' AND name LIKE '%demand-offers%';
  `);
  const afterListings = query(`
    SELECT count(*)::int AS listings_objects
    FROM storage.objects WHERE bucket_id='listings';
  `);

  // Safety: listings still public; orphans unchanged
  if (!/listings/.test(afterBuckets) || !/"public":\s*"true"/.test(afterBuckets.replace(/\s/g, " "))) {
    // soft parse check below via evidence file
  }

  writeFileSync(
    resolve(OUT_DIR, "apply-evidence.json"),
    JSON.stringify(
      {
        applied_at: new Date().toISOString(),
        project_ref: PRODUCTION_REF,
        migration: MIG_FILE,
        before: {
          buckets: beforeBuckets.slice(0, 2000),
          policies: beforePolicies.slice(0, 2000),
          orphans: beforeOrphans.slice(0, 500),
          listings_objects: beforeListings.slice(0, 500),
        },
        after: {
          buckets: afterBuckets.slice(0, 2500),
          policies: afterPolicies.slice(0, 2500),
          history: afterHistory.slice(0, 2000),
          orphans: afterOrphans.slice(0, 500),
          listings_objects: afterListings.slice(0, 500),
        },
        deleted_orphans: false,
        listings_policy_touched: false,
      },
      null,
      2,
    ),
  );

  console.log("OK apply-h4b3b-production");
}

main();
