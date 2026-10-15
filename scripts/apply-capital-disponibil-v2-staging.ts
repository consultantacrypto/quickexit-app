/**
 * Capital Disponibil v2 — apply lifecycle migration to STAGING ONLY.
 * Hard-refuses Production. Never links the repo supabase/ project permanently.
 *
 *   npx tsx scripts/apply-capital-disponibil-v2-staging.ts
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { STAGING_REF, assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const TEMP_WORKDIR = join(tmpdir(), "qe-capital-v2-staging");
const MIG_FILE = "20261015140000_capital_disponibil_v2_lifecycle.sql";
const MIG_VERSION = "20261015140000";

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
  const p = join(TEMP_WORKDIR, "qe-capital-v2-query.sql");
  writeFileSync(p, `${sql}\n`, "utf8");
  return runNpx(`supabase db query --linked -o json -f "${p}"`, TEMP_WORKDIR);
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
    WHERE version = '${MIG_VERSION}'
    ORDER BY version;
  `);
  console.log(`before_history=${beforeHist.replace(/\s+/g, " ").slice(0, 300)}`);

  const beforeCols = query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='demands'
      AND column_name IN ('paid','activated_at','expires_at','package_id','buyer_verified')
    ORDER BY column_name;
  `);
  console.log(`before_cols=${beforeCols.replace(/\s+/g, " ").slice(0, 400)}`);

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

  const afterCols = query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='demands'
      AND column_name IN ('paid','activated_at','expires_at','package_id','buyer_verified')
    ORDER BY column_name;
  `);
  console.log(`after_cols=${afterCols.replace(/\s+/g, " ").slice(0, 800)}`);

  for (const col of ["paid", "activated_at", "expires_at", "package_id", "buyer_verified"]) {
    if (!afterCols.includes(col)) fail(`missing column after apply: ${col}`);
  }

  const rowCount = query(`SELECT count(*)::text AS n FROM public.demands;`);
  console.log(`demands_row_count=${rowCount.replace(/\s+/g, " ").slice(0, 200)}`);

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
  console.log(`after_history=${afterHist.replace(/\s+/g, " ").slice(0, 300)}`);

  console.log("OK apply-capital-disponibil-v2-staging");
}

main();
