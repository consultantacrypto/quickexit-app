import { NextRequest, NextResponse } from "next/server";
import { assertHqAdminFromBearer, extractBearerToken } from "@/lib/hqAdminAuth";
import {
  forceActivate,
  listPendingPaymentDemands,
  listPendingPaymentListings,
  resolveForceActivateTarget,
  type ForceActivateEntityType,
  type ForceActivateMode,
} from "@/lib/forceActivate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseEntityType(value: string | null): ForceActivateEntityType {
  return value === "demand" ? "demand" : "listing";
}

/**
 * GET — entități în așteptarea plății (HQ Admin, service role).
 * Query: ?type=listing|demand (default listing), ?limit=100
 */
export async function GET(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const type = parseEntityType(req.nextUrl.searchParams.get("type"));
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;

  const items =
    type === "demand"
      ? await listPendingPaymentDemands(auth.supabase, limit)
      : await listPendingPaymentListings(auth.supabase, limit);

  return NextResponse.json({
    ok: true,
    type,
    count: items.length,
    items,
    fetchedBy: auth.userEmail,
  });
}

/**
 * POST — Force Sync / activare manuală listare sau cerere capital.
 *
 * Body JSON:
 * - listingId OR demandId (exact one required)
 * - mode: "stripe_sync" | "manual" (required)
 * - stripeSessionId: required for stripe_sync (cs_...)
 * - packageId: optional override for manual
 *   - listings: economy|standard|urgent|auction
 *   - demands: demand (default)
 * - reason: required for manual (min 8 chars — audit trail în logs)
 */
export async function POST(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body JSON invalid." }, { status: 400 });
  }

  const listingId = String(body?.listingId ?? "").trim();
  const demandId = String(body?.demandId ?? "").trim();
  const modeRaw = String(body?.mode ?? "").trim();
  const mode: ForceActivateMode | null =
    modeRaw === "stripe_sync" || modeRaw === "manual" ? modeRaw : null;

  const target = resolveForceActivateTarget({
    listingId: listingId || undefined,
    demandId: demandId || undefined,
    mode: mode ?? "manual",
    adminEmail: auth.userEmail,
  });

  if (!target) {
    return NextResponse.json(
      { error: "Trimite exact unul dintre listingId sau demandId (nu ambele, nu niciunul)." },
      { status: 400 }
    );
  }
  if (!mode) {
    return NextResponse.json(
      { error: 'mode invalid. Folosește "stripe_sync" sau "manual".' },
      { status: 400 }
    );
  }

  const result = await forceActivate(auth.supabase, {
    listingId: listingId || undefined,
    demandId: demandId || undefined,
    mode,
    stripeSessionId: String(body?.stripeSessionId ?? body?.sessionId ?? "").trim() || undefined,
    packageId: String(body?.packageId ?? "").trim() || undefined,
    reason: String(body?.reason ?? "").trim() || undefined,
    adminEmail: auth.userEmail,
  });

  if (!result.ok) {
    const status =
      result.code === "stripe_not_paid" || result.code === "stripe_entity_mismatch"
        ? 409
        : result.code === "entity_not_found"
          ? 404
          : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json({
    ...result,
    activatedBy: auth.userEmail,
  });
}
