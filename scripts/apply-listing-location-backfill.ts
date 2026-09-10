/**
 * Fail-closed structured-location backfill.
 *
 * Default: read-only dry-run (GET/HEAD only). No database writes.
 * Live writes require BOTH:
 *   --apply --confirm=QUICKEXIT_LOCATION_BACKFILL_45
 *
 * This process never auto-rolls back production. A rollback artifact is
 * generated from the local backup and requires a different confirmation phrase.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  applyListingLocationToDetails,
  buildLocationSearchValue,
  hasStructuredListingLocation,
  locationFromFormData,
  parseListingLocationFromDetails,
  type ListingLocation,
} from "../lib/listingLocation";
import { foldLocationSearch } from "../lib/locationFold";
import {
  EXPECTED_MISSING,
  INVENTORY_PATH,
  MAPPINGS,
  SELECT_LIMIT,
  asDetailsRecord,
  assertMappingIntegrity,
  assertMappingMatchesPrepareScript,
  assertGitIgnored,
  categoriesMatch,
  createSupabaseKey,
  ipv4Request,
  lostKeys,
  nonLocationChanges,
  parseInventory,
  resolveIgnoredBackupDir,
  selectErrorMessage,
  titlesMatch,
  type InventoryRow,
  type LiveRow,
  type ProposedLocation,
} from "./listingLocationBackfillShared";

const APPLY_CONFIRM = "QUICKEXIT_LOCATION_BACKFILL_45";
const ROLLBACK_CONFIRM = "QUICKEXIT_LOCATION_ROLLBACK_45";
const RESULT_PATH = path.resolve(process.cwd(), "docs/internal/listing-location-backfill-result.md");

const MUTATION_LIKE = new Set([
  "--write",
  "--commit",
  "--mutate",
  "--force",
  "--yes",
  "--unsafe",
  "--execute",
  "--live",
  "--prod",
  "--rollback",
  "--restore",
  "--delete",
  "--upsert",
]);

type Mode = { apply: false } | { apply: true; confirm: typeof APPLY_CONFIRM };

type Classified = {
  id: string;
  title: string;
  category: string;
  proposed: ProposedLocation;
  location: ListingLocation;
  currentDetails: Record<string, unknown>;
  proposedDetails: Record<string, unknown>;
};

let patchCount = 0;
let patchesArmed = false;
const allowedPatchIds = new Set<string>();

function parseArgs(argv: string[]): Mode {
  const unknown = argv.filter((arg) => arg !== "--apply" && !arg.startsWith("--confirm="));
  for (const arg of unknown) {
    if (MUTATION_LIKE.has(arg) || arg.startsWith("--rollback") || arg.startsWith("--restore")) {
      throw new Error(`Rejected mutation-like argument: ${arg}`);
    }
    throw new Error(`Rejected unknown argument: ${arg}`);
  }

  const apply = argv.includes("--apply");
  const confirmArg = argv.find((arg) => arg.startsWith("--confirm="));
  const confirm = confirmArg ? confirmArg.slice("--confirm=".length) : "";

  if (!apply && confirmArg) {
    throw new Error("`--confirm` is ignored without `--apply`. Default remains dry-run.");
  }
  if (apply && confirm !== APPLY_CONFIRM) {
    throw new Error(
      "Live writes require --apply --confirm=QUICKEXIT_LOCATION_BACKFILL_45. No other confirmation is accepted.",
    );
  }
  if (apply) return { apply: true, confirm: APPLY_CONFIRM };
  return { apply: false };
}

function targetLocation(proposed: ProposedLocation): ListingLocation {
  const check = locationFromFormData({
    country_code: proposed.country_code,
    country_name: proposed.country_name,
    county: proposed.county,
    city: proposed.city,
    district: proposed.district ?? "",
  });
  if (!check.ok) {
    throw new Error(`Approved mapping failed validation: ${check.error}`);
  }
  return check.location;
}

function detailsMatchTarget(details: unknown, location: ListingLocation): boolean {
  if (!hasStructuredListingLocation(details)) return false;
  const parsed = parseListingLocationFromDetails(details);
  if (!parsed) return false;
  if (foldLocationSearch(parsed.country_code) !== foldLocationSearch(location.country_code)) return false;
  if (foldLocationSearch(parsed.county) !== foldLocationSearch(location.county)) return false;
  if (foldLocationSearch(parsed.city) !== foldLocationSearch(location.city)) return false;
  if (foldLocationSearch(parsed.district ?? "") !== foldLocationSearch(location.district ?? "")) {
    return false;
  }
  const storedSearch = foldLocationSearch(String(asDetailsRecord(details).location_search ?? ""));
  return storedSearch === buildLocationSearchValue(location);
}

function allowPatch(url: URL, body: string): void {
  if (!patchesArmed) {
    throw new Error("PATCH refused: backup gate is not armed.");
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  if (!pathname.endsWith("/listings")) {
    throw new Error("PATCH refused: path is not listings.");
  }
  const idFilter = url.searchParams.get("id") ?? "";
  const match = /^eq\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(idFilter);
  if (!match) throw new Error("PATCH refused: missing single-id filter.");
  const id = match[1].toLowerCase();
  if (!allowedPatchIds.has(id)) {
    throw new Error("PATCH refused: id is not in the armed mutation set.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("PATCH refused: body is not JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("PATCH refused: body must be a details object wrapper.");
  }
  const keys = Object.keys(parsed as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== "details") {
    throw new Error("PATCH refused: only the details field may be updated.");
  }
  const details = (parsed as { details: unknown }).details;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    throw new Error("PATCH refused: details must be an object.");
  }
  patchCount += 1;
}

function createClientForMode(mode: Mode): SupabaseClient {
  const { url, key } = createSupabaseKey();
  const allowed = mode.apply ? new Set(["GET", "HEAD", "PATCH"]) : new Set(["GET", "HEAD"]);
  return createClient(url, key, {
    global: {
      fetch: (input, init) =>
        ipv4Request(input, init, allowed, (parsed, body) => {
          if (!mode.apply) throw new Error("PATCH refused: dry-run is GET/HEAD only.");
          allowPatch(parsed, body);
        }),
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function selectActiveNonSeedListings(supabase: SupabaseClient): Promise<LiveRow[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("id,title,category,status,is_seed,details")
    .eq("status", "active")
    .eq("is_seed", false)
    .order("created_at", { ascending: false })
    .limit(SELECT_LIMIT);
  if (error) throw new Error(`SELECT failed: ${selectErrorMessage(error)}`);
  const rows = (data ?? []) as LiveRow[];
  if (rows.length >= SELECT_LIMIT) {
    throw new Error(`SELECT hit the ${SELECT_LIMIT}-row cap; inventory may be truncated.`);
  }
  return rows;
}

async function selectOne(supabase: SupabaseClient, id: string): Promise<LiveRow> {
  const { data, error } = await supabase
    .from("listings")
    .select("id,title,category,status,is_seed,details")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Read-back SELECT failed for ${id}: ${selectErrorMessage(error)}`);
  if (!data) throw new Error(`Read-back SELECT returned no row for ${id}.`);
  return data as LiveRow;
}

function classify(inventory: InventoryRow[], live: LiveRow[]): {
  ready: Classified[];
  alreadyMatching: Classified[];
  blockers: Array<{ id: string; reason: string }>;
  unexpected: string[];
  unresolved: string[];
  liveMissingCount: number;
} {
  const mappedIds = new Set(Object.keys(MAPPINGS));
  const byId = new Map<string, LiveRow>();
  const duplicateLive: string[] = [];
  for (const row of live) {
    const id = String(row.id || "").toLowerCase();
    if (byId.has(id)) duplicateLive.push(id);
    byId.set(id, row);
  }

  const liveMissing = live.filter((row) => !hasStructuredListingLocation(row.details));
  const liveMissingIds = new Set(liveMissing.map((row) => String(row.id).toLowerCase()));
  const unexpected = [...liveMissingIds].filter((id) => !mappedIds.has(id)).sort();
  const unresolved = [...mappedIds].filter((id) => !byId.has(id)).sort();
  const blockers: Array<{ id: string; reason: string }> = [];
  const ready: Classified[] = [];
  const alreadyMatching: Classified[] = [];

  if (duplicateLive.length > 0) {
    blockers.push({ id: duplicateLive[0], reason: `Duplicate live IDs: ${duplicateLive.join(", ")}` });
  }

  for (const expected of inventory) {
    const liveRow = byId.get(expected.id);
    const proposed = MAPPINGS[expected.id];
    if (!liveRow) {
      blockers.push({ id: expected.id, reason: "Mapped listing is missing from the live active non-seed inventory." });
      continue;
    }
    if (String(liveRow.status || "").toLowerCase() !== "active" || liveRow.is_seed === true) {
      blockers.push({ id: expected.id, reason: "Listing is no longer active and non-seed." });
      continue;
    }
    if (!titlesMatch(expected.title, String(liveRow.title ?? ""))) {
      blockers.push({
        id: expected.id,
        reason: `Title no longer matches the report. Expected “${expected.title}”; live “${liveRow.title ?? ""}”.`,
      });
      continue;
    }
    if (!categoriesMatch(expected.category, String(liveRow.category ?? ""))) {
      blockers.push({
        id: expected.id,
        reason: `Category no longer matches the report. Expected “${expected.category}”; live “${liveRow.category ?? ""}”.`,
      });
      continue;
    }

    const location = targetLocation(proposed);
    const currentDetails = asDetailsRecord(liveRow.details);
    const proposedDetails = applyListingLocationToDetails(currentDetails, location);
    const lost = lostKeys(currentDetails, proposedDetails);
    if (lost.length > 0) {
      blockers.push({ id: expected.id, reason: `Merge would drop details keys: ${lost.join(", ")}.` });
      continue;
    }
    const extra = nonLocationChanges(currentDetails, proposedDetails);
    if (extra.length > 0) {
      blockers.push({
        id: expected.id,
        reason: `Merge would change non-location keys: ${extra.join(", ")}.`,
      });
      continue;
    }
    if (!hasStructuredListingLocation(proposedDetails)) {
      blockers.push({ id: expected.id, reason: "Proposed details still fail structured-location validation." });
      continue;
    }
    if (!detailsMatchTarget(proposedDetails, location)) {
      blockers.push({ id: expected.id, reason: "Proposed details do not equal the approved mapping." });
      continue;
    }

    const row: Classified = {
      id: expected.id,
      title: String(liveRow.title ?? ""),
      category: String(liveRow.category ?? ""),
      proposed,
      location,
      currentDetails,
      proposedDetails,
    };

    if (detailsMatchTarget(liveRow.details, location)) {
      alreadyMatching.push(row);
      continue;
    }
    if (hasStructuredListingLocation(liveRow.details) || parseListingLocationFromDetails(liveRow.details)) {
      blockers.push({
        id: expected.id,
        reason: "Listing already has a structured location that differs from the approved target.",
      });
      continue;
    }
    ready.push(row);
  }

  for (const id of unexpected) {
    blockers.push({ id, reason: "Unexpected live listing is missing structured location and is not in the mapping." });
  }

  return {
    ready,
    alreadyMatching,
    blockers,
    unexpected,
    unresolved,
    liveMissingCount: liveMissing.length,
  };
}

type BackupPayload = {
  created_at: string;
  note: string;
  ready_ids: string[];
  rows: Array<{
    id: string;
    title: string;
    original_details: Record<string, unknown>;
    proposed_details: Record<string, unknown>;
    target_location: ListingLocation;
  }>;
};

function createExclusiveRunDir(backupRoot: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "");
  const runDir = path.join(backupRoot, `run-${stamp}`);
  assertGitIgnored(backupRoot);
  assertGitIgnored(runDir);
  fs.mkdirSync(backupRoot, { recursive: true });
  if (fs.existsSync(runDir)) {
    throw new Error(`Refuse to reuse or overwrite existing backup directory: ${path.basename(runDir)}`);
  }
  fs.mkdirSync(runDir);
  return runDir;
}

function writeBackupAndVerify(
  backupRoot: string,
  ready: Classified[],
  alreadyMatching: Classified[],
): { runDir: string; backupFile: string; rollbackFile: string; journalFile: string } {
  if (ready.length === 0) {
    throw new Error("Backup refused: no rows are ready for mutation.");
  }
  const runDir = createExclusiveRunDir(backupRoot);
  const backupFile = path.join(runDir, "backup.json");
  const rollbackFile = path.join(runDir, "rollback.ts");
  const journalFile = path.join(runDir, "journal.jsonl");
  const payload: BackupPayload = {
    created_at: new Date().toISOString(),
    note: "Local backup only. Contains listing details. Do not commit.",
    ready_ids: ready.map((row) => row.id),
    rows: [...ready, ...alreadyMatching].map((row) => ({
      id: row.id,
      title: row.title,
      original_details: row.currentDetails,
      proposed_details: row.proposedDetails,
      target_location: row.location,
    })),
  };

  const fd = fs.openSync(backupFile, "wx");
  try {
    fs.writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } finally {
    fs.closeSync(fd);
  }

  const rollback = `/**
 * GENERATED rollback artifact. Not executed by the backfill tool.
 * Restores only original backed-up details for mapped listing IDs.
 *
 * Requires BOTH:
 *   --rollback --confirm=${ROLLBACK_CONFIRM}
 *
 * This file lives in a gitignored directory. Do not copy credentials into it.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

const APPLY_CONFIRM = "QUICKEXIT_LOCATION_BACKFILL_45";
const CONFIRM = ${JSON.stringify(ROLLBACK_CONFIRM)};
const BACKUP = "backup.json";
const MAPPED = new Set(${JSON.stringify(Object.keys(MAPPINGS))});

const argv = process.argv.slice(2);
if (argv.includes("--apply") || argv.some((arg) => arg === "--confirm=" + APPLY_CONFIRM)) {
  console.error("Refusing: apply confirmation cannot run rollback.");
  process.exit(1);
}
if (!(argv.includes("--rollback") && argv.includes("--confirm=" + CONFIRM))) {
  console.error("Refusing to run. Required: --rollback --confirm=" + CONFIRM);
  process.exit(1);
}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
if (!url || !key) {
  console.error("Missing configured Supabase credentials.");
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(path.join(__dirname, BACKUP), "utf8")) as {
  rows: Array<{ id: string; original_details: Record<string, unknown> }>;
};

async function main() {
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const row of backup.rows) {
    const id = String(row.id || "").toLowerCase();
    if (!MAPPED.has(id)) {
      console.error("Refusing unknown id in backup");
      process.exit(1);
    }
    if (!row.original_details || typeof row.original_details !== "object") {
      console.error("Backup details missing for", id);
      process.exit(1);
    }
    const { error } = await supabase.from("listings").update({ details: row.original_details }).eq("id", id);
    if (error) {
      console.error("Stopped on", id);
      process.exit(1);
    }
  }
}

void main();
`;
  const rollbackFd = fs.openSync(rollbackFile, "wx");
  try {
    fs.writeFileSync(rollbackFd, rollback, "utf8");
  } finally {
    fs.closeSync(rollbackFd);
  }

  const raw = fs.readFileSync(backupFile, "utf8");
  const parsed = JSON.parse(raw) as BackupPayload;
  if (!parsed || !Array.isArray(parsed.rows) || !Array.isArray(parsed.ready_ids)) {
    throw new Error("Backup read-back failed: invalid JSON shape.");
  }
  const byId = new Map(parsed.rows.map((row) => [String(row.id).toLowerCase(), row]));
  if (new Set(parsed.ready_ids).size !== ready.length) {
    throw new Error("Backup read-back failed: ready_ids count mismatch.");
  }
  for (const row of ready) {
    const saved = byId.get(row.id);
    if (!saved) throw new Error(`Backup read-back missing ready id ${row.id}.`);
    if (JSON.stringify(saved.original_details) !== JSON.stringify(row.currentDetails)) {
      throw new Error(`Backup original details mismatch for ${row.id}.`);
    }
    if (JSON.stringify(saved.proposed_details) !== JSON.stringify(row.proposedDetails)) {
      throw new Error(`Backup proposed details mismatch for ${row.id}.`);
    }
    if (JSON.stringify(saved.target_location) !== JSON.stringify(row.location)) {
      throw new Error(`Backup target location mismatch for ${row.id}.`);
    }
  }
  return { runDir, backupFile, rollbackFile, journalFile };
}

function appendJournal(journalFile: string, entry: Record<string, unknown>): void {
  fs.appendFileSync(journalFile, `${JSON.stringify(entry)}\n`, "utf8");
}

function writeResultReport(input: {
  written: number;
  skipped: number;
  inspected: number;
  missingAfter: number;
  unexpected: number;
  blocked: number;
}): void {
  const body = [
    "# Listing location backfill result",
    "",
    "Written only after a real `--apply` run. Canonical store remains `listings.details`.",
    "",
    "## Totals",
    "",
    "| Metric | Count |",
    "|---|---|",
    `| Inspected active non-seed | ${input.inspected} |`,
    `| Written this run | ${input.written} |`,
    `| Already matching / skipped | ${input.skipped} |`,
    `| Remaining without structured location | ${input.missingAfter} |`,
    `| Unexpected | ${input.unexpected} |`,
    `| Divergent / blocked | ${input.blocked} |`,
    "",
  ].join("\n");
  fs.writeFileSync(RESULT_PATH, `${body}\n`, "utf8");
}

async function main() {
  const mode = parseArgs(process.argv.slice(2));
  assertMappingIntegrity();
  assertMappingMatchesPrepareScript();
  const mappedIds = new Set(Object.keys(MAPPINGS));
  if (mappedIds.size !== EXPECTED_MISSING) {
    throw new Error(`Expected ${EXPECTED_MISSING} mapped IDs.`);
  }

  const backupDir = resolveIgnoredBackupDir();
  const inventory = parseInventory(fs.readFileSync(INVENTORY_PATH, "utf8"));
  if (inventory.length !== EXPECTED_MISSING) {
    throw new Error(`Missing-location report parsed ${inventory.length} rows; expected ${EXPECTED_MISSING}.`);
  }

  const supabase = createClientForMode(mode);
  const live = await selectActiveNonSeedListings(supabase);
  const plan = classify(inventory, live);

  const summary = {
    mode: mode.apply ? "apply" : "dry-run",
    inspected: plan.liveMissingCount,
    mapped: plan.ready.length + plan.alreadyMatching.length,
    ready: plan.ready.length,
    alreadyMatching: plan.alreadyMatching.length,
    unresolved: plan.unresolved.length,
    unexpected: plan.unexpected.length,
    blocked: plan.blockers.length,
    written: 0,
    httpPatches: patchCount,
    backupDir,
  };

  const mappedOk = plan.ready.length + plan.alreadyMatching.length === EXPECTED_MISSING;
  const failClosed =
    plan.blockers.length > 0 ||
    plan.unresolved.length > 0 ||
    plan.unexpected.length > 0 ||
    !mappedOk;

  if (!mode.apply) {
    console.log(JSON.stringify(summary, null, 2));
    if (failClosed) {
      for (const blocker of plan.blockers) console.error(`- ${blocker.id}: ${blocker.reason}`);
      process.exitCode = 1;
    }
    return;
  }

  if (failClosed) {
    console.error("Aborting before any write: inventory is not fail-closed.");
    for (const blocker of plan.blockers) console.error(`- ${blocker.id}: ${blocker.reason}`);
    process.exit(1);
  }

  const toWrite = plan.ready;
  if (toWrite.length === 0) {
    writeResultReport({
      written: 0,
      skipped: plan.alreadyMatching.length,
      inspected: live.length,
      missingAfter: plan.liveMissingCount,
      unexpected: 0,
      blocked: 0,
    });
    console.log(JSON.stringify({ ...summary, written: 0, httpPatches: patchCount }, null, 2));
    return;
  }

  const { backupFile, rollbackFile, journalFile } = writeBackupAndVerify(
    backupDir,
    toWrite,
    plan.alreadyMatching,
  );
  appendJournal(journalFile, {
    event: "backup_verified",
    backup: path.basename(backupFile),
    rollback: path.basename(rollbackFile),
    at: new Date().toISOString(),
  });
  for (const row of toWrite) allowedPatchIds.add(row.id);
  patchesArmed = true;

  for (const row of toWrite) {
    const { error } = await supabase.from("listings").update({ details: row.proposedDetails }).eq("id", row.id);
    if (error) {
      console.error(`Stopped on first failed update: ${row.id}`);
      throw new Error(selectErrorMessage(error));
    }
    const readBack = await selectOne(supabase, row.id);
    const lost = lostKeys(row.currentDetails, asDetailsRecord(readBack.details));
    if (lost.length > 0) {
      throw new Error(`Read-back lost keys for ${row.id}: ${lost.join(", ")}`);
    }
    if (!detailsMatchTarget(readBack.details, row.location)) {
      throw new Error(`Read-back structured location mismatch for ${row.id}.`);
    }
    const search = foldLocationSearch(String(asDetailsRecord(readBack.details).location_search ?? ""));
    if (search !== buildLocationSearchValue(row.location)) {
      throw new Error(`Read-back location_search mismatch for ${row.id}.`);
    }
    appendJournal(journalFile, {
      event: "updated",
      id: row.id,
      at: new Date().toISOString(),
    });
  }

  const after = await selectActiveNonSeedListings(supabase);
  const afterMissing = after.filter((row) => !hasStructuredListingLocation(row.details));
  const afterById = new Map(after.map((row) => [String(row.id).toLowerCase(), row]));
  let matching = 0;
  for (const id of mappedIds) {
    const liveRow = afterById.get(id);
    if (!liveRow || !detailsMatchTarget(liveRow.details, targetLocation(MAPPINGS[id]))) {
      throw new Error(`Final verification failed for ${id}.`);
    }
    matching += 1;
  }
  if (matching !== EXPECTED_MISSING) throw new Error("Final verification did not find 45 approved locations.");
  if (afterMissing.length !== 0) throw new Error("Active non-seed rows still lack structured location.");

  writeResultReport({
    written: toWrite.length,
    skipped: plan.alreadyMatching.length,
    inspected: after.length,
    missingAfter: afterMissing.length,
    unexpected: 0,
    blocked: 0,
  });

  console.log(
    JSON.stringify(
      {
        ...summary,
        written: toWrite.length,
        httpPatches: patchCount,
        matching,
        remainingMissing: afterMissing.length,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
