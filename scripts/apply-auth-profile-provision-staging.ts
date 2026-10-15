/**
 * Phase 1A — apply profile auto-provision migration to STAGING ONLY.
 * Uses temp-workdir `supabase link` + `db query --linked` (no STAGING_DB_URL).
 * Never links the repo supabase/ project. Hard-refuses Production.
 *
 *   npx tsx scripts/apply-auth-profile-provision-staging.ts
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { STAGING_REF, assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const TEMP_WORKDIR = join(tmpdir(), "qe-auth-profile-provision-staging");
const MIG_FILE = "20261015180000_auth_profile_auto_provision.sql";
const MIG_VERSION = "20261015180000";
const OUT = resolve("docs/internal/auth/phase1a-staging-ddl-2026-10-15.json");

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
    if (linked !== STAGING_REF) fail(`ABORT unexpected linked ref=${linked}`);
  }
}

function query(sql: string): string {
  const p = join(TEMP_WORKDIR, "qe-auth-profile-query.sql");
  writeFileSync(p, `${sql}\n`, "utf8");
  return runNpx(`supabase db query --linked -o json -f "${p}"`, TEMP_WORKDIR);
}

function parseJsonLoose(raw: string): unknown {
  const start = raw.indexOf("[");
  const startObj = raw.indexOf("{");
  let i = -1;
  if (start >= 0 && (startObj < 0 || start < startObj)) i = start;
  else if (startObj >= 0) i = startObj;
  if (i < 0) return null;
  try {
    return JSON.parse(raw.slice(i));
  } catch {
    return null;
  }
}

function main() {
  assertStagingSupabaseWriteTarget(`https://${STAGING_REF}.supabase.co`);
  console.log(`staging_ref=${STAGING_REF}`);
  console.log("production=untouched");
  console.log("repo_link=unchanged");

  ensureTempStagingLink();

  const beforeHist = query(`
    SELECT version
    FROM supabase_migrations.schema_migrations
    WHERE version = '${MIG_VERSION}';
  `);
  console.log(`before_history=${beforeHist.replace(/\s+/g, " ").slice(0, 300)}`);

  const beforeFn = query(`
    SELECT p.proname AS function_name,
           pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user_profile';
  `);
  console.log(`before_fn=${beforeFn.replace(/\s+/g, " ").slice(0, 200)}`);

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

  const afterFn = query(`
    SELECT p.proname AS function_name,
           prosecdef AS security_definer,
           (SELECT trim(both from unnest(p.proconfig)) FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) LIMIT 1) AS config_hint,
           pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user_profile';
  `);
  const afterFnParsed = parseJsonLoose(afterFn) as
    | Array<{ function_name?: string; security_definer?: boolean; def?: string }>
    | null;
  const def = afterFnParsed?.[0]?.def ?? afterFn;
  if (!/handle_new_user_profile/i.test(def)) fail("function missing after apply");
  if (!/SECURITY DEFINER/i.test(def)) fail("SECURITY DEFINER missing");
  if (!/search_path\s*=\s*public/i.test(def)) fail("search_path=public missing");
  if (!/ON CONFLICT \(id\) DO NOTHING/i.test(def)) fail("idempotent ON CONFLICT missing");
  if (/kyc_status\s*=\s*'verified'/i.test(def)) fail("must not escalate KYC");
  console.log("function_proof=ok");

  const afterTrig = query(`
    SELECT t.tgname AS trigger_name,
           c.relname AS table_name,
           n.nspname AS schema_name,
           pg_get_triggerdef(t.oid) AS trigger_def
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created_profile'
      AND NOT t.tgisinternal;
  `);
  if (!/on_auth_user_created_profile/i.test(afterTrig)) fail("trigger missing after apply");
  if (!/auth\.users|schema_name.: .auth/i.test(afterTrig) && !/"schema_name":"auth"/i.test(afterTrig)) {
    // Accept either JSON field or trigdef referencing auth.users
    if (!/ON auth\.users/i.test(afterTrig)) fail("trigger not on auth.users");
  }
  console.log("trigger_proof=ok");

  try {
    query(`
      INSERT INTO supabase_migrations.schema_migrations (version)
      SELECT '${MIG_VERSION}'
      WHERE NOT EXISTS (
        SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '${MIG_VERSION}'
      );
    `);
    console.log("history_mark=ok");
  } catch (e) {
    console.log(`history_mark=skipped ${(e as Error).message?.slice(0, 120) ?? ""}`);
  }

  const afterHist = query(`
    SELECT version
    FROM supabase_migrations.schema_migrations
    WHERE version = '${MIG_VERSION}';
  `);
  if (!afterHist.includes(MIG_VERSION)) fail("migration history missing version");
  console.log(`after_history=${afterHist.replace(/\s+/g, " ").slice(0, 300)}`);

  // Production non-impact: never queried Production here.
  const record = {
    at: new Date().toISOString(),
    staging_ref: STAGING_REF,
    production_ref: PRODUCTION_REF,
    production: "untouched",
    migration: MIG_FILE,
    version: MIG_VERSION,
    apply: "ok",
    function: "handle_new_user_profile",
    trigger: "on_auth_user_created_profile",
    history: "recorded",
  };
  writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record));
  console.log("OK apply-auth-profile-provision-staging");
}

main();
