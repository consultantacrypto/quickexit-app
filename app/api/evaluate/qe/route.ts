import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/turnstileVerify";
import {
  checkQeValuationRateLimit,
  getClientIp,
  runQeCarValuation,
} from "@/lib/qeCarValuationRequest";
import { sendValuationReportEmail } from "@/lib/qeValuationEmail";
import {
  createQeValuationServiceClient,
  fetchActiveAutoListings,
  findRecentValuationRequest,
  insertValuationLead,
  insertValuationRequest,
  probeValuationStorage,
} from "@/lib/qeCarValuationStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawText = await req.text();
  const ip = getClientIp(req.headers);
  const supabase = createQeValuationServiceClient();

  const outcome = await runQeCarValuation(
    { rawText, ip },
    {
      checkRateLimit: checkQeValuationRateLimit,
      verifyTurnstile: (token, remoteIp) => verifyTurnstileToken(token, remoteIp),
      fetchListings: async () => {
        if (!supabase) return { ok: false };
        return fetchActiveAutoListings(supabase);
      },
      probeStorage: async () => {
        if (!supabase) return "error";
        return probeValuationStorage(supabase);
      },
      findRecentRequest: async (email) => {
        if (!supabase) return false;
        return findRecentValuationRequest(supabase, email);
      },
      insertLead: async (input) => {
        if (!supabase) return { ok: false };
        return insertValuationLead(supabase, input);
      },
      insertRequest: async (input) => {
        if (!supabase) return { ok: false, missing: false };
        return insertValuationRequest(supabase, input);
      },
      sendReport: (input) => sendValuationReportEmail(input),
    },
  );

  return NextResponse.json(outcome.body, {
    status: outcome.status,
    headers: { "Cache-Control": "no-store" },
  });
}
