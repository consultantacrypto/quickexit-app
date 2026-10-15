/**
 * Phase 1C — apply wallet identity migration to STAGING ONLY.
 * Uses temp-workdir `supabase link` + `db query --linked`.
 * Hard-refuses Production.
 *
 *   npx tsx scripts/apply-wallet-identity-staging.ts
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { STAGING_REF, assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const TEMP_WORKDIR = join(tmpdir(), "qe-wallet-identity-staging");
const MIG_FILE = "20261015200000_wallet_identity_bind.sql";
const MIG_VERSION = "20261015200000";
const OUT = resolve("docs/internal/auth/phase1c-staging-ddl-2026-10-15.json");

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
  const p = join(TEMP_WORKDIR, "qe-wallet-identity-query.sql");
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

function rowsOf(raw: string): Array<Record<string, unknown>> {
  const parsed = parseJsonLoose(raw);
  if (Array.isArray(parsed)) return parsed as Array<Record<string, unknown>>;
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { rows?: unknown }).rows)
  ) {
    return (parsed as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

function main() {
  assertStagingSupabaseWriteTarget(`https://${STAGING_REF}.supabase.co`);
  console.log(`staging_ref=${STAGING_REF}`);
  console.log("production=untouched");

  ensureTempStagingLink();

  const path = resolve("supabase/migrations", MIG_FILE);
  if (!existsSync(path)) fail(`missing ${MIG_FILE}`);

  const beforeHist = query(`
    SELECT version FROM supabase_migrations.schema_migrations
    WHERE version = '${MIG_VERSION}';
  `);
  console.log(`before_history=${beforeHist.replace(/\s+/g, " ").slice(0, 200)}`);

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

  const tables = query(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('wallet_addresses', 'wallet_nonces')
      AND c.relkind = 'r'
    ORDER BY 1;
  `);
  const names = new Set(rowsOf(tables).map((r) => String(r.table_name || "")));
  if (!names.has("wallet_addresses") || !names.has("wallet_nonces")) {
    fail(`tables missing after apply: ${tables.slice(0, 400)}`);
  }
  console.log("tables_proof=ok");

  const indexes = query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'wallet_addresses_chain_family_address_uidx',
        'wallet_nonces_nonce_uidx'
      )
    ORDER BY 1;
  `);

  const policies = query(`
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('wallet_addresses', 'wallet_nonces')
    ORDER BY 1, 2;
  `);

  const rls = query(`
    SELECT c.relname AS table_name, c.relrowsecurity AS rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('wallet_addresses', 'wallet_nonces');
  `);

  const artifact = {
    at: new Date().toISOString(),
    staging_ref: STAGING_REF,
    production_ref: PRODUCTION_REF,
    production: "untouched",
    migration: MIG_FILE,
    version: MIG_VERSION,
    tables: ["wallet_addresses", "wallet_nonces"],
    indexes_raw: indexes.slice(0, 800),
    policies_raw: policies.slice(0, 800),
    rls_raw: rls.slice(0, 800),
    result: "PASS",
  };
  writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  console.log(`artifact=${OUT}`);
  console.log("PASS apply-wallet-identity-staging");
}

main();
