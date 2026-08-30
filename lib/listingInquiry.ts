import { normalizePhone } from "@/lib/financingLead";

export const LISTING_INQUIRY_CONSENT_VERSION = "2026-08";
export const MAX_INQUIRY_MESSAGE_LENGTH = 2_000;
export const MAX_INQUIRY_BODY_BYTES = 4_096;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type InquiryNotificationStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped_no_provider"
  | "skipped_disabled";

export type ValidatedListingInquiry = {
  listingId: string;
  phone: string;
  message: string | null;
  consent: true;
};

export type InquiryValidationResult =
  | { ok: true; data: ValidatedListingInquiry }
  | { ok: false; status: number; error_code: string; message: string };

export function isListingInquiryId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function sanitizeInquiryMessage(raw: unknown): string | null {
  if (raw == null) return null;
  const text = String(raw)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim();
  if (!text) return null;
  return text.slice(0, MAX_INQUIRY_MESSAGE_LENGTH);
}

export function validateListingInquiryBody(
  listingId: string,
  rawBody: unknown,
): InquiryValidationResult {
  if (!isListingInquiryId(listingId)) {
    return {
      ok: false,
      status: 400,
      error_code: "invalid_listing",
      message: "Anunț invalid.",
    };
  }

  if (!rawBody || typeof rawBody !== "object") {
    return {
      ok: false,
      status: 400,
      error_code: "validation_error",
      message: "Body JSON invalid.",
    };
  }

  const body = rawBody as Record<string, unknown>;
  const phone = normalizePhone(body.phone);
  if (!phone) {
    return {
      ok: false,
      status: 400,
      error_code: "invalid_phone",
      message: "Introdu un număr de telefon valid.",
    };
  }

  if (body.consent !== true) {
    return {
      ok: false,
      status: 400,
      error_code: "consent_required",
      message: "Este necesar acordul pentru contact.",
    };
  }

  return {
    ok: true,
    data: {
      listingId: listingId.trim(),
      phone,
      message: sanitizeInquiryMessage(body.message),
      consent: true,
    },
  };
}

export function inquirySuccessCopy(notified: boolean): {
  titleKey: "recordedAndSent" | "recordedHqFallback";
} {
  return {
    titleKey: notified ? "recordedAndSent" : "recordedHqFallback",
  };
}
