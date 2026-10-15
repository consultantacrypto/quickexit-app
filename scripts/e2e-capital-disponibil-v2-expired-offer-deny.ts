/**
 * Staging-only: expired demand must deny demand_offers INSERT under RLS.
 * Never prints secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertStagingSupabaseWriteTarget } from "./assert-staging-supabase-target";

function fail(m: string): never {
  console.error(`FAIL ${m}`);
  process.exit(1);
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

async function main() {
  const env = loadEnvFile(resolve(".env.staging.local"));
  const url = assertStagingSupabaseWriteTarget(
    env.STAGING_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const service = env.STAGING_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anon = env.STAGING_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!service || !anon) fail("missing staging keys");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stamp = Date.now();
  const email = `cdv2-rls-${stamp}@staging.quickexit.test`;
  const pass = `Test-${stamp}-Aa1!`;

  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: pass,
    email_confirm: true,
  });
  if (userErr || !userData.user) fail(userErr?.message || "createUser");
  const uid = userData.user.id;

  const past = new Date(Date.now() - 60_000).toISOString();
  const { data: demand, error: demandErr } = await admin
    .from("demands")
    .insert({
      buyer_id: uid,
      target_asset: "RLS expired deny",
      category: "Gadgets",
      budget_min: 1,
      budget: 2,
      status: "active",
      paid: true,
      expires_at: past,
      package_id: "demand_standard_30d",
      buyer_verified: false,
    })
    .select("id")
    .single();
  if (demandErr || !demand) fail(demandErr?.message || "insert demand");

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password: pass });
  if (signErr) fail(signErr.message);

  const { error: offerErr } = await client.from("demand_offers").insert({
    demand_id: demand.id,
    seller_user_id: uid,
    offer_price: 1,
    asset_description: "should fail",
    seller_phone: "1",
    seller_email: email,
    images: [],
    status: "new",
  });

  await admin.from("demands").delete().eq("id", demand.id);
  await admin.auth.admin.deleteUser(uid);

  if (!offerErr) fail("expected RLS deny on expired demand offer insert");
  console.log(
    JSON.stringify({
      I_offer_deny_expired: "PASS",
      rls_error_code: offerErr.code ?? null,
    }),
  );
  console.log("OK e2e-capital-disponibil-v2-expired-offer-deny");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
