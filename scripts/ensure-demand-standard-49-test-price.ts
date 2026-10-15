/**
 * Capital Disponibil v2 — ensure a DEDICATED Stripe TEST Product/Price for 49 RON.
 * Uses sk_test_ only. Does NOT reuse Guest Offer 49 RON price by amount.
 * Writes IDs to %TEMP%/qe-demand-standard-49-test-price.json (not committed).
 */
import Stripe from "stripe";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCT_NAME = "QuickExit — Capital Disponibil";
const PACKAGE_ID = "demand_standard_30d";
const AMOUNT_RON = 49;
const DURATION_DAYS = 30;

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim().replace(/^"|"$/g, "");
    out[key] = value;
  }
  return out;
}

function loadTestKey(): string {
  const merged = {
    ...loadEnvFile(resolve(".env.local")),
    ...loadEnvFile(resolve(".env.staging.local")),
  };
  const v = (merged.STRIPE_SECRET_KEY || "").trim();
  if (!v.startsWith("sk_test_")) fail("must use sk_test_ (no live keys)");
  return v;
}

async function main() {
  const stripe = new Stripe(loadTestKey(), {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2023-10-16" as any,
  });

  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find(
    (p) => !p.livemode && p.name === PRODUCT_NAME && p.metadata?.packageId === PACKAGE_ID,
  );
  if (!product) {
    product = await stripe.products.create({
      name: PRODUCT_NAME,
      description:
        "Publică o cerere de cumpărare verificată și primește oferte de la selleri care au active potrivite.",
      metadata: {
        type: "demand",
        packageId: PACKAGE_ID,
        duration_days: String(DURATION_DAYS),
        purpose: "capital_disponibil_v2_test",
      },
    });
    console.log(`created_product id=${product.id}`);
  } else {
    console.log(`reuse_product id=${product.id}`);
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 20,
  });
  let price = prices.data.find(
    (p) =>
      !p.livemode &&
      p.type === "one_time" &&
      String(p.currency).toLowerCase() === "ron" &&
      p.unit_amount === AMOUNT_RON * 100 &&
      p.metadata?.packageId === PACKAGE_ID,
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "ron",
      unit_amount: AMOUNT_RON * 100,
      nickname: `Capital Disponibil ${AMOUNT_RON} RON / ${DURATION_DAYS}d`,
      metadata: {
        type: "demand",
        packageId: PACKAGE_ID,
        duration_days: String(DURATION_DAYS),
        purpose: "capital_disponibil_v2_test",
      },
    });
    console.log(`created_price id=${price.id} amount_ron=${AMOUNT_RON}`);
  } else {
    console.log(`reuse_price id=${price.id} amount_ron=${AMOUNT_RON}`);
  }

  if (price.id === process.env.STRIPE_PRICE_OFERTA_49_RON) {
    fail("refusing to use Guest Offer price id for Capital Disponibil v2");
  }

  const out = {
    productId: product.id,
    priceId: price.id,
    amountRon: AMOUNT_RON,
    currency: "ron",
    packageId: PACKAGE_ID,
    durationDays: DURATION_DAYS,
    livemode: false,
    env: {
      NEXT_PUBLIC_STRIPE_PRICE_DEMAND_STANDARD_49_RON: price.id,
      STRIPE_PRICE_DEMAND_STANDARD_49_RON: price.id,
    },
  };

  const path = resolve(process.env.TEMP || ".", "qe-demand-standard-49-test-price.json");
  writeFileSync(path, JSON.stringify(out, null, 2));
  console.log(`OK written=${path}`);
  console.log(`SET NEXT_PUBLIC_STRIPE_PRICE_DEMAND_STANDARD_49_RON=${price.id}`);
  console.log(`SET STRIPE_PRICE_DEMAND_STANDARD_49_RON=${price.id}`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
