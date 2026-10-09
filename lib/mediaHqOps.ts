import {
  MEDIA_EDITORIAL_STATUSES,
  type MediaEditorialStatus,
  type MediaPackageId,
  type MediaPaymentStatus,
  type MediaValueTier,
} from "@/lib/mediaPricing";
import { isMediaPackageId } from "@/lib/mediaPricing";

export const MEDIA_HQ_TABS = [
  "queued",
  "needs_info",
  "in_research",
  "in_production",
  "published",
  "closed",
] as const;

export type MediaHqTab = (typeof MEDIA_HQ_TABS)[number];

/** Allowed editorial transitions. payment_status is never mutated here. */
export const MEDIA_EDITORIAL_TRANSITIONS: Record<
  MediaEditorialStatus,
  readonly MediaEditorialStatus[]
> = {
  queued: ["in_research", "needs_info", "rejected", "cancelled"],
  needs_info: ["in_research", "rejected", "cancelled"],
  in_research: ["needs_info", "in_production", "rejected", "cancelled"],
  in_production: ["published", "rejected", "cancelled"],
  published: [],
  rejected: [],
  cancelled: [],
};

export const MEDIA_HQ_TAB_STATUSES: Record<MediaHqTab, readonly MediaEditorialStatus[]> = {
  queued: ["queued"],
  needs_info: ["needs_info"],
  in_research: ["in_research"],
  in_production: ["in_production"],
  published: ["published"],
  closed: ["rejected", "cancelled"],
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isMediaEditorialStatus(value: unknown): value is MediaEditorialStatus {
  return (
    typeof value === "string" &&
    (MEDIA_EDITORIAL_STATUSES as readonly string[]).includes(value)
  );
}

export function isMediaHqTab(value: unknown): value is MediaHqTab {
  return typeof value === "string" && (MEDIA_HQ_TABS as readonly string[]).includes(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function canTransitionMediaEditorial(
  from: MediaEditorialStatus,
  to: MediaEditorialStatus,
): boolean {
  if (from === to) return false;
  return MEDIA_EDITORIAL_TRANSITIONS[from].includes(to);
}

export type MediaEditorialTransitionInput = {
  orderId: unknown;
  toStatus: unknown;
  rejectionReason?: unknown;
  currentStatus: MediaEditorialStatus;
  currentFulfilledAt: string | null;
};

export type MediaEditorialTransitionResult =
  | {
      ok: true;
      orderId: string;
      fromStatus: MediaEditorialStatus;
      toStatus: MediaEditorialStatus;
      patch: {
        editorial_status: MediaEditorialStatus;
        rejection_reason?: string | null;
        fulfilled_at?: string;
        cancelled_at?: string;
      };
    }
  | { ok: false; error: string; error_code: string };

/**
 * Validate and build a media_orders UPDATE patch for editorial workflow.
 * Never includes payment_status.
 */
export function buildMediaEditorialTransition(
  input: MediaEditorialTransitionInput,
): MediaEditorialTransitionResult {
  if (!isUuid(input.orderId)) {
    return { ok: false, error: "Invalid order id.", error_code: "validation_error" };
  }
  if (!isMediaEditorialStatus(input.toStatus)) {
    return { ok: false, error: "Invalid editorial status.", error_code: "validation_error" };
  }
  if (!canTransitionMediaEditorial(input.currentStatus, input.toStatus)) {
    return {
      ok: false,
      error: `Transition ${input.currentStatus} → ${input.toStatus} is not allowed.`,
      error_code: "invalid_transition",
    };
  }

  const patch: {
    editorial_status: MediaEditorialStatus;
    rejection_reason?: string | null;
    fulfilled_at?: string;
    cancelled_at?: string;
  } = {
    editorial_status: input.toStatus,
  };

  if (input.toStatus === "rejected") {
    const reason =
      typeof input.rejectionReason === "string" ? input.rejectionReason.trim() : "";
    if (reason.length < 3 || reason.length > 2000) {
      return {
        ok: false,
        error: "Rejection requires a reason (3–2000 characters).",
        error_code: "rejection_reason_required",
      };
    }
    patch.rejection_reason = reason;
  }

  if (input.toStatus === "published" && !input.currentFulfilledAt) {
    patch.fulfilled_at = new Date().toISOString();
  }

  if (input.toStatus === "cancelled") {
    patch.cancelled_at = new Date().toISOString();
  }

  return {
    ok: true,
    orderId: input.orderId,
    fromStatus: input.currentStatus,
    toStatus: input.toStatus,
    patch,
  };
}

export type MediaHqOrderListItem = {
  id: string;
  listing_id: string;
  user_id: string;
  package: MediaPackageId | string;
  listing_value_eur_snapshot: number;
  value_tier: MediaValueTier | string;
  amount_ron: number;
  currency: string;
  payment_status: MediaPaymentStatus | string;
  editorial_status: MediaEditorialStatus | string;
  locale: string | null;
  source: string;
  rejection_reason: string | null;
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  listing_title: string;
  listing_status: string | null;
  listing_description: string | null;
  listing_images: string[];
  seller_name: string | null;
};

export function packageLabel(pkg: unknown, locale: "ro" | "en" = "ro"): string {
  if (!isMediaPackageId(pkg)) return String(pkg ?? "—");
  if (pkg === "stories_4") return "4 Stories";
  if (pkg === "stories_8") return "8 Stories";
  return locale === "en" ? "Featured" : "Featured";
}

export function allowedNextStatuses(
  current: MediaEditorialStatus,
): readonly MediaEditorialStatus[] {
  return MEDIA_EDITORIAL_TRANSITIONS[current];
}

export function parseMediaHqListQuery(searchParams: URLSearchParams):
  | { ok: true; tab: MediaHqTab; limit: number }
  | { ok: false; status: number; error: string; error_code: string } {
  const tabRaw = searchParams.get("tab") || "queued";
  if (!isMediaHqTab(tabRaw)) {
    return {
      ok: false,
      status: 400,
      error: "Invalid tab.",
      error_code: "validation_error",
    };
  }
  const limitRaw = Number(searchParams.get("limit") || "50");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(100, Math.max(1, Math.floor(limitRaw)))
    : 50;
  return { ok: true, tab: tabRaw, limit };
}
