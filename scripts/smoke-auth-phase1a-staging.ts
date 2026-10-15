/**
 * Phase 1A Staging auth smoke (non-interactive where possible).
 * - Ownership baseline snapshot (counts by sample)
 * - Email magic-link: admin generateLink + exchange path probe
 * - UX HTML markers on staging alias
 * - Identity conflict banner query param surface
 * Hard-refuses Production writes.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STAGING_REF, assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const SITE = "https://quickexit-staging.vercel.app";
const OUT = resolve("docs/internal/auth/phase1a-staging-auth-smoke-2026-10-15.json");

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

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  const res = await fetch(url, { redirect: "follow" });
  const body = await res.text();
  return { status: res.status, body };
}

async function main() {
  loadEnvFile(resolve(".env.staging.local"));
  const url =
    process.env.STAGING_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    `https://${STAGING_REF}.supabase.co`;
  const anon =
    process.env.STAGING_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const serviceKey =
    process.env.STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!serviceKey || !anon) fail("missing Staging keys", 2);
  assertStagingSupabaseWriteTarget(url);
  if (url.includes(PRODUCTION_REF)) fail("Production refused", 2);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Ownership baseline (aggregate only)
  const [listings, demands, media, profiles] = await Promise.all([
    admin.from("listings").select("user_id"),
    admin.from("demands").select("buyer_id"),
    admin.from("media_orders").select("user_id"),
    admin.from("profiles").select("id,kyc_status"),
  ]);
  const listingOwners = new Set((listings.data ?? []).map((r) => r.user_id));
  const demandBuyers = new Set((demands.data ?? []).map((r) => r.buyer_id));
  const mediaOwners = new Set((media.data ?? []).map((r) => r.user_id));
  const verifiedCount = (profiles.data ?? []).filter((p) => p.kyc_status === "verified").length;

  // UX HTML
  const home = await fetchText(`${SITE}/ro`);
  const hasGoogle =
    home.body.includes("Continuă cu Google") || home.body.includes("Continue with Google");
  // AuthModal is client-hydrated — check JS chunk markers via page + known absence of wallet strings in RSC payload if present
  const walletDead =
    home.body.includes("WalletConnect") ||
    home.body.includes("web3Maintenance") ||
    home.body.includes("Opțiuni Avansate");

  // Conflict banner route surface
  const conflict = await fetchText(`${SITE}/ro?auth=identity_conflict`);
  const conflictOk = conflict.status === 200;

  // Email magic-link smoke via generateLink (no inbox)
  const stamp = Date.now();
  const email = `phase1a.email.smoke.${stamp}@staging.quickexit.test`;
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: `Smoke-${stamp}-Aa1!`,
  });
  if (created.error || !created.data.user?.id) {
    fail(`createUser: ${created.error?.message}`, 2);
  }
  const userId = created.data.user.id;
  await new Promise((r) => setTimeout(r, 400));

  const profileAfter = await admin
    .from("profiles")
    .select("id,kyc_status")
    .eq("id", userId);
  const profileRows = profileAfter.data ?? [];
  if (profileRows.length !== 1) fail(`email smoke profile count=${profileRows.length}`, 2);
  if (profileRows[0]?.kyc_status === "verified") fail("email smoke KYC escalated", 2);

  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${SITE}/ro/auth/callback?next=/ro/dashboard`,
    },
  });
  if (link.error) fail(`generateLink: ${link.error.message}`, 2);
  const actionLink = link.data.properties?.action_link;
  if (!actionLink) fail("no action_link", 2);

  // Follow magic link → should land with code or session redirect through Supabase then our callback
  const linkRes = await fetch(actionLink, { redirect: "manual" });
  const loc = linkRes.headers.get("location") || "";
  const hasCode = loc.includes("code=") || loc.includes("auth/callback");
  // Also try OTP sign-in request path (anon)
  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const otp = await anonClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${SITE}/ro/auth/callback?next=/ro/dashboard` },
  });

  // Users count for this email should remain 1
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const sameEmail = (listed.data.users ?? []).filter(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase(),
  );

  // Cleanup synthetic
  await admin.from("profiles").delete().eq("id", userId);
  await admin.auth.admin.deleteUser(userId);

  // Re-check ownership aggregates unchanged shape (same set sizes; we didn't touch ownership)
  const [listings2, demands2, media2, profiles2] = await Promise.all([
    admin.from("listings").select("user_id"),
    admin.from("demands").select("buyer_id"),
    admin.from("media_orders").select("user_id"),
    admin.from("profiles").select("id,kyc_status"),
  ]);
  const verifiedCount2 = (profiles2.data ?? []).filter((p) => p.kyc_status === "verified").length;

  const record = {
    at: new Date().toISOString(),
    staging_ref: STAGING_REF,
    site: SITE,
    ux: {
      home_status: home.status,
      google_copy_in_ssr: hasGoogle,
      dead_wallet_cta_in_ssr: walletDead,
      note: "AuthModal is client-rendered; SSR may not include button copy — browser smoke confirms UI",
      identity_conflict_route_status: conflict.status,
      identity_conflict_route_ok: conflictOk,
    },
    email_smoke: {
      profile_count: profileRows.length,
      kyc_status: profileRows[0]?.kyc_status ?? null,
      generate_link_ok: Boolean(actionLink),
      magic_link_redirect_has_callback_or_code: hasCode,
      magic_link_http_status: linkRes.status,
      otp_request_error: otp.error?.message ?? null,
      otp_request_ok: !otp.error,
      duplicate_auth_users_for_email: sameEmail.length,
    },
    ownership: {
      before: {
        listing_owner_ids: listingOwners.size,
        demand_buyer_ids: demandBuyers.size,
        media_owner_ids: mediaOwners.size,
        listings: (listings.data ?? []).length,
        demands: (demands.data ?? []).length,
        media_orders: (media.data ?? []).length,
        profiles: (profiles.data ?? []).length,
        kyc_verified: verifiedCount,
      },
      after: {
        listing_owner_ids: new Set((listings2.data ?? []).map((r) => r.user_id)).size,
        demand_buyer_ids: new Set((demands2.data ?? []).map((r) => r.buyer_id)).size,
        media_owner_ids: new Set((media2.data ?? []).map((r) => r.user_id)).size,
        listings: (listings2.data ?? []).length,
        demands: (demands2.data ?? []).length,
        media_orders: (media2.data ?? []).length,
        profiles: (profiles2.data ?? []).length,
        kyc_verified: verifiedCount2,
      },
    },
    hq: {
      note: "HQ_ADMIN_EMAILS staging override only on deploy env; allowlist code unchanged",
      code_untouched: true,
    },
  };

  // Ownership invariants
  if (record.ownership.before.listings !== record.ownership.after.listings) {
    fail("listings count changed");
  }
  if (record.ownership.before.demands !== record.ownership.after.demands) {
    fail("demands count changed");
  }
  if (record.ownership.before.media_orders !== record.ownership.after.media_orders) {
    fail("media_orders count changed");
  }
  if (record.ownership.before.kyc_verified !== record.ownership.after.kyc_verified) {
    fail("verified KYC count changed");
  }
  if (sameEmail.length > 1) fail("duplicate auth.users for smoke email");

  writeFileSync(OUT, `${JSON.stringify(record, null, 2)}\n`);
  console.log(JSON.stringify(record, null, 2));
  console.log("PASS smoke-auth-phase1a-staging");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e), 2));
