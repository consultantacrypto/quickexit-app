/**
 * Staging-only publication security matrix.
 * Never targets Production. Never prints secrets / JWTs / emails.
 * Never runs a real Stripe charge.
 *
 *   QE_STAGING_MATRIX=1 npx tsx scripts/e2e-listing-publication-security-staging.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  STAGING_REF,
  assertStagingSupabaseWriteTarget,
} from "./assert-staging-supabase-target";
import { activateRow } from "../lib/stripeWebhookActivation";
import { evaluateListingBumpEligibility } from "../lib/listingRank";

function fail(m: string): never {
  console.error(`FAIL ${m}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string) {
  if (!cond) fail(msg);
}

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return out;
}

const results: Record<string, "PASS" | "FAIL" | "SKIP"> = {};

function record(name: string, ok: boolean) {
  results[name] = ok ? "PASS" : "FAIL";
  if (!ok) fail(name);
  console.log(`PASS ${name}`);
}

async function countById(admin: SupabaseClient, id: string): Promise<number> {
  const { count, error } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("id", id);
  if (error) fail(`count ${error.message}`);
  return count ?? 0;
}

async function loadRow(admin: SupabaseClient, id: string) {
  const { data, error } = await admin
    .from("listings")
    .select("id, status, paid, expires_at, is_seed, title, user_id, bumped_at, availability_status")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(`load ${error.message}`);
  return data;
}

async function main() {
  const stagingPaths = [
    resolve(".env.staging.local"),
    resolve("D:/MEDIA/quickexit/.env.staging.local"),
  ];
  let staging: Record<string, string> = {};
  for (const p of stagingPaths) {
    staging = { ...staging, ...loadEnvFile(p) };
  }
  process.env.QE_STAGING_MATRIX = staging.QE_STAGING_MATRIX || "1";

  const apiUrl = assertStagingSupabaseWriteTarget(
    staging.STAGING_SUPABASE_URL || staging.NEXT_PUBLIC_SUPABASE_URL,
  );
  assert(!apiUrl.includes("geywuzwbzecknokvnins"), "refused Production");
  assert(apiUrl.includes(STAGING_REF), "Staging ref");

  const anonKey = staging.STAGING_ANON_KEY || staging.NEXT_PUBLIC_SUPABASE_ANON_KEY || staging.H4B_ANON_KEY || "";
  const serviceKey =
    staging.STAGING_SERVICE_ROLE_KEY ||
    staging.SUPABASE_SERVICE_ROLE_KEY ||
    staging.H4B_SERVICE_ROLE_KEY ||
    "";
  assert(anonKey.length > 20, "anon key present");
  assert(serviceKey.length > 20, "service role present");

  const admin = createClient(apiUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Mint ephemeral ordinary user (do not reuse possibly expired H4B JWTs).
  const stampAuth = Date.now();
  const testEmail = `pubsec.${stampAuth}@staging.quickexit.test`;
  const testPassword = `PubSec-${stampAuth}-Aa1!`;
  const createdUser = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  assert(createdUser.data.user?.id && !createdUser.error, "create ephemeral user");
  const userId = createdUser.data.user!.id;

  const userClient = createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await userClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  assert(signed.data.session?.access_token && !signed.error, "sign in ephemeral user");
  assert(signed.data.user?.id === userId, "session user matches");

  // Baseline snapshot (no mass mutation of unrelated rows)
  const { count: baselineCount, error: baselineErr } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true });
  assert(!baselineErr, "baseline count");
  const baseline = baselineCount ?? 0;

  const stamp = Date.now();
  const createdIds: string[] = [];

  // --- N1: user INSERT status=active must fail, no row ---
  {
    const { data, error } = await userClient
      .from("listings")
      .insert({
        user_id: userId,
        title: `[STAGING_TEST] PUBSEC_N1_ACTIVE ${stamp}`,
        status: "active",
        is_seed: false,
        category: "auto",
        description: "pubsec negative",
        market_price: 1000,
        exit_price: 800,
        images: [],
        listing_kind: "specific_asset",
        availability_status: "available",
      })
      .select("id")
      .maybeSingle();
    const denied = Boolean(error) && !data;
    record("N1_user_insert_active_denied", denied);
    if (data?.id) {
      await admin.from("listings").delete().eq("id", data.id);
      fail("N1 partial write leaked");
    }
  }

  // --- N2: user INSERT omit status → must not become active ---
  {
    const payload: Record<string, unknown> = {
      user_id: userId,
      title: `[STAGING_TEST] PUBSEC_N2_DEFAULT ${stamp}`,
      is_seed: false,
      category: "auto",
      description: "pubsec default status",
      market_price: 1000,
      exit_price: 800,
      images: [],
      listing_kind: "specific_asset",
      availability_status: "available",
    };
    const { data, error } = await userClient
      .from("listings")
      .insert(payload)
      .select("id, status")
      .maybeSingle();
    if (error && !data) {
      // Rejecting omit-status is also acceptable if NOT NULL without default path fails.
      record("N2_user_insert_omit_status_not_active", true);
    } else {
      assert(data?.id, "N2 inserted");
      createdIds.push(data!.id);
      record("N2_user_insert_omit_status_not_active", data!.status === "pending_payment");
    }
  }

  // --- P1: legitimate pending_payment insert ---
  let pendingId = "";
  {
    const { data, error } = await userClient
      .from("listings")
      .insert({
        user_id: userId,
        title: `[STAGING_TEST] PUBSEC_PENDING ${stamp}`,
        status: "pending_payment",
        paid: false,
        is_seed: false,
        category: "auto",
        description: "pubsec pending ok",
        market_price: 1000,
        exit_price: 800,
        images: [],
        listing_kind: "specific_asset",
        availability_status: "available",
        details: { qa: "publication_security_v1", synthetic: true },
      })
      .select("id, status, paid, expires_at")
      .maybeSingle();
    assert(!error && data?.id, `P1 insert ${error?.message ?? "no row"}`);
    pendingId = data!.id;
    createdIds.push(pendingId);
    record(
      "P1_user_insert_pending_payment",
      data!.status === "pending_payment" && data!.expires_at == null,
    );
  }

  // --- N3: pending → active via SDK ---
  {
    const before = await countById(admin, pendingId);
    const { data, error } = await userClient
      .from("listings")
      .update({ status: "active" })
      .eq("id", pendingId)
      .select("id, status")
      .maybeSingle();
    const row = await loadRow(admin, pendingId);
    record(
      "N3_pending_to_active_sdk_denied",
      Boolean(error) && !data && row?.status === "pending_payment" && (await countById(admin, pendingId)) === before,
    );
  }

  // --- N4: forge expires_at ---
  {
    const { data, error } = await userClient
      .from("listings")
      .update({ expires_at: new Date(Date.now() + 86400000 * 30).toISOString() })
      .eq("id", pendingId)
      .select("id, expires_at")
      .maybeSingle();
    const row = await loadRow(admin, pendingId);
    record("N4_forge_expires_at_denied", Boolean(error) && !data && row?.expires_at == null);
  }

  // --- N5: forge paid ---
  {
    const { data, error } = await userClient
      .from("listings")
      .update({ paid: true })
      .eq("id", pendingId)
      .select("id, paid")
      .maybeSingle();
    const row = await loadRow(admin, pendingId);
    record("N5_forge_paid_denied", Boolean(error) && !data && row?.paid !== true);
  }

  // --- N6: forge is_seed ---
  {
    const { data, error } = await userClient
      .from("listings")
      .update({ is_seed: true })
      .eq("id", pendingId)
      .select("id, is_seed")
      .maybeSingle();
    const row = await loadRow(admin, pendingId);
    record("N6_forge_is_seed_denied", Boolean(error) && !data && row?.is_seed !== true);
  }

  // --- N7: pending → suspended → active bypass ---
  {
    const { data: sus, error: susErr } = await userClient
      .from("listings")
      .update({ status: "suspended" })
      .eq("id", pendingId)
      .select("id, status")
      .maybeSingle();
    const afterSus = await loadRow(admin, pendingId);
    const susDenied =
      Boolean(susErr) && !sus && afterSus?.status === "pending_payment";
    record("N7a_pending_to_suspended_denied", susDenied);

    // Even if somehow suspended, active must fail without expiry — force suspended via service then user activate
    await admin
      .from("listings")
      .update({ status: "suspended", expires_at: null, paid: false })
      .eq("id", pendingId);
    const { data: act, error: actErr } = await userClient
      .from("listings")
      .update({ status: "active" })
      .eq("id", pendingId)
      .select("id, status")
      .maybeSingle();
    const afterAct = await loadRow(admin, pendingId);
    record(
      "N7b_suspended_unpaid_to_active_denied",
      Boolean(actErr) && !act && afterAct?.status !== "active",
    );
    // restore pending for later cleanup path
    await admin
      .from("listings")
      .update({ status: "pending_payment", paid: false, expires_at: null })
      .eq("id", pendingId);
  }

  // --- P2: service_role Force Publish equivalent (HQ path after allowlist) ---
  let hqPublishedId = "";
  {
    const { data: draft, error: draftErr } = await admin
      .from("listings")
      .insert({
        user_id: userId,
        title: `[STAGING_TEST] PUBSEC_HQ_FORCE ${stamp}`,
        status: "pending_payment",
        paid: false,
        is_seed: false,
        category: "auto",
        description: "hq force publish target",
        market_price: 2000,
        exit_price: 1500,
        images: [],
        listing_kind: "specific_asset",
        availability_status: "available",
        details: {
          qa: "publication_security_v1",
          location: { city: "București", county: "București", country: "RO" },
        },
      })
      .select("id")
      .maybeSingle();
    assert(!draftErr && draft?.id, `HQ draft ${draftErr?.message}`);
    hqPublishedId = draft!.id;
    createdIds.push(hqPublishedId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const { data: pub, error: pubErr } = await admin
      .from("listings")
      .update({
        status: "active",
        paid: true,
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", hqPublishedId)
      .select("id, status, paid, expires_at")
      .maybeSingle();
    record(
      "P2_service_role_force_publish",
      !pubErr && pub?.status === "active" && pub?.paid === true && Boolean(pub?.expires_at),
    );
  }

  // --- P3: Stripe webhook activation equivalent (activateRow + service_role) ---
  let stripeId = "";
  {
    const { data: draft, error: draftErr } = await admin
      .from("listings")
      .insert({
        user_id: userId,
        title: `[STAGING_TEST] PUBSEC_STRIPE_ACT ${stamp}`,
        status: "pending_payment",
        paid: false,
        is_seed: false,
        category: "auto",
        description: "stripe activate target",
        market_price: 3000,
        exit_price: 2200,
        images: [],
        listing_kind: "specific_asset",
        availability_status: "available",
        details: { qa: "publication_security_v1" },
      })
      .select("id")
      .maybeSingle();
    assert(!draftErr && draft?.id, `stripe draft ${draftErr?.message}`);
    stripeId = draft!.id;
    createdIds.push(stripeId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);
    const err = await activateRow(
      admin,
      "listings",
      stripeId,
      expiresAt.toISOString(),
      "[pubsec-staging]",
    );
    const row = await loadRow(admin, stripeId);
    record(
      "P3_stripe_activateRow_service_role",
      !err && row?.status === "active" && row?.paid === true && Boolean(row?.expires_at),
    );
  }

  // --- P4: legitimate suspend/resume with expiry window ---
  {
    const { error: susErr } = await userClient
      .from("listings")
      .update({ status: "suspended" })
      .eq("id", hqPublishedId);
    const susRow = await loadRow(admin, hqPublishedId);
    record("P4a_user_suspend_active", !susErr && susRow?.status === "suspended");

    const { error: resErr } = await userClient
      .from("listings")
      .update({ status: "active" })
      .eq("id", hqPublishedId);
    const resRow = await loadRow(admin, hqPublishedId);
    record("P4b_user_resume_with_expiry", !resErr && resRow?.status === "active");
  }

  // --- P5: sold transition ---
  {
    const { data: soldDraft, error: soldDraftErr } = await admin
      .from("listings")
      .insert({
        user_id: userId,
        title: `[STAGING_TEST] PUBSEC_SOLD ${stamp}`,
        status: "active",
        paid: true,
        is_seed: false,
        expires_at: new Date(Date.now() + 86400000 * 10).toISOString(),
        category: "auto",
        description: "sold transition",
        market_price: 1000,
        exit_price: 900,
        images: [],
        listing_kind: "specific_asset",
        availability_status: "available",
        details: { qa: "publication_security_v1" },
      })
      .select("id")
      .maybeSingle();
    assert(!soldDraftErr && soldDraft?.id, `sold draft ${soldDraftErr?.message}`);
    createdIds.push(soldDraft!.id);
    const { error: soldErr } = await userClient
      .from("listings")
      .update({ status: "sold" })
      .eq("id", soldDraft!.id);
    const soldRow = await loadRow(admin, soldDraft!.id);
    record("P5_user_mark_sold", !soldErr && soldRow?.status === "sold");
  }

  // --- P6: Admin Bump eligibility + RPC on active paid row ---
  {
    const row = await loadRow(admin, hqPublishedId);
    const elig = evaluateListingBumpEligibility({
      status: row?.status,
      is_seed: row?.is_seed,
      availability_status: row?.availability_status,
    });
    record("P6a_bump_eligibility", elig.ok === true);

    const { data: bumpedAt, error: bumpErr } = await admin.rpc("hq_bump_listing", {
      p_listing_id: hqPublishedId,
      p_actor_user_id: userId,
      p_actor_email: "staging-pubsec@example.invalid",
    });
    const afterBump = await loadRow(admin, hqPublishedId);
    record(
      "P6b_hq_bump_listing_rpc",
      !bumpErr && Boolean(bumpedAt) && Boolean(afterBump?.bumped_at),
    );
  }

  // --- P7: image-honesty-style pending fixture still insertable ---
  {
    const { data, error } = await userClient
      .from("listings")
      .insert({
        user_id: userId,
        title: `[STAGING_TEST] IMAGE_HONESTY_QA pubsec ${stamp}`,
        status: "pending_payment",
        paid: false,
        is_seed: false,
        category: "auto",
        description: "image honesty compatibility",
        market_price: 10000,
        exit_price: 8000,
        images: [],
        listing_kind: "specific_asset",
        availability_status: "available",
        details: { qa: "image_honesty_pra_v1", synthetic: true },
      })
      .select("id, status")
      .maybeSingle();
    assert(!error && data?.id, `P7 ${error?.message}`);
    createdIds.push(data!.id);
    record("P7_image_qa_pending_fixture_compatible", data!.status === "pending_payment");
  }

  // --- Existing data unchanged (baseline count delta == created only, then cleanup) ---
  const { count: midCount } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true });
  record(
    "X1_no_unexpected_mass_inserts",
    (midCount ?? 0) === baseline + createdIds.length,
  );

  // Cleanup synthetic rows + ephemeral auth user
  if (createdIds.length > 0) {
    await admin.from("listing_bump_events").delete().in("listing_id", createdIds);
    const { error: delErr } = await admin.from("listings").delete().in("id", createdIds);
    assert(!delErr, `cleanup ${delErr?.message}`);
  }
  const { count: finalCount } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true });
  record("X2_cleanup_restores_baseline_count", (finalCount ?? 0) === baseline);

  const { error: delUserErr } = await admin.auth.admin.deleteUser(userId);
  record("X3_ephemeral_user_deleted", !delUserErr);

  console.log(
    JSON.stringify(
      {
        ok: true,
        plane: "staging",
        ref: STAGING_REF,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(`FAIL ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
