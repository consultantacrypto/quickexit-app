import {
  inquirySuccessCopy,
  isListingInquiryId,
  sanitizeInquiryMessage,
  validateListingInquiryBody,
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

const valid = validateListingInquiryBody(listingId, {
  phone: "0722123456",
  message: "  Pot vedea activul?  ",
  consent: true,
});
assert(valid.ok, "valid inquiry body");
if (valid.ok) {
  assert(valid.data.phone === "+40722123456", "phone normalized");
  assert(valid.data.message === "Pot vedea activul?", "message trimmed");
}

const noPhone = validateListingInquiryBody(listingId, {
  phone: "abc",
  consent: true,
});
assert(!noPhone.ok && noPhone.error_code === "invalid_phone", "invalid phone");

const noConsent = validateListingInquiryBody(listingId, {
  phone: "+40722123456",
  consent: false,
});
assert(!noConsent.ok && noConsent.error_code === "consent_required", "consent required");

assert(sanitizeInquiryMessage("a".repeat(5000))?.length === 2000, "message max length");
assert(inquirySuccessCopy(true).titleKey === "recordedAndSent", "sent copy");
assert(inquirySuccessCopy(false).titleKey === "recordedHqFallback", "hq fallback copy");

console.log("OK listing-inquiry");
