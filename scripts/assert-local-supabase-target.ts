/**
 * Hard gate: refuse any write-oriented local E2E unless the API and DB
 * targets are proven loopback. Never use Production, preview, or supabase.co.
 */
const PRODUCTION_REF = "geywuzwbzecknokvnins";
const BLOCKED_HOST_FRAGMENTS = [
  PRODUCTION_REF,
  "supabase.co",
  "quickexit.ro",
  "vercel.app",
];

function blockedReason(value: string): string | null {
  const lower = value.toLowerCase();
  for (const fragment of BLOCKED_HOST_FRAGMENTS) {
    if (lower.includes(fragment)) {
      return `STOP: target contains blocked fragment ${fragment}`;
    }
  }
  return null;
}

function assertLoopbackHost(host: string, label: string): void {
  const normalized = host.replace(/^\[(.*)\]$/, "$1").toLowerCase();
  const ok =
    normalized === "127.0.0.1" ||
    normalized === "localhost" ||
    normalized === "::1";
  if (!ok) {
    throw new Error(`STOP: ${label} host must be loopback, got ${host}`);
  }
}

export function assertLocalSupabaseWriteTarget(rawUrl: string | undefined): string {
  const url = String(rawUrl ?? "").trim().replace(/\/+$/, "");
  if (!url) {
    throw new Error("LOCAL_SUPABASE_URL missing");
  }
  const blocked = blockedReason(url);
  if (blocked) throw new Error(blocked);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("LOCAL_SUPABASE_URL is not a valid URL");
  }
  if (parsed.protocol !== "http:") {
    throw new Error("STOP: local API URL must use http:// on loopback");
  }
  assertLoopbackHost(parsed.hostname, "API");
  if (!parsed.port) {
    throw new Error("STOP: local API URL must include an explicit port");
  }
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("STOP: local API port is invalid");
  }
  if (parsed.username || parsed.password) {
    throw new Error("STOP: API URL must not embed credentials");
  }
  return `${parsed.protocol}//${parsed.hostname}:${parsed.port}`;
}

export function assertLocalSupabaseDbTarget(rawUrl: string | undefined): string {
  const url = String(rawUrl ?? "").trim();
  if (!url) {
    throw new Error("LOCAL_SUPABASE_DB_URL missing");
  }
  const blocked = blockedReason(url);
  if (blocked) throw new Error(blocked);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("LOCAL_SUPABASE_DB_URL is not a valid URL");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("STOP: DB URL must be postgres/postgresql");
  }
  assertLoopbackHost(parsed.hostname, "DB");
  if (!parsed.port) {
    throw new Error("STOP: DB URL must include an explicit port");
  }
  return `${parsed.protocol}//${parsed.hostname}:${parsed.port}/${parsed.pathname.replace(/^\//, "")}`;
}

export function assertLocalSupabaseTargets(env: Record<string, string | undefined> = process.env): {
  apiUrl: string;
  dbUrl: string;
} {
  const apiUrl = assertLocalSupabaseWriteTarget(
    env.LOCAL_SUPABASE_URL ?? env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const dbUrl = assertLocalSupabaseDbTarget(
    env.LOCAL_SUPABASE_DB_URL ?? env.DATABASE_URL,
  );
  return { apiUrl, dbUrl };
}

if (process.argv[1]?.includes("assert-local-supabase-target")) {
  try {
    const proven = assertLocalSupabaseTargets();
    console.log(`OK local-write-target proven api=${proven.apiUrl} db=${proven.dbUrl}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "STOP");
    process.exit(1);
  }
}
