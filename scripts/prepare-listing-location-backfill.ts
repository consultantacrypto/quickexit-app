/**
 * READ-ONLY dry run: proposed structured-location backfill for the 45
 * active non-seed listings that currently lack valid location in details.
 *
 * This script never mutates Supabase. There is no --apply mode.
 * Canonical store remains listings.details. Proposed objects are built with
 * applyListingLocationToDetails (merge, never replace the full details object).
 */
import { createClient } from "@supabase/supabase-js";
import dns from "node:dns";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import dotenv from "dotenv";
import {
  applyListingLocationToDetails,
  formatListingLocation,
  hasStructuredListingLocation,
  listingLocationLabelFromUnknown,
  locationFromFormData,
  parseListingLocationFromDetails,
  type ListingLocation,
} from "../lib/listingLocation";
import { foldLocationSearch } from "../lib/locationFold";

dns.setDefaultResultOrder("ipv4first");
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: "D:/MEDIA/quickexit/.env.local" });
dotenv.config({ path: "D:/MEDIA/quickexit/.env" });

const EXPECTED_MISSING = 45;
const SELECT_LIMIT = 500;
const REPORT_PATH = path.resolve(process.cwd(), "docs/internal/listing-location-backfill-dry-run.md");
const INVENTORY_PATH = path.resolve(process.cwd(), "docs/internal/listing-location-missing-report.md");

const LOCATION_KEYS = new Set([
  "country_code",
  "country_name",
  "county",
  "region",
  "city",
  "district",
  "location",
  "location_search",
  "location_structured",
]);

type ProposedLocation = {
  country_code: string;
  country_name: string;
  county: string;
  city: string;
  district: string | null;
  group: string;
};

type LiveRow = {
  id: string;
  title: string | null;
  category: string | null;
  status: string | null;
  is_seed: boolean | null;
  details: unknown;
};

type InventoryRow = {
  id: string;
  title: string;
  category: string;
};

type Blocker = {
  id: string;
  reason: string;
};

const VOLUNTARI: ProposedLocation = {
  country_code: "RO",
  country_name: "România",
  county: "Ilfov",
  city: "Voluntari",
  district: null,
  group: "Voluntari, Ilfov — România",
};

const BRASOV: ProposedLocation = {
  country_code: "RO",
  country_name: "România",
  county: "Brașov",
  city: "Brașov",
  district: null,
  group: "Brașov, Brașov — România",
};

const UNGHENI: ProposedLocation = {
  country_code: "MD",
  country_name: "Republica Moldova",
  county: "",
  city: "Ungheni",
  district: null,
  group: "Ungheni — Republica Moldova",
};

const SABARENI: ProposedLocation = {
  country_code: "RO",
  country_name: "România",
  county: "Giurgiu",
  city: "Săbăreni",
  district: null,
  group: "Săbăreni, Giurgiu — România",
};

const CONSTANTA: ProposedLocation = {
  country_code: "RO",
  country_name: "România",
  county: "Constanța",
  city: "Constanța",
  district: null,
  group: "Constanța, Constanța — România",
};

const TULCEA_CITY: ProposedLocation = {
  country_code: "RO",
  country_name: "România",
  county: "Tulcea",
  city: "Tulcea",
  district: null,
  group: "Tulcea, Tulcea — România",
};

const MURIGHIOL: ProposedLocation = {
  country_code: "RO",
  country_name: "România",
  county: "Tulcea",
  city: "Murighiol",
  district: null,
  group: "Murighiol, Tulcea — România",
};

const MAPPINGS: Record<string, ProposedLocation> = {
  "4936e198-e892-425e-9030-21610cc3c0ff": VOLUNTARI,
  "0e0a6734-f66f-48ce-8fc5-35eb42987652": VOLUNTARI,
  "6bebb6a4-36f1-4ea4-853b-c6389d18a9b9": VOLUNTARI,
  "5f1b5d2a-3ee8-4c73-870e-26c754e6578d": VOLUNTARI,
  "28346aae-1948-4840-aca5-35fc9e1f3055": VOLUNTARI,
  "eaa7245f-925a-4ef0-867d-86fb4e9f1db5": VOLUNTARI,
  "543dc565-f6ea-4ee8-ae8a-d69ac5bbadf4": VOLUNTARI,
  "50e8decd-635a-46f7-908e-2ac1fddf8ac6": VOLUNTARI,
  "1a9deb68-7c7a-4146-9093-a8526561e1ba": VOLUNTARI,
  "261ca25c-f59a-4c91-9c3f-bc688881d9e0": BRASOV,
  "a82429c9-ecfa-4331-b4e4-04e97f49ec37": UNGHENI,
  "d3fa3f7e-81d9-4c86-83c0-9baa2f98a199": SABARENI,
  "ce6abdb4-49d4-4a9c-9a81-0590549fc500": CONSTANTA,
  "05736a1b-e50c-4078-9f36-4d0ac0b7c09f": CONSTANTA,
  "c30d6dec-a72f-4d94-9866-6ff41a559f95": CONSTANTA,
  "2ec90b6d-9635-48ed-8ab7-0c3180ef00a0": CONSTANTA,
  "f478197d-9833-4d3d-b739-fc523018e6a7": CONSTANTA,
  "2c755525-5744-481f-b9fd-2055f931bbd6": CONSTANTA,
  "de314c19-7c36-4ce2-b254-b20a8d4fc74b": CONSTANTA,
  "4b9a7b75-2b4c-4887-9620-735e4a31ef34": CONSTANTA,
  "939a9754-8dec-405f-b17e-e238c8cc6245": CONSTANTA,
  "d9809662-4e3c-4945-a6a9-3ac5ae94f426": CONSTANTA,
  "21cf5bef-e32d-4935-beee-f74a3f795d3b": CONSTANTA,
  "1a96b7d7-040c-4edd-bf4e-3cb9096bb4a0": CONSTANTA,
  "3cbc6cfa-d646-467c-a40c-ef0a41de777f": CONSTANTA,
  "4b28ac85-21d4-419f-8b77-a67f285d72b9": CONSTANTA,
  "d223becc-d7dc-45cc-8e90-a6d944f7fa22": CONSTANTA,
  "70f2cf29-5fa8-40eb-b616-4263c639ecee": CONSTANTA,
  "6e02b7b0-dccc-45d0-9e27-88f866640fcc": CONSTANTA,
  "042de3f2-027b-46eb-8019-320e2fbd9c65": CONSTANTA,
  "cee3007c-5743-4428-83ca-604de35c6959": CONSTANTA,
  "5df2a431-ff16-4fad-89a8-5dbb636ade55": CONSTANTA,
  "cf99b841-c81d-4db4-8d15-0a059f93e8ed": CONSTANTA,
  "13acad30-181f-4902-8802-7f98c1b80205": CONSTANTA,
  "269b9f87-b01a-42a5-ba8c-29ed5c56a091": CONSTANTA,
  "af5590c9-e9d1-45cc-8424-97d19f700a86": CONSTANTA,
  "1b9a3428-68d4-4ec7-8872-304a44d90b36": CONSTANTA,
  "d346ab18-49ea-4a04-aea7-1b30296b7097": CONSTANTA,
  "53c12a75-c04a-4b0e-8fd1-7a45c8748166": CONSTANTA,
  "13440977-9cca-4b0b-a4d3-3cbf10cbba51": CONSTANTA,
  "3b1ea132-1f69-46ea-8953-f07d982619e8": CONSTANTA,
  "d843a498-9702-45fa-b6aa-cdf278cdb4ea": CONSTANTA,
  "d0eacfcd-4050-4941-af49-c1fd96faa4de": CONSTANTA,
  "c9c0f3e8-a054-47e6-8806-00e6cb9722e8": TULCEA_CITY,
  "1523c382-ecdb-4e4a-9221-e4460252fe8d": MURIGHIOL,
};

const FORBIDDEN_ARGV = new Set(["--apply", "--write", "--commit", "--mutate"]);

function escapeMd(value: string): string {
  return value.replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
}

function compactText(value: string): string {
  return foldLocationSearch(value).replace(/[^a-z0-9]+/g, "");
}

function titlesMatch(expected: string, live: string): boolean {
  const a = foldLocationSearch(expected);
  const b = foldLocationSearch(live);
  if (!a || !b) return false;
  if (a === b) return true;
  const ca = compactText(expected);
  const cb = compactText(live);
  if (ca && ca === cb) return true;
  if (a.length >= 12 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

function categoriesMatch(expected: string, live: string): boolean {
  return foldLocationSearch(expected) === foldLocationSearch(live);
}

function asDetailsRecord(details: unknown): Record<string, unknown> {
  if (details !== null && typeof details === "object" && !Array.isArray(details)) {
    return { ...(details as Record<string, unknown>) };
  }
  return {};
}

function parseInventory(md: string): InventoryRow[] {
  const section = md.split("## Missing structured location")[1] ?? "";
  const rows: InventoryRow[] = [];
  const seen = new Set<string>();
  const re =
    /^\|\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/gim;
  let match: RegExpExecArray | null = re.exec(section);
  while (match) {
    const id = match[1].toLowerCase();
    if (seen.has(id)) {
      throw new Error(`Duplicate ID in missing-location report: ${id}`);
    }
    seen.add(id);
    rows.push({
      id,
      title: match[2].trim(),
      category: match[3].trim(),
    });
    match = re.exec(section);
  }
  return rows;
}

function formatProposed(location: ProposedLocation): string {
  const county = location.county.trim() || "—";
  const district = location.district?.trim() || "—";
  return `${location.country_code} / ${county} / ${location.city} / ${district}`;
}

function formatOldStructured(details: unknown): string {
  const parsed = parseListingLocationFromDetails(details);
  if (!parsed) return "—";
  return formatProposed({
    country_code: parsed.country_code,
    country_name: parsed.country_name,
    county: parsed.county,
    city: parsed.city,
    district: parsed.district,
    group: "",
  });
}

function lostKeys(current: Record<string, unknown>, proposed: Record<string, unknown>): string[] {
  return Object.keys(current).filter((key) => !Object.prototype.hasOwnProperty.call(proposed, key));
}

function nonLocationChanges(
  current: Record<string, unknown>,
  proposed: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(current), ...Object.keys(proposed)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (LOCATION_KEYS.has(key)) continue;
    if (JSON.stringify(current[key]) !== JSON.stringify(proposed[key])) changed.push(key);
  }
  return changed.sort();
}

function assertMappingIntegrity(): string[] {
  const errors: string[] = [];
  const ids = Object.keys(MAPPINGS);
  if (ids.length !== EXPECTED_MISSING) {
    errors.push(`Mapping table has ${ids.length} IDs; expected ${EXPECTED_MISSING}.`);
  }
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`Duplicate mapped ID: ${id}`);
    seen.add(id);
  }
  return errors;
}

function headerRecord(headers?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) out[key] = value;
    return out;
  }
  return { ...(headers as Record<string, string>) };
}

/** GET/HEAD only, IPv4. Blocks PostgREST mutations even if a service key is present. */
function selectOnlyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return Promise.reject(new Error(`SELECT-only fetch refused HTTP ${method}`));
  }

  return new Promise((resolve, reject) => {
    const parsed = new URL(requestUrl);
    const lib = parsed.protocol === "http:" ? http : https;
    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: headerRecord(init?.headers),
        family: 4,
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          const resHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (Array.isArray(value)) resHeaders.set(key, value.join(", "));
            else if (value) resHeaders.set(key, value);
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 0,
              statusText: res.statusMessage ?? "",
              headers: resHeaders,
            }),
          );
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("SELECT timed out"));
    });
    req.end();
  });
}

function selectErrorMessage(error: { message?: string; details?: string; hint?: string }): string {
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return parts.join(" | ") || "unknown SELECT error";
}

async function selectActiveNonSeedListings(): Promise<LiveRow[]> {
  if (process.argv.some((arg) => FORBIDDEN_ARGV.has(arg))) {
    throw new Error("This script is read-only. No apply/write/mutate mode exists.");
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const key = service || anon;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and a SELECT key (anon or service).");
  }

  const supabase = createClient(url, key, {
    global: { fetch: selectOnlyFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });

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

function buildReport(input: {
  inspectedActive: number;
  liveMissing: LiveRow[];
  mapped: Array<{
    id: string;
    title: string;
    category: string;
    group: string;
    oldPublic: string;
    oldStructured: string;
    proposed: ProposedLocation;
    proposedLabel: string;
  }>;
  unresolved: string[];
  unexpected: string[];
  blockers: Blocker[];
  totals: Map<string, number>;
}): string {
  const lines = [
    "# Listing location backfill dry-run",
    "",
    "Read-only. No database writes were performed. There is no apply mode.",
    "Canonical store remains `listings.details`. Proposed objects are merges via `applyListingLocationToDetails`.",
    "",
    "## Totals",
    "",
    `| Metric | Count |`,
    `|---|---|`,
    `| Inspected active non-seed listings | ${input.inspectedActive} |`,
    `| Live missing structured location | ${input.liveMissing.length} |`,
    `| Mapped | ${input.mapped.length} |`,
    `| Unresolved | ${input.unresolved.length} |`,
    `| Unexpected | ${input.unexpected.length} |`,
    `| Blocked | ${input.blockers.length} |`,
    "",
    "## Totals per proposed location",
    "",
    "| Location | Count |",
    "|---|---|",
  ];

  const groups = [...input.totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [group, count] of groups) {
    lines.push(`| ${group} | ${count} |`);
  }
  if (groups.length === 0) lines.push("| — | 0 |");
  lines.push("");

  if (input.blockers.length > 0) {
    lines.push("## Blockers", "");
    lines.push("| Listing ID | Reason |");
    lines.push("|---|---|");
    for (const blocker of input.blockers) {
      lines.push(`| ${blocker.id} | ${escapeMd(blocker.reason)} |`);
    }
    lines.push("");
  }

  if (input.unexpected.length > 0) {
    lines.push("## Unexpected missing-location IDs", "");
    for (const id of input.unexpected) lines.push(`- ${id}`);
    lines.push("");
  }

  if (input.unresolved.length > 0) {
    lines.push("## Unresolved mapped IDs", "");
    for (const id of input.unresolved) lines.push(`- ${id}`);
    lines.push("");
  }

  lines.push("## Proposed rows", "");
  lines.push(
    "| Listing ID | Title | Old public location | Old structured | Proposed country/county/city/district | Proposed public label | Group |",
  );
  lines.push("|---|---|---|---|---|---|---|");
  for (const row of input.mapped) {
    lines.push(
      `| ${row.id} | ${escapeMd(row.title)} | ${escapeMd(row.oldPublic || "—")} | ${escapeMd(row.oldStructured)} | ${escapeMd(formatProposed(row.proposed))} | ${escapeMd(row.proposedLabel)} | ${escapeMd(row.group)} |`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const mappingErrors = assertMappingIntegrity();
  if (mappingErrors.length > 0) {
    throw new Error(mappingErrors.join(" "));
  }

  const inventoryMd = fs.readFileSync(INVENTORY_PATH, "utf8");
  const inventory = parseInventory(inventoryMd);
  if (inventory.length !== EXPECTED_MISSING) {
    throw new Error(
      `Missing-location report parsed ${inventory.length} rows; expected ${EXPECTED_MISSING}.`,
    );
  }

  const mappedIds = new Set(Object.keys(MAPPINGS));
  const inventoryIds = new Set(inventory.map((row) => row.id));
  const reportOnly = [...inventoryIds].filter((id) => !mappedIds.has(id));
  const mappingOnly = [...mappedIds].filter((id) => !inventoryIds.has(id));
  if (reportOnly.length > 0 || mappingOnly.length > 0) {
    throw new Error(
      `Mapping/report ID mismatch. Report-only: ${reportOnly.join(", ") || "none"}. Mapping-only: ${mappingOnly.join(", ") || "none"}.`,
    );
  }

  const live = await selectActiveNonSeedListings();
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
  const unresolved = [...mappedIds].filter((id) => !liveMissingIds.has(id)).sort();
  const blockers: Blocker[] = [];
  const mapped: Array<{
    id: string;
    title: string;
    category: string;
    group: string;
    oldPublic: string;
    oldStructured: string;
    proposed: ProposedLocation;
    proposedLabel: string;
  }> = [];
  const totals = new Map<string, number>();

  if (duplicateLive.length > 0) {
    blockers.push({ id: duplicateLive[0], reason: `Duplicate live IDs: ${duplicateLive.join(", ")}` });
  }
  if (liveMissing.length !== EXPECTED_MISSING) {
    blockers.push({
      id: "inventory",
      reason: `Live missing structured location is ${liveMissing.length}, expected ${EXPECTED_MISSING}.`,
    });
  }

  for (const expected of inventory) {
    const liveRow = byId.get(expected.id);
    const proposed = MAPPINGS[expected.id];
    if (!liveRow) {
      blockers.push({ id: expected.id, reason: "Mapped listing no longer exists among active non-seed rows." });
      continue;
    }
    if (String(liveRow.status || "").toLowerCase() !== "active" || liveRow.is_seed === true) {
      blockers.push({ id: expected.id, reason: "Listing is no longer active and non-seed." });
      continue;
    }
    if (hasStructuredListingLocation(liveRow.details)) {
      blockers.push({ id: expected.id, reason: "Listing already has structured location." });
      continue;
    }

    const liveTitle = String(liveRow.title ?? "");
    const liveCategory = String(liveRow.category ?? "");
    if (!titlesMatch(expected.title, liveTitle)) {
      blockers.push({
        id: expected.id,
        reason: `Title no longer matches the report. Expected “${expected.title}”; live “${liveTitle}”.`,
      });
      continue;
    }
    if (!categoriesMatch(expected.category, liveCategory)) {
      blockers.push({
        id: expected.id,
        reason: `Category no longer matches the report. Expected “${expected.category}”; live “${liveCategory}”.`,
      });
      continue;
    }

    const check = locationFromFormData({
      country_code: proposed.country_code,
      country_name: proposed.country_name,
      county: proposed.county,
      city: proposed.city,
      district: proposed.district ?? "",
    });
    if (!check.ok) {
      blockers.push({ id: expected.id, reason: `Proposed location failed validation: ${check.error}` });
      continue;
    }

    const current = asDetailsRecord(liveRow.details);
    const proposedDetails = applyListingLocationToDetails(current, check.location);
    const lost = lostKeys(current, proposedDetails);
    if (lost.length > 0) {
      blockers.push({ id: expected.id, reason: `Proposed merge would drop details keys: ${lost.join(", ")}.` });
      continue;
    }
    const extra = nonLocationChanges(current, proposedDetails);
    if (extra.length > 0) {
      blockers.push({
        id: expected.id,
        reason: `Proposed merge would change non-location keys: ${extra.join(", ")}.`,
      });
      continue;
    }
    if (!hasStructuredListingLocation(proposedDetails)) {
      blockers.push({ id: expected.id, reason: "Proposed details still fail structured-location validation." });
      continue;
    }

    const location: ListingLocation = check.location;
    mapped.push({
      id: expected.id,
      title: liveTitle,
      category: liveCategory,
      group: proposed.group,
      oldPublic: listingLocationLabelFromUnknown(liveRow.details) ?? "",
      oldStructured: formatOldStructured(liveRow.details),
      proposed,
      proposedLabel: formatListingLocation(location),
    });
    totals.set(proposed.group, (totals.get(proposed.group) ?? 0) + 1);
  }

  for (const id of unexpected) {
    blockers.push({ id, reason: "Unexpected live listing is missing structured location and is not in the mapping." });
  }
  for (const id of unresolved) {
    if (!blockers.some((blocker) => blocker.id === id)) {
      blockers.push({ id, reason: "Mapped ID is not in the live missing-location inventory." });
    }
  }

  const body = buildReport({
    inspectedActive: live.length,
    liveMissing,
    mapped,
    unresolved,
    unexpected,
    blockers,
    totals,
  });
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, body, "utf8");

  const summary = {
    inspected: liveMissing.length,
    mapped: mapped.length,
    unresolved: unresolved.length,
    unexpected: unexpected.length,
    blocked: blockers.length,
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log("Wrote", REPORT_PATH);

  const ok =
    liveMissing.length === EXPECTED_MISSING &&
    mapped.length === EXPECTED_MISSING &&
    unresolved.length === 0 &&
    unexpected.length === 0 &&
    blockers.length === 0;
  if (!ok) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  const cause =
    error instanceof Error && "cause" in error && error.cause
      ? error.cause instanceof Error
        ? error.cause.message
        : String(error.cause)
      : "";
  const message =
    (error instanceof Error ? error.message : String(error)) + (cause ? ` (${cause})` : "");
  console.error(message);
  const fallback = [
    "# Listing location backfill dry-run",
    "",
    "Read-only dry-run failed before a complete inventory could be produced.",
    "",
    `\`${escapeMd(message)}\``,
    "",
    "No database writes were performed.",
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${fallback}\n`, "utf8");
  process.exit(1);
});
