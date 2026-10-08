import type { MediaEditorialStatus, MediaPackageId, MediaPaymentStatus } from "@/lib/mediaPricing";
import { isMediaPackageId } from "@/lib/mediaPricing";

/** Owner-readable Media order projection for dashboard (RLS SELECT only). */
export type MediaOrderStatusView = {
  id: string;
  listing_id: string;
  package: MediaPackageId | string;
  payment_status: MediaPaymentStatus | string;
  editorial_status: MediaEditorialStatus | string | null;
  amount_ron: number;
  currency: string;
  paid_at: string | null;
  created_at?: string | null;
};

export type MediaPaymentUxKey =
  | "processing"
  | "listingActiveMediaPaid"
  | "listingActiveMediaPending"
  | "mediaFailed"
  | "listingOnlySuccess";

export type MediaEditorialUxKey =
  | "queued"
  | "needs_info"
  | "in_research"
  | "in_production"
  | "published"
  | "rejected"
  | "cancelled";

const EDITORIAL_KEYS: readonly MediaEditorialUxKey[] = [
  "queued",
  "needs_info",
  "in_research",
  "in_production",
  "published",
  "rejected",
  "cancelled",
] as const;

export function isMediaEditorialUxKey(value: unknown): value is MediaEditorialUxKey {
  return typeof value === "string" && (EDITORIAL_KEYS as readonly string[]).includes(value);
}

/** Map DB editorial_status → i18n key. Unknown → null (do not show raw DB string). */
export function mapMediaEditorialStatusToUx(
  editorialStatus: unknown,
): MediaEditorialUxKey | null {
  if (isMediaEditorialUxKey(editorialStatus)) return editorialStatus;
  return null;
}

/**
 * Prefer the commercially active order (pending|paid), else newest row.
 * Never invent state — returns null when no rows.
 */
export function pickPrimaryMediaOrderForListing(
  orders: MediaOrderStatusView[],
  listingId: string,
): MediaOrderStatusView | null {
  const forListing = orders.filter((o) => String(o.listing_id) === String(listingId));
  if (forListing.length === 0) return null;
  const active = forListing.find(
    (o) => o.payment_status === "pending" || o.payment_status === "paid",
  );
  if (active) return active;
  return forListing[0] ?? null;
}

export function indexMediaOrdersByListingId(
  orders: MediaOrderStatusView[],
): Record<string, MediaOrderStatusView> {
  const byListing: Record<string, MediaOrderStatusView[]> = {};
  for (const order of orders) {
    const id = String(order.listing_id);
    if (!byListing[id]) byListing[id] = [];
    byListing[id].push(order);
  }
  const out: Record<string, MediaOrderStatusView> = {};
  for (const [listingId, rows] of Object.entries(byListing)) {
    const picked = pickPrimaryMediaOrderForListing(rows, listingId);
    if (picked) out[listingId] = picked;
  }
  return out;
}

/**
 * Read-only UX state for post-checkout dashboard banner / listing card.
 * Does not mutate payment or editorial state.
 */
export function resolveMediaPaymentUx(params: {
  /** True when user just returned from Stripe with payment=success for this listing. */
  paymentSuccessContext: boolean;
  listingStatus: string | null | undefined;
  mediaOrder: MediaOrderStatusView | null | undefined;
}): {
  ux: MediaPaymentUxKey | null;
  editorial: MediaEditorialUxKey | null;
  showEditorial: boolean;
  shouldRefresh: boolean;
} {
  const listingStatus = String(params.listingStatus ?? "");
  const media = params.mediaOrder ?? null;
  const editorial = media ? mapMediaEditorialStatusToUx(media.editorial_status) : null;

  if (media?.payment_status === "failed") {
    return {
      ux: "mediaFailed",
      editorial,
      showEditorial: false,
      shouldRefresh: false,
    };
  }

  if (media?.payment_status === "paid" && listingStatus === "active") {
    return {
      ux: "listingActiveMediaPaid",
      editorial,
      showEditorial: editorial !== null && editorial !== "cancelled",
      shouldRefresh: false,
    };
  }

  if (media?.payment_status === "pending" && listingStatus === "active") {
    return {
      ux: "listingActiveMediaPending",
      editorial,
      showEditorial: false,
      shouldRefresh: params.paymentSuccessContext,
    };
  }

  if (params.paymentSuccessContext) {
    if (listingStatus !== "active" || (media && media.payment_status === "pending")) {
      return {
        ux: "processing",
        editorial,
        showEditorial: false,
        shouldRefresh: true,
      };
    }
    if (!media) {
      return {
        ux: "listingOnlySuccess",
        editorial: null,
        showEditorial: false,
        shouldRefresh: listingStatus !== "active",
      };
    }
  }

  // Card context (no success query): show paid Media quietly if present
  if (media?.payment_status === "paid") {
    return {
      ux: "listingActiveMediaPaid",
      editorial,
      showEditorial: listingStatus === "active" && editorial !== null && editorial !== "cancelled",
      shouldRefresh: false,
    };
  }

  if (media?.payment_status === "pending") {
    return {
      ux: "listingActiveMediaPending",
      editorial,
      showEditorial: false,
      shouldRefresh: false,
    };
  }

  return { ux: null, editorial: null, showEditorial: false, shouldRefresh: false };
}

export function mediaPackageLabelKey(pkg: unknown): MediaPackageId | null {
  return isMediaPackageId(pkg) ? pkg : null;
}

/** Bounded refresh: at most this many extra polls after initial read. */
export const MEDIA_STATUS_MAX_REFRESHES = 2;
export const MEDIA_STATUS_REFRESH_MS = 2000;
