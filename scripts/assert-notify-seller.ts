import {
  classifySellerNotifySkip,
  hasEmailProviderConfig,
  isSellerEmailSendEnabled,
  notificationStatusFromResult,
} from "../lib/notifySeller";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

assert(isSellerEmailSendEnabled() === (process.env.QUICKEXIT_ENABLE_SELLER_EMAIL === "1"), "flag is explicit");

const skip = classifySellerNotifySkip();
if (!hasEmailProviderConfig()) {
  assert(skip === "no_provider", "missing provider classifies as no_provider");
  assert(
    notificationStatusFromResult({ ok: false, reason: "no_provider" }) ===
      "skipped_no_provider",
    "no provider status",
  );
} else {
  assert(skip === "disabled" || skip === "no_provider", "configured provider still skippable");
}

assert(
  notificationStatusFromResult({ ok: true, reason: "sent", channel: "resend" }) === "sent",
  "sent status",
);
assert(
  notificationStatusFromResult({ ok: false, reason: "send_failed" }) === "failed",
  "failed status",
);
assert(
  notificationStatusFromResult({ ok: false, reason: "disabled" }) === "skipped_disabled",
  "disabled status",
);

console.log("OK notify-seller");
