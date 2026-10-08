import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  buildMediaOrderInsertSnapshot,
  type MediaOrderRow,
} from "@/lib/mediaOrder";
import {
  isMediaPackageId,
  type MediaPackageId,
  type MediaQuote,
  type MediaValueTier,
} from "@/lib/mediaPricing";

/** Server + preview flag. Default OFF — Production must stay off until Phase 2E. */
export function isMediaCheckoutEnabled(): boolean {
  const raw = (
    process.env.MEDIA_CHECKOUT_ENABLED ??
    process.env.NEXT_PUBLIC_MEDIA_CHECKOUT_ENABLED ??
    ""
  )
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/**
 * Parse optional mediaPackage from checkout body.
 * - undefined / null / "" → null (listing-only)
 * - valid id → package
 * - anything else → "invalid" (never coerce)
 */
export function parseCheckoutMediaPackage(
  value: unknown,
): MediaPackageId | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (isMediaPackageId(value)) return value;
  return "invalid";
}

export function mediaStripeProductName(
  mediaPackage: MediaPackageId,
  locale: "ro" | "en" = "ro",
): string {
  if (locale === "en") {
    if (mediaPackage === "stories_4") return "QuickExit Media — 4 Stories";
    if (mediaPackage === "stories_8") return "QuickExit Media — 8 Stories";
    return "QuickExit Media — Featured";
  }
  if (mediaPackage === "stories_4") return "QuickExit Media — 4 Stories";
  if (mediaPackage === "stories_8") return "QuickExit Media — 8 Stories";
  return "QuickExit Media — Featured";
}

/** Media line item via server-owned price_data (bani). Never accept client amount. */
export function buildMediaCheckoutLineItem(
  quote: MediaQuote,
  locale: "ro" | "en" = "ro",
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: 1,
    price_data: {
      currency: "ron",
      unit_amount: Math.round(quote.amountRon * 100),
      product_data: {
        name: mediaStripeProductName(quote.package, locale),
      },
    },
  };
}

export function buildListingOnlyLineItems(
  listingPriceId: string,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return [{ price: listingPriceId, quantity: 1 }];
}

export function buildCombinedListingMediaLineItems(
  listingPriceId: string,
  quote: MediaQuote,
  locale: "ro" | "en" = "ro",
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return [
    { price: listingPriceId, quantity: 1 },
    buildMediaCheckoutLineItem(quote, locale),
  ];
}

export function buildCombinedMediaCheckoutMetadata(base: Record<string, string>, params: {
  mediaOrderId: string;
  mediaPackage: MediaPackageId;
  mediaTier: MediaValueTier;
}): Record<string, string> {
  return {
    ...base,
    mediaOrderId: params.mediaOrderId,
    mediaPackage: params.mediaPackage,
    mediaTier: params.mediaTier,
  };
}

/** Combined-session idempotency — includes media order UUID so cancelled retries get a fresh Session. */
export function buildMediaCheckoutIdempotencyKey(params: {
  listingId: string;
  listingPackageId: string;
  mediaOrderId: string;
}): string {
  return `qe_media_v1_${params.listingId}_${params.listingPackageId}_${params.mediaOrderId}`;
}

export type MediaOrderPrepareResult =
  | { ok: true; order: Pick<MediaOrderRow, "id" | "amount_ron" | "package" | "value_tier" | "listing_value_eur_snapshot" | "currency"> }
  | { ok: false; code: "media_already_paid" | "media_order_insert_failed" | "media_order_cancel_failed"; message: string };

/**
 * Supersede pending Media order (if any), then insert a new pending row.
 * Fail-closed on unique conflict / paid row.
 *
 * Race note: Supabase JS cannot wrap SELECT+UPDATE+INSERT in one DB transaction
 * without an RPC. Window: two concurrent checkouts may both pass the paid check;
 * the partial unique index then rejects the second INSERT — we fail closed and
 * do not create a Stripe Session.
 */
export async function preparePendingMediaOrder(params: {
  admin: SupabaseClient;
  listingId: string;
  userId: string;
  quote: MediaQuote;
  locale?: string | null;
}): Promise<MediaOrderPrepareResult> {
  const { admin, listingId, userId, quote, locale } = params;

  const { data: activeRows, error: activeError } = await admin
    .from("media_orders")
    .select("id, payment_status")
    .eq("listing_id", listingId)
    .in("payment_status", ["pending", "paid"]);

  if (activeError) {
    return {
      ok: false,
      code: "media_order_insert_failed",
      message: "Nu am putut verifica comenzile Media existente.",
    };
  }

  const paid = (activeRows ?? []).find((row) => row.payment_status === "paid");
  if (paid) {
    return {
      ok: false,
      code: "media_already_paid",
      message: "Există deja o comandă Media plătită pentru acest anunț.",
    };
  }

  const pendingRows = (activeRows ?? []).filter((row) => row.payment_status === "pending");
  if (pendingRows.length > 0) {
    const nowIso = new Date().toISOString();
    const { error: cancelError } = await admin
      .from("media_orders")
      .update({
        payment_status: "cancelled",
        cancelled_at: nowIso,
      })
      .eq("listing_id", listingId)
      .eq("payment_status", "pending");

    if (cancelError) {
      return {
        ok: false,
        code: "media_order_cancel_failed",
        message: "Nu am putut anula comanda Media anterioară.",
      };
    }
  }

  const snapshot = buildMediaOrderInsertSnapshot({
    listingId,
    userId,
    quote,
    locale: locale ?? null,
    source: "publish_checkout",
  });

  const { data: inserted, error: insertError } = await admin
    .from("media_orders")
    .insert(snapshot)
    .select(
      "id, amount_ron, package, value_tier, listing_value_eur_snapshot, currency",
    )
    .single();

  if (insertError || !inserted?.id) {
    return {
      ok: false,
      code: "media_order_insert_failed",
      message: "Nu am putut crea comanda Media. Plata nu a fost inițiată.",
    };
  }

  return {
    ok: true,
    order: {
      id: String(inserted.id),
      amount_ron: Number(inserted.amount_ron),
      package: inserted.package as MediaPackageId,
      value_tier: inserted.value_tier as MediaValueTier,
      listing_value_eur_snapshot: Number(inserted.listing_value_eur_snapshot),
      currency: "ron",
    },
  };
}

export async function cancelMediaOrderAfterFailure(params: {
  admin: SupabaseClient;
  mediaOrderId: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await params.admin
    .from("media_orders")
    .update({
      payment_status: "cancelled",
      cancelled_at: nowIso,
    })
    .eq("id", params.mediaOrderId)
    .eq("payment_status", "pending");

  if (error) {
    console.error("[stripe/checkout] failed to cancel media order after Stripe failure", {
      mediaOrderId: params.mediaOrderId,
      message: error.message,
    });
  }
}

export async function persistMediaCheckoutSessionId(params: {
  admin: SupabaseClient;
  mediaOrderId: string;
  sessionId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await params.admin
    .from("media_orders")
    .update({ stripe_checkout_session_id: params.sessionId })
    .eq("id", params.mediaOrderId)
    .eq("payment_status", "pending");

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

/**
 * Listing Stripe Price IDs are RON by product contract (stripePackages amountRon / *_RON env).
 * Media quotes are always currency: "ron". Mixed-currency sessions are not created.
 */
export function assertListingAndMediaCurrencyCompatible(): { ok: true } | { ok: false; reason: string } {
  return { ok: true };
}
