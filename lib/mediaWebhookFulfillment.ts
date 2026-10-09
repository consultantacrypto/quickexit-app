import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaPackageId, MediaPaymentStatus } from "@/lib/mediaPricing";
import { isMediaPackageId } from "@/lib/mediaPricing";
import { expectedMinorAmountForPriceId } from "@/lib/stripeListingFulfillment";

/** Row shape used for webhook Media validation (service-role reads). */
export type MediaOrderFulfillmentRow = {
  id: string;
  listing_id: string;
  user_id: string;
  package: string;
  amount_ron: number;
  currency: string;
  payment_status: string;
  editorial_status: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  /** Present for HQ notify payload; optional for older call sites. */
  listing_value_eur_snapshot?: number | null;
  value_tier?: string | null;
  locale?: string | null;
  source?: string | null;
};

export type MediaWebhookFailureCode =
  | "media_order_missing"
  | "media_order_listing_mismatch"
  | "media_order_user_mismatch"
  | "media_session_mismatch"
  | "media_order_cancelled"
  | "media_order_refunded"
  | "media_order_incompatible_status"
  | "media_package_mismatch"
  | "media_currency_mismatch"
  | "media_amount_invalid"
  | "ambiguous_listing_line_items"
  | "missing_listing_line_item"
  | "unexpected_media_line_items"
  | "media_fulfillment_failed"
  | "media_mark_failed_error";

export type NormalizedCheckoutLineItem = {
  /** Stripe Price id when the line uses a catalog Price; null for ad-hoc price_data. */
  priceId: string | null;
  unitAmount: number | null;
  quantity: number;
};

export function extractMediaOrderIdFromMetadata(metadata: Record<string, string> | null | undefined): string | null {
  const raw = String(metadata?.mediaOrderId ?? metadata?.media_order_id ?? "").trim();
  return raw || null;
}

export function extractMediaPackageFromMetadata(
  metadata: Record<string, string> | null | undefined,
): MediaPackageId | null {
  const raw = metadata?.mediaPackage ?? metadata?.media_package;
  return isMediaPackageId(raw) ? raw : null;
}

export function isCombinedCheckoutFulfillmentEvent(eventType: string): boolean {
  return (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded"
  );
}

export function isAsyncPaymentFailedEvent(eventType: string): boolean {
  return eventType === "checkout.session.async_payment_failed";
}

/**
 * Test-mode gate: live events always pass.
 * Test events allowed only when STRIPE_WEBHOOK_ALLOW_TEST_EVENTS is explicitly on
 * AND Vercel Production is not the host. Never a Production bypass.
 */
export function shouldRejectTestModeEvent(livemode: boolean | null | undefined): boolean {
  if (livemode !== false) return false;
  const allow =
    process.env.STRIPE_WEBHOOK_ALLOW_TEST_EVENTS === "true" ||
    process.env.STRIPE_WEBHOOK_ALLOW_TEST_EVENTS === "1";
  if (!allow) return true;
  if (process.env.VERCEL_ENV === "production") return true;
  return false;
}

/**
 * Classify line items against the known listing Stripe Price ID.
 * Fail closed when the listing Price is missing or appears more than once.
 */
export function classifyListingLineItems(params: {
  lineItems: NormalizedCheckoutLineItem[];
  expectedListingPriceId: string;
}):
  | { ok: true; listingLineCount: 1; otherLineCount: number }
  | { ok: false; code: "missing_listing_line_item" | "ambiguous_listing_line_items" } {
  const expected = params.expectedListingPriceId.trim();
  if (!expected) {
    return { ok: false, code: "missing_listing_line_item" };
  }
  const listingMatches = params.lineItems.filter((item) => item.priceId === expected);
  if (listingMatches.length === 0) {
    return { ok: false, code: "missing_listing_line_item" };
  }
  if (listingMatches.length > 1) {
    return { ok: false, code: "ambiguous_listing_line_items" };
  }
  return {
    ok: true,
    listingLineCount: 1,
    otherLineCount: params.lineItems.length - 1,
  };
}

/**
 * When mediaOrderId is absent, reject sessions that still look like they contain
 * a non-listing (price_data) line — fail closed rather than listing-only fulfill.
 */
export function classifyUnexpectedMediaStructure(params: {
  mediaOrderId: string | null;
  lineItems: NormalizedCheckoutLineItem[];
  expectedListingPriceId: string;
}): "ok" | "unexpected_media_line_items" {
  if (params.mediaOrderId) return "ok";
  const expected = params.expectedListingPriceId.trim();
  const extras = params.lineItems.filter((item) => item.priceId !== expected);
  if (extras.length === 0) return "ok";
  // Ad-hoc price_data lines have null priceId — treat as Media-shaped.
  const looksLikeMedia = extras.some((item) => !item.priceId || item.priceId !== expected);
  return looksLikeMedia ? "unexpected_media_line_items" : "ok";
}

export function expectedCombinedMinorAmount(params: {
  listingPriceId: string;
  mediaAmountRon: number;
}): number | null {
  const listingMinor = expectedMinorAmountForPriceId(params.listingPriceId);
  if (listingMinor == null) return null;
  if (!Number.isFinite(params.mediaAmountRon) || params.mediaAmountRon <= 0) return null;
  return listingMinor + Math.round(params.mediaAmountRon * 100);
}

export function classifyCombinedPaidSessionAmount(params: {
  amountTotal: number;
  currency: string;
  listingPriceId: string;
  mediaAmountRon: number;
  mediaCurrency: string;
}): "ok" | "amount_mismatch" | "currency_mismatch" | "invalid_amount" | "media_currency_mismatch" | "media_amount_invalid" {
  const sessionCurrency = String(params.currency ?? "").toLowerCase();
  const mediaCurrency = String(params.mediaCurrency ?? "").toLowerCase();
  if (!Number.isFinite(params.amountTotal) || params.amountTotal <= 0) return "invalid_amount";
  if (sessionCurrency !== "ron") return "currency_mismatch";
  if (mediaCurrency !== "ron") return "media_currency_mismatch";
  if (!Number.isFinite(params.mediaAmountRon) || params.mediaAmountRon <= 0) {
    return "media_amount_invalid";
  }
  const expected = expectedCombinedMinorAmount({
    listingPriceId: params.listingPriceId,
    mediaAmountRon: params.mediaAmountRon,
  });
  if (expected == null) return "invalid_amount";
  if (params.amountTotal !== expected) return "amount_mismatch";
  return "ok";
}

export function classifyMediaOrderForPaidFulfillment(params: {
  order: MediaOrderFulfillmentRow | null | undefined;
  listingId: string;
  userId?: string | null;
  sessionId: string;
  metadataPackage?: MediaPackageId | null;
}):
  | { ok: true; order: MediaOrderFulfillmentRow; alreadyPaid: boolean }
  | { ok: false; code: MediaWebhookFailureCode } {
  const { order, listingId, userId, sessionId, metadataPackage } = params;
  if (!order) return { ok: false, code: "media_order_missing" };
  if (String(order.listing_id) !== String(listingId)) {
    return { ok: false, code: "media_order_listing_mismatch" };
  }
  if (userId && String(order.user_id) !== String(userId)) {
    return { ok: false, code: "media_order_user_mismatch" };
  }
  if (
    !order.stripe_checkout_session_id ||
    order.stripe_checkout_session_id !== sessionId
  ) {
    return { ok: false, code: "media_session_mismatch" };
  }
  if (metadataPackage && order.package !== metadataPackage) {
    return { ok: false, code: "media_package_mismatch" };
  }

  const status = String(order.payment_status) as MediaPaymentStatus | string;
  if (status === "paid") {
    return { ok: true, order, alreadyPaid: true };
  }
  if (status === "cancelled") return { ok: false, code: "media_order_cancelled" };
  if (status === "refunded") return { ok: false, code: "media_order_refunded" };
  if (status === "failed") return { ok: false, code: "media_order_incompatible_status" };
  if (status !== "pending") return { ok: false, code: "media_order_incompatible_status" };
  return { ok: true, order, alreadyPaid: false };
}

export function classifyMediaOrderForAsyncFailure(params: {
  order: MediaOrderFulfillmentRow | null | undefined;
  listingId: string;
  sessionId: string;
}):
  | { action: "noop"; reason: "missing" | "already_paid" | "already_terminal" | "session_mismatch" | "listing_mismatch" }
  | { action: "mark_failed"; order: MediaOrderFulfillmentRow } {
  const { order, listingId, sessionId } = params;
  if (!order) return { action: "noop", reason: "missing" };
  if (String(order.listing_id) !== String(listingId)) {
    return { action: "noop", reason: "listing_mismatch" };
  }
  if (
    order.stripe_checkout_session_id &&
    order.stripe_checkout_session_id !== sessionId
  ) {
    return { action: "noop", reason: "session_mismatch" };
  }
  if (order.payment_status === "paid") {
    return { action: "noop", reason: "already_paid" };
  }
  if (
    order.payment_status === "failed" ||
    order.payment_status === "cancelled" ||
    order.payment_status === "refunded"
  ) {
    return { action: "noop", reason: "already_terminal" };
  }
  if (order.payment_status === "pending") {
    return { action: "mark_failed", order };
  }
  return { action: "noop", reason: "already_terminal" };
}

export async function loadMediaOrderForFulfillment(
  admin: SupabaseClient,
  mediaOrderId: string,
): Promise<MediaOrderFulfillmentRow | null> {
  const { data, error } = await admin
    .from("media_orders")
    .select(
      "id, listing_id, user_id, package, amount_ron, currency, payment_status, editorial_status, stripe_checkout_session_id, stripe_payment_intent_id, paid_at, listing_value_eur_snapshot, value_tier, locale, source",
    )
    .eq("id", mediaOrderId)
    .maybeSingle();
  if (error || !data) return null;
  return data as MediaOrderFulfillmentRow;
}

/**
 * Idempotent pending → paid. Already-paid rows are left unchanged (no timestamp rewrite).
 */
export async function markMediaOrderPaid(params: {
  admin: SupabaseClient;
  mediaOrderId: string;
  paymentIntentId: string | null;
  nowIso?: string;
}): Promise<
  | { ok: true; outcome: "updated" | "already_paid" }
  | { ok: false; code: "media_fulfillment_failed"; message: string }
> {
  const nowIso = params.nowIso ?? new Date().toISOString();

  const { data: current, error: readError } = await params.admin
    .from("media_orders")
    .select("id, payment_status, paid_at, stripe_payment_intent_id")
    .eq("id", params.mediaOrderId)
    .maybeSingle();

  if (readError || !current) {
    return {
      ok: false,
      code: "media_fulfillment_failed",
      message: readError?.message ?? "media order not found for paid update",
    };
  }

  if (current.payment_status === "paid") {
    return { ok: true, outcome: "already_paid" };
  }

  if (current.payment_status !== "pending") {
    return {
      ok: false,
      code: "media_fulfillment_failed",
      message: `refusing paid update from status=${current.payment_status}`,
    };
  }

  const patch: Record<string, unknown> = {
    payment_status: "paid",
    editorial_status: "queued",
    paid_at: current.paid_at ?? nowIso,
  };
  if (params.paymentIntentId) {
    patch.stripe_payment_intent_id = params.paymentIntentId;
  }

  const { data: updated, error: updateError } = await params.admin
    .from("media_orders")
    .update(patch)
    .eq("id", params.mediaOrderId)
    .eq("payment_status", "pending")
    .select("id");

  if (updateError) {
    return {
      ok: false,
      code: "media_fulfillment_failed",
      message: updateError.message,
    };
  }

  if (!updated?.length) {
    // Race: another worker paid it — re-read.
    const { data: again } = await params.admin
      .from("media_orders")
      .select("payment_status")
      .eq("id", params.mediaOrderId)
      .maybeSingle();
    if (again?.payment_status === "paid") {
      return { ok: true, outcome: "already_paid" };
    }
    return {
      ok: false,
      code: "media_fulfillment_failed",
      message: "pending→paid update affected 0 rows",
    };
  }

  return { ok: true, outcome: "updated" };
}

/**
 * pending → failed for async_payment_failed. Never downgrades paid.
 */
export async function markMediaOrderFailedFromAsync(params: {
  admin: SupabaseClient;
  mediaOrderId: string;
}): Promise<
  | { ok: true; outcome: "updated" | "noop" }
  | { ok: false; code: "media_mark_failed_error"; message: string }
> {
  const { data: current, error: readError } = await params.admin
    .from("media_orders")
    .select("id, payment_status")
    .eq("id", params.mediaOrderId)
    .maybeSingle();

  if (readError || !current) {
    return {
      ok: false,
      code: "media_mark_failed_error",
      message: readError?.message ?? "media order not found for failed update",
    };
  }

  if (current.payment_status === "paid") {
    return { ok: true, outcome: "noop" };
  }
  if (current.payment_status !== "pending") {
    return { ok: true, outcome: "noop" };
  }

  const { error: updateError } = await params.admin
    .from("media_orders")
    .update({ payment_status: "failed" })
    .eq("id", params.mediaOrderId)
    .eq("payment_status", "pending");

  if (updateError) {
    return {
      ok: false,
      code: "media_mark_failed_error",
      message: updateError.message,
    };
  }

  return { ok: true, outcome: "updated" };
}

/** Normalize Stripe line items (expanded price objects or ids). */
export function normalizeStripeLineItems(
  data: Array<{
    quantity?: number | null;
    amount_total?: number | null;
    price?: string | { id?: string | null; unit_amount?: number | null } | null;
  }> | null | undefined,
): NormalizedCheckoutLineItem[] {
  if (!data?.length) return [];
  return data.map((item) => {
    const qty = Number(item.quantity ?? 1) || 1;
    const price = item.price;
    if (typeof price === "string") {
      return { priceId: price, unitAmount: null, quantity: qty };
    }
    if (price && typeof price === "object") {
      return {
        priceId: typeof price.id === "string" ? price.id : null,
        unitAmount:
          typeof price.unit_amount === "number" ? price.unit_amount : null,
        quantity: qty,
      };
    }
    // price_data-only line may still expose amount_total at item level
    return {
      priceId: null,
      unitAmount: typeof item.amount_total === "number" ? item.amount_total : null,
      quantity: qty,
    };
  });
}
