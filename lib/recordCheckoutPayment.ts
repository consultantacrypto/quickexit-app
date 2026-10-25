import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  isMissingRelationError,
  snapshotFromMetadata,
} from "@/lib/attribution";
import { sendGa4PurchaseEvent } from "@/lib/ga4MeasurementProtocol";
import { expectedMinorAmountForPriceId } from "@/lib/stripeListingFulfillment";

export type PaymentWriteResult = "inserted" | "exists" | "skipped" | "retry";

const PERMANENT_SKIP_CODES = new Set(["23502", "23514", "42703", "22P02", "PGRST204"]);

function minorToMajor(minor: number): number {
  return Math.round(minor) / 100;
}

/**
 * Upsert a paid checkout into public.payments.
 * `retry` means the caller should return 500 so Stripe delivers the event again.
 * `skipped` means the table is missing or the row cannot be stored; fulfillment
 * must still proceed.
 */
export async function recordCheckoutPayment(input: {
  supabase: SupabaseClient;
  session: Stripe.Checkout.Session;
  packageId: string | null;
  priceId: string | null;
  listingId: string;
  demandId: string;
  userId: string;
  mediaOrderId: string | null;
}): Promise<PaymentWriteResult> {
  const sessionId = String(input.session.id || "").trim();
  if (!sessionId) return "skipped";

  let mediaAmountMinor: number | null = null;
  let mediaPackage: string | null = null;
  if (input.mediaOrderId) {
    const { data, error } = await input.supabase
      .from("media_orders")
      .select("amount_ron, package")
      .eq("id", input.mediaOrderId)
      .maybeSingle();
    if (!error && data) {
      const major = Number(data.amount_ron);
      if (Number.isFinite(major) && major > 0) mediaAmountMinor = Math.round(major * 100);
      if (typeof data.package === "string" && data.package) mediaPackage = data.package;
    }
  }

  const listingAmountMinor = input.priceId ? expectedMinorAmountForPriceId(input.priceId) : null;
  const metadata = (input.session.metadata ?? {}) as Record<string, string | undefined>;
  const snapshot = snapshotFromMetadata(metadata);
  const amountMinor = Number(input.session.amount_total ?? 0);
  const currency = String(input.session.currency ?? "ron").toLowerCase();
  const paymentIntentId =
    typeof input.session.payment_intent === "string"
      ? input.session.payment_intent
      : input.session.payment_intent?.id ?? null;

  const row = {
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    amount_minor: Number.isFinite(amountMinor) ? Math.round(amountMinor) : 0,
    currency,
    package_id: input.packageId,
    product: input.packageId,
    user_id: input.userId || null,
    listing_id: input.listingId || null,
    demand_id: input.demandId || null,
    media_order_id: input.mediaOrderId,
    media_package: mediaPackage,
    media_amount_minor: mediaAmountMinor,
    listing_amount_minor: listingAmountMinor,
    attribution_first: snapshot.first ?? null,
    attribution_last: snapshot.last ?? null,
    heard_from: snapshot.heard_from ?? null,
    heard_from_detail: snapshot.heard_from_detail ?? null,
    paid_at: new Date().toISOString(),
  };

  const { error } = await input.supabase.from("payments").insert(row);
  if (!error) {
    const items: Array<{ item_id: string; item_name: string; price: number; quantity: number }> = [];
    if (input.packageId && listingAmountMinor != null) {
      items.push({
        item_id: input.packageId,
        item_name: input.packageId,
        price: minorToMajor(listingAmountMinor),
        quantity: 1,
      });
    }
    if (mediaPackage && mediaAmountMinor != null) {
      items.push({
        item_id: mediaPackage,
        item_name: mediaPackage,
        price: minorToMajor(mediaAmountMinor),
        quantity: 1,
      });
    }
    if (items.length === 0 && input.packageId) {
      items.push({
        item_id: input.packageId,
        item_name: input.packageId,
        price: minorToMajor(amountMinor),
        quantity: 1,
      });
    }
    const purchase = await sendGa4PurchaseEvent({
      clientId: metadata.ga_client_id,
      userId: input.userId || null,
      transactionId: sessionId,
      currency,
      value: minorToMajor(amountMinor),
      items,
    });
    if (!purchase.sent && purchase.reason !== "missing_secret") {
      console.warn("[stripe/webhook] GA4 purchase was not sent", {
        sessionId,
        reason: purchase.reason,
      });
    }
    return "inserted";
  }

  if (error.code === "23505") return "exists";
  if (isMissingRelationError(error) || PERMANENT_SKIP_CODES.has(String(error.code || ""))) {
    console.warn("[stripe/webhook] payments row skipped", {
      sessionId,
      code: error.code ?? null,
      message: String(error.message || "").slice(0, 180),
    });
    return "skipped";
  }

  console.error("[stripe/webhook] payments insert failed", {
    sessionId,
    code: error.code ?? null,
    message: String(error.message || "").slice(0, 180),
  });
  return "retry";
}
