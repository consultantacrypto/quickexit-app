/**
 * Production Live Checkout SESSION proof for Capital Disponibil v2.
 * Creates synthetic demand + Stripe Checkout session. Does NOT complete payment.
 * Never prints secrets / full IDs beyond redacted refs.
 *
 * Requires TEMP/qe-prod-supabase.env (anon + service). Uses Production site.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const PROD_URL = "https://www.quickexit.ro";
const PRODUCTION_REF = "geywuzwbzecknokvnins";
const EXPECTED_MINOR = 4900;

function load(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const o: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    o[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return o;
}

function fail(m: string): never {
  console.error(`FAIL ${m}`);
  process.exit(1);
}

function redact(id: string) {
  return id.length < 12 ? "<short>" : `${id.slice(0, 8)}…${id.slice(-4)}`;
}

async function main() {
  const env = load(join(tmpdir(), "qe-prod-supabase.env"));
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const service = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url.includes(PRODUCTION_REF)) fail("must target Production Supabase");
  if (!anon || !service) fail("missing Production keys in temp env");

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const stamp = Date.now();
  const email = `cdv2-prod-${stamp}@quickexit.operator-test`;
  const password = `ProdTest-${stamp}-Aa1!`;

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr || !created.user) fail(`createUser: ${cErr?.message}`);
  await admin.from("profiles").upsert({
    id: created.user.id,
    kyc_status: "verified",
    user_type: "buyer",
  });

  const { data: demand, error: dErr } = await admin
    .from("demands")
    .insert({
      buyer_id: created.user.id,
      target_asset: "[OPERATOR_TEST] Capital Disponibil v2 Live session",
      category: "Auto & Moto",
      budget_min: 40000,
      budget: 60000,
      description: "Synthetic Production checkout session proof — do not pay unless approved",
      requirements: { locatie: "București", modele: "Test" },
      status: "pending_payment",
      paid: false,
    })
    .select("id,status,paid")
    .single();
  if (dErr || !demand) fail(`demand: ${dErr?.message}`);
  if (demand.status !== "pending_payment" || demand.paid !== false) {
    fail("prepay state invalid");
  }

  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const signed = await anonClient.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session) fail(signed.error?.message ?? "signin");

  const checkoutRes = await fetch(`${PROD_URL}/api/stripe/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${signed.data.session.access_token}`,
    },
    body: JSON.stringify({ type: "demand", demandId: demand.id, locale: "ro" }),
  });
  const body = (await checkoutRes.json().catch(() => null)) as {
    url?: string;
    sessionId?: string;
    error?: string;
    amount_total?: number | null;
    currency?: string | null;
    livemode?: boolean | null;
    packageId?: string | null;
    type?: string | null;
  } | null;
  if (!checkoutRes.ok) {
    fail(`checkout HTTP ${checkoutRes.status}: ${body?.error ?? JSON.stringify(body)}`);
  }
  const sessionId = String(body?.sessionId || "");
  const checkoutUrl = String(body?.url || "");
  if (!sessionId.startsWith("cs_live_")) {
    fail(`STOP expected cs_live_ got ${sessionId.slice(0, 10)}`);
  }
  if (!checkoutUrl.startsWith("https://checkout.stripe.com/")) fail("missing checkout url");
  if (body?.livemode !== true) fail("STOP livemode must be true on Production");
  if (body?.amount_total !== EXPECTED_MINOR) {
    fail(`STOP amount_total ${body?.amount_total} != ${EXPECTED_MINOR}`);
  }
  if (String(body?.currency || "").toLowerCase() !== "ron") fail("STOP currency must be ron");
  if (body?.packageId !== "demand_standard_30d") fail("STOP packageId mismatch");
  if (body?.type !== "demand") fail("STOP type mismatch");

  const out = {
    ok: true,
    production_ref: PRODUCTION_REF,
    demand_ref: redact(demand.id),
    demand_status: demand.status,
    paid: demand.paid,
    session_ref: redact(sessionId),
    session_mode: "live",
    livemode: body.livemode,
    amount_total: body.amount_total,
    currency: body.currency,
    packageId: body.packageId,
    type: body.type,
    expected_amount_minor: EXPECTED_MINOR,
    expected_amount_ron: "49.00",
    checkout_url_host: "checkout.stripe.com",
    payment_completed: false,
    note: "Live session facts from Stripe Checkout create response. Payment not completed (operator optional).",
  };
  writeFileSync(
    resolve(
      "docs/internal/product/capital-disponibil-v2-production-pre-rollout-2026-10-15/live-checkout-session.json",
    ),
    `${JSON.stringify(out, null, 2)}\n`,
  );
  writeFileSync(
    join(tmpdir(), "qe-cdv2-prod-checkout-pay.json"),
    JSON.stringify({
      sessionId,
      url: checkoutUrl,
      demandId: demand.id,
      buyerId: created.user.id,
      email,
      password,
    }),
    "utf8",
  );
  console.log(JSON.stringify(out, null, 2));
  console.log("OK production-live-checkout-session");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
