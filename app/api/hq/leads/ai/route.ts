import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertHqAdminFromBearer, extractBearerToken } from "@/lib/hqAdminAuth";
import type { LeadRow } from "@/lib/leadAgent";
import { getCampaignPlaybookRules, getDanielVoiceRules } from "@/lib/leadAgentPlaybook";

export const runtime = "nodejs";

type AiMode = "score" | "message";
type AiChannel = "whatsapp" | "linkedin" | "email" | "phone";
type AiTone = "natural" | "premium" | "direct";

const VALID_MODES: AiMode[] = ["score", "message"];
const VALID_CHANNELS: AiChannel[] = ["whatsapp", "linkedin", "email", "phone"];
const VALID_TONES: AiTone[] = ["natural", "premium", "direct"];

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_GEMINI_STATUSES = new Set(["UNAVAILABLE", "RESOURCE_EXHAUSTED"]);

type ScoreResult = {
  score: number;
  reason: string;
  recommended_channel: string;
  suggested_next_action: string;
  risk_notes: string;
};

type MessageResult = {
  body: string;
};

function extractGeminiText(payload: unknown): string {
  const root = payload as Record<string, unknown>;
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];
  if (!candidates.length) return "";
  const first = candidates[0] as Record<string, unknown>;
  const content = (first?.content as Record<string, unknown>) ?? {};
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const textPart = parts.find(
    (part) => typeof (part as Record<string, unknown>)?.text === "string",
  ) as Record<string, unknown> | undefined;
  return typeof textPart?.text === "string" ? textPart.text : "";
}

function cleanPossibleJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function safeSnippet(bodyText: string, secret: string): string {
  let cleaned = bodyText;
  if (secret) cleaned = cleaned.split(secret).join("[redacted]");
  return cleaned.slice(0, 500);
}

async function callGemini(prompt: string, geminiApiKey: string, candidateModels: string[]) {
  const attempts: Array<{ model: string; status: number; message: string }> = [];

  for (const model of candidateModels) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const rawBody = await response.text();
    let payload: Record<string, unknown> | null = null;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      payload = null;
    }

    if (response.ok) {
      const text = payload ? extractGeminiText(payload) : "";
      return { ok: true as const, text, usedModel: model, attempts };
    }

    const geminiError =
      payload && typeof payload.error === "object"
        ? (payload.error as Record<string, unknown>)
        : null;
    const geminiStatus =
      typeof geminiError?.status === "string" ? geminiError.status : null;
    const geminiMessage =
      typeof geminiError?.message === "string"
        ? geminiError.message
        : safeSnippet(rawBody, geminiApiKey);

    attempts.push({ model, status: response.status, message: geminiMessage });

    const shouldRetry =
      RETRYABLE_HTTP_STATUSES.has(response.status) ||
      (geminiStatus ? RETRYABLE_GEMINI_STATUSES.has(geminiStatus) : false);
    if (!shouldRetry) {
      return {
        ok: false as const,
        error: `Gemini a răspuns cu eroare (${response.status}): ${geminiMessage}`,
        attempts,
      };
    }
  }

  return {
    ok: false as const,
    error: "Gemini indisponibil pe toate modelele de rezervă.",
    attempts,
  };
}

function leadPromptSnapshot(lead: LeadRow): Record<string, unknown> {
  return {
    lead_type: lead.lead_type,
    campaign_key: lead.campaign_key,
    language: lead.language,
    preferred_channel: lead.preferred_channel,
    full_name: lead.full_name,
    company: lead.company,
    category: lead.category,
    asset_summary: lead.asset_summary,
    asset_location: lead.asset_location,
    est_value_eur: lead.est_value_eur,
    status: lead.status,
    source: lead.source,
    data_source_note: lead.data_source_note,
    notes_excerpt: lead.notes ? String(lead.notes).slice(0, 400) : null,
    ai_score: lead.ai_score,
    next_action: lead.next_action,
  };
}

function buildScorePrompt(lead: LeadRow): string {
  return `
Ești analist pentru QuickExit (platformă românească care poate ajuta la conectarea activelor valoroase cu cumpărători/investitori interesați).
Evaluează lead-ul de mai jos pentru outreach manual (fără automatizare).

Criterii: lead_type fit (seller/buyer/connector), campaign fit, asset/category fit, valoare estimată, calitate contact (fără a folosi email/telefon în răspuns), urgență/relevanță, probabilitate de răspuns, potențial venit QuickExit, risc reputație/trust.
Nu inventa date lipsă. Fii conservator dacă informațiile sunt incomplete.

Lead (JSON):
${JSON.stringify(leadPromptSnapshot(lead))}

Răspunde DOAR cu JSON valid, fără markdown:
{
  "score": <număr întreg 0-100>,
  "reason": "<2-4 propoziții în română>",
  "recommended_channel": "<whatsapp|linkedin|email|phone sau alt canal scurt>",
  "suggested_next_action": "<acțiune concretă pentru operator, în română>",
  "risk_notes": "<riscuri sau precauții, în română>"
}
`.trim();
}

function channelInstruction(channel: AiChannel): string {
  if (channel === "whatsapp") {
    return "Canal WhatsApp: scurt, conversațional, maximum 4 propoziții.";
  }
  if (channel === "linkedin") {
    return "Canal LinkedIn: profesional dar uman, maximum 6 propoziții.";
  }
  if (channel === "email") {
    return "Canal email: stil email concis; dacă e util, începe cu o linie Subiect: ... apoi corpul mesajului.";
  }
  return "Canal telefon: bullet points scurte pentru apel, nu script complet.";
}

function toneInstruction(tone: AiTone): string {
  if (tone === "premium") return "Ton premium: rafinat, high-trust, sofisticat.";
  if (tone === "direct") return "Ton direct: concis, fără umplutură.";
  return "Ton natural: cald, uman, clar.";
}

function buildMessagePrompt(lead: LeadRow, channel: AiChannel, tone: AiTone): string {
  const lang = lead.language === "en" ? "English" : "Romanian";
  const campaignRules = getCampaignPlaybookRules(lead.campaign_key);
  const danielVoice = getDanielVoiceRules(lead.language);
  const preferredChannel = lead.preferred_channel?.trim() || channel;

  const campaignBlock = campaignRules
    ? `\nReguli campanie (campaign_key=${lead.campaign_key}):\n${campaignRules}`
    : lead.campaign_key
      ? `\nCampanie: ${lead.campaign_key} (fără playbook dedicat — folosește lead_type, category și notes).`
      : "";

  const danielBlock = danielVoice ? `\n${danielVoice}` : "";

  return `
Generează un draft de outreach MANUAL pentru QuickExit (platformă care poate ajuta la conectarea activelor cu cumpărători/investitori — nu promite cumpărători garantați).
Limba mesajului: ${lang}.
Canal selectat: ${channel}. Canal preferat lead: ${preferredChannel}.
${channelInstruction(channel)}
${toneInstruction(tone)}
${campaignBlock}
${danielBlock}

Context lead de folosit (nu inventa în afara acestor câmpuri):
- lead_type: ${lead.lead_type}
- category: ${lead.category ?? "—"}
- campaign_key: ${lead.campaign_key ?? "—"}
- language: ${lead.language}
- asset_summary: ${lead.asset_summary ?? "—"}
- est_value_eur: ${lead.est_value_eur ?? "—"}
- notes: ${lead.notes ? String(lead.notes).slice(0, 500) : "—"}

Reguli stricte:
- Nu suna spammy.
- Nu promite randamente garantate.
- Nu spune că QuickExit are deja cumpărători garantați.
- Dacă lipsesc date, fii prudent; nu inventa fapte despre activ sau persoană.
- Personalizează cu lead_type, category, campaign_key, asset_summary, notes și valoare estimată când există.
- Nu include email sau telefon în mesaj.
- Evită formulări generice de vânzări; fii specific pentru contextul de mai sus.

Lead complet (JSON):
${JSON.stringify(leadPromptSnapshot(lead))}

Răspunde DOAR cu JSON valid, fără markdown:
{ "body": "<textul mesajului>" }
`.trim();
}

function parseScoreResult(raw: string): ScoreResult | null {
  try {
    const parsed = JSON.parse(cleanPossibleJson(raw)) as Record<string, unknown>;
    const score = Math.round(Number(parsed.score));
    if (!Number.isFinite(score) || score < 0 || score > 100) return null;
    const reason = String(parsed.reason ?? "").trim();
    const recommended_channel = String(parsed.recommended_channel ?? "").trim();
    const suggested_next_action = String(parsed.suggested_next_action ?? "").trim();
    const risk_notes = String(parsed.risk_notes ?? "").trim();
    if (!reason || !suggested_next_action) return null;
    return {
      score,
      reason,
      recommended_channel: recommended_channel || "email",
      suggested_next_action,
      risk_notes: risk_notes || "—",
    };
  } catch {
    return null;
  }
}

function parseMessageResult(raw: string): MessageResult | null {
  try {
    const parsed = JSON.parse(cleanPossibleJson(raw)) as Record<string, unknown>;
    const body = String(parsed.body ?? "").trim();
    if (!body) return null;
    return { body: body.slice(0, 4000) };
  } catch {
    const cleaned = raw.trim();
    if (!cleaned) return null;
    return { body: cleaned.slice(0, 4000) };
  }
}

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
    console.error("[hq/leads/ai] lead_events insert failed", {
      leadId: params.leadId,
      eventType: params.eventType,
      reason: error.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const configuredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const candidateModels = Array.from(
      new Set(
        [configuredModel, "gemini-flash-latest", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
          .map((m) => m.replace(/^models\//, "").trim())
          .filter(Boolean),
      ),
    );

    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: "Config server incompletă: GEMINI_API_KEY lipsește." },
        { status: 500 },
      );
    }

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

    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
    const mode = String(body.mode || "").trim().toLowerCase() as AiMode;

    if (!leadId) {
      return NextResponse.json({ success: false, error: "leadId obligatoriu." }, { status: 400 });
    }
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { success: false, error: "mode invalid. Acceptat: score | message." },
        { status: 400 },
      );
    }

    const channel = String(body.channel || "whatsapp").trim().toLowerCase() as AiChannel;
    const tone = String(body.tone || "natural").trim().toLowerCase() as AiTone;

    if (mode === "message") {
      if (!VALID_CHANNELS.includes(channel)) {
        return NextResponse.json(
          { success: false, error: "channel invalid. Acceptat: whatsapp | linkedin | email | phone." },
          { status: 400 },
        );
      }
      if (!VALID_TONES.includes(tone)) {
        return NextResponse.json(
          { success: false, error: "tone invalid. Acceptat: natural | premium | direct." },
          { status: 400 },
        );
      }
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) {
      return NextResponse.json({ success: false, error: leadError.message }, { status: 500 });
    }
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead negăsit." }, { status: 404 });
    }

    const leadRow = lead as LeadRow;
    const prompt =
      mode === "score"
        ? buildScorePrompt(leadRow)
        : buildMessagePrompt(leadRow, channel, tone);

    const gemini = await callGemini(prompt, geminiApiKey, candidateModels);
    if (!gemini.ok) {
      return NextResponse.json({ success: false, error: gemini.error }, { status: 502 });
    }
    if (!gemini.text.trim()) {
      return NextResponse.json(
        { success: false, error: "Gemini a returnat un răspuns gol." },
        { status: 502 },
      );
    }

    if (mode === "score") {
      const scoreResult = parseScoreResult(gemini.text);
      if (!scoreResult) {
        return NextResponse.json(
          {
            success: false,
            error: "Nu am putut interpreta scorul AI. Încearcă din nou.",
            raw: gemini.text.slice(0, 500),
          },
          { status: 502 },
        );
      }

      const updatePayload: Record<string, unknown> = {
        ai_score: scoreResult.score,
        ai_score_reason: scoreResult.reason,
      };
      if (!leadRow.next_action?.trim()) {
        updatePayload.next_action = scoreResult.suggested_next_action;
      }

      const { data: updated, error: updateError } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", leadId)
        .select("*")
        .single();

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logLeadEvent(supabase, {
        leadId,
        eventType: "ai_scored",
        payload: {
          score: scoreResult.score,
          recommended_channel: scoreResult.recommended_channel,
          suggested_next_action: scoreResult.suggested_next_action,
          risk_notes: scoreResult.risk_notes,
          model: gemini.usedModel,
        },
        actorEmail: userEmail,
      });

      return NextResponse.json({
        success: true,
        mode: "score",
        usedModel: gemini.usedModel,
        score: scoreResult,
        lead: updated as LeadRow,
      });
    }

    const messageResult = parseMessageResult(gemini.text);
    if (!messageResult) {
      return NextResponse.json(
        {
          success: false,
          error: "Nu am putut interpreta mesajul AI. Încearcă din nou.",
          raw: gemini.text.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const { data: insertedMessage, error: messageError } = await supabase
      .from("lead_messages")
      .insert({
        lead_id: leadId,
        channel,
        direction: "outbound",
        body: messageResult.body,
        generated_by_ai: true,
        model: gemini.usedModel,
      })
      .select("*")
      .single();

    if (messageError) {
      return NextResponse.json({ success: false, error: messageError.message }, { status: 500 });
    }

    await logLeadEvent(supabase, {
      leadId,
      eventType: "message_generated",
      payload: {
        channel,
        tone,
        model: gemini.usedModel,
        message_id: insertedMessage.id,
      },
      actorEmail: userEmail,
    });

    return NextResponse.json({
      success: true,
      mode: "message",
      usedModel: gemini.usedModel,
      message: insertedMessage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută";
    return NextResponse.json(
      { success: false, error: `Eroare Lead Agent AI: ${message}` },
      { status: 500 },
    );
  }
}
