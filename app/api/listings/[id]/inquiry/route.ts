import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
import {
  MAX_INQUIRY_BODY_BYTES,
  NO_STORE_HEADERS,
  checkInquiryRateLimit,
  getClientIp,
  isPublicInquirableListing,
  isSafePublicInquiryError,
  isSameOriginMutationRequest,
  LISTING_INQUIRY_CONSENT_VERSION,
  mapInquiryWriteError,
  publicInquiryErrorMessage,
  validateListingInquiryBody,
  type InquiryLocale,
} from "@/lib/listingInquiry";
import {
  notificationErrorCodeFromResult,
  notificationStatusFromResult,
  notifySellerOfInquiry,
} from "@/lib/notifySeller";

export const runtime = "nodejs";

function jsonError(status: number, error_code: string, locale: InquiryLocale) {
  const safeCode = isSafePublicInquiryError(error_code) ? error_code : "server_error";
  return NextResponse.json(
    {
      success: false,
      error: publicInquiryErrorMessage(safeCode, locale),
      error_code: safeCode,
    },
    { status, headers: NO_STORE_HEADERS },
  );
}

function jsonOk() {
  return NextResponse.json(
    { success: true, persisted: true },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function createUserClient(bearer: string) {
  return createClient(getSupabaseProjectUrl(), getSupabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveSellerEmail(sellerUserId: string): Promise<string | null> {
  const admin = createServiceClient();
  if (!admin) return null;

  try {
    const { data, error } = await admin.auth.admin.getUserById(sellerUserId);
    if (error || !data.user?.email) return null;
    const email = data.user.email.trim();
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: listingIdParam } = await context.params;
  let locale: InquiryLocale = "ro";

  if (!isSameOriginMutationRequest(req.headers)) {
    return jsonError(403, "origin_rejected", locale);
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_INQUIRY_BODY_BYTES) {
    return jsonError(413, "validation_error", locale);
  }

  let rawBody: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_INQUIRY_BODY_BYTES) {
      return jsonError(413, "validation_error", locale);
    }
    rawBody = text ? JSON.parse(text) : null;
  } catch {
    return jsonError(400, "validation_error", locale);
  }

  const validated = validateListingInquiryBody(listingIdParam, rawBody);
  if (!validated.ok) {
    return jsonError(validated.status, validated.error_code, locale);
  }
  locale = validated.data.locale;

  const bearer = extractBearerToken(req);
  if (!bearer) {
    return jsonError(401, "auth_required", locale);
  }

  let supabase;
  try {
    supabase = createUserClient(bearer);
  } catch {
    return jsonError(500, "server_error", locale);
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError(401, "auth_required", locale);
  }

  const ip = getClientIp(req.headers);
  const rate = checkInquiryRateLimit({ ip, userId: user.id });
  if (!rate.allowed) {
    return jsonError(429, "rate_limited", locale);
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, user_id, title, status, is_seed, expires_at")
    .eq("id", validated.data.listingId)
    .maybeSingle();

  if (listingError) {
    console.warn("[inquiry] listing lookup failed", {
      code: listingError.code ?? null,
    });
    return jsonError(500, "server_error", locale);
  }

  if (!listing || !isPublicInquirableListing(listing)) {
    return jsonError(404, "listing_unavailable", locale);
  }

  const sellerUserId = String(listing.user_id).trim();
  if (sellerUserId === user.id) {
    return jsonError(403, "own_listing", locale);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("listing_inquiries")
    .insert({
      listing_id: validated.data.listingId,
      buyer_phone: validated.data.phone,
      message: validated.data.message,
      consent_version: LISTING_INQUIRY_CONSENT_VERSION,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    const mapped = mapInquiryWriteError(insertError);
    console.warn("[inquiry] persist failed", {
      code: insertError?.code ?? null,
      mapped: mapped.error_code,
    });
    return jsonError(mapped.status, mapped.error_code, locale);
  }

  const admin = createServiceClient();
  if (admin) {
    const { data: claimed } = await admin
      .from("listing_inquiries")
      .update({ notification_status: "sending" })
      .eq("id", inserted.id)
      .eq("notification_status", "pending")
      .select("id")
      .maybeSingle();

    if (claimed?.id) {
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
          locale,
        });
      } catch {
        notifyResult = { ok: false as const, reason: "send_failed" as const };
      }

      const notificationStatus = notificationStatusFromResult(notifyResult);
      const notificationErrorCode = notificationErrorCodeFromResult(notifyResult);

      await admin
        .from("listing_inquiries")
        .update({
          notification_status: notificationStatus,
          notification_error_code: notificationErrorCode,
        })
        .eq("id", inserted.id);
    }
  }

  return jsonOk();
}
