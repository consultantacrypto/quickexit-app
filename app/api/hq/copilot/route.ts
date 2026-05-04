import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type CopilotMode = "daily" | "risk" | "priorities" | "growth";
type RiskSeverity = "critical" | "high" | "medium" | "low";

type CopilotStructuredResult = {
  executiveSummary: string;
  criticalRisks: Array<{ title: string; why: string; severity: RiskSeverity }>;
  opportunities: Array<{ title: string; why: string; impact: "mare" | "mediu" | "mic" }>;
  recommendedActions: Array<{
    title: string;
    why: string;
    impact: "mare" | "mediu" | "mic";
    effort: "mic" | "mediu" | "mare";
    urgency: "azi" | "curand" | "backlog";
  }>;
  founderNote: string;
};

const VALID_MODES: CopilotMode[] = ["daily", "risk", "priorities", "growth"];

function extractGeminiText(payload: unknown): string {
  const root = payload as Record<string, unknown>;
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];
  if (!candidates.length) return "";
  const first = candidates[0] as Record<string, unknown>;
  const content = (first?.content as Record<string, unknown>) ?? {};
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const textPart = parts.find((part) => typeof (part as Record<string, unknown>)?.text === "string") as
    | Record<string, unknown>
    | undefined;
  return typeof textPart?.text === "string" ? textPart.text : "";
}

function cleanPossibleJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return trimmed;
}

function toNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function byCategoryCount(rows: any[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row?.category || "necategorizat").trim() || "necategorizat";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function generateOperationalRisks(input: {
  listings: any[];
  demands: any[];
  profiles: any[];
  valuationReports: any[];
}) {
  const { listings, demands, profiles, valuationReports } = input;
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const risks: Array<{
    risk_key: string;
    risk_type: string;
    entity_table: string | null;
    entity_id: string | null;
    severity: RiskSeverity;
    title: string;
    description: string;
  }> = [];

  listings.forEach((l) => {
    if (l.status === "active" && l.is_seed === true) {
      risks.push({
        risk_key: `active_seed_listing_${l.id}`,
        risk_type: "listing_seed_active_public",
        entity_table: "listings",
        entity_id: l.id ?? null,
        severity: "critical",
        title: "Seed activ vizibil public",
        description: "Listing market index marcat seed apare in starea activa.",
      });
    }
    if (l.status === "pending_payment" && l.created_at && now - new Date(l.created_at).getTime() > dayMs) {
      risks.push({
        risk_key: `old_pending_listing_${l.id}`,
        risk_type: "listing_pending_stale",
        entity_table: "listings",
        entity_id: l.id ?? null,
        severity: "medium",
        title: "Anunt in asteptarea platii de peste 24h",
        description: "Potential blocaj in funnel de conversie listing.",
      });
    }
    if (!l.user_id && l.is_seed !== true) {
      risks.push({
        risk_key: `listing_missing_user_${l.id}`,
        risk_type: "listing_missing_owner",
        entity_table: "listings",
        entity_id: l.id ?? null,
        severity: "high",
        title: "Anunt real fara user_id",
        description: "Date inconsistente pe listing non-seed.",
      });
    }
    if (l.status === "active" && (!Array.isArray(l.images) || l.images.length === 0) && l.is_seed !== true) {
      risks.push({
        risk_key: `active_listing_no_images_${l.id}`,
        risk_type: "listing_active_without_images",
        entity_table: "listings",
        entity_id: l.id ?? null,
        severity: "low",
        title: "Anunt activ fara poze",
        description: "Listare activa fara imagini; poate reduce conversia.",
      });
    }
  });

  demands.forEach((d) => {
    if (d.status === "pending_payment" && d.created_at && now - new Date(d.created_at).getTime() > dayMs) {
      risks.push({
        risk_key: `old_pending_demand_${d.id}`,
        risk_type: "demand_pending_stale",
        entity_table: "demands",
        entity_id: d.id ?? null,
        severity: "medium",
        title: "Cerere in asteptarea platii de peste 24h",
        description: "Potential blocaj in funnel de conversie demand.",
      });
    }
    if (d.status === "active" && !d.buyer_id) {
      risks.push({
        risk_key: `active_demand_missing_buyer_${d.id}`,
        risk_type: "demand_active_orphan_buyer",
        entity_table: "demands",
        entity_id: d.id ?? null,
        severity: "high",
        title: "Cerere activa fara buyer_id",
        description: "Cerere activa fara cumparator atasat.",
      });
    }
  });

  profiles.forEach((p) => {
    if (p.kyc_status === "requires_input") {
      risks.push({
        risk_key: `profile_kyc_requires_input_${p.id}`,
        risk_type: "profile_kyc_blocked",
        entity_table: "profiles",
        entity_id: p.id ?? null,
        severity: "medium",
        title: "Profil cu KYC de reluat",
        description: "Utilizator blocat in verificarea KYC.",
      });
    }
  });

  valuationReports.forEach((v) => {
    if (toNum(v.confidence_score) < 50) {
      risks.push({
        risk_key: `low_confidence_report_${v.id}`,
        risk_type: "valuation_low_confidence",
        entity_table: "valuation_reports",
        entity_id: v.id ?? null,
        severity: "low",
        title: "Raport de evaluare cu incredere scazuta",
        description: "Scor de incredere sub pragul minim.",
      });
    }
  });

  return risks;
}

function modeSpecificInstruction(mode: CopilotMode): string {
  if (mode === "daily") {
    return "Concentreaza analiza pe sumar operational, ce merge, ce e blocat, ce s-a schimbat si ce trebuie facut azi.";
  }
  if (mode === "risk") {
    return "Concentreaza analiza pe riscuri critice, medii, mici, verificari manuale si ce nu trebuie ignorat.";
  }
  if (mode === "priorities") {
    return "Returneaza top 5 actiuni recomandate; pentru fiecare include impact, efort, urgenta si motiv.";
  }
  return "Concentreaza analiza pe categorii cu potential, dezechilibre cerere-oferta si ce merita promovat manual.";
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ success: false, error: "Config Supabase incompleta: lipsesc URL sau anon key." }, { status: 500 });
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: "Config server incompleta: SUPABASE_SERVICE_ROLE_KEY lipseste." },
        { status: 500 }
      );
    }

    if (!geminiApiKey) {
      return NextResponse.json(
        { success: false, error: "Config server incompleta: GEMINI_API_KEY lipseste." },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!bearer) {
      return NextResponse.json({ success: false, error: "Token lipsa. Trimite Authorization Bearer." }, { status: 401 });
    }

    const authSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Autentificare invalida sau expirata." }, { status: 401 });
    }

    const ADMIN_EMAILS = (process.env.HQ_ADMIN_EMAILS || "consultantacrypto.ro@gmail.com")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = String(user.email || "").trim().toLowerCase();
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return NextResponse.json({ success: false, error: "Acces interzis. Doar adminii pot folosi HQ Copilot." }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as { mode?: unknown };
    const mode = String(body.mode || "").trim().toLowerCase() as CopilotMode;
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { success: false, error: "Parametru mode invalid. Acceptat: daily | risk | priorities | growth." },
        { status: 400 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const [listingsRes, demandsRes, listingOffersRes, demandOffersRes, profilesRes, valuationRes] = await Promise.all([
      adminSupabase.from("listings").select("*").order("created_at", { ascending: false }).limit(500),
      adminSupabase.from("demands").select("*").order("created_at", { ascending: false }).limit(500),
      adminSupabase.from("listing_offers").select("*").order("created_at", { ascending: false }).limit(300),
      adminSupabase.from("demand_offers").select("*").order("created_at", { ascending: false }).limit(300),
      adminSupabase.from("profiles").select("id, full_name, kyc_status, user_type, created_at").order("created_at", { ascending: false }).limit(500),
      adminSupabase
        .from("valuation_reports")
        .select("id, confidence_score, market_anchor_price, quick_exit_price, generated_at")
        .order("generated_at", { ascending: false })
        .limit(500),
    ]);

    const errors = [listingsRes.error, demandsRes.error, listingOffersRes.error, demandOffersRes.error, profilesRes.error, valuationRes.error].filter(Boolean);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: `Nu pot citi snapshot-ul operational: ${errors[0]?.message}` }, { status: 500 });
    }

    const listings = listingsRes.data ?? [];
    const demands = demandsRes.data ?? [];
    const listingOffers = listingOffersRes.data ?? [];
    const demandOffers = demandOffersRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const valuationReports = valuationRes.data ?? [];

    const generatedRisks = generateOperationalRisks({ listings, demands, profiles, valuationReports });

    const riskResolutionsRes = await adminSupabase
      .from("admin_risk_resolutions")
      .select("risk_key, title, severity, resolved_at, entity_table")
      .order("resolved_at", { ascending: false })
      .limit(50);

    const resolvedRisksAvailable = !riskResolutionsRes.error;
    const recentResolvedRisks = resolvedRisksAvailable ? riskResolutionsRes.data ?? [] : [];

    const listingsActive = listings.filter((l) => l.status === "active");
    const demandsActive = demands.filter((d) => d.status === "active");
    const lowConfidenceReports = valuationReports.filter((r) => toNum(r.confidence_score) < 50);

    const snapshot = {
      generatedAt: new Date().toISOString(),
      mode,
      listings: {
        total: listings.length,
        active: listingsActive.length,
        pending_payment: listings.filter((l) => l.status === "pending_payment").length,
        seed: listings.filter((l) => l.is_seed === true).length,
        active_without_images: listings.filter(
          (l) => l.status === "active" && l.is_seed !== true && (!Array.isArray(l.images) || l.images.length === 0)
        ).length,
        missing_user_id: listings.filter((l) => l.is_seed !== true && !l.user_id).length,
        total_market_price_active: listingsActive.reduce((sum, l) => sum + toNum(l.market_price), 0),
        total_exit_price_active: listingsActive.reduce((sum, l) => sum + toNum(l.exit_price), 0),
        by_category: byCategoryCount(listings),
        recent: listings.slice(0, 10).map((l) => ({
          id: l.id ?? null,
          title: l.title ?? null,
          category: l.category ?? null,
          status: l.status ?? null,
          is_seed: l.is_seed === true,
          market_price: toNum(l.market_price),
          exit_price: toNum(l.exit_price),
          created_at: l.created_at ?? null,
        })),
      },
      demands: {
        total: demands.length,
        active: demandsActive.length,
        pending_payment: demands.filter((d) => d.status === "pending_payment").length,
        missing_buyer_id: demands.filter((d) => d.status === "active" && !d.buyer_id).length,
        total_budget_active: demandsActive.reduce((sum, d) => sum + toNum(d.budget), 0),
        by_category: byCategoryCount(demands),
        recent: demands.slice(0, 10).map((d) => ({
          id: d.id ?? null,
          target_asset: d.target_asset ?? null,
          category: d.category ?? null,
          budget: toNum(d.budget),
          status: d.status ?? null,
          buyer_id: d.buyer_id ? String(d.buyer_id).slice(0, 8) : null,
          created_at: d.created_at ?? null,
        })),
      },
      offers: {
        listing_offers_total: listingOffers.length,
        demand_offers_total: demandOffers.length,
        recent_listing_offers: listingOffers.slice(0, 10).map((o) => ({
          id: o.id ?? null,
          listing_id: o.listing_id ?? null,
          offer_price: toNum(o.offer_price),
          status: o.status ?? null,
          created_at: o.created_at ?? null,
        })),
        recent_demand_offers: demandOffers.slice(0, 10).map((o) => ({
          id: o.id ?? null,
          demand_id: o.demand_id ?? null,
          offer_price: toNum(o.offer_price),
          status: o.status ?? null,
          created_at: o.created_at ?? null,
        })),
      },
      profiles: {
        total: profiles.length,
        verified: profiles.filter((p) => p.kyc_status === "verified").length,
        pending: profiles.filter((p) => p.kyc_status === "pending").length,
        processing: profiles.filter((p) => p.kyc_status === "processing").length,
        requires_input: profiles.filter((p) => p.kyc_status === "requires_input").length,
        canceled: profiles.filter((p) => p.kyc_status === "canceled").length,
        by_user_type: profiles.reduce<Record<string, number>>((acc, p) => {
          const t = String(p.user_type || "necunoscut");
          acc[t] = (acc[t] ?? 0) + 1;
          return acc;
        }, {}),
        recent: profiles.slice(0, 10).map((p) => ({
          id: p.id ?? null,
          full_name: p.full_name ?? null,
          kyc_status: p.kyc_status ?? null,
          user_type: p.user_type ?? null,
          created_at: p.created_at ?? null,
        })),
      },
      valuation_reports: {
        total: valuationReports.length,
        avg_confidence: valuationReports.length
          ? Number(
              (
                valuationReports.reduce((sum, v) => sum + toNum(v.confidence_score), 0) / valuationReports.length
              ).toFixed(2)
            )
          : 0,
        low_confidence_count: lowConfidenceReports.length,
        recent_low_confidence_reports: lowConfidenceReports.slice(0, 10).map((r) => ({
          id: r.id ?? null,
          confidence_score: toNum(r.confidence_score),
          market_anchor_price: toNum(r.market_anchor_price),
          quick_exit_price: toNum(r.quick_exit_price),
          generated_at: r.generated_at ?? null,
        })),
      },
      risks: {
        total_detected: generatedRisks.length,
        critical: generatedRisks.filter((r) => r.severity === "critical").length,
        high: generatedRisks.filter((r) => r.severity === "high").length,
        medium: generatedRisks.filter((r) => r.severity === "medium").length,
        low: generatedRisks.filter((r) => r.severity === "low").length,
        sample: generatedRisks.slice(0, 20),
        resolved_risks_available: resolvedRisksAvailable,
        resolved_risks_count: recentResolvedRisks.length,
        recent_resolved_risks: recentResolvedRisks,
      },
    };

    const fullPrompt = `
Esti HQ Copilot pentru Quick Exit, o platforma romaneasca de lichiditate pentru active.

Rolul tau:
- ajuti fondatorul sa opereze platforma
- analizezi riscuri, produs, date, crestere si prioritati
- nu inventezi date
- folosesti doar snapshot-ul primit
- raspunzi in romana
- esti practic, structurat si orientat pe actiuni
- prioritizezi increderea, monetizarea, siguranta si claritatea UX

Mod analiza: ${mode}
Directie pentru acest mod: ${modeSpecificInstruction(mode)}

Snapshot operational:
${JSON.stringify(snapshot, null, 2)}

Raspunde STRICT in JSON valid, fara markdown, fara backticks, fara text inainte sau dupa JSON.

Format obligatoriu:
{
  "executiveSummary": "string",
  "criticalRisks": [
    {
      "title": "string",
      "why": "string",
      "severity": "critical|high|medium|low"
    }
  ],
  "opportunities": [
    {
      "title": "string",
      "why": "string",
      "impact": "mare|mediu|mic"
    }
  ],
  "recommendedActions": [
    {
      "title": "string",
      "why": "string",
      "impact": "mare|mediu|mic",
      "effort": "mic|mediu|mare",
      "urgency": "azi|curand|backlog"
    }
  ],
  "founderNote": "string"
}
`.trim();

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      geminiModel
    )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
      }),
    });

    const geminiPayload = (await geminiResponse.json().catch(() => ({}))) as Record<string, unknown>;
    if (!geminiResponse.ok) {
      const err = (geminiPayload.error as Record<string, unknown> | undefined)?.message;
      return NextResponse.json(
        { success: false, error: `Gemini request failed: ${typeof err === "string" ? err : `HTTP ${geminiResponse.status}`}` },
        { status: 502 }
      );
    }

    const text = extractGeminiText(geminiPayload);
    if (!text) {
      return NextResponse.json({ success: true, mode, generatedAt: snapshot.generatedAt, snapshotSummary: snapshot.risks, result: { rawText: "", parseWarning: true } });
    }

    try {
      const parsed = JSON.parse(cleanPossibleJson(text)) as CopilotStructuredResult;
      return NextResponse.json({
        success: true,
        mode,
        generatedAt: snapshot.generatedAt,
        snapshotSummary: {
          listings: snapshot.listings.total,
          demands: snapshot.demands.total,
          offers: snapshot.offers.listing_offers_total + snapshot.offers.demand_offers_total,
          profiles: snapshot.profiles.total,
          risks_detected: snapshot.risks.total_detected,
          resolved_risks_available: snapshot.risks.resolved_risks_available,
        },
        result: parsed,
      });
    } catch {
      return NextResponse.json({
        success: true,
        mode,
        generatedAt: snapshot.generatedAt,
        snapshotSummary: {
          listings: snapshot.listings.total,
          demands: snapshot.demands.total,
          offers: snapshot.offers.listing_offers_total + snapshot.offers.demand_offers_total,
          profiles: snapshot.profiles.total,
          risks_detected: snapshot.risks.total_detected,
          resolved_risks_available: snapshot.risks.resolved_risks_available,
        },
        result: {
          rawText: text,
          parseWarning: true,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscuta";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
