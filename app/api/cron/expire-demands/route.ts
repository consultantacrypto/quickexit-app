import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl } from "@/lib/supabase/config";
import { logInfo, logError, ensureCorrelationId } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const STAGING_REF = "nlnzlswjjplofpkhoxtr";

function authorizeCron(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return { ok: false, status: 503, error: "CRON_SECRET missing" };
  }

  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const headerSecret = req.headers.get("x-cron-secret")?.trim() || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer !== secret && headerSecret !== secret) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}

function assertSafeExpireTarget(url: string): { ok: true } | { ok: false; error: string } {
  const lower = url.toLowerCase();
  const allowProductionExpire =
    process.env.CRON_ALLOW_PRODUCTION_EXPIRE === "1" ||
    process.env.CRON_ALLOW_PRODUCTION_EXPIRE === "true";

  // Production Supabase: only when explicitly armed (and typically VERCEL_ENV=production).
  if (lower.includes(PRODUCTION_REF)) {
    if (allowProductionExpire) return { ok: true };
    return { ok: false, error: "production_supabase_refused" };
  }

  // Production Vercel without Production Supabase URL still refused unless armed.
  if (process.env.VERCEL_ENV === "production" && !allowProductionExpire) {
    return { ok: false, error: "production_env_refused" };
  }

  if (
    process.env.QE_STAGING_SITE === "1" ||
    process.env.QE_STAGING_SITE === "true" ||
    lower.includes(STAGING_REF)
  ) {
    return { ok: true };
  }
  // Preview without staging flag still OK if URL is Staging.
  if (lower.includes(STAGING_REF)) return { ok: true };
  return { ok: false, error: "unsafe_expire_target" };
}

/**
 * Staging/ops cron: mark active demands past expires_at as expired.
 * Auth: Authorization Bearer CRON_SECRET (or x-cron-secret header).
 * Refuses Production Supabase / Production Vercel by default.
 */
export async function POST(req: Request) {
  const correlationId = ensureCorrelationId(req.headers);
  const authz = authorizeCron(req);
  if (!authz.ok) {
    logInfo({
      component: "demand_fulfillment",
      operation: "expire",
      result: "denied",
      correlation_id: correlationId,
      error_code: authz.error,
    });
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const url = getSupabaseProjectUrl();
  if (!serviceKey || !url) {
    return NextResponse.json({ error: "supabase config missing" }, { status: 503 });
  }

  const target = assertSafeExpireTarget(url);
  if (!target.ok) {
    logError({
      component: "demand_fulfillment",
      operation: "expire",
      result: "denied",
      correlation_id: correlationId,
      error_code: target.error,
    });
    return NextResponse.json({ error: target.error }, { status: 403 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("demands")
    .update({ status: "expired" })
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lte("expires_at", nowIso)
    .select("id");

  if (error) {
    logError({
      component: "demand_fulfillment",
      operation: "expire",
      result: "error",
      correlation_id: correlationId,
      error_code: "expire_failed",
    });
    return NextResponse.json({ error: "expire_failed" }, { status: 500 });
  }

  const expiredCount = data?.length ?? 0;
  logInfo({
    component: "demand_fulfillment",
    operation: "expire",
    result: "ok",
    correlation_id: correlationId,
    expired_count: expiredCount,
  });

  return NextResponse.json({ ok: true, expired_count: expiredCount });
}

export async function GET(req: Request) {
  // Same auth as POST — no unauthenticated GET.
  return POST(req);
}
