import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
import {
  NO_STORE_HEADERS,
  isListingInquiryId,
  isSafePublicInquiryError,
  isSameOriginMutationRequest,
  mapInquiryWriteError,
  parseSellerInquiryStatusBody,
  publicInquiryErrorMessage,
  type InquiryLocale,
} from "@/lib/listingInquiry";

export const runtime = "nodejs";

function localeFromRequest(req: NextRequest): InquiryLocale {
  const header = req.headers.get("accept-language")?.toLowerCase() ?? "";
  return header.startsWith("en") ? "en" : "ro";
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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const locale = localeFromRequest(req);
  if (!isSameOriginMutationRequest(req.headers)) {
    return jsonError(403, "origin_rejected", locale);
  }

  const { id } = await context.params;
  if (!isListingInquiryId(id)) {
    return jsonError(400, "validation_error", locale);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "validation_error", locale);
  }

  const parsed = parseSellerInquiryStatusBody(body);
  if (!parsed.ok) {
    return jsonError(parsed.status, parsed.error_code, locale);
  }

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

  const { data, error } = await supabase.rpc("listing_inquiries_seller_set_status", {
    inquiry_id: id.trim(),
    next_status: parsed.status,
  });

  if (error) {
    const mapped = mapInquiryWriteError(error);
    return jsonError(mapped.status, mapped.error_code, locale);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object" || !("id" in row)) {
    return jsonError(404, "not_found", locale);
  }

  return NextResponse.json(
    { success: true, id: row.id, status: row.status },
    { headers: NO_STORE_HEADERS },
  );
}
