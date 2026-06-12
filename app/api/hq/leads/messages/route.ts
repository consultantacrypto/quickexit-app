import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertHqAdminFromBearer, extractBearerToken } from "@/lib/hqAdminAuth";
import { isMessageFeedback, MESSAGE_FEEDBACK_VALUES } from "@/lib/leadAgentPlaybook";

export const runtime = "nodejs";

const VALID_CHANNELS = ["whatsapp", "linkedin", "email", "phone"] as const;
const MAX_BODY_LEN = 4000;

async function logLeadEvent(
  supabase: SupabaseClient,
  params: {
    leadId: string;
    eventType: string;
    payload?: Record<string, unknown> | null;
    actorEmail: string;
  },
) {
  const { error } = await supabase.from("lead_events").insert({
    lead_id: params.leadId,
    event_type: params.eventType,
    payload: params.payload ?? null,
    actor_email: params.actorEmail,
  });
  if (error) {
    console.error("[hq/leads/messages] lead_events insert failed", {
      leadId: params.leadId,
      eventType: params.eventType,
      reason: error.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await assertHqAdminFromBearer(extractBearerToken(req));
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { supabase, userEmail } = auth;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "Body JSON invalid." }, { status: 400 });
    }

    const action = String(body.action || "").trim().toLowerCase();
    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";

    if (!leadId) {
      return NextResponse.json({ success: false, error: "leadId obligatoriu." }, { status: 400 });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) {
      return NextResponse.json({ success: false, error: leadError.message }, { status: 500 });
    }
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead negăsit." }, { status: 404 });
    }

    if (action === "save_final") {
      const channel = String(body.channel || "").trim().toLowerCase();
      const text = typeof body.body === "string" ? body.body.trim() : "";

      if (!VALID_CHANNELS.includes(channel as (typeof VALID_CHANNELS)[number])) {
        return NextResponse.json(
          {
            success: false,
            error: "channel invalid. Acceptat: whatsapp | linkedin | email | phone.",
          },
          { status: 400 },
        );
      }
      if (!text) {
        return NextResponse.json({ success: false, error: "body obligatoriu." }, { status: 400 });
      }
      if (text.length > MAX_BODY_LEN) {
        return NextResponse.json(
          { success: false, error: `Mesajul depășește ${MAX_BODY_LEN} caractere.` },
          { status: 400 },
        );
      }

      const sourceMessageId =
        typeof body.source_message_id === "string" ? body.source_message_id.trim() : null;

      const { data: insertedMessage, error: insertError } = await supabase
        .from("lead_messages")
        .insert({
          lead_id: leadId,
          channel,
          direction: "outbound",
          body: text,
          generated_by_ai: false,
          model: null,
        })
        .select("*")
        .single();

      if (insertError) {
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }

      await logLeadEvent(supabase, {
        leadId,
        eventType: "message_final_saved",
        payload: {
          message_id: insertedMessage.id,
          channel,
          source_message_id: sourceMessageId,
          body_length: text.length,
        },
        actorEmail: userEmail,
      });

      return NextResponse.json({ success: true, message: insertedMessage });
    }

    if (action === "feedback") {
      const messageId = typeof body.message_id === "string" ? body.message_id.trim() : "";
      const feedback = String(body.feedback || "").trim().toLowerCase();

      if (!messageId) {
        return NextResponse.json({ success: false, error: "message_id obligatoriu." }, { status: 400 });
      }
      if (!isMessageFeedback(feedback)) {
        return NextResponse.json(
          {
            success: false,
            error: `feedback invalid. Acceptat: ${MESSAGE_FEEDBACK_VALUES.join(" | ")}.`,
          },
          { status: 400 },
        );
      }

      const { data: message, error: messageError } = await supabase
        .from("lead_messages")
        .select("id, lead_id")
        .eq("id", messageId)
        .eq("lead_id", leadId)
        .maybeSingle();

      if (messageError) {
        return NextResponse.json({ success: false, error: messageError.message }, { status: 500 });
      }
      if (!message) {
        return NextResponse.json({ success: false, error: "Mesaj negăsit." }, { status: 404 });
      }

      await logLeadEvent(supabase, {
        leadId,
        eventType: "message_feedback",
        payload: { feedback, message_id: messageId },
        actorEmail: userEmail,
      });

      return NextResponse.json({ success: true, feedback, message_id: messageId });
    }

    return NextResponse.json(
      { success: false, error: "action invalid. Acceptat: save_final | feedback." },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută";
    return NextResponse.json(
      { success: false, error: `Eroare Lead Agent mesaje: ${message}` },
      { status: 500 },
    );
  }
}
