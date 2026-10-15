import { NextResponse } from "next/server";
import { resolveObservabilityEnvironment } from "@/lib/observability/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cheap, non-sensitive uptime probe.
 * Does not touch Supabase, Stripe, or secrets.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      environment: resolveObservabilityEnvironment(),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
