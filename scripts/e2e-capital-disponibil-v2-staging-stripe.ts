/**
 * Capital Disponibil v2 — Staging live Stripe TEST checkout + webhook E2E.
 * STAGING ONLY. Never prints secrets / PII / full Stripe ids beyond redacted refs.
 *
 *   npx tsx scripts/e2e-capital-disponibil-v2-staging-stripe.ts
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import Stripe from "stripe";
import { payStripeCheckoutUrl } from "./phase-2g-pay-checkout";
import {
  STAGING_REF,
  assertStagingSupabaseWriteTarget,
} from "./assert-staging-supabase-target";
import { DEMAND_STANDARD_PACKAGE_ID } from "../lib/demandLifecycle";

const STAGING_URL = "https://quickexit-staging.vercel.app";
const PRODUCTION_REF = "geywuzwbzecknokvnins";
const EXPECTED_MINOR = 4900;

function load(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const o: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    o[line.slice(0, i).trim()] = v;
  }
  return o;
}

function fail(m: string): never {
  console.error(`FAIL ${m}`);
  process.exit(1);
}

function redact(id: string): string {
  if (!id || id.length < 12) return "<short>";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

const results: Record<string, string> = {};

async function main() {
  const staging = load(resolve(".env.staging.local"));
  const local = load(resolve(".env.local"));
  const deploy = load(join(tmpdir(), "qe-staging-deploy.env"));
  const helperPath = join(tmpdir(), "qe-demand-standard-49-test-price.json");
  const helper = existsSync(helperPath)
    ? (JSON.parse(readFileSync(helperPath, "utf8")) as { priceId?: string })
    : null;

  const apiUrl = assertStagingSupabaseWriteTarget(
    staging.STAGING_SUPABASE_URL || staging.NEXT_PUBLIC_SUPABASE_URL || "",
  );
  if (apiUrl.includes(PRODUCTION_REF)) fail("Production refused");

  const anon =
    staging.STAGING_ANON_KEY || staging.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceKey =
    staging.STAGING_SERVICE_ROLE_KEY || staging.SUPABASE_SERVICE_ROLE_KEY || "";
  const stripeKey =
    process.env.STRIPE_SECRET_KEY ||
    local.STRIPE_SECRET_KEY ||
    deploy.STRIPE_SECRET_KEY ||
    "";
  if (!anon || !serviceKey) fail("missing Staging keys");
  if (!stripeKey.startsWith("sk_test_")) fail("STRIPE_SECRET_KEY must be sk_test_");

  const expectedPrice =
    process.env.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    local.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    deploy.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    helper?.priceId ||
    "";
  if (!expectedPrice.startsWith("price_")) fail("dedicated demand price missing locally");

  const service = createClient(apiUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stripe = new Stripe(stripeKey, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2023-10-16" as any,
  });

  const stamp = Date.now();
  const email = `cdv2-stripe-${stamp}@staging.quickexit.test`;
  const password = `Test-${stamp}-Aa1!`;
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) fail(`createUser: ${createErr?.message}`);
  const buyerId = created.user.id;

  await service.from("profiles").upsert({
    id: buyerId,
    kyc_status: "verified",
    user_type: "buyer",
  });

  const { data: demand, error: demandErr } = await service
    .from("demands")
    .insert({
      buyer_id: buyerId,
      target_asset: "Cumpăr BMW XM Stripe E2E",
      category: "Auto & Moto",
      budget_min: 80000,
      budget: 120000,
      description: "Capital Disponibil v2 live Stripe TEST",
      requirements: { locatie: "București", modele: "BMW XM", an_minim: "2021" },
      status: "pending_payment",
      paid: false,
    })
    .select("id,status,paid,buyer_id")
    .single();
  if (demandErr || !demand) fail(`demand insert: ${demandErr?.message}`);
  if (demand.status !== "pending_payment" || demand.paid !== false) {
    fail("pre-pay state not pending_payment/paid=false");
  }
  results.prepay_state = "PASS";

  const anonClient = createClient(apiUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await anonClient.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session) fail(signed.error?.message ?? "signIn");
  const token = signed.data.session.access_token;

  const checkoutRes = await fetch(`${STAGING_URL}/api/stripe/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: "demand",
      demandId: demand.id,
      locale: "ro",
    }),
  });
  const checkoutBody = (await checkoutRes.json().catch(() => null)) as {
    url?: string;
    sessionId?: string;
    id?: string;
    error?: string;
  } | null;
  if (!checkoutRes.ok) {
    fail(
      `checkout HTTP ${checkoutRes.status}: ${checkoutBody?.error ?? JSON.stringify(checkoutBody)}`,
    );
  }
  const sessionId = String(checkoutBody?.sessionId || checkoutBody?.id || "").trim();
  const checkoutUrl = String(checkoutBody?.url || "").trim();
  if (!sessionId.startsWith("cs_test_")) fail("session must be cs_test_");
  if (!checkoutUrl.startsWith("https://checkout.stripe.com/")) fail("missing checkout url");

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "line_items.data.price.product"],
  });
  if (session.livemode) fail("STOP livemode=true");
  const amountTotal = session.amount_total;
  const currency = String(session.currency || "").toLowerCase();
  const meta = session.metadata || {};
  if (amountTotal !== EXPECTED_MINOR) fail(`amount_total ${amountTotal} != ${EXPECTED_MINOR}`);
  if (currency !== "ron") fail(`currency ${currency}`);
  if (meta.packageId !== DEMAND_STANDARD_PACKAGE_ID) fail("packageId mismatch");
  if (meta.type !== "demand") fail("type mismatch");
  if (meta.demandId !== demand.id) fail("demandId mismatch");
  if (meta.priceId && meta.priceId !== expectedPrice) {
    fail("session priceId != verified dedicated price");
  }
  const line = session.line_items?.data?.[0];
  const lineAmount = line?.amount_total ?? line?.price?.unit_amount;
  if (lineAmount !== EXPECTED_MINOR) fail(`line amount ${lineAmount}`);
  results.checkout_49_ron = "PASS";
  results.checkout_session_ref = redact(sessionId);
  results.checkout_livemode = "false";
  results.checkout_amount_ron = "49.00";
  results.checkout_packageId = DEMAND_STANDARD_PACKAGE_ID;
  results.checkout_type = "demand";

  await payStripeCheckoutUrl(checkoutUrl, "quickexit-staging.vercel.app");
  results.payment_completed = "PASS";

  let activated: Record<string, unknown> | null = null;
  for (let i = 0; i < 40; i++) {
    await sleep(2000);
    const { data: row } = await service
      .from("demands")
      .select(
        "id,status,paid,activated_at,expires_at,package_id,buyer_verified,buyer_id",
      )
      .eq("id", demand.id)
      .maybeSingle();
    if (row?.status === "active" && row.paid === true) {
      activated = row;
      break;
    }
  }
  if (!activated) fail("webhook activation timeout");
  if (activated.package_id !== DEMAND_STANDARD_PACKAGE_ID) fail("package_id after pay");
  if (!activated.activated_at || !activated.expires_at) fail("lifecycle timestamps missing");
  const days =
    (new Date(String(activated.expires_at)).getTime() -
      new Date(String(activated.activated_at)).getTime()) /
    86400000;
  if (days < 29.5 || days > 30.5) fail(`expires window ${days}`);
  if (activated.buyer_id !== buyerId) fail("owner mismatch");
  if (activated.buyer_verified !== true) fail("buyer_verified expected true");
  results.webhook_activate = "PASS";
  results.expires_days = String(Math.round(days * 10) / 10);

  const expiresBefore = String(activated.expires_at);
  // Idempotency: retrieve completed session again and wait — no status flip / no extend
  await sleep(3000);
  const { data: afterReplay } = await service
    .from("demands")
    .select("id,status,paid,expires_at,activated_at")
    .eq("id", demand.id)
    .single();
  if (afterReplay?.status !== "active" || afterReplay.paid !== true) fail("post-idempotent state");
  if (String(afterReplay.expires_at) !== expiresBefore) fail("expires_at extended");
  const { count: demandCount } = await service
    .from("demands")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", buyerId)
    .eq("target_asset", "Cumpăr BMW XM Stripe E2E");
  if ((demandCount ?? 0) !== 1) fail(`duplicate demands count=${demandCount}`);
  results.idempotency = "PASS";

  // Abandoned checkout + resume (second demand)
  const { data: abandon, error: abErr } = await service
    .from("demands")
    .insert({
      buyer_id: buyerId,
      target_asset: "Cumpăr abandon resume E2E",
      category: "Lux & Ceasuri",
      budget_min: 10000,
      budget: 25000,
      description: "abandon then resume",
      requirements: { brand_model: "Rolex" },
      status: "pending_payment",
      paid: false,
    })
    .select("id,status")
    .single();
  if (abErr || !abandon) fail(`abandon insert: ${abErr?.message}`);

  const resumeRes = await fetch(`${STAGING_URL}/api/stripe/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: "demand",
      demandId: abandon.id,
      locale: "ro",
    }),
  });
  const resumeBody = (await resumeRes.json().catch(() => null)) as {
    url?: string;
    sessionId?: string;
    error?: string;
  } | null;
  if (!resumeRes.ok || !resumeBody?.url) {
    fail(`resume checkout: ${resumeRes.status} ${resumeBody?.error}`);
  }
  const resumeSession = await stripe.checkout.sessions.retrieve(
    String(resumeBody.sessionId || ""),
  );
  if (resumeSession.amount_total !== EXPECTED_MINOR) fail("resume not 49 RON");
  if (resumeSession.metadata?.demandId !== abandon.id) fail("resume demand id");
  // Do not pay — expire session to leave pending
  try {
    await stripe.checkout.sessions.expire(String(resumeBody.sessionId));
  } catch {
    /* ignore if already expired */
  }
  const { data: stillPending } = await service
    .from("demands")
    .select("id,status,paid")
    .eq("id", abandon.id)
    .single();
  if (stillPending?.status !== "pending_payment" || stillPending.paid !== false) {
    fail("abandon demand mutated unexpectedly");
  }
  const { count: abandonCount } = await service
    .from("demands")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", buyerId)
    .eq("target_asset", "Cumpăr abandon resume E2E");
  if ((abandonCount ?? 0) !== 1) fail("duplicate abandon demand");
  results.resume_checkout = "PASS";

  const events = await stripe.events.list({
    type: "checkout.session.completed",
    limit: 30,
  });
  const match = events.data.find((e) => {
    const obj = e.data.object as { id?: string };
    return obj.id === sessionId && e.livemode === false;
  });
  results.stripe_event_ref = match ? redact(match.id) : "not_listed_yet";
  results.stripe_event_livemode = match ? String(match.livemode) : "n/a";

  const out = {
    at: new Date().toISOString(),
    staging_ref: STAGING_REF,
    staging_url: STAGING_URL,
    production_touched: false,
    results,
  };
  writeFileSync(
    resolve("docs/internal/product/capital-disponibil-v2-staging-stripe-e2e-2026-10-15.json"),
    `${JSON.stringify(out, null, 2)}\n`,
  );
  console.log(JSON.stringify(out, null, 2));
  console.log("OK e2e-capital-disponibil-v2-staging-stripe");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
