import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertHqAdminFromBearer, extractBearerToken } from "@/lib/hqAdminAuth";
import {
  isLeadStatus,
  LEAD_PATCHABLE_FIELDS,
  parseLeadImportLines,
  sanitizeLeadCreateInput,
  type LeadCreateInput,
  type LeadEventRow,
  type LeadRow,
} from "@/lib/leadAgent";

export const runtime = "nodejs";

const MAX_LIST_LIMIT = 200;
const MAX_IMPORT_BATCH = 100;

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
    console.error("[hq/leads] lead_events insert failed", {
      leadId: params.leadId,
      eventType: params.eventType,
      reason: error.message,
    });
  }
}

function leadRowToInsertPayload(data: LeadCreateInput) {
  return {
    lead_type: data.lead_type,
    campaign_key: data.campaign_key ?? null,
    language: data.language ?? "ro",
    preferred_channel: data.preferred_channel ?? null,
    full_name: data.full_name ?? null,
    company: data.company ?? null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    linkedin_url: data.linkedin_url ?? null,
    source: data.source ?? "manual",
    source_url: data.source_url ?? null,
    data_source_note: data.data_source_note ?? null,
    legal_basis: data.legal_basis ?? "legitimate_interest",
    category: data.category ?? null,
    asset_summary: data.asset_summary ?? null,
    asset_location: data.asset_location ?? null,
    est_value_eur: data.est_value_eur ?? null,
    status: data.status ?? "new",
    next_action: data.next_action ?? null,
    next_action_at: data.next_action_at ?? null,
    notes: data.notes ?? null,
    owner_email: data.owner_email ?? null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await assertHqAdminFromBearer(extractBearerToken(req));
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (leadError) {
      return NextResponse.json({ success: false, error: leadError.message }, { status: 500 });
    }
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead negăsit." }, { status: 404 });
    }

    const [{ data: events }, { data: messages }] = await Promise.all([
      supabase
        .from("lead_events")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("lead_messages")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      success: true,
      lead: lead as LeadRow,
      events: (events ?? []) as LeadEventRow[],
      messages: messages ?? [],
    });
  }

  let query = supabase
    .from("leads")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(MAX_LIST_LIMIT);

  const status = searchParams.get("status");
  const leadType = searchParams.get("lead_type");
  const category = searchParams.get("category");
  const campaignKey = searchParams.get("campaign_key");
  const language = searchParams.get("language");
  const excludeArchived = searchParams.get("exclude_archived");

  if (status) query = query.eq("status", status);
  if (leadType) query = query.eq("lead_type", leadType);
  if (category) query = query.eq("category", category);
  if (campaignKey) query = query.eq("campaign_key", campaignKey);
  if (language) query = query.eq("language", language);
  if (excludeArchived === "true") query = query.neq("status", "archived");

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, leads: (leads ?? []) as LeadRow[] });
}

export async function POST(req: NextRequest) {
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

  if (Array.isArray(body.leads) || typeof body.import_text === "string") {
    let rows: LeadCreateInput[];

    if (typeof body.import_text === "string") {
      const parsed = parseLeadImportLines(body.import_text);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            success: false,
            error: parsed.line ? `Linia ${parsed.line}: ${parsed.error}` : parsed.error,
          },
          { status: 400 },
        );
      }
      rows = parsed.rows;
    } else {
      const rawLeads = body.leads as unknown[];
      if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
        return NextResponse.json({ success: false, error: "Lista leads este goală." }, { status: 400 });
      }
      if (rawLeads.length > MAX_IMPORT_BATCH) {
        return NextResponse.json(
          { success: false, error: `Import maxim ${MAX_IMPORT_BATCH} leads per cerere.` },
          { status: 400 },
        );
      }
      rows = [];
      for (let i = 0; i < rawLeads.length; i++) {
        const item = rawLeads[i];
        if (!item || typeof item !== "object") {
          return NextResponse.json(
            { success: false, error: `Lead invalid la index ${i}.` },
            { status: 400 },
          );
        }
        const sanitized = sanitizeLeadCreateInput(item as Record<string, unknown>, userEmail);
        if (!sanitized.ok) {
          return NextResponse.json(
            { success: false, error: `Lead ${i + 1}: ${sanitized.error}` },
            { status: 400 },
          );
        }
        rows.push(sanitized.data);
      }
    }

    if (rows.length > MAX_IMPORT_BATCH) {
      return NextResponse.json(
        { success: false, error: `Import maxim ${MAX_IMPORT_BATCH} leads per cerere.` },
        { status: 400 },
      );
    }

    const campaignKey =
      typeof body.campaign_key === "string" ? body.campaign_key.trim().slice(0, 80) : null;

    const insertPayload = rows.map((row) => ({
      ...leadRowToInsertPayload({
        ...row,
        campaign_key: row.campaign_key ?? campaignKey,
        owner_email: row.owner_email ?? userEmail,
        source: row.source || (typeof body.import_text === "string" ? "import" : "batch"),
      }),
    }));

    const { data: inserted, error } = await supabase.from("leads").insert(insertPayload).select("*");

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const created = (inserted ?? []) as LeadRow[];
    await Promise.all(
      created.map((lead) =>
        logLeadEvent(supabase, {
          leadId: lead.id,
          eventType: typeof body.import_text === "string" ? "imported" : "created",
          payload: { batch: created.length > 1, source: lead.source },
          actorEmail: userEmail,
        }),
      ),
    );

    return NextResponse.json({ success: true, leads: created, count: created.length });
  }

  const sanitized = sanitizeLeadCreateInput(body, userEmail);
  if (!sanitized.ok) {
    return NextResponse.json({ success: false, error: sanitized.error }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert(leadRowToInsertPayload(sanitized.data))
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const lead = inserted as LeadRow;
  await logLeadEvent(supabase, {
    leadId: lead.id,
    eventType: "created",
    payload: { source: lead.source },
    actorEmail: userEmail,
  });

  return NextResponse.json({ success: true, lead });
}

export async function PATCH(req: NextRequest) {
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

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ success: false, error: "id obligatoriu." }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ success: false, error: "Lead negăsit." }, { status: 404 });
  }

  const before = existing as LeadRow;
  const updatePayload: Record<string, unknown> = {};

  for (const field of LEAD_PATCHABLE_FIELDS) {
    if (!(field in body)) continue;

    if (field === "lead_type") {
      const sanitized = sanitizeLeadCreateInput({ ...before, lead_type: body.lead_type });
      if (!sanitized.ok) {
        return NextResponse.json({ success: false, error: sanitized.error }, { status: 400 });
      }
      updatePayload.lead_type = sanitized.data.lead_type;
      continue;
    }

    if (field === "status") {
      if (!isLeadStatus(body.status)) {
        return NextResponse.json({ success: false, error: "status invalid." }, { status: 400 });
      }
      updatePayload.status = body.status;
      continue;
    }

    if (field === "est_value_eur") {
      const sanitized = sanitizeLeadCreateInput({ ...before, lead_type: before.lead_type, est_value_eur: body.est_value_eur });
      if (!sanitized.ok) {
        return NextResponse.json({ success: false, error: sanitized.error }, { status: 400 });
      }
      updatePayload.est_value_eur = sanitized.data.est_value_eur ?? null;
      continue;
    }

    if (field === "next_action_at") {
      if (body.next_action_at === null || body.next_action_at === "") {
        updatePayload.next_action_at = null;
      } else {
        const d = new Date(String(body.next_action_at));
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ success: false, error: "next_action_at invalid." }, { status: 400 });
        }
        updatePayload.next_action_at = d.toISOString();
      }
      continue;
    }

    const sanitized = sanitizeLeadCreateInput({
      ...before,
      lead_type: before.lead_type,
      [field]: body[field],
    });
    if (!sanitized.ok) {
      return NextResponse.json({ success: false, error: sanitized.error }, { status: 400 });
    }
    updatePayload[field] = (sanitized.data as Record<string, unknown>)[field] ?? null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ success: false, error: "Niciun câmp de actualizat." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
  }

  const after = updated as LeadRow;
  const events: Array<{ eventType: string; payload: Record<string, unknown> }> = [];

  if ("status" in updatePayload && before.status !== after.status) {
    events.push({
      eventType: "status_changed",
      payload: { from: before.status, to: after.status },
    });
  }
  if ("notes" in updatePayload && before.notes !== after.notes) {
    events.push({ eventType: "note_updated", payload: {} });
  }
  if (
    ("next_action" in updatePayload || "next_action_at" in updatePayload) &&
    (before.next_action !== after.next_action || before.next_action_at !== after.next_action_at)
  ) {
    events.push({
      eventType: "next_action_updated",
      payload: {
        next_action: after.next_action,
        next_action_at: after.next_action_at,
      },
    });
  }
  if (events.length === 0) {
    events.push({ eventType: "updated", payload: { fields: Object.keys(updatePayload) } });
  }

  await Promise.all(
    events.map((e) =>
      logLeadEvent(supabase, {
        leadId: id,
        eventType: e.eventType,
        payload: e.payload,
        actorEmail: userEmail,
      }),
    ),
  );

  return NextResponse.json({ success: true, lead: after });
}

export async function DELETE(req: NextRequest) {
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

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ success: false, error: "id obligatoriu." }, { status: 400 });
  }

  const action = body.action === "delete_request" ? "delete_request" : "archive";

  const updatePayload =
    action === "delete_request"
      ? { delete_requested: true, status: "archived" as const }
      : { status: "archived" as const };

  const { data: updated, error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  await logLeadEvent(supabase, {
    leadId: id,
    eventType: action === "delete_request" ? "delete_requested" : "archived",
    payload: { action },
    actorEmail: userEmail,
  });

  return NextResponse.json({ success: true, lead: updated as LeadRow });
}
