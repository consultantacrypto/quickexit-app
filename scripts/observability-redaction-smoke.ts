import {
  sanitizeSentryEvent,
} from "../lib/observability/redaction";

const event = {
  request: {
    headers: {
      authorization: "Bearer secret",
      "content-type": "application/json",
      "stripe-signature": "t=1,v1=abc",
    },
    cookies: "session=abc",
    data: { password: "x", phone: "0712", userId: "u1", note: "ok" },
  },
  user: { id: "user-1", email: "a@b.c", ip_address: "1.2.3.4" },
  extra: { service_role: "sr_key", listingId: "L1" },
  breadcrumbs: {
    values: [{ message: "Authorization: Bearer abc", data: { token: "t" } }],
  },
};

const out = sanitizeSentryEvent(event);
if (!out) throw new Error("event dropped unexpectedly");
if (out.request?.headers?.authorization !== "[Redacted]") {
  throw new Error("auth not redacted");
}
if (out.request?.headers?.["stripe-signature"] !== "[Redacted]") {
  throw new Error("sig not redacted");
}
if (out.user && "email" in out.user && out.user.email) {
  throw new Error("email leaked");
}
if (out.extra?.service_role !== "[Redacted]") {
  throw new Error("service role leaked");
}
if (out.extra?.listingId !== "L1") {
  throw new Error("listingId wrongly redacted");
}
if (out.request?.data && typeof out.request.data === "object") {
  const data = out.request.data as Record<string, unknown>;
  if (data.password !== "[Redacted]" || data.phone !== "[Redacted]") {
    throw new Error("PII fields not redacted");
  }
}

console.log("REDACTION_PASS");
