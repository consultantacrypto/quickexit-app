/**
 * Capital Disponibil v2 — apply lifecycle migration to PRODUCTION ONLY.
 * Applies ONLY: 20261015140000_capital_disponibil_v2_lifecycle.sql
 * Via temp workdir link (never links repo supabase/). Never prints secrets.
 *
 *   npx tsx scripts/apply-capital-disponibil-v2-production.ts
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const STAGING_REF = "nlnzlswjjplofpkhoxtr";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const TEMP_WORKDIR = join(tmpdir(), "qe-capital-v2-production");
const MIG_FILE = "20261015140000_capital_disponibil_v2_lifecycle.sql";
const MIG_VERSION = "20261015140000";
const OUT_DIR = resolve(
  "docs/internal/product/capital-disponibil-v2-production-pre-rollout-2026-10-15",
);

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
  runNpx(`supabase link --project-ref ${PRODUCTION_REF} --yes`, TEMP_WORKDIR);
  const refPath = join(TEMP_WORKDIR, "supabase", ".temp", "project-ref");
  if (existsSync(refPath)) {
    const linked = readFileSync(refPath, "utf8").trim();
    if (linked === STAGING_REF) fail("ABORT temp linked to Staging");
    if (linked !== PRODUCTION_REF) fail(`ABORT unexpected linked ref=${linked}`);
  }
}

function query(sql: string): string {
  const p = join(TEMP_WORKDIR, "qe-capital-v2-prod-query.sql");
  writeFileSync(p, `${sql}\n`, "utf8");
  return runNpx(`supabase db query --linked -o json -f "${p}"`, TEMP_WORKDIR);
}

function assertSqlSafe(sql: string) {
  if (/DROP\s+TABLE/i.test(sql)) fail("refuses DROP TABLE");
  if (/DROP\s+COLUMN/i.test(sql) && !/COMMENT/i.test(sql)) {
    // comments may mention drop; actual DDL must not drop columns
    if (/ALTER\s+TABLE[\s\S]*DROP\s+COLUMN/i.test(sql)) fail("refuses DROP COLUMN");
  }
  if (!sql.includes("ADD COLUMN IF NOT EXISTS")) fail("must be additive columns");
  for (const col of [
    "paid",
    "activated_at",
    "expires_at",
    "package_id",
    "buyer_verified",
  ]) {
    if (!sql.includes(col)) fail(`missing expected column ${col}`);
  }
}

function main() {
  console.log(`production_ref=${PRODUCTION_REF}`);
  console.log("staging=untouched");
  console.log("repo_link=unchanged");

  ensureProdLink();
  mkdirSync(OUT_DIR, { recursive: true });

  const beforeHist = query(`
    SELECT version FROM supabase_migrations.schema_migrations
    WHERE version = '${MIG_VERSION}';
  `);
  writeFileSync(join(OUT_DIR, "migration-before.json"), beforeHist);

  const beforeCols = query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='demands'
      AND column_name IN ('paid','activated_at','expires_at','package_id','buyer_verified')
    ORDER BY column_name;
  `);
  writeFileSync(join(OUT_DIR, "demands-cols-before.json"), beforeCols);

  const beforeCounts = query(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'active')::int AS active,
      count(*) FILTER (WHERE status = 'pending_payment')::int AS pending_payment,
      count(*) FILTER (WHERE status = 'expired')::int AS expired
    FROM public.demands;
  `);
  writeFileSync(join(OUT_DIR, "demands-counts-before.json"), beforeCounts);

  const path = resolve("supabase/migrations", MIG_FILE);
  if (!existsSync(path)) fail(`missing ${MIG_FILE}`);
  const sql = readFileSync(path, "utf8");
  assertSqlSafe(sql);

  if (beforeHist.includes(MIG_VERSION)) {
    console.log("migration_already_recorded=true");
  } else {
    try {
      const out = runNpx(`supabase db query --linked -f "${path}"`, TEMP_WORKDIR);
      if (/ERROR:/i.test(out)) fail(out.slice(0, 800));
      console.log("apply=ok");
    } catch (e) {
      const err = e as { stderr?: string; stdout?: string; message?: string };
      fail(`${err.stderr ?? ""}\n${err.stdout ?? ""}\n${err.message ?? ""}`.slice(0, 1200));
    }

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
  }

  const afterCols = query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='demands'
      AND column_name IN ('paid','activated_at','expires_at','package_id','buyer_verified')
    ORDER BY column_name;
  `);
  writeFileSync(join(OUT_DIR, "demands-cols-after.json"), afterCols);
  for (const col of ["paid", "activated_at", "expires_at", "package_id", "buyer_verified"]) {
    if (!afterCols.includes(col)) fail(`missing column after apply: ${col}`);
  }

  const afterCounts = query(`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'active')::int AS active,
      count(*) FILTER (WHERE status = 'pending_payment')::int AS pending_payment,
      count(*) FILTER (WHERE status = 'expired')::int AS expired
    FROM public.demands;
  `);
  writeFileSync(join(OUT_DIR, "demands-counts-after.json"), afterCounts);

  const afterHist = query(`
    SELECT version FROM supabase_migrations.schema_migrations
    WHERE version = '${MIG_VERSION}';
  `);
  writeFileSync(join(OUT_DIR, "migration-after.json"), afterHist);
  if (!afterHist.includes(MIG_VERSION)) fail("migration not recorded");

  // Unrelated tables must still exist unchanged (presence probe only)
  const unrelated = query(`
    SELECT
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='listings') AS listings_table,
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='media_orders') AS media_orders_table;
  `);
  writeFileSync(join(OUT_DIR, "unrelated-tables-probe.json"), unrelated);

  console.log(
    JSON.stringify(
      {
        ok: true,
        production_ref: PRODUCTION_REF,
        migration: MIG_VERSION,
        out_dir: OUT_DIR,
      },
      null,
      2,
    ),
  );
  console.log("OK apply-capital-disponibil-v2-production");
}

main();
