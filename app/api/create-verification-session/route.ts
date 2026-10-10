import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy Stripe Identity initiation route.
 *
 * Previously trusted client-supplied `userId` with no authentication and created
 * a Stripe Identity verification session. That path is disabled.
 *
 * Active KYC initiation: POST /api/kyc/start (authenticated session only).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "This endpoint is retired. Use authenticated POST /api/kyc/start.",
    },
    { status: 410 }
  );
}
