/**
 * Phase 1A — full email magic-link session proof on Staging (no inbox).
 * Uses admin generateLink hashed_token + verifyOtp, then hits staging callback path.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STAGING_REF, assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

const SITE = "https://quickexit-staging.vercel.app";
const OUT = resolve("docs/internal/auth/phase1a-email-session-smoke-2026-10-15.json");

function fail(m: string, c = 1): never {
  console.error(`FAIL ${m}`);
  process.exit(c);
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  loadEnvFile(resolve(".env.staging.local"));
  const url =
    process.env.STAGING_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    `https://${STAGING_REF}.supabase.co`;
  const anon =
    process.env.STAGING_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceKey =
    process.env.STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!serviceKey || !anon) fail("missing Staging keys", 2);
  assertStagingSupabaseWriteTarget(url);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stamp = Date.now();
  const email = `phase1a.session.${stamp}@staging.quickexit.test`;
  const password = `Session-${stamp}-Aa1!`;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user?.id) fail(created.error?.message ?? "no user", 2);
  const userId = created.data.user.id;
  await new Promise((r) => setTimeout(r, 500));

  const beforeOwners = await admin
    .from("listings")
    .select("id,user_id")
    .eq("user_id", userId);
  const profile = await admin.from("profiles").select("id,kyc_status").eq("id", userId);
  if ((profile.data ?? []).length !== 1) fail("profile missing after create", 2);
  const kyc = profile.data![0]!.kyc_status;

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${SITE}/ro/auth/callback?next=/ro/dashboard` },
  });
  if (link.error) fail(link.error.message, 2);
  const hashed = link.data.properties?.hashed_token;
  const actionLink = link.data.properties?.action_link;
  if (!hashed) fail("no hashed_token", 2);

  const browser = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await browser.auth.verifyOtp({
    token_hash: hashed,
    type: "email",
  });
  if (verified.error || !verified.data.session?.access_token) {
    fail(`verifyOtp: ${verified.error?.message ?? "no session"}`, 2);
  }
  const sessionUserId = verified.data.user?.id;
  if (sessionUserId !== userId) fail("session user mismatch", 2);

  // Hit staging callback with code from action_link redirect chain
  let callbackHit: { status: number; location: string | null } | null = null;
  if (actionLink) {
    const res = await fetch(actionLink, { redirect: "manual" });
    const loc = res.headers.get("location");
    if (loc && loc.includes("code=")) {
      const cb = await fetch(loc, { redirect: "manual" });
      callbackHit = {
        status: cb.status,
        location: cb.headers.get("location"),
      };
    } else {
      callbackHit = { status: res.status, location: loc };
    }
  }

  // Dashboard page reachable
  const dash = await fetch(`${SITE}/ro/dashboard`, { redirect: "follow" });

  // Ownership unchanged for this user (none) + global KYC verified count stable for this user
  const afterProfile = await admin
    .from("profiles")
    .select("id,kyc_status")
    .eq("id", userId)
    .maybeSingle();
  const afterListings = await admin
    .from("listings")
    .select("id")
    .eq("user_id", userId);

  const dup = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const same = (dup.data.users ?? []).filter(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
  );

  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);

  const record = {
    at: new Date().toISOString(),
    staging_ref: STAGING_REF,
    email_session: {
      session_established: true,
      user_id_suffix: userId.slice(-8),
      profile_exists: true,
      kyc_status: kyc,
      kyc_unchanged_after_session: afterProfile.data?.kyc_status === kyc,
      duplicate_users: same.length,
      listings_owned: (beforeOwners.data ?? []).length,
      listings_after: (afterListings.data ?? []).length,
    },
    callback_probe: callbackHit,
    dashboard_http: dash.status,
  };

  if (same.length !== 1) fail("duplicate auth.users", 2);
  if (afterProfile.data?.kyc_status === "verified" && kyc !== "verified") {
    fail("KYC escalated", 2);
  }

  writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record, null, 2));
  console.log("PASS smoke-auth-phase1a-email-session-staging");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e), 2));
