import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  isMissingRelationError,
  isOptionalAttributionColumnError,
  snapshotFromMetadata,
} from "@/lib/attribution";
import { assertHqAdminFromBearer, extractBearerToken } from "@/lib/hqAdminAuth";
import { houseAccountIds } from "@/lib/hqHouseAccount";
import {
  buildHqMetrics,
  type MetricActorRow,
  type MetricPaymentRow,
} from "@/lib/hqMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const ROW_LIMIT = 5000;

type StripeCache = { at: number; rows: MetricPaymentRow[] };
let stripeCache: StripeCache | null = null;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

async function selectWithFallback(
  supabase: SupabaseClient,
  table: string,
  fullColumns: string,
  baseColumns: string,
  orderColumn: string,
): Promise<{ rows: Record<string, unknown>[]; warning: string | null; truncated: boolean }> {
  const full = await supabase
    .from(table)
    .select(fullColumns)
    .order(orderColumn, { ascending: false })
    .limit(ROW_LIMIT);
  if (!full.error) {
    const rows = (full.data ?? []) as unknown as Record<string, unknown>[];
    return { rows, warning: null, truncated: rows.length >= ROW_LIMIT };
  }
  if (isMissingRelationError(full.error) && !isOptionalAttributionColumnError(full.error)) {
    return {
      rows: [],
      warning: `Tabelul ${table} nu există încă. Aplică migrația înainte de deploy.`,
      truncated: false,
    };
  }
  const base = await supabase
    .from(table)
    .select(baseColumns)
    .order(orderColumn, { ascending: false })
    .limit(ROW_LIMIT);
  if (base.error) {
    return {
      rows: [],
      warning: `Nu am putut citi ${table}.`,
      truncated: false,
    };
  }
  const rows = (base.data ?? []) as unknown as Record<string, unknown>[];
  return {
    rows,
    warning: `Coloanele de atribuire lipsesc pe ${table}. Aplică migrația ca să vezi sursele.`,
    truncated: rows.length >= ROW_LIMIT,
  };
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toActor(row: Record<string, unknown>, actorKey: string): MetricActorRow {
  return {
    id: String(row.id ?? ""),
    actor_id: asText(row[actorKey]),
    status: asText(row.status),
    created_at: asText(row.created_at),
    sold_at: asText(row.sold_at),
    heard_from: asText(row.heard_from),
    attribution_first: row.attribution_first,
  };
}

async function stripeSupplement(existingSessionIds: Set<string>): Promise<MetricPaymentRow[]> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) return [];
  const now = Date.now();
  if (!stripeCache || now - stripeCache.at > 10 * 60 * 1000) {
    try {
      const stripe = new Stripe(secret, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pinned legacy Stripe API version
        apiVersion: "2023-10-16" as any,
      });
      const page = await stripe.checkout.sessions.list({ limit: 100, status: "complete" });
      stripeCache = {
        at: now,
        rows: page.data.map((session) => {
          const metadata = (session.metadata ?? {}) as Record<string, string | undefined>;
          const snapshot = snapshotFromMetadata(metadata);
          const created = session.created ? new Date(session.created * 1000).toISOString() : null;
          return {
            id: session.id,
            user_id: metadata.userId || session.client_reference_id || null,
            listing_id: metadata.listingId || null,
            demand_id: metadata.demandId || null,
            package_id: metadata.packageId || null,
            media_package: metadata.mediaPackage || null,
            amount_minor: session.amount_total ?? 0,
            media_amount_minor: null,
            listing_amount_minor: null,
            paid_at: created,
            heard_from: snapshot.heard_from ?? null,
            attribution_first: snapshot.first ?? null,
            source: "stripe" as const,
          };
        }),
      };
    } catch {
      return [];
    }
  }
  return (stripeCache?.rows ?? []).filter((row) => !existingSessionIds.has(row.id));
}

export async function GET(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return json(
      { success: false, error: auth.error },
      auth.status,
    );
  }

  const excludeHouse = req.nextUrl.searchParams.get("excludeHouse") !== "0";
  const warnings: string[] = [];
  let truncated = false;

  const [listingsRes, inquiriesRes, offersRes, demandsRes, paymentsRes] = await Promise.all([
    selectWithFallback(
      auth.supabase,
      "listings",
      "id, user_id, status, created_at, sold_at, heard_from, attribution_first",
      "id, user_id, status, created_at",
      "created_at",
    ),
    selectWithFallback(
      auth.supabase,
      "listing_inquiries",
      "id, buyer_id, created_at, heard_from, attribution_first",
      "id, buyer_id, created_at",
      "created_at",
    ),
    selectWithFallback(
      auth.supabase,
      "listing_offers",
      "id, buyer_user_id, created_at, heard_from, attribution_first",
      "id, buyer_user_id, created_at",
      "created_at",
    ),
    selectWithFallback(
      auth.supabase,
      "demands",
      "id, buyer_id, status, created_at, heard_from, attribution_first",
      "id, buyer_id, status, created_at",
      "created_at",
    ),
    selectWithFallback(
      auth.supabase,
      "payments",
      "id, stripe_checkout_session_id, user_id, listing_id, demand_id, package_id, media_package, amount_minor, media_amount_minor, listing_amount_minor, paid_at, heard_from, attribution_first",
      "id, stripe_checkout_session_id, user_id, listing_id, demand_id, package_id, media_package, amount_minor, media_amount_minor, listing_amount_minor, paid_at, heard_from, attribution_first",
      "paid_at",
    ),
  ]);

  for (const result of [listingsRes, inquiriesRes, offersRes, demandsRes, paymentsRes]) {
    if (result.warning) warnings.push(result.warning);
    if (result.truncated) truncated = true;
  }

  const paymentRows: MetricPaymentRow[] = paymentsRes.rows.map((row) => ({
    id: String(row.stripe_checkout_session_id || row.id || ""),
    user_id: asText(row.user_id),
    listing_id: asText(row.listing_id),
    demand_id: asText(row.demand_id),
    package_id: asText(row.package_id),
    media_package: asText(row.media_package),
    amount_minor: Number(row.amount_minor ?? 0),
    media_amount_minor:
      row.media_amount_minor == null ? null : Number(row.media_amount_minor),
    listing_amount_minor:
      row.listing_amount_minor == null ? null : Number(row.listing_amount_minor),
    paid_at: asText(row.paid_at),
    heard_from: asText(row.heard_from),
    attribution_first: row.attribution_first,
    source: "payments",
  }));
  const known = new Set(paymentRows.map((row) => row.id));
  const stripeRows = await stripeSupplement(known);
  if (stripeRows.length > 0) {
    warnings.push(
      `${stripeRows.length} plăți recente vin din Stripe pentru că nu sunt încă în tabelul payments.`,
    );
  }

  const report = buildHqMetrics({
    excludeHouse,
    houseIds: houseAccountIds(),
    listings: listingsRes.rows.map((row) => toActor(row, "user_id")),
    inquiries: inquiriesRes.rows.map((row) => toActor(row, "buyer_id")),
    offers: offersRes.rows.map((row) => toActor(row, "buyer_user_id")),
    demands: demandsRes.rows.map((row) => toActor(row, "buyer_id")),
    payments: [...paymentRows, ...stripeRows],
    truncated,
    warnings,
  });

  return json({ success: true, report });
}
