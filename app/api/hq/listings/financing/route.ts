import { NextRequest, NextResponse } from "next/server";
import { assertHqAdminFromBearer, extractBearerToken } from "@/lib/hqAdminAuth";
import {
  getListingFinancingEligibility,
  isListingFinancingActive,
  mergeListingFinancingDetails,
  type FinancingEligibilityRejectReason,
} from "@/lib/listingFinancingAdmin";

export const runtime = "nodejs";

const ELIGIBILITY_ERROR_MESSAGES: Record<FinancingEligibilityRejectReason, string> = {
  not_auto: "Finanțarea este disponibilă doar pentru categoria Auto & Moto.",
  not_active: "Listarea trebuie să fie activă pentru a activa finanțarea.",
  invalid_price: "Prețul de exit trebuie să fie valid.",
  price_on_request: "Listările cu preț la cerere nu sunt eligibile pentru finanțare.",
  auction: "Licitațiile nu sunt eligibile pentru finanțare.",
};

export async function PATCH(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Payload JSON invalid." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: "Payload invalid." }, { status: 400 });
  }

  const listingId = (body as { listingId?: unknown }).listingId;
  const enabled = (body as { enabled?: unknown }).enabled;

  if (typeof listingId !== "string" || !listingId.trim()) {
    return NextResponse.json({ success: false, error: "listingId lipsă sau invalid." }, { status: 400 });
  }

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ success: false, error: "enabled trebuie să fie boolean." }, { status: 400 });
  }

  const { supabase } = auth;

  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("id, user_id, category, status, exit_price, sale_strategy, details")
    .eq("id", listingId.trim())
    .maybeSingle();

  if (fetchError) {
    console.error("[hq/listings/financing] fetch failed", fetchError.message);
    return NextResponse.json({ success: false, error: "Nu am putut citi listarea." }, { status: 500 });
  }

  if (!listing) {
    return NextResponse.json({ success: false, error: "Listarea nu a fost găsită." }, { status: 404 });
  }

  if (enabled) {
    const eligibility = getListingFinancingEligibility(listing);
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          success: false,
          error: ELIGIBILITY_ERROR_MESSAGES[eligibility.reason],
          reason: eligibility.reason,
        },
        { status: 422 },
      );
    }
  }

  const mergedDetails = mergeListingFinancingDetails(listing.details, enabled);

  const { error: updateError } = await supabase
    .from("listings")
    .update({ details: mergedDetails })
    .eq("id", listing.id);

  if (updateError) {
    console.error("[hq/listings/financing] update failed", updateError.message);
    return NextResponse.json({ success: false, error: "Nu am putut actualiza finanțarea." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    listingId: listing.id,
    userId: listing.user_id,
    financing_enabled: mergedDetails.financing_enabled === true,
    financing_partner:
      typeof mergedDetails.financing_partner === "string" ? mergedDetails.financing_partner : null,
    financing_active: isListingFinancingActive(mergedDetails),
    details: mergedDetails,
  });
}
