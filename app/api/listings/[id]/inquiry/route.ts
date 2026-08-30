import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  MAX_INQUIRY_BODY_BYTES,
  validateListingInquiryBody,
} from "@/lib/listingInquiry";
import {
  notificationStatusFromResult,
  notifySellerOfInquiry,
} from "@/lib/notifySeller";

export const runtime = "nodejs";

function jsonError(status: number, error_code: string, message: string) {
  return NextResponse.json({ success: false, error: message, error_code }, { status });
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveSellerEmail(
  sellerUserId: string,
): Promise<string | null> {
  const admin = createServiceClient();
  if (!admin) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", sellerUserId)
    .maybeSingle();

  void profile;

  try {
    const { data, error } = await admin.auth.admin.getUserById(sellerUserId);
    if (error || !data.user?.email) return null;
    const email = data.user.email.trim();
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

async function recordHqFallback(input: {
  listingId: string;
  listingTitle: string;
  sellerUserId: string;
  reason: string;
}) {
  const admin = createServiceClient();
  if (!admin) return;
  try {
    await admin.from("leads").insert({
      lead_type: "buyer",
      campaign_key: "listing_inquiry",
      language: "ro",
      source: "listing_inquiry",
      legal_basis: "consent",
      asset_summary: input.listingTitle.slice(0, 180),
      notes: `inquiry_hq_fallback listing=${input.listingId} reason=${input.reason}`,
      status: "new",
    });
  } catch {
    // HQ table may not exist locally; persistence of the inquiry remains the source of truth.
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: listingIdParam } = await context.params;

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_INQUIRY_BODY_BYTES) {
    return jsonError(413, "validation_error", "Payload prea mare.");
  }

  let rawBody: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_INQUIRY_BODY_BYTES) {
      return jsonError(413, "validation_error", "Payload prea mare.");
    }
    rawBody = text ? JSON.parse(text) : null;
  } catch {
    return jsonError(400, "validation_error", "Body JSON invalid.");
  }

  const validated = validateListingInquiryBody(listingIdParam, rawBody);
  if (!validated.ok) {
    return jsonError(validated.status, validated.error_code, validated.message);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError(401, "auth_required", "Autentifică-te pentru a solicita detalii.");
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, user_id, title, status, is_seed")
    .eq("id", validated.data.listingId)
    .maybeSingle();

  if (listingError) {
    console.warn("[inquiry] listing lookup failed", {
      code: listingError.code ?? null,
    });
    return jsonError(500, "server_error", "Solicitarea nu a putut fi înregistrată.");
  }

  if (!listing || listing.status !== "active" || listing.is_seed === true) {
    return jsonError(404, "listing_not_found", "Anunțul nu este disponibil.");
  }

  const sellerUserId =
    typeof listing.user_id === "string" && listing.user_id.trim()
      ? listing.user_id.trim()
      : "";
  if (!sellerUserId) {
    return jsonError(422, "seller_unavailable", "Vânzătorul nu este disponibil.");
  }
  if (sellerUserId === user.id) {
    return jsonError(403, "own_listing", "Nu poți solicita detalii la anunțul tău.");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("listing_inquiries")
    .insert({
      listing_id: validated.data.listingId,
      buyer_user_id: user.id,
      buyer_phone: validated.data.phone,
      message: validated.data.message,
      notification_status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    const missingTable =
      insertError?.code === "42P01" ||
      /listing_inquiries/i.test(insertError?.message ?? "");
    console.warn("[inquiry] persist failed", {
      code: insertError?.code ?? null,
      missingTable,
    });
    return jsonError(
      missingTable ? 503 : 500,
      missingTable ? "table_missing" : "persist_failed",
      "Solicitarea nu a putut fi înregistrată.",
    );
  }

  let sellerEmail: string | null = null;
  try {
    sellerEmail = await resolveSellerEmail(sellerUserId);
  } catch {
    sellerEmail = null;
  }

  let notifyResult;
  try {
    notifyResult = await notifySellerOfInquiry({
      sellerEmail,
      listingTitle: typeof listing.title === "string" ? listing.title : "Anunț QuickExit",
      listingId: validated.data.listingId,
    });
  } catch {
    notifyResult = { ok: false as const, reason: "send_failed" as const };
  }

  const notificationStatus = notificationStatusFromResult(notifyResult);
  const notified = notifyResult.ok;

  const admin = createServiceClient();
  if (admin) {
    await admin
      .from("listing_inquiries")
      .update({
        notification_status: notificationStatus,
        notified_at: notified ? new Date().toISOString() : null,
        hq_fallback_at: notified ? null : new Date().toISOString(),
      })
      .eq("id", inserted.id);
  }

  if (!notified) {
    await recordHqFallback({
      listingId: validated.data.listingId,
      listingTitle: typeof listing.title === "string" ? listing.title : "listing",
      sellerUserId,
      reason: notifyResult.reason,
    });
  }

  return NextResponse.json({
    success: true,
    persisted: true,
    notified,
    notification_status: notificationStatus,
  });
}
