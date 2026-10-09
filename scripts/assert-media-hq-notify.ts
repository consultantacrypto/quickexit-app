/**
 * Phase 3B — Media HQ paid→queued notification (best-effort, Resend).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildMediaHqAlertEmail,
  notifyMediaHqPaidQueued,
  parseMediaHqAlertEmails,
  resolveMediaHqUrl,
} from "../lib/notifyMediaHq";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

// --- parse recipients ---
assert(parseMediaHqAlertEmails("").length === 0, "empty");
assert(parseMediaHqAlertEmails(null).length === 0, "null");
assert(parseMediaHqAlertEmails("  a@x.com , b@y.com ").join(",") === "a@x.com,b@y.com", "parse");
assert(parseMediaHqAlertEmails("not-an-email,ok@test.com").join(",") === "ok@test.com", "invalid dropped");
assert(parseMediaHqAlertEmails("ok@test.com,ok@test.com").length === 1, "dedupe");

const payload = {
  mediaOrderId: "11111111-1111-4111-8111-111111111111",
  listingId: "22222222-2222-4222-8222-222222222222",
  listingTitle: "Test Listing <script>",
  package: "stories_4",
  amountRon: 449,
  listingValueEur: 120000,
  valueTier: "100k_500k",
  paidAt: "2026-10-09T12:00:00.000Z",
  locale: "ro",
  source: "publish_checkout",
  editorialStatus: "queued",
};

const email = buildMediaHqAlertEmail({
  from: "QuickExit <ops@example.com>",
  recipients: ["ops@example.com"],
  payload: { ...payload, hqUrl: "https://www.quickexit.ro/ro/hq-admin/media" },
});
assert(email.subject.includes("4 Stories"), "subject package");
assert(email.subject.includes("Comandă nouă plătită"), "subject ro");
assert(email.text.includes(payload.listingId), "body listing id");
assert(email.text.includes("449 RON"), "body amount");
assert(email.text.includes("hq-admin/media"), "body hq link");
assert(!email.text.includes("<script>"), "sanitized title");
assert(!email.text.includes("sk_live"), "no secrets");

async function main() {
  // A. newly paid + queued → send once (mocked Resend)
  let sendCount = 0;
  const okFetch: typeof fetch = async () => {
    sendCount += 1;
    return new Response("{}", { status: 200 });
  };
  const envOk = {
    MEDIA_HQ_ALERT_EMAILS: "ops@example.com",
    RESEND_API_KEY: "re_test",
    RESEND_FROM: "QuickExit <ops@example.com>",
  };
  const sent = await notifyMediaHqPaidQueued(
    { newlyPaid: true, editorialStatus: "queued", payload },
    { fetchImpl: okFetch, env: envOk },
  );
  assert(sent.sent && sent.attempted && sent.reason === "sent", "A sent");
  assert(sendCount === 1, "A one send");

  // B. already paid / not newly paid → no send
  sendCount = 0;
  const dup = await notifyMediaHqPaidQueued(
    { newlyPaid: false, editorialStatus: "queued", payload },
    { fetchImpl: okFetch, env: envOk },
  );
  assert(dup.skipped && dup.reason === "not_newly_paid", "B skip not newly paid");
  assert(sendCount === 0, "B no send");

  // C/D same as B for duplicate paths — outcome already_paid maps to newlyPaid false
  const asyncDup = await notifyMediaHqPaidQueued(
    { newlyPaid: false, editorialStatus: "queued", payload },
    { fetchImpl: okFetch, env: envOk },
  );
  assert(asyncDup.reason === "not_newly_paid", "C/D idempotent");

  // E. failed / not queued
  const notQueued = await notifyMediaHqPaidQueued(
    { newlyPaid: true, editorialStatus: "failed", payload },
    { fetchImpl: okFetch, env: envOk },
  );
  assert(notQueued.reason === "not_queued", "E not queued");

  // G. missing env
  const missing = await notifyMediaHqPaidQueued(
    { newlyPaid: true, editorialStatus: "queued", payload },
    {
      fetchImpl: okFetch,
      env: { RESEND_API_KEY: "re_test", RESEND_FROM: "QuickExit <ops@example.com>" },
    },
  );
  assert(missing.skipped && missing.reason === "missing_recipients", "G missing recipients");

  // I. invalid recipients
  const invalid = await notifyMediaHqPaidQueued(
    { newlyPaid: true, editorialStatus: "queued", payload },
    {
      fetchImpl: okFetch,
      env: {
        MEDIA_HQ_ALERT_EMAILS: "not-valid",
        RESEND_API_KEY: "re_test",
        RESEND_FROM: "QuickExit <ops@example.com>",
      },
    },
  );
  assert(invalid.skipped && invalid.reason === "invalid_recipients", "I invalid");

  // H. Resend failure — does not throw
  const failFetch: typeof fetch = async () => new Response("nope", { status: 500 });
  const failed = await notifyMediaHqPaidQueued(
    { newlyPaid: true, editorialStatus: "queued", payload },
    { fetchImpl: failFetch, env: envOk },
  );
  assert(failed.attempted && !failed.sent && failed.reason === "send_failed", "H send failed");

  // no provider
  const noProv = await notifyMediaHqPaidQueued(
    { newlyPaid: true, editorialStatus: "queued", payload },
    { fetchImpl: okFetch, env: { MEDIA_HQ_ALERT_EMAILS: "ops@example.com" } },
  );
  assert(noProv.reason === "no_provider", "no provider skip");

  assert(resolveMediaHqUrl({ env: {} }).includes("/ro/hq-admin/media"), "hq url default");

  // Webhook wiring + safety
  const webhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
  assert(webhook.includes("notifyMediaHqPaidQueued"), "webhook imports notify");
  assert(webhook.includes('paid.outcome === "updated"'), "only on newly paid");
  assert(webhook.includes("Media HQ notify"), "logs notify result");
  assert(
    webhook.indexOf("markMediaOrderPaid") < webhook.indexOf("notifyMediaHqPaidQueued"),
    "fulfill before notify",
  );
  const notifyBlock = webhook.slice(webhook.indexOf('paid.outcome === "updated"'));
  assert(notifyBlock.includes("try {"), "notify try");
  assert(notifyBlock.includes("catch"), "notify catch");
  assert(
    !notifyBlock.includes('return fail("media_fulfillment_failed"'),
    "notify does not fail webhook",
  );

  const helper = readFileSync(resolve("lib/notifyMediaHq.ts"), "utf8");
  assert(helper.includes("MEDIA_HQ_ALERT_EMAILS"), "env contract");
  assert(helper.includes("RESEND_API_KEY"), "reuses Resend");
  assert(!helper.includes("NEXT_PUBLIC_MEDIA_HQ"), "no public recipients");
  assert(!helper.includes("consultantacrypto"), "no hardcoded emails");

  const checkout = readFileSync(resolve("app/api/stripe/checkout/route.ts"), "utf8");
  assert(!checkout.includes("notifyMediaHq"), "checkout does not notify");

  console.log("OK media-hq-notify");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
