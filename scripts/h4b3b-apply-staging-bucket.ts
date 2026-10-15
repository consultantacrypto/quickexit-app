/**
 * H4B.3b — apply private demand-offers bucket migration to STAGING ONLY.
 * Hard-refuses Production. Never links the repo supabase/ project.
 *
 *   npx tsx scripts/h4b3b-apply-staging-bucket.ts
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { STAGING_REF, assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const TEMP_WORKDIR = join(tmpdir(), "qe-h4b3b-staging");
const MIG_FILE = "20261015120000_h4b3b_private_demand_offer_media.sql";

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

function ensureTempStagingLink() {
  mkdirSync(TEMP_WORKDIR, { recursive: true });
  if (!existsSync(join(TEMP_WORKDIR, "supabase", "config.toml"))) {
    runNpx("supabase init --yes", TEMP_WORKDIR);
  }
  runNpx(`supabase link --project-ref ${STAGING_REF} --yes`, TEMP_WORKDIR);
  const refPath = join(TEMP_WORKDIR, "supabase", ".temp", "project-ref");
  if (existsSync(refPath)) {
    const linked = readFileSync(refPath, "utf8").trim();
    if (linked === PRODUCTION_REF) fail("ABORT temp linked to Production");
  }
}

function query(sql: string): string {
  const p = join(TEMP_WORKDIR, "qe-h4b3b-query.sql");
  writeFileSync(p, `${sql}\n`, "utf8");
  return runNpx(`supabase db query --linked -o json -f "${p}"`, TEMP_WORKDIR);
}

function main() {
  assertStagingSupabaseWriteTarget(`https://${STAGING_REF}.supabase.co`);
  console.log(`staging_ref=${STAGING_REF}`);
  console.log("production=untouched");
  console.log("repo_link=unchanged");

  ensureTempStagingLink();

  const before = query(`
    SELECT id, public::text AS public, file_size_limit::text AS file_size_limit
    FROM storage.buckets WHERE id = 'demand-offers';
  `);
  console.log(`before_buckets=${before.slice(0, 400)}`);

  const path = resolve("supabase/migrations", MIG_FILE);
  if (!existsSync(path)) fail(`missing ${MIG_FILE}`);
  try {
    const out = runNpx(`supabase db query --linked -f "${path}"`, TEMP_WORKDIR);
    if (/ERROR:/i.test(out)) fail(out.slice(0, 800));
    console.log("apply=ok");
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    fail(`${err.stderr ?? ""}\n${err.stdout ?? ""}\n${err.message ?? ""}`.slice(0, 1200));
  }

  const after = query(`
    SELECT id, public::text AS public, file_size_limit::text AS file_size_limit,
           allowed_mime_types::text AS mime
    FROM storage.buckets WHERE id = 'demand-offers';
    SELECT policyname, cmd, roles::text
    FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname ILIKE '%demand_offers%'
    ORDER BY policyname;
  `);
  console.log(`after=${after.slice(0, 1200)}`);

  // Bookkeeping-only history mark (version present → skip)
  try {
    query(`
      INSERT INTO supabase_migrations.schema_migrations (version)
      SELECT '20261015120000'
      WHERE NOT EXISTS (
        SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261015120000'
      );
    `);
    console.log("history_mark=ok");
  } catch (e) {
    console.log(`history_mark=skipped ${(e as Error).message?.slice(0, 120) ?? ""}`);
  }

  console.log("OK h4b3b-apply-staging-bucket");
}

main();
