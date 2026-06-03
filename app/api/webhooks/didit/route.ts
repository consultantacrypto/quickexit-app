import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  extractDiditUserId,
  mapDiditStatusToKycStatus,
  verifyDiditSignatureV2,
} from "@/lib/didit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.error("[didit/webhook] DIDIT_WEBHOOK_SECRET lipsește.");
    return NextResponse.json({ error: "Config server incompletă." }, { status: 500 });
  }

  const rawBody = await req.text();
  if (!rawBody) {
    return NextResponse.json({ error: "Body gol." }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON invalid." }, { status: 400 });
  }

  const signatureV2 = req.headers.get("X-Signature-V2");
  const timestamp = req.headers.get("X-Timestamp");

  if (!verifyDiditSignatureV2(payload, signatureV2, timestamp, webhookSecret)) {
    console.error("[didit/webhook] Semnătură invalidă sau request expirat.");
    return NextResponse.json({ error: "Semnătură invalidă." }, { status: 401 });
  }

  const webhookType = payload.webhook_type;
  if (webhookType !== "status.updated") {
    return NextResponse.json({ received: true, skipped: "event_type" });
  }

  const diditStatus = payload.status;
  if (typeof diditStatus !== "string" || !diditStatus.trim()) {
    return NextResponse.json({ received: true, skipped: "no_status" });
  }

  const kyc_status = mapDiditStatusToKycStatus(diditStatus);
  if (!kyc_status) {
    console.log(
      `[didit/webhook] Status Didit fără mapare: "${diditStatus}" (session: ${String(payload.session_id ?? "")})`
    );
    return NextResponse.json({ received: true, skipped: "unmapped_status" });
  }

  const userId = extractDiditUserId(payload);
  if (!userId) {
    console.error(
      "[didit/webhook] Lipsește userId — nu se poate actualiza profiles. session:",
      payload.session_id ?? null,
      "vendor_data:",
      payload.vendor_data ?? null
    );
    return NextResponse.json({ received: true, skipped: "no_user_id" });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ kyc_status })
    .eq("id", userId);

  if (error) {
    console.error("[didit/webhook] Eroare Supabase:", error);
    return NextResponse.json({ error: "Eroare bază de date" }, { status: 500 });
  }

  console.log(
    `[didit/webhook] profiles.kyc_status = "${kyc_status}" pentru ${userId} (Didit: "${diditStatus}")`
  );

  return NextResponse.json({ received: true });
}
