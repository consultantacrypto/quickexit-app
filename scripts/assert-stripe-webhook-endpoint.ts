import { CANONICAL_STRIPE_WEBHOOK_URL, classifyWebhookProbeStatus } from "../lib/stripeListingFulfillment";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

async function probe(url: string): Promise<number> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
    redirect: "manual",
  });
  return res.status;
}

async function main() {
  const canonical = await probe(CANONICAL_STRIPE_WEBHOOK_URL);
  const canonicalClass = classifyWebhookProbeStatus(canonical);
  console.log(
    JSON.stringify({
      canonical: CANONICAL_STRIPE_WEBHOOK_URL,
      status: canonical,
      class: canonicalClass,
    }),
  );
  if (canonicalClass === "redirect") {
    fail(`canonical webhook redirected (${canonical}); Stripe will not deliver`);
  }
  if (canonicalClass !== "direct") {
    fail(`canonical webhook unexpected status ${canonical}`);
  }

  const apex = "https://quickexit.ro/api/stripe/webhook";
  const apexStatus = await probe(apex);
  const apexClass = classifyWebhookProbeStatus(apexStatus);
  console.log(JSON.stringify({ apex, status: apexStatus, class: apexClass }));
  if (apexClass === "redirect") {
    console.log("WARN apex webhook redirects; do not use it as the Stripe destination");
  }
  console.log("PASS assert-stripe-webhook-endpoint");
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : "probe failed");
});
