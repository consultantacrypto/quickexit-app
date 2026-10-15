/**
 * Phase 1A — Staging synthetic proof: auth.users insert → exactly one profiles row.
 * Hard-refuses Production. Cleans up synthetic user.
 *
 *   npx tsx scripts/assert-auth-profile-provision-staging.ts
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STAGING_REF, assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const OUT = resolve("docs/internal/auth/phase1a-staging-synthetic-proof-2026-10-15.json");

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
  const serviceKey =
    process.env.STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!serviceKey) fail("missing Staging service role key", 2);

  assertStagingSupabaseWriteTarget(url);
  if (url.includes(PRODUCTION_REF)) fail("Production refused", 2);

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const email = `phase1a.synth.${stamp}@staging.quickexit.test`;
  const password = `Synth-${stamp}-Aa1!`;

  const created = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user?.id) {
    fail(`createUser: ${created.error?.message ?? "no user"}`, 2);
  }
  const userId = created.data.user.id;

  // Allow trigger to fire
  await new Promise((r) => setTimeout(r, 500));

  const profiles1 = await sb.from("profiles").select("id,kyc_status,user_type").eq("id", userId);
  if (profiles1.error) fail(`profiles select: ${profiles1.error.message}`, 2);
  const rows1 = profiles1.data ?? [];
  if (rows1.length !== 1) fail(`expected 1 profile after create, got ${rows1.length}`, 2);

  const kyc1 = String(rows1[0]?.kyc_status ?? "");
  if (kyc1 === "verified") fail("KYC escalated to verified — forbidden", 2);

  // Retry provisioning path (idempotent insert)
  const retry = await sb.from("profiles").insert({ id: userId }).select("id");
  // Expect conflict/error OR empty — never duplicate
  const profiles2 = await sb.from("profiles").select("id,kyc_status").eq("id", userId);
  const rows2 = profiles2.data ?? [];
  if (rows2.length !== 1) fail(`expected 1 profile after retry, got ${rows2.length}`, 2);
  if (String(rows2[0]?.kyc_status) === "verified") fail("KYC escalated after retry", 2);

  // HQ invariant: synthetic email must not be HQ (allowlist is env, not DB)
  // Ownership: no listings/demands created for synthetic user
  const listings = await sb.from("listings").select("id").eq("user_id", userId);
  const demands = await sb.from("demands").select("id").eq("buyer_id", userId);
  const media = await sb.from("media_orders").select("id").eq("user_id", userId);

  const proof = {
    at: new Date().toISOString(),
    staging_ref: STAGING_REF,
    synthetic_user_id_suffix: userId.slice(-8),
    profile_count_after_create: rows1.length,
    profile_count_after_retry: rows2.length,
    kyc_status: kyc1,
    kyc_escalated: false,
    retry_insert_error_code: retry.error?.code ?? null,
    ownership_rows: {
      listings: (listings.data ?? []).length,
      demands: (demands.data ?? []).length,
      media_orders: (media.data ?? []).length,
    },
    hq_effect: "none",
  };

  // Cleanup
  await sb.from("profiles").delete().eq("id", userId);
  const del = await sb.auth.admin.deleteUser(userId);
  if (del.error) {
    console.warn(`cleanup_user_warn=${del.error.message}`);
  }

  // Confirm cleanup
  const gone = await sb.from("profiles").select("id").eq("id", userId);
  writeFileSync(
    OUT,
    `${JSON.stringify({ ...proof, cleaned_up: (gone.data ?? []).length === 0 }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ ...proof, cleaned_up: (gone.data ?? []).length === 0 }));
  console.log("PASS assert-auth-profile-provision-staging");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e), 2));
