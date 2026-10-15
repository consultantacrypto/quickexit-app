/**
 * Phase 4B.1 migration discipline guard (CI-safe, no cloud credentials).
 *
 * PASS only when:
 * - supabase/migrations filenames unique + timestamp-ordered
 * - no DO_NOT_RUN / superseded packs under supabase/migrations
 * - all required H4 production-truth objects appear in canonical migrations
 * - media_orders orphan reconstructed as canonical migration
 * - required H4 rollback docs exist
 * - staging-bootstrap is not treated as runnable migration source
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(".");
const MIG_DIR = join(ROOT, "supabase", "migrations");
const H4_MANIFEST = join(
  ROOT,
  "docs/internal/staging-bootstrap/production-truth/h4-must-present.json",
);
const STAGING_BOOTSTRAP = join(ROOT, "docs/internal/sql/staging-bootstrap");

const REQUIRED_CANONICAL_SNIPPETS = [
  "quickexit_media_orders_phase_2b_2b1",
  "reconcile_h4b1_write_escalation",
  "reconcile_h4b2a_offers_identity",
  "reconcile_h4b2b_negotiation_insert",
  "reconcile_h4b3a_listings_storage",
  "reconcile_core_schema_production_truth",
  "reconcile_baseline_rls_production_truth",
  "reconcile_evidenced_triggers",
  "reconcile_listing_offer_stats_trigger",
];

const REQUIRED_ROLLBACKS = [
  "docs/internal/sql/h4b-proposed/h4b-1-write-escalation-hardening.ROLLBACK.sql",
  "docs/internal/sql/h4b-proposed/h4b-2a-offers-insert-identity-hardening.ROLLBACK.sql",
  "docs/internal/sql/h4b-proposed/h4b-2b-negotiation-insert-hardening.ROLLBACK.sql",
  "docs/internal/sql/h4b-proposed/h4b-3a-listings-storage-write-hardening.ROLLBACK.sql",
];

const FORBIDDEN_BASENAME_SNIPPETS = [
  "h4b-2-listing-offers-rls",
  "h4b-2-demand-offers-rls",
  "h4b-2-negotiations-rls",
  "h4b-2a-offers-rls-safe-replace",
  "h4b-3b-private-offer-media",
  "offers-rls-hardening",
  "negotiations-rls-hardening",
];

const ORPHAN_MEDIA_ORDERS_MARKERS = [
  "20261008150013",
  "quickexit_media_orders_phase_2b_2b1",
];

function fail(msg: string): never {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

function main() {
  if (!existsSync(MIG_DIR)) fail("supabase/migrations missing");

  const files = readdirSync(MIG_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) fail("no migrations present");

  const versions = files.map((f) => {
    const m = f.match(/^(\d{14})_(.+)\.sql$/);
    if (!m) fail(`migration filename must be YYYYMMDDHHMMSS_name.sql: ${f}`);
    return { version: m[1]!, name: m[2]!, file: f };
  });
  const versionSet = new Set<string>();
  for (const v of versions) {
    if (versionSet.has(v.version)) fail(`duplicate migration version ${v.version}`);
    versionSet.add(v.version);
  }
  for (let i = 1; i < versions.length; i++) {
    if (versions[i]!.version < versions[i - 1]!.version) {
      fail(`migrations not ordered: ${versions[i - 1]!.file} then ${versions[i]!.file}`);
    }
  }

  for (const f of files) {
    for (const snip of FORBIDDEN_BASENAME_SNIPPETS) {
      if (f.toLowerCase().includes(snip.toLowerCase())) {
        fail(`DO_NOT_RUN file must not live in supabase/migrations: ${f}`);
      }
    }
  }

  const basenamesJoined = files.join("\n");
  for (const snip of REQUIRED_CANONICAL_SNIPPETS) {
    if (!basenamesJoined.includes(snip)) {
      fail(`required canonical migration missing (basename contains "${snip}")`);
    }
  }

  const migText = files
    .map((f) => readFileSync(join(MIG_DIR, f), "utf8"))
    .join("\n");

  for (const marker of ORPHAN_MEDIA_ORDERS_MARKERS) {
    if (!migText.includes(marker)) {
      fail(`media_orders orphan reconciliation incomplete — missing marker "${marker}"`);
    }
  }

  if (!existsSync(H4_MANIFEST)) {
    fail(`missing H4 manifest ${H4_MANIFEST}`);
  }
  const h4 = JSON.parse(readFileSync(H4_MANIFEST, "utf8")) as Array<{
    kind: string;
    name: string;
  }>;
  const missing = h4.filter((o) => !migText.includes(o.name));

  for (const rb of REQUIRED_ROLLBACKS) {
    if (!existsSync(join(ROOT, rb))) {
      fail(`required rollback missing: ${rb}`);
    }
  }

  // Staging bootstrap must remain historical — never copied as sole runnable source
  if (existsSync(STAGING_BOOTSTRAP)) {
    const readme = join(STAGING_BOOTSTRAP, "README.md");
    if (existsSync(readme)) {
      const t = readFileSync(readme, "utf8");
      if (
        !/RECOVERY|HISTORICAL BOOTSTRAP|NOT.*canonical migration/i.test(t) &&
        !/NOT HISTORICAL MIGRATION|BOOTSTRAP SNAPSHOT/i.test(t)
      ) {
        fail(
          "docs/internal/sql/staging-bootstrap/README.md must mark RECOVERY / HISTORICAL BOOTSTRAP (not canonical)",
        );
      }
    }
  }

  // Superseded proposed packs must carry DO_NOT_RUN
  const proposedDir = join(ROOT, "docs/internal/sql/h4b-proposed");
  const mustMark = [
    "h4b-2-listing-offers-rls.sql",
    "h4b-2-demand-offers-rls.sql",
    "h4b-2-negotiations-rls.sql",
    "h4b-2a-offers-rls-safe-replace.sql",
    "h4b-3b-private-offer-media.sql",
    "offers-rls-hardening.sql",
    "negotiations-rls-hardening.sql",
  ];
  const unmarked: string[] = [];
  for (const name of mustMark) {
    const p = join(proposedDir, name);
    if (!existsSync(p)) continue;
    const head = readFileSync(p, "utf8").slice(0, 1200);
    if (!/DO_NOT_RUN/i.test(head)) unmarked.push(name);
  }
  if (unmarked.length) {
    fail(`proposed SQL missing DO_NOT_RUN header: ${unmarked.join(", ")}`);
  }

  const report = {
    at: new Date().toISOString(),
    mode: "assert-migration-discipline",
    migration_count: files.length,
    migrations: versions.map((v) => v.file),
    h4_required: h4.length,
    h4_missing_from_canonical_migrations: missing.map((m) => `${m.kind}:${m.name}`),
    media_orders_orphan_reconciled: true,
    rollbacks_ok: true,
  };
  console.log(JSON.stringify(report, null, 2));

  if (missing.length) {
    fail(
      `H4 objects absent from supabase/migrations (${missing.length}/${h4.length}): ${missing
        .map((m) => m.name)
        .join(", ")}`,
    );
  }

  console.error("OK assert-migration-discipline");
}

main();
