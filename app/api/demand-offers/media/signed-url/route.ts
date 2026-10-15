import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
import {
  DEMAND_OFFERS_STORAGE_BUCKET,
  DEMAND_OFFER_SIGNED_URL_TTL_SECONDS,
  objectPathFromPrivateDbRef,
} from "@/lib/demandOfferMedia";
import { resolveDemandOfferMediaAccess } from "@/lib/demandOfferMediaAccess";
import { captureException } from "@/lib/observability";
import { logInfo, logWarn, logError } from "@/lib/observability/log";

export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
};

function extractBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  const component = "demand_offer_media";
  const operation = "signed_url";

  try {
    const bearer = extractBearer(req);
    if (!bearer) {
      logInfo({
        component,
        operation,
        result: "denied",
        error_code: "authentication_required",
      });
      return NextResponse.json(
        { success: false, error_code: "authentication_required" },
        { status: 401, headers: NO_STORE },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      media_ref?: string;
      offer_id?: string;
    } | null;

    const mediaRef = String(body?.media_ref ?? "").trim();
    const offerId = body?.offer_id ? String(body.offer_id).trim() : null;
    if (!mediaRef || !objectPathFromPrivateDbRef(mediaRef)) {
      logInfo({
        component,
        operation,
        result: "validation_failed",
        error_code: "invalid_media_ref",
      });
      return NextResponse.json(
        { success: false, error_code: "invalid_media_ref" },
        { status: 400, headers: NO_STORE },
      );
    }

    const userClient = createClient(getSupabaseProjectUrl(), getSupabaseAnonKey(), {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      logInfo({
        component,
        operation,
        result: "denied",
        error_code: "authentication_required",
      });
      return NextResponse.json(
        { success: false, error_code: "authentication_required" },
        { status: 401, headers: NO_STORE },
      );
    }

    const admin = serviceClient();
    if (!admin) {
      logError({
        component,
        operation,
        result: "error",
        error_code: "service_unavailable",
      });
      return NextResponse.json(
        { success: false, error_code: "server_error" },
        { status: 500, headers: NO_STORE },
      );
    }

    const decision = await resolveDemandOfferMediaAccess({
      userClient,
      serviceClient: admin,
      userId: user.id,
      userEmail: user.email,
      offerId,
      mediaRef,
    });

    if (!decision.allowed) {
      const code =
        decision.reason === "offer_not_found" || decision.reason === "path_mismatch"
          ? "not_found"
          : "access_denied";
      logInfo({
        component,
        operation,
        result: code === "not_found" ? "not_found" : "denied",
        error_code: code,
        entity_id: decision.offerId,
      });
      return NextResponse.json(
        { success: false, error_code: code },
        { status: code === "not_found" ? 404 : 403, headers: NO_STORE },
      );
    }

    const objectPath = objectPathFromPrivateDbRef(mediaRef)!;
    const { data, error } = await admin.storage
      .from(DEMAND_OFFERS_STORAGE_BUCKET)
      .createSignedUrl(objectPath, DEMAND_OFFER_SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      logWarn({
        component,
        operation,
        result: "not_found",
        error_code: "object_missing",
        entity_id: decision.offerId,
      });
      return NextResponse.json(
        { success: false, error_code: "not_found" },
        { status: 404, headers: NO_STORE },
      );
    }

    logInfo({
      component,
      operation,
      result: "success",
      entity_id: decision.offerId,
      actor: decision.actor,
      ttl_seconds: DEMAND_OFFER_SIGNED_URL_TTL_SECONDS,
    });

    return NextResponse.json(
      {
        success: true,
        expires_in: DEMAND_OFFER_SIGNED_URL_TTL_SECONDS,
        // signed URL returned once to authorized client — never persist in DB
        url: data.signedUrl,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    captureException(error, { component, operation, error_code: "server_error" });
    logError({
      component,
      operation,
      result: "error",
      error_code: "server_error",
    });
    return NextResponse.json(
      { success: false, error_code: "server_error" },
      { status: 500, headers: NO_STORE },
    );
  }
}
