/**
 * Phase 2G.1 — Supabase URL guard assertions (no network).
 */
import {
  getSupabaseProjectUrl,
  isApprovedSupabaseProjectUrl,
  isSupabaseLoopbackAllowed,
} from "../lib/supabase/config";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

const prevNode = process.env.NODE_ENV;
const prevVercel = process.env.VERCEL_ENV;
const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function restore() {
  setEnv("NODE_ENV", prevNode);
  setEnv("VERCEL_ENV", prevVercel);
  setEnv("NEXT_PUBLIC_SUPABASE_URL", prevUrl);
}

try {
  // Development: loopback allowed
  setEnv("NODE_ENV", "development");
  setEnv("VERCEL_ENV", undefined);
  assert(isSupabaseLoopbackAllowed() === true, "dev allows loopback flag");
  assert(isApprovedSupabaseProjectUrl("http://127.0.0.1:54321") === true, "dev accepts 127.0.0.1");
  assert(isApprovedSupabaseProjectUrl("http://localhost:54321") === true, "dev accepts localhost");
  assert(
    isApprovedSupabaseProjectUrl("https://geywuzwbzecknokvnins.supabase.co") === true,
    "dev still accepts *.supabase.co",
  );
  assert(isApprovedSupabaseProjectUrl("https://www.quickexit.ro") === false, "dev rejects site URL");

  setEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  assert(getSupabaseProjectUrl() === "http://127.0.0.1:54321", "getSupabaseProjectUrl loopback");

  // Production NODE_ENV: loopback rejected
  setEnv("NODE_ENV", "production");
  setEnv("VERCEL_ENV", undefined);
  assert(isSupabaseLoopbackAllowed() === false, "production NODE_ENV disallows loopback");
  assert(isApprovedSupabaseProjectUrl("http://127.0.0.1:54321") === false, "prod rejects 127.0.0.1");
  assert(isApprovedSupabaseProjectUrl("http://localhost:54321") === false, "prod rejects localhost");
  assert(
    isApprovedSupabaseProjectUrl("https://abcd.supabase.co") === true,
    "prod accepts *.supabase.co",
  );

  setEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  let threw = false;
  try {
    getSupabaseProjectUrl();
  } catch {
    threw = true;
  }
  assert(threw, "getSupabaseProjectUrl throws on loopback in production NODE_ENV");

  // Vercel production: reject even if NODE_ENV somehow development
  setEnv("NODE_ENV", "development");
  setEnv("VERCEL_ENV", "production");
  assert(isSupabaseLoopbackAllowed() === false, "VERCEL_ENV=production blocks loopback");
  assert(isApprovedSupabaseProjectUrl("http://localhost:54321") === false, "vercel prod rejects localhost");

  console.log("OK supabase-url-guard");
} finally {
  restore();
}
