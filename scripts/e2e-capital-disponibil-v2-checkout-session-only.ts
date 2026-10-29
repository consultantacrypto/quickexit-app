/**
 * Prove Staging demand checkout creates TEST session @ 49 RON (no charge yet).
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import Stripe from "stripe";
import {
  STAGING_REF,
  assertStagingSupabaseWriteTarget,
} from "./assert-staging-supabase-target";
import { DEMAND_STANDARD_PACKAGE_ID } from "../lib/demandLifecycle";

const STAGING_URL = "https://quickexit-staging.vercel.app";
const EXPECTED_MINOR = 4900;

function load(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const o: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    o[line.slice(0, i).trim()] = v;
  }
  return o;
}

function fail(m: string): never {
  console.error(`FAIL ${m}`);
  process.exit(1);
}

function redact(id: string): string {
  return id.length < 12 ? "<short>" : `${id.slice(0, 8)}…${id.slice(-4)}`;
}

async function main() {
  const staging = load(resolve(".env.staging.local"));
  const local = load(resolve(".env.local"));
  const deploy = load(join(tmpdir(), "qe-staging-deploy.env"));
  const helper = existsSync(join(tmpdir(), "qe-demand-standard-49-test-price.json"))
    ? JSON.parse(readFileSync(join(tmpdir(), "qe-demand-standard-49-test-price.json"), "utf8"))
    : null;

  const apiUrl = assertStagingSupabaseWriteTarget(
    staging.STAGING_SUPABASE_URL || staging.NEXT_PUBLIC_SUPABASE_URL || "",
  );
  const anon = staging.STAGING_ANON_KEY || staging.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceKey = staging.STAGING_SERVICE_ROLE_KEY || staging.SUPABASE_SERVICE_ROLE_KEY || "";
  const stripeKey = process.env.STRIPE_SECRET_KEY || local.STRIPE_SECRET_KEY || deploy.STRIPE_SECRET_KEY || "";
  const expectedPrice =
    process.env.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    local.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    deploy.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    helper?.priceId ||
    "";
  if (!stripeKey.startsWith("sk_test_")) fail("need sk_test_");
  if (!expectedPrice.startsWith("price_")) fail("need dedicated price");

  const service = createClient(apiUrl, serviceKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" as any });
  const stamp = Date.now();
  const email = `cdv2-sess-${stamp}@staging.quickexit.test`;
  const password = `Test-${stamp}-Aa1!`;
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) fail(createErr?.message ?? "user");
  await service.from("profiles").upsert({
    id: created.user.id,
    kyc_status: "verified",
    user_type: "buyer",
  });
  const { data: demand, error: dErr } = await service
    .from("demands")
    .insert({
      buyer_id: created.user.id,
      target_asset: "Cumpăr session proof E2E",
      category: "Auto & Moto",
      budget_min: 50000,
      budget: 90000,
      description: "session amount proof",
      requirements: { locatie: "Cluj" },
      status: "pending_payment",
      paid: false,
    })
    .select("id,status,paid")
    .single();
  if (dErr || !demand) fail(dErr?.message ?? "demand");

  const anonClient = createClient(apiUrl, anon, { auth: { persistSession: false } });
  const signed = await anonClient.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session) fail(signed.error?.message ?? "signin");

  const checkoutRes = await fetch(`${STAGING_URL}/api/stripe/checkout`, {
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
  } | null;
  if (!checkoutRes.ok) fail(`checkout ${checkoutRes.status} ${body?.error}`);
  const sessionId = String(body?.sessionId || "");
  if (!sessionId.startsWith("cs_test_")) fail("not cs_test_");

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });
  if (session.livemode) fail("STOP livemode=true");
  if (session.amount_total !== EXPECTED_MINOR) fail(`amount ${session.amount_total}`);
  if (String(session.currency).toLowerCase() !== "ron") fail("currency");
  if (session.metadata?.packageId !== DEMAND_STANDARD_PACKAGE_ID) fail("packageId");
  if (session.metadata?.type !== "demand") fail("type");
  if (session.metadata?.demandId !== demand.id) fail("demandId");
  if (session.metadata?.priceId !== expectedPrice) fail("priceId not dedicated");

  const guest =
    process.env.STRIPE_PRICE_OFERTA_49_RON ||
    local.STRIPE_PRICE_OFERTA_49_RON ||
    deploy.STRIPE_PRICE_OFERTA_49_RON ||
    "";
  const legacy =
    process.env.STRIPE_PRICE_CERERE_99_RON ||
    local.STRIPE_PRICE_CERERE_99_RON ||
    deploy.STRIPE_PRICE_CERERE_99_RON ||
    "";
  if (guest && session.metadata?.priceId === guest) fail("guest offer collision");
  if (legacy && session.metadata?.priceId === legacy) fail("legacy 99 collision");

  const out = {
    ok: true,
    staging_ref: STAGING_REF,
    demand_status: demand.status,
    paid: demand.paid,
    session_ref: redact(sessionId),
    livemode: session.livemode,
    amount_total: session.amount_total,
    amount_ron: "49.00",
    currency: session.currency,
    packageId: session.metadata?.packageId,
    type: session.metadata?.type,
    demand_id_match: session.metadata?.demandId === demand.id,
    price_ref: redact(String(session.metadata?.priceId || "")),
    checkout_url_host: "checkout.stripe.com",
    not_99_ron: session.amount_total !== 9900,
    not_guest_offer: session.metadata?.priceId !== guest,
  };
  writeFileSync(
    resolve("docs/internal/product/capital-disponibil-v2-staging-checkout-session-2026-10-15.json"),
    `${JSON.stringify(out, null, 2)}\n`,
  );
  console.log(JSON.stringify(out, null, 2));
  // Keep URL in temp for browser pay (not committed)
  writeFileSync(
    join(tmpdir(), "qe-cdv2-checkout-pay.json"),
    JSON.stringify({
      sessionId,
      url: body?.url,
      demandId: demand.id,
      buyerId: created.user.id,
      email,
      password,
    }),
    "utf8",
  );
  console.log("OK checkout-session-49-proof");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
