/**
 * Validate Staging Stripe TEST wiring for demand_standard_30d @ 49 RON.
 * Never prints secret keys or full Price IDs beyond prefix/suffix.
 */
import Stripe from "stripe";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

const EXPECTED_RON = 49;

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
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}

function redactId(id: string): string {
  if (id.length < 12) return "<short>";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

async function main() {
  const staging = loadEnvFile(resolve(".env.staging.local"));
  const local = loadEnvFile(resolve(".env.local"));
  const helperPath = join(tmpdir(), "qe-demand-standard-49-test-price.json");
  const helper = existsSync(helperPath)
    ? (JSON.parse(readFileSync(helperPath, "utf8")) as {
        priceId?: string;
        env?: Record<string, string>;
      })
    : null;

  const priceFromEnv =
    process.env.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    staging.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    local.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    helper?.env?.STRIPE_PRICE_DEMAND_STANDARD_49_RON ||
    helper?.priceId ||
    "";

  if (!priceFromEnv.startsWith("price_")) {
    fail("STRIPE_PRICE_DEMAND_STANDARD_49_RON missing or invalid (expect price_…)");
  }

  process.env.STRIPE_PRICE_DEMAND_STANDARD_49_RON = priceFromEnv;

  const secret =
    process.env.STRIPE_SECRET_KEY ||
    staging.STRIPE_SECRET_KEY ||
    local.STRIPE_SECRET_KEY ||
    "";
  if (!secret.startsWith("sk_test_")) fail("STRIPE_SECRET_KEY must be sk_test_");

  const { getDemandCheckoutPackageId, getPackageByPackageId, getPriceIdForPackageId } =
    await import("../lib/stripePackages");

  const resolved = getPriceIdForPackageId("demand_standard_30d");
  if (!resolved || resolved !== priceFromEnv) {
    fail("code catalog does not resolve demand_standard_30d to configured TEST Price");
  }
  const pkg = getPackageByPackageId("demand_standard_30d");
  if (!pkg || pkg.amountRon !== EXPECTED_RON) fail("catalog amount must be 49 RON");

  const stripe = new Stripe(secret, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2023-10-16" as any,
  });

  const price = await stripe.prices.retrieve(priceFromEnv, { expand: ["product"] });
  if (price.livemode) fail("Price is LIVE — refused (TEST only)");
  if (String(price.currency).toLowerCase() !== "ron") fail("currency must be ron");
  if (price.type !== "one_time") fail("price must be one_time");
  if (price.unit_amount !== EXPECTED_RON * 100) {
    fail(`unit_amount expected ${EXPECTED_RON * 100}, got ${price.unit_amount}`);
  }

  const product =
    typeof price.product === "string"
      ? await stripe.products.retrieve(price.product)
      : price.product;
  if (!product || ("deleted" in product && product.deleted)) fail("product missing");
  if ("livemode" in product && product.livemode) fail("product is LIVE");

  const offerPrice =
    process.env.STRIPE_PRICE_OFERTA_49_RON ||
    staging.STRIPE_PRICE_OFERTA_49_RON ||
    local.STRIPE_PRICE_OFERTA_49_RON ||
    "";
  if (offerPrice && offerPrice === priceFromEnv) {
    fail("demand v2 Price must not equal Guest Offer Price");
  }

  const legacy99 =
    process.env.STRIPE_PRICE_CERERE_99_RON ||
    staging.STRIPE_PRICE_CERERE_99_RON ||
    local.STRIPE_PRICE_CERERE_99_RON ||
    "";
  if (legacy99 && legacy99 === priceFromEnv) {
    fail("demand v2 Price must not equal legacy 99 Price");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        packageId: getDemandCheckoutPackageId(),
        expected_minor: EXPECTED_RON * 100,
        amount_ron: EXPECTED_RON,
        currency: price.currency,
        livemode: price.livemode,
        price_ref: redactId(price.id),
        product_name:
          product && "name" in product ? String(product.name).slice(0, 80) : null,
        product_metadata_packageId:
          product && "metadata" in product ? product.metadata?.packageId ?? null : null,
        guest_offer_collision: false,
        legacy_99_collision: false,
      },
      null,
      2,
    ),
  );
  console.log("OK verify-capital-disponibil-v2-stripe-test");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
