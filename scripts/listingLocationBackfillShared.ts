/**
 * Shared verified 45-ID location mapping and SELECT helpers.
 * Values must stay identical to scripts/prepare-listing-location-backfill.ts.
 */
import { spawnSync } from "node:child_process";
import dns from "node:dns";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import dotenv from "dotenv";
import { foldLocationSearch } from "../lib/locationFold";

dns.setDefaultResultOrder("ipv4first");
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: "D:/MEDIA/quickexit/.env.local" });
dotenv.config({ path: "D:/MEDIA/quickexit/.env" });

export const EXPECTED_MISSING = 45;
export const SELECT_LIMIT = 500;
export const INVENTORY_PATH = path.resolve(
  process.cwd(),
  "docs/internal/listing-location-missing-report.md",
);
export const PREPARE_SCRIPT_PATH = path.resolve(
  process.cwd(),
  "scripts/prepare-listing-location-backfill.ts",
);

export const LOCATION_KEYS = new Set([
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

export type ProposedLocation = {
  country_code: string;
  country_name: string;
  county: string;
  city: string;
  district: string | null;
  group: string;
};

export type LiveRow = {
  id: string;
  title: string | null;
  category: string | null;
  status: string | null;
  is_seed: boolean | null;
  details: unknown;
};

export type InventoryRow = {
  id: string;
  title: string;
  category: string;
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

export const MAPPINGS: Record<string, ProposedLocation> = {
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

export function compactText(value: string): string {
  return foldLocationSearch(value).replace(/[^a-z0-9]+/g, "");
}

export function titlesMatch(expected: string, live: string): boolean {
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

export function categoriesMatch(expected: string, live: string): boolean {
  return foldLocationSearch(expected) === foldLocationSearch(live);
}

export function asDetailsRecord(details: unknown): Record<string, unknown> {
  if (details !== null && typeof details === "object" && !Array.isArray(details)) {
    return { ...(details as Record<string, unknown>) };
  }
  return {};
}

export function parseInventory(md: string): InventoryRow[] {
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

export function lostKeys(current: Record<string, unknown>, proposed: Record<string, unknown>): string[] {
  return Object.keys(current).filter((key) => !Object.prototype.hasOwnProperty.call(proposed, key));
}

export function nonLocationChanges(
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

export function assertMappingIntegrity(): void {
  const ids = Object.keys(MAPPINGS);
  if (ids.length !== EXPECTED_MISSING) {
    throw new Error(`Mapping table has ${ids.length} IDs; expected ${EXPECTED_MISSING}.`);
  }
}

export function assertMappingMatchesPrepareScript(): void {
  const src = fs.readFileSync(PREPARE_SCRIPT_PATH, "utf8");
  const start = src.indexOf("const MAPPINGS:");
  const end = src.indexOf("const FORBIDDEN_ARGV");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Could not locate MAPPINGS in the SELECT-only prepare script.");
  }
  const block = src.slice(start, end);
  const prepareIds = [
    ...block.matchAll(/"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/gi),
  ].map((match) => match[1].toLowerCase());
  const local = Object.keys(MAPPINGS).map((id) => id.toLowerCase()).sort();
  const remote = [...prepareIds].sort();
  if (JSON.stringify(local) !== JSON.stringify(remote)) {
    throw new Error("Apply mapping IDs do not match the verified SELECT-only script.");
  }
}

export function headerRecord(headers?: HeadersInit): Record<string, string> {
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

export function requestUrlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

/** Fetch null-body statuses. Node/undici rejects a non-null body with these codes. */
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

export function buildFetchResponse(input: {
  status: number;
  statusText: string;
  headers: Headers;
  body: Buffer;
}): Response {
  const status = input.status;
  const body: BodyInit | null = NULL_BODY_STATUSES.has(status) ? null : new Uint8Array(input.body);
  return new Response(body, {
    status,
    statusText: input.statusText,
    headers: input.headers,
  });
}

export function ipv4Request(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  allowedMethods: Set<string>,
  allowPatch: (url: URL, body: string) => void,
): Promise<Response> {
  const requestUrl = requestUrlOf(input);
  const method = (init?.method ?? "GET").toUpperCase();
  if (!allowedMethods.has(method)) {
    return Promise.reject(new Error(`HTTP ${method} is not permitted in this mode.`));
  }

  let body = "";
  if (init?.body != null) {
    if (typeof init.body === "string") body = init.body;
    else if (init.body instanceof URLSearchParams) body = init.body.toString();
    else if (init.body instanceof Uint8Array) body = Buffer.from(init.body).toString("utf8");
    else {
      return Promise.reject(new Error("Unsupported request body type."));
    }
  }

  const parsed = new URL(requestUrl);
  if (method === "PATCH") allowPatch(parsed, body);

  return new Promise((resolve, reject) => {
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
            buildFetchResponse({
              status: res.statusCode ?? 0,
              statusText: res.statusMessage ?? "",
              headers: resHeaders,
              body: Buffer.concat(chunks),
            }),
          );
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    if (body) req.write(body);
    req.end();
  });
}

export function selectErrorMessage(error: { message?: string; details?: string; hint?: string }): string {
  const parts = [error.message, error.details, error.hint].filter(Boolean);
  return parts.join(" | ") || "unknown SELECT error";
}

export function createSupabaseKey(): { url: string; key: string } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const key = service || anon;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and a configured SELECT/update key.");
  }
  return { url, key };
}

export function assertGitIgnored(absPath: string): void {
  const relative = path.relative(process.cwd(), absPath).replace(/\\/g, "/");
  const check = spawnSync("git", ["check-ignore", "-v", relative], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (check.status !== 0 || !String(check.stdout || "").trim()) {
    throw new Error(
      `No suitable ignored backup directory (${relative}). Stopped without writing or changing .gitignore.`,
    );
  }
}

export function resolveIgnoredBackupDir(): string {
  const candidate = path.resolve(process.cwd(), "coverage", "listing-location-backfill");
  assertGitIgnored(candidate);
  return candidate;
}
