import { NextRequest, NextResponse } from "next/server";
import {
  assertHqAdminFromBearer,
  extractBearerToken,
} from "@/lib/hqAdminAuth";
import {
  HQ_DEMAND_COLUMNS,
  HQ_DEMAND_OFFER_COLUMNS,
  HQ_LISTING_COLUMNS,
  HQ_LISTING_OFFER_COLUMNS,
  HQ_OVERVIEW_LIMITS,
  HQ_PROFILE_COLUMNS,
  HQ_RISK_RESOLUTION_COLUMNS,
  HQ_VALUATION_COLUMNS,
} from "@/lib/hqOverview";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function jsonError(status: number, error: string, error_code = "server_error") {
  return NextResponse.json(
    { success: false, error, error_code },
    { status, headers: NO_STORE },
  );
}

/**
 * GET /api/hq/overview — Main HQ operational snapshot (service-role after HQ auth).
 */
export async function GET(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return jsonError(
      auth.status,
      auth.error,
      auth.status === 403 ? "forbidden" : "auth_required",
    );
  }

  const sb = auth.supabase;

  const [
    listingsRes,
    demandsRes,
    listingOffersRes,
    demandOffersRes,
    profilesRes,
    valuationRes,
    risksRes,
  ] = await Promise.all([
    sb
      .from("listings")
      .select(HQ_LISTING_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(HQ_OVERVIEW_LIMITS.listings),
    sb
      .from("demands")
      .select(HQ_DEMAND_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(HQ_OVERVIEW_LIMITS.demands),
    sb
      .from("listing_offers")
      .select(HQ_LISTING_OFFER_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(HQ_OVERVIEW_LIMITS.listingOffers),
    sb
      .from("demand_offers")
      .select(HQ_DEMAND_OFFER_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(HQ_OVERVIEW_LIMITS.demandOffers),
    sb
      .from("profiles")
      .select(HQ_PROFILE_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(HQ_OVERVIEW_LIMITS.profiles),
    sb
      .from("valuation_reports")
      .select(HQ_VALUATION_COLUMNS)
      .order("generated_at", { ascending: false })
      .limit(HQ_OVERVIEW_LIMITS.valuationReports),
    sb
      .from("admin_risk_resolutions")
      .select(HQ_RISK_RESOLUTION_COLUMNS)
      .order("resolved_at", { ascending: false })
      .limit(HQ_OVERVIEW_LIMITS.riskResolutions),
  ]);

  const coreError =
    listingsRes.error ||
    demandsRes.error ||
    listingOffersRes.error ||
    demandOffersRes.error ||
    profilesRes.error ||
    valuationRes.error;

  if (coreError) {
    console.error("[hq/overview] query failed", {
      message: coreError.message,
      code: coreError.code,
      admin: auth.userEmail,
    });
    return jsonError(500, "internal_error", "server_error");
  }

  let riskTableAvailable = true;
  let riskResolutions = risksRes.data ?? [];
  if (risksRes.error) {
    // Table may be missing in some environments — HQ UI already handles this.
    riskTableAvailable = false;
    riskResolutions = [];
    console.error("[hq/overview] risk resolutions unavailable", {
      message: risksRes.error.message,
      code: risksRes.error.code,
      admin: auth.userEmail,
    });
  }

  return NextResponse.json(
    {
      success: true,
      listings: listingsRes.data ?? [],
      demands: demandsRes.data ?? [],
      listingOffers: listingOffersRes.data ?? [],
      demandOffers: demandOffersRes.data ?? [],
      profiles: profilesRes.data ?? [],
      valuationReports: valuationRes.data ?? [],
      riskResolutions,
      riskTableAvailable,
      limits: HQ_OVERVIEW_LIMITS,
    },
    { headers: NO_STORE },
  );
}
