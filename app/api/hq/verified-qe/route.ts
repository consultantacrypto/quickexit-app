import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { assertHqAdminFromBearer, extractBearerToken } from "@/lib/hqAdminAuth";
import { isHqUuid } from "@/lib/hqOverview";
import {
  executeVerifiedQeMutation,
  mapVerifiedQeWriteError,
  readVerifiedQeRpcRow,
  type VerifiedQePlan,
} from "@/lib/verifiedQeAdmin";
import { isMissingVerifiedQeColumnError } from "@/lib/verifiedQe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const LIST_COLUMNS =
  "id,title,status,verified_qe,verified_docs,verified_vin,verified_photos,verified_at";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function revalidateVerifiedListing(listingId: string) {
  for (const locale of ["ro", "en"] as const) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/anunturi`);
    revalidatePath(`/${locale}/cauta`);
    revalidatePath(`/${locale}/licitatii`);
    revalidatePath(`/${locale}/anunt/${listingId}`);
    revalidatePath(`/${locale}/hq-admin`);
    revalidatePath(`/${locale}/hq-admin/verificare`);
  }
}

function sanitizeTitleQuery(raw: string): string {
  return raw.replace(/[%_,()*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * GET /api/hq/verified-qe?q=
 * HQ lookup for the manual badge screen. Service role only after allowlist auth.
 */
export async function GET(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return json(auth.status, {
      success: false,
      error: auth.error,
      error_code: auth.status === 403 ? "forbidden" : "auth_required",
    });
  }

  const q = sanitizeTitleQuery(req.nextUrl.searchParams.get("q") ?? "");
  let query = auth.supabase
    .from("listings")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(20);
  if (q) {
    query = isHqUuid(q) ? query.eq("id", q) : query.ilike("title", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingVerifiedQeColumnError(error)) {
      return json(503, { success: false, error: "schema_missing", error_code: "schema_missing" });
    }
    console.error("[hq/verified-qe] list failed", { code: error.code ?? null });
    return json(500, { success: false, error: "internal_error", error_code: "server_error" });
  }

  return json(200, { success: true, listings: data ?? [] });
}

/**
 * POST /api/hq/verified-qe
 * Grants or revokes the badge. The actor uuid comes from the HQ session.
 * verified_at is now() inside hq_set_listing_verified_qe. Incomplete checks
 * are rejected here and again in SQL. Nothing in cron, Stripe, or webhooks
 * calls this route.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error: "invalid_request", error_code: "invalid_request" });
  }

  const authorization = extractBearerToken(req);
  const result = await executeVerifiedQeMutation(authorization, body, {
    authenticate: async (token) => {
      const auth = await assertHqAdminFromBearer(token);
      if (!auth.ok) {
        return { ok: false, status: auth.status, error: auth.error };
      }
      return {
        ok: true,
        userId: auth.userId,
        apply: async (plan: VerifiedQePlan) => {
          const { data, error } = await auth.supabase.rpc("hq_set_listing_verified_qe", {
            p_listing_id: plan.listingId,
            p_actor_user_id: plan.actorUserId,
            p_grant: plan.grant,
            p_docs: plan.docs,
            p_vin: plan.vin,
            p_photos: plan.photos,
          });
          if (error) {
            console.error("[hq/verified-qe] write failed", {
              code: error.code ?? null,
              listing_id: plan.listingId,
              grant: plan.grant,
            });
            return mapVerifiedQeWriteError(error);
          }
          const listing = readVerifiedQeRpcRow(plan.listingId, data);
          if (!listing) {
            return { ok: false, status: 500, error: "internal_error", error_code: "server_error" };
          }
          return { ok: true, listing };
        },
      };
    },
  });

  if (result.status === 200 && result.listingId) {
    revalidateVerifiedListing(result.listingId);
  }
  return json(result.status, result.body);
}
