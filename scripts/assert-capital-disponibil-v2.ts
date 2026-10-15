/**
 * Static assertions for Capital Disponibil v2 (49 RON / 30d).
 * No network, no secrets, no DB mutations.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getDemandCheckoutPackageId,
  getPackageByPackageId,
  getPriceIdForPackageId,
} from "../lib/stripePackages";
import {
  DEMAND_STANDARD_DURATION_DAYS,
  DEMAND_STANDARD_PACKAGE_ID,
  DEMAND_STANDARD_PRICE_RON,
  buildDemandActivationPayload,
  isDemandEffectivelyActive,
} from "../lib/demandLifecycle";
import { formatDemandRequirementChips } from "../lib/demandRequirements";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`FAIL ${msg}`);
    process.exit(1);
  }
}

const packagesSrc = readFileSync(resolve("lib/stripePackages.ts"), "utf8");
assert(packagesSrc.includes("demand_standard_30d"), "package id in stripePackages");
assert(packagesSrc.includes("STRIPE_PRICE_DEMAND_STANDARD_49_RON"), "new env key");
assert(
  !packagesSrc.includes("NEXT_PUBLIC_STRIPE_PRICE_DEMAND_STANDARD_49_RON"),
  "demand v2 price must remain server-only",
);
assert(packagesSrc.includes("STRIPE_PRICE_CERERE_99_RON"), "legacy 99 kept");
assert(packagesSrc.includes("PRICE_OFERTA_49_RON"), "guest offer kept separate");

assert(getDemandCheckoutPackageId() === DEMAND_STANDARD_PACKAGE_ID, "canonical checkout package");
const pkg = getPackageByPackageId(DEMAND_STANDARD_PACKAGE_ID);
assert(pkg, "demand_standard_30d package exists");
assert(pkg!.amountRon === DEMAND_STANDARD_PRICE_RON, "49 RON amount");
assert(pkg!.duration.kind === "days" && pkg!.duration.value === DEMAND_STANDARD_DURATION_DAYS, "30d");

const legacy = getPackageByPackageId("demand");
assert(legacy && legacy.amountRon === 99, "legacy demand 99 still mapped");

const offer = getPackageByPackageId("offer");
assert(offer && offer.amountRon === 49, "guest offer still 49");
assert(
  getPriceIdForPackageId(DEMAND_STANDARD_PACKAGE_ID) !== getPriceIdForPackageId("offer") ||
    getPriceIdForPackageId(DEMAND_STANDARD_PACKAGE_ID)?.startsWith("PRICE_"),
  "demand v2 price id must not silently equal offer unless both placeholders",
);

const active = isDemandEffectivelyActive({
  status: "active",
  expires_at: new Date(Date.now() + 86400000).toISOString(),
});
assert(active, "future expires_at still active");

const expired = isDemandEffectivelyActive({
  status: "active",
  expires_at: new Date(Date.now() - 1000).toISOString(),
});
assert(!expired, "past expires_at not effectively active");

const payload = buildDemandActivationPayload({
  expiresAt: new Date().toISOString(),
  packageId: DEMAND_STANDARD_PACKAGE_ID,
  buyerVerified: true,
});
assert(payload.status === "active", "activation status");
assert(payload.paid === true, "activation paid");
assert(typeof payload.activated_at === "string", "activated_at set");
assert(payload.buyer_verified === true, "buyer_verified set");

const chips = formatDemandRequirementChips(
  { locatie: "București", an_minim: "2021" },
  "ro",
  4,
);
assert(chips.length === 2, "requirements chips");
assert(chips.some((c) => c.key === "locatie"), "location chip");

const migration = readFileSync(
  resolve("supabase/migrations/20261015140000_capital_disponibil_v2_lifecycle.sql"),
  "utf8",
);
assert(migration.includes("ADD COLUMN IF NOT EXISTS paid"), "migration paid");
assert(migration.includes("activated_at"), "migration activated_at");
assert(migration.includes("expires_at"), "migration expires_at");
assert(migration.includes("buyer_verified"), "migration buyer_verified");
assert(!/^\s*DROP\s+COLUMN\b/im.test(migration), "no destructive drop column");

const checkout = readFileSync(resolve("app/api/stripe/checkout/route.ts"), "utf8");
assert(checkout.includes("getDemandCheckoutPackageId"), "checkout uses v2 package");
assert(checkout.includes("DEMAND_STANDARD_PACKAGE_ID"), "checkout metadata package");

const webhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
assert(webhook.includes('type === "demand"'), "webhook demand branch");
assert(webhook.includes("expectedDemandMinor"), "demand amount check");

const posteaza = readFileSync(
  resolve("app/[locale]/posteaza-cerere/PosteazaCerereClient.tsx"),
  "utf8",
);
assert(posteaza.includes("DEMAND_STANDARD_PRICE_RON"), "UI uses 49 constant");
assert(!posteaza.includes("99 RON"), "no hardcoded 99 in create flow");

const navRo = readFileSync(resolve("messages/ro.json"), "utf8");
const navEn = readFileSync(resolve("messages/en.json"), "utf8");
assert(navRo.includes('"buyerOffers": "Capital Disponibil"'), "nav terminology RO");
assert(navRo.includes("Publică ce vrei să cumperi"), "primary CTA RO");
assert(navEn.includes("Post what you want to buy"), "primary CTA EN");
assert(
  !navRo.includes("Publică ce vrei să cumperi — 49 RON"),
  "homepage/discovery CTAs must not show early 49 RON (RO)",
);
assert(
  !navEn.includes("Post what you want to buy — 49 RON"),
  "homepage/discovery CTAs must not show early 49 RON (EN)",
);
assert(navRo.includes("Publică cererea — 49 RON / 30 zile"), "final-step price RO");
assert(navEn.includes("Publish request — 49 RON / 30 days"), "final-step price EN");
assert(
  navRo.includes('"price": "49 RON"') && navRo.includes('"capitalRequest"'),
  "tarife capitalRequest price kept",
);

const capitalCopy = readFileSync(resolve("lib/capitalDisponibilContent.ts"), "utf8");
assert(
  !capitalCopy.includes("Post what you want to buy — 49 RON"),
  "directory CTA must not show early 49 RON (EN)",
);
assert(
  !capitalCopy.includes("Publică ce vrei să cumperi — 49 RON"),
  "directory CTA must not show early 49 RON (RO)",
);
assert(posteaza.includes("finalPublishTitle"), "final step uses i18n publish title");
assert(posteaza.includes("demand_checkout_started"), "checkout funnel event");
assert(posteaza.includes("demand_start"), "start funnel event");
assert(posteaza.includes("demand_form_progress"), "form progress funnel event");

console.log("OK assert-capital-disponibil-v2");
