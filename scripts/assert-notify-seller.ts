import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifySellerNotifySkip,
  hasEmailProviderConfig,
  notificationErrorCodeFromResult,
  notificationStatusFromResult,
  notifySellerOfInquiry,
  sanitizeEmailHeaderValue,
  buildInquiryEmailPayload,
} from "../lib/notifySeller";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const emptyEnv = {};
assert(!hasEmailProviderConfig({ env: emptyEnv }), "no provider without env");
assert(classifySellerNotifySkip({ env: emptyEnv }) === "no_provider", "skip no_provider");

const smtpOnly = {
  SMTP_HOST: "smtp.example.com",
  SMTP_FROM: "alerts@example.com",
  SMTP_USER: "alerts",
};
assert(!hasEmailProviderConfig({ env: smtpOnly }), "smtp names are not a provider");
assert(classifySellerNotifySkip({ env: smtpOnly }) === "no_provider", "smtp-only is no_provider");
assert(
  classifySellerNotifySkip({ env: { ...smtpOnly, QUICKEXIT_ENABLE_SELLER_EMAIL: "1" } }) ===
    "no_provider",
  "smtp plus enable flag still has no Resend provider",
);

const injected = sanitizeEmailHeaderValue("Cadillac\r\nBcc: attacker@example.com");
assert(!injected.includes("\r"), "CR stripped from header value");
assert(!injected.includes("\n"), "LF stripped from header value");
assert(!/^Bcc:/m.test(injected), "injected header line flattened");

const payload = buildInquiryEmailPayload({
  from: "QuickExit <alerts@example.com>",
  recipient: "seller@example.com",
  listingTitle: "Watch <script>alert(1)</script>\r\nBcc: evil@x.test",
});
assert(!("html" in payload), "email payload is text-only, no HTML");
assert(!payload.text.includes("<script>"), "listing title markup not treated as HTML");
assert(!payload.subject.includes("<"), "angle brackets stripped from subject");
assert(!payload.subject.includes("\n"), "subject has no newline");
assert(!payload.text.includes("+407"), "buyer phone is not in the email");
assert(!payload.text.includes("Pot vedea"), "buyer message is not in the email");
assert(payload.to.join(",") === "seller@example.com", "recipient is the provided Auth email only");
assert(!payload.text.toLowerCase().includes("http://"), "email body does not add buyer links");

async function main() {
const missingRecipient = await notifySellerOfInquiry({
  sellerEmail: null,
  listingTitle: "Test",
  listingId: "50e8decd-635a-46f7-908e-2ac1fddf8ac6",
});
assert(missingRecipient.ok === false && missingRecipient.reason === "missing_recipient", "missing recipient");
assert(
  notificationStatusFromResult(missingRecipient) === "skipped_missing_recipient",
  "missing recipient status",
);

const noProvider = await notifySellerOfInquiry(
  {
    sellerEmail: "seller@example.com",
    listingTitle: "Test",
    listingId: "50e8decd-635a-46f7-908e-2ac1fddf8ac6",
  },
  { env: {} },
);
assert(noProvider.ok === false && noProvider.reason === "no_provider", "no provider result");

const disabled = await notifySellerOfInquiry(
  {
    sellerEmail: "seller@example.com",
    listingTitle: "Test",
    listingId: "50e8decd-635a-46f7-908e-2ac1fddf8ac6",
  },
  {
    env: {
      RESEND_API_KEY: "re_test",
      RESEND_FROM: "QuickExit <alerts@example.com>",
    },
  },
);
assert(disabled.ok === false && disabled.reason === "disabled", "send flag off");

let sentCalls = 0;
let capturedBody = "";
const success = await notifySellerOfInquiry(
  {
    sellerEmail: "seller@example.com",
    listingTitle: "Cadillac",
    listingId: "50e8decd-635a-46f7-908e-2ac1fddf8ac6",
  },
  {
    env: {
      RESEND_API_KEY: "re_test",
      RESEND_FROM: "QuickExit <alerts@example.com>",
      QUICKEXIT_ENABLE_SELLER_EMAIL: "1",
    },
    fetchImpl: async (_url, init) => {
      sentCalls += 1;
      capturedBody = String(init?.body ?? "");
      return new Response("{}", { status: 200 });
    },
  },
);
assert(success.ok && success.reason === "sent", "provider accepted");
assert(notificationStatusFromResult(success) === "sent", "sent status");
assert(notificationErrorCodeFromResult(success) === null, "no error code on success");
assert(sentCalls === 1, "one provider call");
assert(!capturedBody.includes("html"), "provider JSON has no html key");
assert(!capturedBody.includes("buyer"), "provider JSON has no buyer fields");

const failed = await notifySellerOfInquiry(
  {
    sellerEmail: "seller@example.com",
    listingTitle: "Cadillac",
    listingId: "50e8decd-635a-46f7-908e-2ac1fddf8ac6",
  },
  {
    env: {
      RESEND_API_KEY: "re_test",
      RESEND_FROM: "QuickExit <alerts@example.com>",
      QUICKEXIT_ENABLE_SELLER_EMAIL: "1",
    },
    fetchImpl: async () => new Response("nope", { status: 500 }),
  },
);
assert(failed.ok === false && failed.reason === "send_failed", "provider rejection");
assert(notificationStatusFromResult(failed) === "failed", "failed status");
assert(notificationErrorCodeFromResult(failed) === "send_failed", "error code stored");

const inquiryRoute = readFileSync(resolve("app/api/listings/[id]/inquiry/route.ts"), "utf8");
assert(inquiryRoute.includes("auth.admin.getUserById"), "recipient from Auth admin record");
assert(!/rawBody.*sellerEmail|body\.sellerEmail|seller_email/.test(inquiryRoute), "client cannot supply recipient");
assert(inquiryRoute.includes('notification_status: "sending"'), "CAS claim before send");
assert(inquiryRoute.includes('eq("notification_status", "pending")'), "CAS only claims pending");
assert(inquiryRoute.includes("isSameOriginMutationRequest"), "cookie mutation requires same origin");
assert(inquiryRoute.includes("LISTING_INQUIRY_CONSENT_VERSION"), "server owns consent version");
assert(!/buyer_id:|seller_id:/.test(inquiryRoute), "insert does not take client ownership ids");
assert(
  inquiryRoute.indexOf(".insert(") < inquiryRoute.indexOf("await notifySellerOfInquiry"),
  "persist before notify",
);
assert(
  /return NextResponse\.json\(\s*\{\s*success: true,\s*persisted: true\s*\},/.test(inquiryRoute),
  "success payload has no notification or provider details",
);
assert(!inquiryRoute.includes("notified,"), "buyer response omits notified");
assert(!/jsonOk[\s\S]{0,200}notification_status/.test(inquiryRoute), "jsonOk omits notification_status");
assert(!/provider rejected send[\s\S]*NextResponse/.test(inquiryRoute), "provider details stay server-side");

console.log("OK notify-seller");
}

void main();
