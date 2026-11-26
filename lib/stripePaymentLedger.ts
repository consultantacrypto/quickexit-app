/**
 * Records a paid Stripe Checkout session in public.payments.
 * Idempotent on stripe_checkout_session_id (unique in Postgres).
 * Service-role client only. Never logs secrets or raw webhook bodies.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { logError, logInfo } from "@/lib/observability";
import { getPackageByPackageId } from "@/lib/stripePackages";
import { expectedMinorAmountForPriceId } from "@/lib/stripeListingFulfillment";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PaymentLedgerRow = {
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_minor: number;
  currency: string;
  package_id: string | null;
  product: string;
  user_id: string | null;
  listing_id: string | null;
  demand_id: string | null;
  media_order_id: string | null;
  media_package: string | null;
  media_amount_minor: number | null;
  listing_amount_minor: number | null;
  attribution_first: unknown | null;
  attribution_last: unknown | null;
  heard_from: string | null;
  heard_from_detail: string | null;
  paid_at: string;
};

export type PaymentLedgerResult =
  | { ok: true; inserted: boolean; row: PaymentLedgerRow }
  | { ok: false; code: string; message: string; row: PaymentLedgerRow | null };

export function paymentIntentIdFromSession(session: {
  payment_intent?: string | { id?: string | null } | null;
}): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "string" && pi.trim()) return pi.trim();
  if (pi && typeof pi === "object" && typeof pi.id === "string" && pi.id.trim()) {
    return pi.id.trim();
  }
  return null;
}

export function optionalUuid(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return UUID_RE.test(raw) ? raw : null;
}

function optionalText(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function optionalJson(value: unknown): unknown | null {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function paidAtIsoFromStripeEvent(createdUnix: number | null | undefined, fallback = new Date()): string {
  if (typeof createdUnix === "number" && Number.isFinite(createdUnix) && createdUnix > 0) {
    return new Date(createdUnix * 1000).toISOString();
  }
  return fallback.toISOString();
}

export function buildPaymentLedgerRow(input: {
  session: Stripe.Checkout.Session;
  paidAtIso: string;
  product: string;
  packageId?: string | null;
  userId?: string | null;
  listingId?: string | null;
  demandId?: string | null;
  mediaOrderId?: string | null;
  mediaPackage?: string | null;
}): PaymentLedgerRow | null {
  const sessionId = String(input.session.id ?? "").trim();
  const amountMinor = Number(input.session.amount_total ?? NaN);
  const currency = String(input.session.currency ?? "").trim().toLowerCase();
  if (!sessionId || !Number.isInteger(amountMinor) || amountMinor < 0 || !currency) {
    return null;
  }

  const metadata = (input.session.metadata ?? {}) as Record<string, string>;
  const packageId =
    optionalText(input.packageId, 80) ||
    optionalText(metadata.packageId ?? metadata.package_id, 80);
  const listingPriceId = optionalText(metadata.priceId ?? metadata.price_id, 80);
  const packageAmountMinor = packageId
    ? minorFromPackageId(packageId)
    : null;
  const listingAmountMinor =
    input.product === "listing"
      ? (listingPriceId ? expectedMinorAmountForPriceId(listingPriceId) : null) ?? packageAmountMinor
      : null;
  const mediaOrderId = optionalUuid(input.mediaOrderId ?? metadata.mediaOrderId ?? metadata.media_order_id);
  const mediaAmountMinor =
    input.product === "listing" &&
    mediaOrderId &&
    listingAmountMinor != null &&
    amountMinor >= listingAmountMinor
      ? amountMinor - listingAmountMinor
      : null;

  return {
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentIdFromSession(input.session),
    amount_minor: amountMinor,
    currency,
    package_id: packageId,
    product: input.product,
    user_id: optionalUuid(input.userId ?? metadata.userId ?? metadata.user_id),
    listing_id:
      input.product === "listing"
        ? optionalUuid(input.listingId ?? metadata.listingId ?? metadata.listing_id)
        : null,
    demand_id:
      input.product === "demand"
        ? optionalUuid(input.demandId ?? metadata.demandId ?? metadata.demand_id)
        : null,
    media_order_id: mediaOrderId,
    media_package: optionalText(input.mediaPackage ?? metadata.mediaPackage ?? metadata.media_package, 40),
    media_amount_minor: mediaAmountMinor,
    listing_amount_minor: listingAmountMinor,
    attribution_first: optionalJson(metadata.attribution_first),
    attribution_last: optionalJson(metadata.attribution_last),
    heard_from: optionalText(metadata.heard_from, 80),
    heard_from_detail: optionalText(metadata.heard_from_detail, 200),
    paid_at: input.paidAtIso,
  };
}

function minorFromPackageId(packageId: string): number | null {
  const pkg = getPackageByPackageId(packageId);
  if (!pkg) return null;
  return Math.round(pkg.amountRon * 100);
}

type LedgerInsertError = { code?: string; message?: string } | null;

export function isPaymentLedgerDuplicate(error: LedgerInsertError): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;
  return /duplicate key/i.test(String(error.message ?? ""));
}

export async function recordStripeCheckoutPayment(
  admin: Pick<SupabaseClient, "from">,
  row: PaymentLedgerRow,
  logContext: { eventId?: string | null; correlationId?: string | null } = {},
): Promise<PaymentLedgerResult> {
  const { error } = await admin.from("payments").insert(row).select("id").maybeSingle();

  if (error && isPaymentLedgerDuplicate(error)) {
    logInfo({
      component: "stripe_webhook",
      operation: "payment_ledger",
      result: "skip",
      error_code: "payment_ledger_duplicate",
      correlation_id: logContext.correlationId ?? null,
      entity_id: row.listing_id ?? row.demand_id,
      sessionId: row.stripe_checkout_session_id,
      eventId: logContext.eventId ?? null,
      product: row.product,
    });
    return { ok: true, inserted: false, row };
  }

  if (error) {
    const message = String(error.message ?? "payments insert failed").slice(0, 200);
    logError({
      component: "stripe_webhook",
      operation: "payment_ledger",
      result: "error",
      error_code: "payment_ledger_failed",
      correlation_id: logContext.correlationId ?? null,
      entity_id: row.listing_id ?? row.demand_id,
      sessionId: row.stripe_checkout_session_id,
      eventId: logContext.eventId ?? null,
      product: row.product,
      supabase_code: error.code ?? null,
      message,
    });
    return { ok: false, code: error.code ?? "payment_ledger_failed", message, row };
  }

  logInfo({
    component: "stripe_webhook",
    operation: "payment_ledger",
    result: "ok",
    correlation_id: logContext.correlationId ?? null,
    entity_id: row.listing_id ?? row.demand_id,
    sessionId: row.stripe_checkout_session_id,
    eventId: logContext.eventId ?? null,
    product: row.product,
    amount_minor: row.amount_minor,
    currency: row.currency,
    package_id: row.package_id,
  });
  return { ok: true, inserted: true, row };
}
