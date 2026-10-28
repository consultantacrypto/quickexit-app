import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEALER_AMOUNT_MINOR,
  DEALER_AMOUNT_RON,
  DEALER_CAPACITY_CARS,
  DEALER_CHECKOUT_TYPE,
  DEALER_PACKAGE_ID,
  classifyDealerCheckoutSession,
  classifyDealerWebhookSession,
  isDealerCheckoutSessionId,
  isStripeCheckoutUrl,
  resolveDealerReturnOrigin,
} from "../lib/dealerSubscription";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

assert(DEALER_AMOUNT_RON === 600, "confirmed amount is 600 RON");
assert(DEALER_AMOUNT_MINOR === 60000, "stripe minor units are 60000");
assert(DEALER_CAPACITY_CARS === 10, "capacity is about 10 cars");

const paid = {
  mode: "payment",
  status: "complete",
  payment_status: "paid",
  amount_total: 60000,
  currency: "ron",
  metadata: { type: DEALER_CHECKOUT_TYPE, packageId: DEALER_PACKAGE_ID },
  customer_details: { email: "parc@example.com" },
};

const success = classifyDealerCheckoutSession(paid);
assert(success.state === "success" && success.email === "parc@example.com", "paid session confirms");
assert(classifyDealerCheckoutSession({ ...paid, amount_total: 60100 }).state === "mismatch", "wrong amount rejected");
assert(classifyDealerCheckoutSession({ ...paid, currency: "eur" }).state === "mismatch", "wrong currency rejected");
assert(classifyDealerCheckoutSession({ ...paid, mode: "subscription" }).state === "mismatch", "recurring mode rejected");
assert(
  classifyDealerCheckoutSession({ ...paid, payment_status: "unpaid", status: "complete" }).state === "pending",
  "unpaid session stays pending",
);
assert(classifyDealerWebhookSession(paid).action === "paid", "webhook acks paid");
assert(classifyDealerWebhookSession({ ...paid, amount_total: 100 }).action === "rejected", "webhook rejects amount");

assert(isDealerCheckoutSessionId("cs_live_abc123"), "live session id accepted");
assert(isDealerCheckoutSessionId("cs_test_abc123"), "test session id accepted");
assert(!isDealerCheckoutSessionId("pi_live_abc"), "non-session id rejected");
assert(isStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_live_abc"), "stripe checkout url accepted");
assert(!isStripeCheckoutUrl("https://evil.example/checkout"), "foreign checkout url rejected");

const local = resolveDealerReturnOrigin(new Headers({ host: "localhost:3000" }));
assert(local === "http://localhost:3000", `local origin ${local}`);
const prod = resolveDealerReturnOrigin(
  new Headers({ host: "www.quickexit.ro", "x-forwarded-proto": "https" }),
);
assert(prod === "https://www.quickexit.ro", `prod origin ${prod}`);
const evil = resolveDealerReturnOrigin(new Headers({ host: "evil.example" }));
assert(!evil.includes("evil.example"), "untrusted host falls back");

const page = readFileSync(resolve("app/[locale]/dealeri/page.tsx"), "utf8");
const button = readFileSync(resolve("app/[locale]/dealeri/DealerSubscribeButton.tsx"), "utf8");
const route = readFileSync(resolve("app/api/stripe/dealer-checkout/route.ts"), "utf8");
const webhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
const middleware = readFileSync(resolve("middleware.ts"), "utf8");
const nextConfig = readFileSync(resolve("next.config.ts"), "utf8");

const copy = `${page}\n${button}`;
assert(copy.includes("600 RON") && page.includes("aproximativ"), "page states the confirmed offer");
assert(!copy.includes("99 RON") && !copy.includes("179 RON"), "page does not invent other prices");
assert(!/lunar|\/lună|pe lună|anual/i.test(copy), "page does not invent a billing interval");
assert(!route.includes("payment_method_types"), "dealer checkout uses dynamic payment methods");
assert(!route.includes("body.amount") && !route.includes("price_data"), "client cannot set the amount");
assert(route.includes("ensureDealerPrice"), "checkout resolves the catalog price");
assert(route.includes("mode: \"payment\""), "checkout is a one-time payment");
assert(webhook.includes("classifyDealerWebhookSession"), "webhook recognizes the dealer package");
assert(middleware.includes('pathname === "/dealeri"'), "/dealeri skips locale redirect");
assert(nextConfig.includes('source: "/dealeri"'), "/dealeri rewrites to the Romanian page");

console.log("OK dealer subscription");
