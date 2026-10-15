import { NextResponse } from "next/server";
import {
  DEMAND_OFFERS_STORAGE_BUCKET,
  DEMAND_OFFER_SIGNED_URL_TTL_SECONDS,
  objectPathFromPrivateDbRef,
} from "@/lib/demandOfferMedia";
import {
  assertHqAdminFromAccessToken,
  extractBearerToken,
} from "@/lib/hqAdminAuth";
import { captureException } from "@/lib/observability";
import { logInfo, logWarn, logError } from "@/lib/observability/log";

export const runtime = "nodejs";

const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
};

/**
 * HQ moderation signed URL for private demand-offer media.
 * Canonical HQ allowlist gate → service role only after membership succeeds.
 */
export async function POST(req: Request) {
  const component = "demand_offer_media";
  const operation = "signed_url";

  try {
    const auth = await assertHqAdminFromAccessToken(extractBearerToken(req));
    if (!auth.ok) {
      logInfo({
        component,
        operation,
        result: "denied",
        error_code: auth.error,
        via: "hq",
      });
      return NextResponse.json(
        { success: false, error_code: auth.error },
        { status: auth.status, headers: NO_STORE },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      media_ref?: string;
    } | null;
    const mediaRef = String(body?.media_ref ?? "").trim();
    const objectPath = objectPathFromPrivateDbRef(mediaRef);
    if (!objectPath) {
      logInfo({
        component,
        operation,
        result: "validation_failed",
        error_code: "invalid_media_ref",
        via: "hq",
      });
      return NextResponse.json(
        { success: false, error_code: "invalid_media_ref" },
        { status: 400, headers: NO_STORE },
      );
    }

    const { data, error } = await auth.supabase.storage
      .from(DEMAND_OFFERS_STORAGE_BUCKET)
      .createSignedUrl(objectPath, DEMAND_OFFER_SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      logWarn({
        component,
        operation,
        result: "not_found",
        error_code: "object_missing",
        via: "hq",
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
      via: "hq",
      actor: "hq",
      ttl_seconds: DEMAND_OFFER_SIGNED_URL_TTL_SECONDS,
    });

    return NextResponse.json(
      {
        success: true,
        expires_in: DEMAND_OFFER_SIGNED_URL_TTL_SECONDS,
        url: data.signedUrl,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    captureException(error, {
      component,
      operation,
      error_code: "server_error",
      tags: { via: "hq" },
    });
    logError({
      component,
      operation,
      result: "error",
      error_code: "server_error",
      via: "hq",
    });
    return NextResponse.json(
      { success: false, error_code: "server_error" },
      { status: 500, headers: NO_STORE },
    );
  }
}
