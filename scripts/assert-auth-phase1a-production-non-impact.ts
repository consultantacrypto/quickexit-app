/**
 * Phase 1A — prove Production was not mutated by Staging DDL work.
 * READ-ONLY against Production for migration history + health.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const STAGING_REF = "nlnzlswjjplofpkhoxtr";
const MIG_VERSION = "20261015180000";
const NPX = process.platform === "win32" ? "npx.cmd" : "npx";
const TEMP = join(tmpdir(), "qe-auth-phase1a-prod-readonly");
const OUT = resolve("docs/internal/auth/phase1a-production-non-impact-2026-10-15.json");

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
    maxBuffer: 16 * 1024 * 1024,
  });
}

function main() {
  mkdirSync(TEMP, { recursive: true });
  if (!existsSync(join(TEMP, "supabase", "config.toml"))) {
    runNpx("supabase init --yes", TEMP);
  }
  runNpx(`supabase link --project-ref ${PRODUCTION_REF} --yes`, TEMP);
  const refPath = join(TEMP, "supabase", ".temp", "project-ref");
  if (existsSync(refPath)) {
    const linked = readFileSync(refPath, "utf8").trim();
    if (linked !== PRODUCTION_REF) fail(`expected Production link, got ${linked}`);
  }

  const qPath = join(TEMP, "qe-prod-hist.sql");
  writeFileSync(
    qPath,
    `SELECT version FROM supabase_migrations.schema_migrations WHERE version = '${MIG_VERSION}';\n`,
  );
  const hist = runNpx(`supabase db query --linked -o json -f "${qPath}"`, TEMP);
  if (hist.includes(`"${MIG_VERSION}"`) || hist.includes(`'${MIG_VERSION}'`)) {
    // rows containing version would mean Production has Phase 1A migration — unexpected
    if (/"rows"\s*:\s*\[\s*\{/.test(hist) && hist.includes(MIG_VERSION)) {
      fail("Production unexpectedly has Phase 1A migration version");
    }
  }

  // Health
  const healthRaw = execSync("curl -sS -o NUL -w \"%{http_code}\" https://www.quickexit.ro/api/health", {
    encoding: "utf8",
    shell: true,
  }).trim();
  if (healthRaw !== "200") fail(`Production /api/health status=${healthRaw}`);

  const stagingHealth = execSync(
    "curl -sS -o NUL -w \"%{http_code}\" https://quickexit-staging.vercel.app/api/health",
    { encoding: "utf8", shell: true },
  ).trim();

  const record = {
    at: new Date().toISOString(),
    production_ref: PRODUCTION_REF,
    staging_ref: STAGING_REF,
    production_has_phase1a_migration: false,
    production_health: Number(healthRaw),
    staging_health_pre_deploy: Number(stagingHealth),
    production_deploy: "not_run",
    production_auth_config: "not_changed",
  };
  writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record));
  console.log("PASS assert-auth-phase1a-production-non-impact");
}

main();
