/**
 * Read-only: classify profiles columns visible to the anon PostgREST role.
 * Never prints keys, JWTs, emails, phones, or row bodies.
 * GET/HEAD only. Dummy UUID filter returns zero rows.
 */
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_HOST = "geywuzwbzecknokvnins.supabase.co";
const DUMMY_ID = "00000000-0000-4000-8000-000000000000";

const CANDIDATE_COLUMNS = [
  "id",
  "full_name",
  "kyc_status",
  "user_type",
  "created_at",
  "updated_at",
  "email",
  "phone",
  "telefon",
  "avatar_url",
  "bio",
  "role",
  "is_admin",
  "stripe_customer_id",
] as const;

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

if (existsSync(resolve(".env.local"))) {
  loadDotenv({ path: resolve(".env.local") });
}

const url = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const anonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!url || !anonKey) fail("missing supabase url or anon key in process env");

let host = "";
try {
  host = new URL(url).host;
} catch {
  fail("invalid supabase url");
}

console.log(`inspect_host=${host}`);
console.log(`inspect_mode=read-only-column-probe`);
console.log(`is_production_host=${host === PRODUCTION_HOST ? "yes" : "no"}`);

function anonHeaders(): HeadersInit {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
}

async function probeColumn(column: string): Promise<"selectable" | "missing_or_ungranted" | `http_${number}`> {
  const response = await fetch(
    `${url}/rest/v1/profiles?id=eq.${DUMMY_ID}&select=${encodeURIComponent(column)}`,
    { method: "GET", headers: anonHeaders() },
  );
  const text = await response.text();
  if (response.status === 200) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return "http_200";
    }
    if (Array.isArray(parsed) && parsed.length === 0) return "selectable";
    return "http_200";
  }
  if (response.status === 400 || response.status === 406) return "missing_or_ungranted";
  return `http_${response.status}`;
}

async function main() {
  const head = await fetch(`${url}/rest/v1/profiles?select=*`, {
    method: "HEAD",
    headers: { ...anonHeaders(), Prefer: "count=exact" },
  });
  console.log(`anon_profiles_head_status=${head.status}`);
  const range = head.headers.get("content-range");
  console.log(`anon_profiles_content_range_present=${range ? "yes" : "no"}`);
  if (range) {
    const match = /\/(\d+|\*)/.exec(range);
    const total = match?.[1] ?? null;
    if (total === "*") console.log("anon_profiles_count=unknown");
    else if (total != null) {
      console.log(`anon_profiles_count_ge1=${Number(total) >= 1 ? "yes" : "no"}`);
      console.log(`anon_profiles_count_is_zero=${Number(total) === 0 ? "yes" : "no"}`);
    }
  }

  const star = await fetch(
    `${url}/rest/v1/profiles?id=eq.${DUMMY_ID}&select=*`,
    { method: "GET", headers: anonHeaders() },
  );
  const starText = await star.text();
  let starRows = -1;
  try {
    const parsed = JSON.parse(starText) as unknown;
    starRows = Array.isArray(parsed) ? parsed.length : -1;
  } catch {
    starRows = -1;
  }
  console.log(`anon_star_dummy_status=${star.status}`);
  console.log(`anon_star_dummy_rows=${starRows}`);

  const selectable: string[] = [];
  const hidden: string[] = [];
  const other: string[] = [];
  for (const column of CANDIDATE_COLUMNS) {
    const result = await probeColumn(column);
    if (result === "selectable") selectable.push(column);
    else if (result === "missing_or_ungranted") hidden.push(column);
    else other.push(`${column}:${result}`);
  }

  console.log(`anon_selectable_candidates=${selectable.join(",") || "(none)"}`);
  console.log(`anon_missing_or_ungranted=${hidden.join(",") || "(none)"}`);
  if (other.length) console.log(`anon_other=${other.join(",")}`);

  console.log("OK profiles-column-probe");
}

void main();
