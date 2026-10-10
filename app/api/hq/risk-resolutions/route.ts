import { NextRequest, NextResponse } from "next/server";
import {
  assertHqAdminFromBearer,
  extractBearerToken,
} from "@/lib/hqAdminAuth";
import { parseHqRiskResolutionBody } from "@/lib/hqOverview";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function jsonError(status: number, error: string, error_code = "server_error") {
  return NextResponse.json(
    { success: false, error, error_code },
    { status, headers: NO_STORE },
  );
}

/**
 * POST /api/hq/risk-resolutions — insert HQ risk resolution (service-role after HQ auth).
 * resolved_by is taken from authenticated admin identity, never from client body.
 */
export async function POST(req: NextRequest) {
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
    return jsonError(400, "invalid_request", "invalid_request");
  }

  const parsed = parseHqRiskResolutionBody(body);
  if (!parsed.ok) {
    return jsonError(parsed.status, parsed.error, parsed.error_code);
  }

  const { error } = await auth.supabase.from("admin_risk_resolutions").insert({
    risk_key: parsed.data.risk_key,
    risk_type: parsed.data.risk_type,
    entity_table: parsed.data.entity_table,
    entity_id: parsed.data.entity_id,
    severity: parsed.data.severity,
    title: parsed.data.title,
    note: parsed.data.note,
    resolved_by: auth.userId,
  });

  if (error) {
    const missing =
      error.code === "42P01" || /admin_risk_resolutions/i.test(error.message ?? "");
    console.error("[hq/risk-resolutions] insert failed", {
      message: error.message,
      code: error.code,
      admin: auth.userEmail,
      risk_key: parsed.data.risk_key,
    });
    return jsonError(
      missing ? 503 : 500,
      missing ? "table_missing" : "internal_error",
      missing ? "table_missing" : "server_error",
    );
  }

  return NextResponse.json(
    { success: true },
    { status: 201, headers: NO_STORE },
  );
}
