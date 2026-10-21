/**
 * Public discovery sort: effective_sort_at DESC, id DESC.
 * effective_sort_at is a DB generated column = GREATEST(created_at, COALESCE(bumped_at, created_at)).
 */

export const PUBLIC_LISTING_SORT_PRIMARY = "effective_sort_at" as const;
export const PUBLIC_LISTING_SORT_TIEBREAK = "id" as const;

export type ListingBumpEligibilityInput = {
  status?: unknown;
  is_seed?: unknown;
  availability_status?: unknown;
};

export type ListingBumpDenialReason =
  | "missing_listing"
  | "not_active"
  | "seed_listing"
  | "availability_blocked";

export function evaluateListingBumpEligibility(
  listing: ListingBumpEligibilityInput | null | undefined,
): { ok: true } | { ok: false; reason: ListingBumpDenialReason } {
  if (!listing) return { ok: false, reason: "missing_listing" };
  if (listing.status !== "active") return { ok: false, reason: "not_active" };
  if (listing.is_seed !== false) return { ok: false, reason: "seed_listing" };
  const availability = String(listing.availability_status ?? "");
  if (availability !== "available" && availability !== "needs_confirmation") {
    return { ok: false, reason: "availability_blocked" };
  }
  return { ok: true };
}

export function listingBumpDenialMessage(reason: ListingBumpDenialReason): string {
  switch (reason) {
    case "missing_listing":
      return "Anunțul nu a fost găsit.";
    case "not_active":
      return "Doar anunțurile active pot fi aduse primul.";
    case "seed_listing":
      return "Anunțurile seed nu pot fi aduse primul.";
    case "availability_blocked":
      return "Anunțul nu este disponibil public (sold/archived).";
    default:
      return "Anunțul nu este eligibil pentru bump.";
  }
}
