import { NextRequest, NextResponse } from "next/server";
import {
  createFinancingServiceClient,
  findFinancingDuplicate,
  getClientIp,
  insertFinancingLead,
  insertFinancingLeadEvent,
  isListingEligibleForFinancingRequest,
  MAX_FINANCING_REQUEST_BODY_BYTES,
  recalculateFinancingFromListing,
  validateFinancingRequestBody,
  buildFinancingLeadNotes,
  checkFinancingRateLimit,
  type FinancingListingRow,
} from "@/lib/financingLead";

export const runtime = "nodejs";

function jsonError(status: number, error_code: string, message = "Cererea nu a putut fi procesată.") {
  return NextResponse.json({ success: false, error: message, error_code }, { status });
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_FINANCING_REQUEST_BODY_BYTES) {
    return jsonError(413, "validation_error", "Payload prea mare.");
  }

  let rawBody: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_FINANCING_REQUEST_BODY_BYTES) {
      return jsonError(413, "validation_error", "Payload prea mare.");
    }
    rawBody = text ? JSON.parse(text) : null;
  } catch {
    return jsonError(400, "validation_error", "Body JSON invalid.");
  }

  const ip = getClientIp(req.headers);
  const rateLimit = checkFinancingRateLimit(ip);
  if (!rateLimit.allowed) {
    return jsonError(429, "rate_limited");
  }

  const validated = validateFinancingRequestBody(rawBody);
  if (!validated.ok) {
    return jsonError(validated.status, validated.error_code, validated.message);
  }

  if (validated.honeypotTriggered) {
    return NextResponse.json({ success: true });
  }

  const body = validated.data;
  const supabase = createFinancingServiceClient();
  if (!supabase) {
    return jsonError(500, "server_error");
  }

  const { data: listing, error: fetchError } = await supabase
    .from("listings")
    .select("id, user_id, title, category, status, exit_price, sale_strategy, details")
    .eq("id", body.listingId)
    .maybeSingle();

  if (fetchError) {
    console.error("[financing/request] listing fetch failed", fetchError.message);
    return jsonError(500, "server_error");
  }

  if (!listing) {
    return jsonError(404, "listing_not_found");
  }

  const listingRow = listing as FinancingListingRow;

  if (!isListingEligibleForFinancingRequest(listingRow)) {
    return jsonError(422, "not_eligible");
  }

  const calc = recalculateFinancingFromListing(
    listingRow,
    body.depositPct,
    body.interestPct,
    body.termMonths,
  );

  if (!calc) {
    return jsonError(422, "not_eligible");
  }

  const isDuplicate = await findFinancingDuplicate(supabase, body.phone, body.listingId);
  if (isDuplicate) {
    return jsonError(409, "duplicate_request");
  }

  const sellerUserId = String(listingRow.user_id ?? "").trim();
  if (!sellerUserId) {
    return jsonError(422, "not_eligible");
  }

  let notes: string;
  try {
    notes = buildFinancingLeadNotes({
      listingId: body.listingId,
      sellerUserId,
      calc,
      depositPct: body.depositPct,
      interestPct: body.interestPct,
      termMonths: body.termMonths,
    });
  } catch (err) {
    console.error("[financing/request] notes build failed", err);
    return jsonError(500, "server_error");
  }

  const inserted = await insertFinancingLead(supabase, {
    body,
    listing: listingRow,
    calc,
    notes,
  });

  if (!inserted.ok) {
    return jsonError(500, "server_error");
  }

  await insertFinancingLeadEvent(supabase, {
    leadId: inserted.leadId,
    listingId: body.listingId,
    sellerUserId,
    depositPct: body.depositPct,
    interestPct: body.interestPct,
    termMonths: body.termMonths,
    monthlyPaymentEstimate: calc.monthlyPayment,
  });

  return NextResponse.json({ success: true });
}
