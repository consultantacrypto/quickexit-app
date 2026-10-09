import { NextRequest, NextResponse } from "next/server";
import {
  assertHqAdminFromBearer,
  extractBearerToken,
} from "@/lib/hqAdminAuth";
import {
  buildMediaEditorialTransition,
  isMediaEditorialStatus,
  isUuid,
  MEDIA_HQ_TAB_STATUSES,
  MEDIA_HQ_TABS,
  parseMediaHqListQuery,
  type MediaHqOrderListItem,
} from "@/lib/mediaHqOps";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function jsonError(status: number, error: string, error_code = "server_error") {
  return NextResponse.json(
    { success: false, error, error_code },
    { status, headers: NO_STORE },
  );
}

function asStringArray(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .slice(0, 12);
}

export async function GET(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return jsonError(
      auth.status,
      auth.error,
      auth.status === 403 ? "forbidden" : "auth_required",
    );
  }

  const parsed = parseMediaHqListQuery(req.nextUrl.searchParams);
  if (!parsed.ok) {
    return jsonError(parsed.status, parsed.error, parsed.error_code);
  }

  type MediaOrderDbRow = {
    id: string;
    listing_id: string;
    user_id: string;
    package: string;
    listing_value_eur_snapshot: number;
    value_tier: string;
    amount_ron: number;
    currency: string;
    payment_status: string;
    editorial_status: string;
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
  };

  const statuses = MEDIA_HQ_TAB_STATUSES[parsed.tab];
  // media_orders is not in generated DB types yet — query via untyped client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaOrders = (auth.supabase as any).from("media_orders");
  const { data, error } = await mediaOrders
    .select(
      [
        "id",
        "listing_id",
        "user_id",
        "package",
        "listing_value_eur_snapshot",
        "value_tier",
        "amount_ron",
        "currency",
        "payment_status",
        "editorial_status",
        "locale",
        "source",
        "rejection_reason",
        "created_at",
        "paid_at",
        "fulfilled_at",
        "cancelled_at",
        "updated_at",
        "stripe_checkout_session_id",
        "stripe_payment_intent_id",
      ].join(", "),
    )
    .in("editorial_status", [...statuses])
    .order("created_at", { ascending: false })
    .limit(parsed.limit);

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /media_orders/i.test(error.message ?? "");
    return jsonError(
      missing ? 503 : 500,
      missing
        ? "Tabela media_orders nu este aplicată."
        : "Nu am putut încărca comenzile Media.",
      missing ? "table_missing" : "server_error",
    );
  }

  const rows = ((data ?? []) as MediaOrderDbRow[]).slice().sort((a, b) => {
    const aKey = a.paid_at || a.created_at;
    const bKey = b.paid_at || b.created_at;
    return String(bKey).localeCompare(String(aKey));
  });
  const listingIds = Array.from(
    new Set(rows.map((r) => String(r.listing_id || "")).filter(Boolean)),
  );
  const userIds = Array.from(
    new Set(rows.map((r) => String(r.user_id || "")).filter(Boolean)),
  );

  const listingsById: Record<
    string,
    {
      title: string;
      status: string | null;
      description: string | null;
      images: string[];
    }
  > = {};
  if (listingIds.length > 0) {
    const { data: listings } = await auth.supabase
      .from("listings")
      .select("id, title, status, description, images")
      .in("id", listingIds);
    for (const listing of listings ?? []) {
      listingsById[String(listing.id)] = {
        title: String(listing.title || "").trim() || "Anunț",
        status: listing.status != null ? String(listing.status) : null,
        description:
          listing.description != null ? String(listing.description) : null,
        images: asStringArray(listing.images),
      };
    }
  }

  const namesByUser: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await auth.supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const profile of profiles ?? []) {
      const name = String(profile.full_name || "").trim();
      namesByUser[String(profile.id)] = name || null;
    }
  }

  const orders: MediaHqOrderListItem[] = rows.map((row) => {
    const listing = listingsById[String(row.listing_id)];
    return {
      id: String(row.id),
      listing_id: String(row.listing_id),
      user_id: String(row.user_id),
      package: row.package,
      listing_value_eur_snapshot: Number(row.listing_value_eur_snapshot),
      value_tier: row.value_tier,
      amount_ron: Number(row.amount_ron),
      currency: String(row.currency || "ron"),
      payment_status: row.payment_status,
      editorial_status: row.editorial_status,
      locale: row.locale != null ? String(row.locale) : null,
      source: String(row.source || ""),
      rejection_reason:
        row.rejection_reason != null ? String(row.rejection_reason) : null,
      created_at: String(row.created_at),
      paid_at: row.paid_at != null ? String(row.paid_at) : null,
      fulfilled_at: row.fulfilled_at != null ? String(row.fulfilled_at) : null,
      cancelled_at: row.cancelled_at != null ? String(row.cancelled_at) : null,
      updated_at: String(row.updated_at),
      stripe_checkout_session_id:
        row.stripe_checkout_session_id != null
          ? String(row.stripe_checkout_session_id)
          : null,
      stripe_payment_intent_id:
        row.stripe_payment_intent_id != null
          ? String(row.stripe_payment_intent_id)
          : null,
      listing_title: listing?.title ?? "Anunț",
      listing_status: listing?.status ?? null,
      listing_description: listing?.description ?? null,
      listing_images: listing?.images ?? [],
      seller_name: namesByUser[String(row.user_id)] ?? null,
    };
  });

  const counts: Record<string, number> = {};
  for (const tab of MEDIA_HQ_TABS) {
    const tabStatuses = MEDIA_HQ_TAB_STATUSES[tab];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countError } = await (auth.supabase as any)
      .from("media_orders")
      .select("id", { count: "exact", head: true })
      .in("editorial_status", [...tabStatuses]);
    counts[tab] = countError ? 0 : count ?? 0;
  }

  return NextResponse.json(
    { success: true, tab: parsed.tab, orders, counts },
    { headers: NO_STORE },
  );
}

export async function PATCH(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return jsonError(
      auth.status,
      auth.error,
      auth.status === 403 ? "forbidden" : "auth_required",
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Body JSON invalid.", "validation_error");
  }

  if (!body || typeof body !== "object") {
    return jsonError(400, "Body JSON invalid.", "validation_error");
  }

  const record = body as Record<string, unknown>;
  const orderId = record.id ?? record.orderId;
  const toStatus = record.editorial_status ?? record.toStatus;
  const rejectionReason = record.rejection_reason ?? record.rejectionReason;

  if (!isUuid(orderId)) {
    return jsonError(400, "Invalid order id.", "validation_error");
  }
  if (!isMediaEditorialStatus(toStatus)) {
    return jsonError(400, "Invalid editorial status.", "validation_error");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaOrdersTable = (auth.supabase as any).from("media_orders");
  const { data: currentRaw, error: loadError } = await mediaOrdersTable
    .select("id, editorial_status, payment_status, fulfilled_at, rejection_reason")
    .eq("id", orderId)
    .maybeSingle();

  if (loadError) {
    return jsonError(500, "Nu am putut citi comanda Media.", "server_error");
  }
  const current = currentRaw as {
    id: string;
    editorial_status: string;
    payment_status: string;
    fulfilled_at: string | null;
    rejection_reason: string | null;
  } | null;
  if (!current) {
    return jsonError(404, "Comanda Media nu a fost găsită.", "not_found");
  }
  if (!isMediaEditorialStatus(current.editorial_status)) {
    return jsonError(500, "Status editorial invalid în DB.", "server_error");
  }

  const built = buildMediaEditorialTransition({
    orderId,
    toStatus,
    rejectionReason,
    currentStatus: current.editorial_status,
    currentFulfilledAt:
      current.fulfilled_at != null ? String(current.fulfilled_at) : null,
  });

  if (!built.ok) {
    return jsonError(
      built.error_code === "invalid_transition" ? 409 : 400,
      built.error,
      built.error_code,
    );
  }

  // Fail closed: never include payment_status in patch.
  if ("payment_status" in built.patch) {
    return jsonError(500, "Internal patch error.", "server_error");
  }

  const { data: updatedRaw, error: updateError } = await mediaOrdersTable
    .update(built.patch)
    .eq("id", built.orderId)
    .select(
      "id, editorial_status, payment_status, rejection_reason, fulfilled_at, cancelled_at, updated_at",
    )
    .maybeSingle();

  const updated = updatedRaw as {
    id: string;
    editorial_status: string;
    payment_status: string;
    rejection_reason: string | null;
    fulfilled_at: string | null;
    cancelled_at: string | null;
    updated_at: string;
  } | null;

  if (updateError || !updated) {
    return jsonError(500, "Nu am putut actualiza statusul editorial.", "server_error");
  }

  if (String(updated.payment_status) !== String(current.payment_status)) {
    console.error("[hq/media-orders] payment_status changed unexpectedly");
    return jsonError(500, "Payment status integrity failure.", "integrity_error");
  }

  return NextResponse.json(
    {
      success: true,
      order: updated,
      from_status: built.fromStatus,
      to_status: built.toStatus,
    },
    { headers: NO_STORE },
  );
}
