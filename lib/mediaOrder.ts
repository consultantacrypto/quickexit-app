import type {
  MediaEditorialStatus,
  MediaOrderSource,
  MediaPackageId,
  MediaPaymentStatus,
  MediaQuote,
  MediaValueTier,
} from "@/lib/mediaPricing";

/** Domain row shape for public.media_orders (application types only — not generated Supabase types). */
export type MediaOrderRow = {
  id: string;
  listing_id: string;
  user_id: string;
  package: MediaPackageId;
  listing_value_eur_snapshot: number;
  value_tier: MediaValueTier;
  amount_ron: number;
  currency: "ron";
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_status: MediaPaymentStatus;
  editorial_status: MediaEditorialStatus;
  locale: string | null;
  source: MediaOrderSource;
  rejection_reason: string | null;
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
};

/** Immutable commercial snapshot persisted at checkout initiation (Phase 2D+).
 * After insert, package / listing_value_eur_snapshot / value_tier / amount_ron /
 * currency must not be rewritten by client or casual server updates.
 * Application-level control only in v1 (no DB immutability trigger).
 */
export type MediaOrderInsertSnapshot = {
  listing_id: string;
  user_id: string;
  package: MediaPackageId;
  listing_value_eur_snapshot: number;
  value_tier: MediaValueTier;
  amount_ron: number;
  currency: "ron";
  locale?: string | null;
  source?: MediaOrderSource;
  payment_status?: "pending";
  editorial_status?: "queued";
};

export function buildMediaOrderInsertSnapshot(params: {
  listingId: string;
  userId: string;
  quote: MediaQuote;
  locale?: string | null;
  source?: MediaOrderSource;
}): MediaOrderInsertSnapshot {
  return {
    listing_id: params.listingId,
    user_id: params.userId,
    package: params.quote.package,
    listing_value_eur_snapshot: params.quote.listingValueEur,
    value_tier: params.quote.tier,
    amount_ron: params.quote.amountRon,
    currency: "ron",
    locale: params.locale ?? null,
    source: params.source ?? "publish_checkout",
    payment_status: "pending",
    editorial_status: "queued",
  };
}
