import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
import {
  DEMAND_OFFERS_STORAGE_BUCKET,
  buildDemandOfferObjectPath,
  demandOfferImageExtension,
  toPrivateDbRef,
  validateDemandOfferImageFile,
} from "@/lib/demandOfferMedia";
import { assertDemandOfferUploadAllowed } from "@/lib/demandOfferMediaAccess";
import { captureException } from "@/lib/observability";
import { logInfo, logError } from "@/lib/observability/log";

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
  const operation = "upload";

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

    const form = await req.formData();
    const demandId = String(form.get("demand_id") ?? "").trim();
    const file = form.get("file");
    if (!(file instanceof File)) {
      logInfo({
        component,
        operation,
        result: "validation_failed",
        error_code: "file_required",
      });
      return NextResponse.json(
        { success: false, error_code: "validation_failed" },
        { status: 400, headers: NO_STORE },
      );
    }

    const validation = validateDemandOfferImageFile(file, 0);
    if (validation) {
      logInfo({
        component,
        operation,
        result: "validation_failed",
        error_code: validation,
      });
      return NextResponse.json(
        { success: false, error_code: validation },
        { status: 400, headers: NO_STORE },
      );
    }

    const ext = demandOfferImageExtension(file);
    if (!ext) {
      return NextResponse.json(
        { success: false, error_code: "unsupported_type" },
        { status: 400, headers: NO_STORE },
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

    const gate = await assertDemandOfferUploadAllowed({
      serviceClient: admin,
      userId: user.id,
      demandId,
    });
    if (!gate.ok) {
      logInfo({
        component,
        operation,
        result: "denied",
        error_code: gate.reason,
      });
      return NextResponse.json(
        { success: false, error_code: "access_denied" },
        { status: 403, headers: NO_STORE },
      );
    }

    let objectPath: string;
    try {
      objectPath = buildDemandOfferObjectPath({
        uploaderUserId: user.id,
        demandId,
        ext,
      });
    } catch {
      return NextResponse.json(
        { success: false, error_code: "validation_failed" },
        { status: 400, headers: NO_STORE },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    // Upload with the caller's JWT so Storage INSERT RLS (owner prefix) applies.
    const { error: uploadError } = await userClient.storage
      .from(DEMAND_OFFERS_STORAGE_BUCKET)
      .upload(objectPath, bytes, {
        contentType: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
        upsert: false,
      });

    if (uploadError) {
      logError({
        component,
        operation,
        result: "error",
        error_code: "upload_failed",
      });
      return NextResponse.json(
        { success: false, error_code: "upload_failed" },
        { status: 502, headers: NO_STORE },
      );
    }

    const mediaRef = toPrivateDbRef(objectPath);
    logInfo({
      component,
      operation,
      result: "success",
      entity_id: demandId,
      bytes: bytes.byteLength,
    });

    return NextResponse.json(
      {
        success: true,
        media_ref: mediaRef,
        // Never return/store a signed URL here — viewer resolves separately.
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
