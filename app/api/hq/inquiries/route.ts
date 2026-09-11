import { NextRequest, NextResponse } from "next/server";
import {
  assertHqAdminFromBearer,
  extractBearerToken,
} from "@/lib/hqAdminAuth";
import {
  HQ_FALLBACK_NOTIFICATION_STATUSES,
  NO_STORE_HEADERS,
  inquiryNeedsHqFallback,
  parseHqInquiryListQuery,
  parseHqInquiryPatch,
  type InquiryNotificationStatus,
} from "@/lib/listingInquiry";

export const runtime = "nodejs";

function jsonError(status: number, error: string, error_code = "server_error") {
  return NextResponse.json(
    { success: false, error, error_code },
    { status, headers: NO_STORE_HEADERS },
  );
}

export async function GET(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return jsonError(auth.status, auth.error, auth.status === 403 ? "forbidden" : "auth_required");
  }

  const parsed = parseHqInquiryListQuery(req.nextUrl.searchParams);
  if (!parsed.ok) {
    return jsonError(parsed.status, parsed.error, parsed.error_code);
  }

  let query = auth.supabase
    .from("listing_inquiries")
    .select(
      "id, listing_id, seller_id, buyer_phone, message, status, notification_status, notification_error_code, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(parsed.limit);

  if (parsed.view === "fallback") {
    query = query.in("notification_status", [...HQ_FALLBACK_NOTIFICATION_STATUSES]);
  }
  if (parsed.cursor) {
    query = query.lt("created_at", parsed.cursor);
  }

  const { data, error } = await query;

  if (error) {
    const missingTable =
      error.code === "42P01" || /listing_inquiries/i.test(error.message ?? "");
    return jsonError(
      missingTable ? 503 : 500,
      missingTable
        ? "Tabela listing_inquiries nu este aplicată."
        : "Nu am putut încărca solicitările.",
      missingTable ? "table_missing" : "server_error",
    );
  }

  const rows = data ?? [];
  const listingIds = Array.from(
    new Set(rows.map((row) => String(row.listing_id || "")).filter(Boolean)),
  );
  const titles: Record<string, string> = {};
  if (listingIds.length > 0) {
    const { data: listings } = await auth.supabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);
    for (const listing of listings ?? []) {
      titles[String(listing.id)] = String(listing.title || "").trim() || "Anunț";
    }
  }

  const inquiries = rows.map((row) => {
    const notificationStatus = String(
      row.notification_status || "pending",
    ) as InquiryNotificationStatus;
    return {
      id: row.id,
      listing_id: row.listing_id,
      listing_title: titles[String(row.listing_id)] || "Anunț",
      seller_id: row.seller_id,
      buyer_phone: row.buyer_phone,
      message: row.message,
      status: row.status,
      notification_status: notificationStatus,
      notification_error_code: row.notification_error_code,
      created_at: row.created_at,
      needs_hq: inquiryNeedsHqFallback(notificationStatus),
    };
  });

  const last = inquiries[inquiries.length - 1];
  const next_cursor =
    inquiries.length === parsed.limit && last?.created_at ? String(last.created_at) : null;

  return NextResponse.json(
    { success: true, view: parsed.view, inquiries, next_cursor },
    { headers: NO_STORE_HEADERS },
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return jsonError(auth.status, auth.error, auth.status === 403 ? "forbidden" : "auth_required");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Body JSON invalid.", "validation_error");
  }

  const parsed = parseHqInquiryPatch(body);
  if (!parsed.ok) {
    return jsonError(parsed.status, parsed.error, parsed.error_code);
  }

  const { data, error } = await auth.supabase
    .from("listing_inquiries")
    .update({ status: parsed.status })
    .eq("id", parsed.id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return jsonError(500, "Nu am putut actualiza solicitarea.", "persist_failed");
  }
  if (!data?.id) {
    return jsonError(404, "Solicitarea nu a fost găsită.", "not_found");
  }

  return NextResponse.json({ success: true, id: data.id, status: data.status }, { headers: NO_STORE_HEADERS });
}
