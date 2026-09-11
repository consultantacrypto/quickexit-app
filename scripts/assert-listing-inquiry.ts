import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  inquirySuccessCopy,
  isListingInquiryId,
  isSafePublicInquiryError,
  sanitizeInquiryMessage,
  validateListingInquiryBody,
  checkInquiryRateLimit,
  inquiryNeedsHqFallback,
  isPublicInquirableListing,
  isPostgresUniqueViolation,
  parseHqInquiryPatch,
  INQUIRY_RATE_LIMIT_SCOPE,
  INQUIRY_AUTHORITATIVE_RATE_SCOPE,
  LISTING_INQUIRY_CONSENT_VERSION,
  wouldViolateDuplicateWindow,
  wouldViolateHourlyCap,
  isSameOriginMutationRequest,
  parseHqInquiryListQuery,
  canSellerTransitionInquiry,
  MAX_INQUIRY_MESSAGE_LENGTH,
} from "../lib/listingInquiry";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const listingId = "50e8decd-635a-46f7-908e-2ac1fddf8ac6";

assert(isListingInquiryId(listingId), "valid uuid listing id");
assert(!isListingInquiryId(""), "empty id rejected");
assert(!isListingInquiryId("not-a-uuid"), "malformed id rejected");
assert(!isListingInquiryId(`${listingId}/../x`), "path-like id rejected");
assert(
  !validateListingInquiryBody("not-a-uuid", { phone: "0722123456", consent: true }).ok,
  "malformed listing id produces validation error",
);

const valid = validateListingInquiryBody(listingId, {
  phone: "0722123456",
  message: "  Pot vedea activul?  ",
  consent: true,
  seller_id: "00000000-0000-4000-8000-000000000000",
  buyer_id: "11111111-1111-4111-8111-111111111111",
  status: "closed",
});
assert(valid.ok, "valid inquiry body ignores spoofed ids");
if (valid.ok) {
  assert(valid.data.phone === "+40722123456", "phone normalized");
  assert(valid.data.phone.length >= 8 && valid.data.phone.length <= 20, "normalized phone length");
  assert(/^\+\d+$/.test(valid.data.phone), "phone is plus and digits");
  assert(valid.data.message === "Pot vedea activul?", "message trimmed");
  assert(!("seller_id" in valid.data), "seller_id not accepted from body");
}

const noPhone = validateListingInquiryBody(listingId, {
  phone: "abc",
  consent: true,
});
assert(!noPhone.ok && noPhone.error_code === "invalid_phone", "invalid phone");

const markupPhone = validateListingInquiryBody(listingId, {
  phone: "<script>alert(1)</script>",
  consent: true,
});
assert(!markupPhone.ok && markupPhone.error_code === "invalid_phone", "markup phone rejected");

const shortPhone = validateListingInquiryBody(listingId, {
  phone: "+40123",
  consent: true,
});
assert(!shortPhone.ok && shortPhone.error_code === "invalid_phone", "short phone rejected");

const noConsent = validateListingInquiryBody(listingId, {
  phone: "+40722123456",
  consent: false,
});
assert(!noConsent.ok && noConsent.error_code === "consent_required", "consent required");

const missingConsent = validateListingInquiryBody(listingId, {
  phone: "+40722123456",
});
assert(!missingConsent.ok && missingConsent.error_code === "consent_required", "consent must be explicit true");

assert(sanitizeInquiryMessage("<img src=x onerror=alert(1)>hi") === "hi", "markup stripped from message");
assert(sanitizeInquiryMessage("see https://evil.test") === "see https://evil.test", "links stay as text after sanitize");

const tooLong = validateListingInquiryBody(listingId, {
  phone: "+40722123456",
  consent: true,
  message: "a".repeat(MAX_INQUIRY_MESSAGE_LENGTH + 1),
});
assert(!tooLong.ok && tooLong.error_code === "message_too_long", "oversized message rejected, not truncated");

const exactMax = validateListingInquiryBody(listingId, {
  phone: "+40722123456",
  consent: true,
  message: "a".repeat(MAX_INQUIRY_MESSAGE_LENGTH),
});
assert(exactMax.ok, "message at max length accepted");

assert(isPublicInquirableListing({ status: "active", is_seed: false, user_id: "seller" }), "active public listing allowed");
assert(!isPublicInquirableListing({ status: "pending_payment", is_seed: false, user_id: "seller" }), "inactive listing rejected");
assert(!isPublicInquirableListing({ status: "active", is_seed: true, user_id: "seller" }), "seed listing rejected");
assert(!isPublicInquirableListing({ status: "draft", is_seed: false, user_id: "seller" }), "draft listing rejected");
assert(!isPublicInquirableListing({ status: "active", is_seed: false }), "missing seller rejected");
assert(
  !isPublicInquirableListing({
    status: "active",
    is_seed: false,
    user_id: "seller",
    expires_at: "2020-01-01T00:00:00.000Z",
  }),
  "expired listing rejected",
);
assert(!isPublicInquirableListing(null), "missing listing rejected");

assert(isPostgresUniqueViolation("23505"), "unique violation mapped");
assert(!isPostgresUniqueViolation("42P01"), "other codes not unique");

assert(INQUIRY_RATE_LIMIT_SCOPE === "instance-local-supplemental", "instance map is supplemental only");

assert(
  inquirySuccessCopy().ro === "Solicitarea ta a fost înregistrată.",
  "generic recorded copy",
);
assert(inquirySuccessCopy().en === "Your request was recorded.", "generic recorded copy en");
assert(inquiryNeedsHqFallback("skipped_no_provider"), "no provider needs HQ");
assert(inquiryNeedsHqFallback("sending"), "sending still needs HQ if stuck");
assert(!inquiryNeedsHqFallback("sent"), "sent does not need HQ");
assert(isSafePublicInquiryError("auth_required"), "auth error is public-safe");
assert(isSafePublicInquiryError("message_too_long"), "message_too_long is public-safe");
assert(!isSafePublicInquiryError("smtp_password"), "unknown codes are not public-safe");

const extraPatch = parseHqInquiryPatch({
  id: listingId,
  status: "seen",
  notification_status: "sent",
  seller_id: "00000000-0000-4000-8000-000000000000",
});
assert(!extraPatch.ok, "HQ patch rejects extra fields");

const goodPatch = parseHqInquiryPatch({ id: listingId, status: "hq_handling" });
assert(goodPatch.ok && goodPatch.ok && goodPatch.status === "hq_handling", "HQ patch allowlist status");

for (let i = 0; i < 5; i += 1) {
  const allowed = checkInquiryRateLimit({ ip: "rate-test-ip", userId: "rate-test-user" });
  assert(allowed.allowed, `rate limit allows attempt ${i + 1}`);
}
assert(
  !checkInquiryRateLimit({ ip: "rate-test-ip", userId: "rate-test-user" }).allowed,
  "sixth attempt rate limited",
);

assert(INQUIRY_AUTHORITATIVE_RATE_SCOPE === "database-advisory-lock", "DB locks are authoritative");
assert(LISTING_INQUIRY_CONSENT_VERSION === "2026-08", "consent version pinned");

const now = new Date("2026-09-10T12:00:00.000Z");
assert(
  wouldViolateDuplicateWindow([new Date("2026-09-10T11:50:00.000Z")], now),
  "15-minute duplicate window",
);
assert(
  !wouldViolateDuplicateWindow([new Date("2026-09-10T11:40:00.000Z")], now),
  "outside 15-minute window allowed",
);
assert(
  wouldViolateHourlyCap(
    [0, 1, 2, 3, 4].map((m) => new Date(`2026-09-10T11:${50 + m}:00.000Z`)),
    now,
  ),
  "fifth inquiry in the hour blocks the sixth",
);
assert(canSellerTransitionInquiry("new", "seen"), "seller new→seen");
assert(canSellerTransitionInquiry("seen", "closed"), "seller seen→closed");
assert(!canSellerTransitionInquiry("closed", "seen"), "closed is final");
assert(!canSellerTransitionInquiry("hq_handling", "seen"), "hq_handling not seller-writable");

const originOk = isSameOriginMutationRequest(
  new Headers({
    origin: "https://www.quickexit.ro",
    host: "www.quickexit.ro",
    "x-forwarded-proto": "https",
  }),
);
assert(originOk, "same-origin mutation accepted");
assert(
  !isSameOriginMutationRequest(
    new Headers({
      origin: "https://evil.example",
      host: "www.quickexit.ro",
      "x-forwarded-proto": "https",
    }),
  ),
  "cross-origin mutation rejected",
);
assert(
  !isSameOriginMutationRequest(
    new Headers({ host: "www.quickexit.ro", "x-forwarded-proto": "https" }),
  ),
  "missing origin rejected",
);

const defaultHq = parseHqInquiryListQuery(new URLSearchParams());
assert(defaultHq.ok && defaultHq.view === "fallback" && defaultHq.limit === 50, "HQ default fallback page");
assert(!parseHqInquiryListQuery(new URLSearchParams("view=secret")).ok, "invalid HQ view rejected");
assert(!parseHqInquiryListQuery(new URLSearchParams("limit=500")).ok, "HQ oversize limit rejected");
assert(!parseHqInquiryListQuery(new URLSearchParams("cursor=not-a-date")).ok, "invalid HQ cursor rejected");

const seoSource = readFileSync(resolve("lib/listingSeo.ts"), "utf8");
assert(
  !/select\([^)]*phone/i.test(seoSource),
  "public seller context must not select profiles.phone",
);

const dashboardSource = readFileSync(resolve("app/[locale]/dashboard/page.tsx"), "utf8");
assert(dashboardSource.includes('from("seller_contacts")'), "dashboard reads seller_contacts");
assert(!dashboardSource.includes('.update({ phone:'), "dashboard does not write profiles.phone");

const publishSource = readFileSync(resolve("app/[locale]/pune-anunt/PuneAnuntClient.tsx"), "utf8");
assert(publishSource.includes('from("seller_contacts")'), "publish form uses seller_contacts");
assert(!publishSource.includes('.update({ phone:'), "publish form does not write profiles.phone");

console.log("OK listing-inquiry");
