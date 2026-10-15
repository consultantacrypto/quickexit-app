/**
 * Authorization for demand-offer media signed URLs / uploads.
 * Path obscurity is never sufficient — prove DB relationship.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isHqAdminEmail } from "@/lib/hqAdminAllowlist";
import {
  objectPathFromPrivateDbRef,
  parseUploaderAndDemandFromObjectPath,
} from "@/lib/demandOfferMedia";

export type DemandOfferMediaActor =
  | "demand_owner"
  | "offer_sender"
  | "hq"
  | "denied";

export type DemandOfferAccessDecision = {
  allowed: boolean;
  actor: DemandOfferMediaActor;
  offerId: string | null;
  demandId: string | null;
  reason:
    | "ok"
    | "unauthenticated"
    | "offer_not_found"
    | "not_participant"
    | "path_mismatch"
    | "invalid_ref";
};

export async function resolveDemandOfferMediaAccess(input: {
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  userId: string;
  userEmail?: string | null;
  /** Prefer offer id when known (dashboard). */
  offerId?: string | null;
  /** Private DB ref or object path. */
  mediaRef: string;
}): Promise<DemandOfferAccessDecision> {
  const objectPath = objectPathFromPrivateDbRef(input.mediaRef);
  if (!objectPath) {
    return {
      allowed: false,
      actor: "denied",
      offerId: null,
      demandId: null,
      reason: "invalid_ref",
    };
  }

  const pathIds = parseUploaderAndDemandFromObjectPath(objectPath);
  if (!pathIds) {
    return {
      allowed: false,
      actor: "denied",
      offerId: null,
      demandId: null,
      reason: "invalid_ref",
    };
  }

  if (isHqAdminEmail(input.userEmail)) {
    return {
      allowed: true,
      actor: "hq",
      offerId: input.offerId ?? null,
      demandId: pathIds.demandId,
      reason: "ok",
    };
  }

  // Prefer service client for relationship lookup (stable under RLS for authz).
  // Still scopes to the offer/demand under evaluation — never broad listing.
  let offerQuery = input.serviceClient
    .from("demand_offers")
    .select("id, demand_id, seller_user_id, images")
    .eq("demand_id", pathIds.demandId)
    .eq("seller_user_id", pathIds.uploaderUserId);

  if (input.offerId) {
    offerQuery = offerQuery.eq("id", input.offerId);
  }

  const { data: offers, error } = await offerQuery.limit(5);
  if (error || !offers?.length) {
    return {
      allowed: false,
      actor: "denied",
      offerId: input.offerId ?? null,
      demandId: pathIds.demandId,
      reason: "offer_not_found",
    };
  }

  const privateRef = input.mediaRef.startsWith("demand-offers/")
    ? input.mediaRef
    : `demand-offers/${objectPath}`;

  const matched = offers.find((row) => {
    const images = Array.isArray(row.images) ? row.images : [];
    return images.some((img) => {
      const s = String(img ?? "");
      return s === privateRef || s === objectPath || s.endsWith(objectPath);
    });
  });

  if (!matched) {
    // Path tamper / guessed object not attached to an offer
    return {
      allowed: false,
      actor: "denied",
      offerId: input.offerId ?? null,
      demandId: pathIds.demandId,
      reason: "path_mismatch",
    };
  }

  if (matched.seller_user_id === input.userId) {
    return {
      allowed: true,
      actor: "offer_sender",
      offerId: matched.id,
      demandId: matched.demand_id,
      reason: "ok",
    };
  }

  const { data: demand, error: demandError } = await input.serviceClient
    .from("demands")
    .select("id, buyer_id")
    .eq("id", matched.demand_id)
    .maybeSingle();

  if (demandError || !demand) {
    return {
      allowed: false,
      actor: "denied",
      offerId: matched.id,
      demandId: matched.demand_id,
      reason: "offer_not_found",
    };
  }

  if (demand.buyer_id === input.userId) {
    return {
      allowed: true,
      actor: "demand_owner",
      offerId: matched.id,
      demandId: matched.demand_id,
      reason: "ok",
    };
  }

  return {
    allowed: false,
    actor: "denied",
    offerId: matched.id,
    demandId: matched.demand_id,
    reason: "not_participant",
  };
}

/** Upload gate: authenticated seller may upload under own uid + existing demand. */
export async function assertDemandOfferUploadAllowed(input: {
  serviceClient: SupabaseClient;
  userId: string;
  demandId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const demandId = String(input.demandId ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(demandId)) {
    return { ok: false, reason: "invalid_demand" };
  }
  const { data, error } = await input.serviceClient
    .from("demands")
    .select("id, status")
    .eq("id", demandId)
    .maybeSingle();
  if (error || !data) return { ok: false, reason: "demand_not_found" };
  // Seller may attach media while submitting an offer; demand must exist.
  // Do not require buyer_id === userId (seller is not the buyer).
  if (data.id !== demandId) return { ok: false, reason: "demand_not_found" };
  return { ok: true };
}
