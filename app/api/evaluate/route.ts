import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const toSafeInt = (value: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
};

const toConfidence = (value: unknown) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(99, Math.round(n)));
};

const percentile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
};

const extractJsonPayload = (rawText: string) => {
  const trimmed = rawText.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return trimmed;
};

// --- CONFIGURAȚIA CELOR 6 CATEGORII (fără discounturi hardcodate) ---
const categoryConfig: Record<string, { accepted: string[]; requiredFields: string[] }> = {
  auto: {
    accepted: ["Auto & Moto", "auto"],
    requiredFields: ["make", "model", "year"],
  },
  imobiliare: {
    accepted: ["Imobiliare", "real_estate"],
    requiredFields: ["surface", "location"],
  },
  lux: {
    accepted: ["Lux & Ceasuri", "lux", "ceasuri"],
    requiredFields: ["brand", "model"],
  },
  business: {
    accepted: ["Afaceri de vânzare", "business"],
    requiredFields: ["industry", "revenue"],
  },
  gadgets: {
    accepted: ["Gadgets", "laptop", "phone"],
    requiredFields: ["brand", "model"],
  },
  foto: {
    accepted: ["Foto & Audio", "foto", "audio"],
    requiredFields: ["brand", "model"],
  },
};

const buildDeterministicFallback = (params: {
  comps: any[];
  dataQualityLabel: string;
  liveCount: number;
  seedCount: number;
  warningsCount: number;
  dynamicExplanation: string;
}) => {
  const { comps, liveCount, seedCount, warningsCount, dynamicExplanation } = params;
  const usablePrices = (comps || [])
    .map((item) => Number(item?.exit_price ?? item?.market_price ?? 0))
    .filter((v) => Number.isFinite(v) && v > 0) as number[];

  const marketBase = usablePrices.length ? percentile(usablePrices, 0.5) : 0;
  const quickExit = Math.round(marketBase * 0.86);
  const strongExit = Math.round(marketBase * 0.75);
  const liquidation = Math.round(marketBase * 0.58);
  const confidenceRaw = 25 + Math.min(usablePrices.length, 25) * 2 + Math.min(liveCount, 10) * 2 - Math.min(seedCount, 10) - warningsCount * 3;

  return {
    estimated_market_price: toSafeInt(marketBase),
    quick_exit_price: toSafeInt(quickExit),
    strong_exit_price: toSafeInt(strongExit),
    liquidation_price: toSafeInt(liquidation),
    confidence_score: toConfidence(confidenceRaw),
    explanation:
      `${dynamicExplanation} ` +
      "Fallback-ul deterministic a folosit distribuția comparabilelor disponibile și discounturi fixe de lichidare rapidă pentru a menține stabilitatea evaluării.",
  };
};

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ success: false, message: "Eroare Server: Chei lipsă." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const catInput = body.category?.toLowerCase() || "auto";
    
    // Identificăm configurația corectă
    let catKey = "auto";
    if (catInput.includes("imobil")) catKey = "imobiliare";
    else if (catInput.includes("lux") || catInput.includes("ceas")) catKey = "lux";
    else if (catInput.includes("afacer") || catInput.includes("business")) catKey = "business";
    else if (catInput.includes("gadget") || catInput.includes("phone") || catInput.includes("laptop")) catKey = "gadgets";
    else if (catInput.includes("foto") || catInput.includes("audio")) catKey = "foto";

    const config = categoryConfig[catKey];

    // ==========================================
    // 🛡️ NOU: FILTRU ANTI-BĂLĂRIE PENTRU VIP/COMPLEXE
    // ==========================================
    const payloadString = JSON.stringify(body).toLowerCase();
    
    // Dacă e peste 500mp, peste 500k EUR cifră afaceri, sau conține cuvinte cheie grele
    const isVipAsset = 
      (catKey === "imobiliare" && Number(body.surface) > 500) ||
      (catKey === "business" && Number(body.revenue) > 500000) ||
      payloadString.match(/resort|hotel|pensiune|aquapark|fabrica|hala|complex turistic|penthouse/);

    if (isVipAsset) {
      return NextResponse.json({
        success: true,
        category: catKey,
        estimated_market_price: 0, // Asta declanșează instant ECRANUL VIP în frontend!
        quick_exit_price: 0,
        strong_exit_price: 0,
        liquidation_price: 0,
        confidence_score: 0,
        comparable_count: 0,
        data_quality_label: 'vip_asset',
        live_comparable_count: 0,
        seed_comparable_count: 0,
        explanation: "Algoritmul a detectat un activ comercial sau exclusivist. Evaluările standard nu se pot aplica.",
        warnings: ["Activ VIP detectat. Necesită setare manuală a prețului."]
      });
    }
    // ==========================================

    // 1. Validare Câmpuri
    const warnings: string[] = [];
    config.requiredFields.forEach((f: string) => {
      if (!body[f] && !body.details?.[f]) warnings.push(`Lipsește: ${f}`);
    });

    // 2. Query Comparabile (Active + Seed)
    let query = supabase.from("listings")
      .select("*")
      .in("category", config.accepted)
      .or(`status.eq.active,status.eq.seed,is_seed.eq.true`); 

    // Matching specific pe categorii (MODIFICAT AICI PENTRU A FI INSENSIBIL LA CASE ȘI SPAȚII)
    if (catKey === "auto") {
      if (body.make) query = query.ilike("vehicle_make", body.make.trim());
      if (body.model) query = query.ilike("vehicle_model", body.model.trim());
    } else if (body.brand) {
      // Pentru Lux, Gadgets, Foto folosim brand din details JSONB
      query = query.contains('details', { brand: body.brand });
    }

    const { data: comps, error: fetchError } = await query.limit(50);

    // --- LOGICA NOUĂ: QUALITY LABELS ---
    const live_comparable_count = comps ? comps.filter((c: any) => !c.is_seed && c.status === 'active').length : 0;
    const seed_comparable_count = comps ? comps.filter((c: any) => c.is_seed || c.status === 'seed').length : 0;

    let data_quality_label = 'low_data';
    if (comps && comps.length >= 3) {
      if (live_comparable_count > seed_comparable_count) {
        data_quality_label = 'platform_market';
      } else {
        data_quality_label = 'market_index';
      }
    }

    let dynamic_explanation = "Date insuficiente pentru o evaluare de precizie ridicată.";
    if (data_quality_label === 'market_index') {
      dynamic_explanation = "Evaluare bazată pe Quick Exit Market Index.";
    } else if (data_quality_label === 'platform_market') {
      dynamic_explanation = "Evaluare bazată predominant pe listări reale din platformă.";
    }
    
    if (fetchError) {
      return NextResponse.json({ success: false, message: "Eroare la extragerea comparabilelor." }, { status: 500 });
    }

    const fallbackEvaluation = buildDeterministicFallback({
      comps: comps ?? [],
      dataQualityLabel: data_quality_label,
      liveCount: live_comparable_count,
      seedCount: seed_comparable_count,
      warningsCount: warnings.length,
      dynamicExplanation: dynamic_explanation,
    });

    let estimated_market_price = fallbackEvaluation.estimated_market_price;
    let quick_exit_price = fallbackEvaluation.quick_exit_price;
    let strong_exit_price = fallbackEvaluation.strong_exit_price;
    let liquidation_price = fallbackEvaluation.liquidation_price;
    let confidence_score = fallbackEvaluation.confidence_score;
    let explanation = fallbackEvaluation.explanation;

    if (geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: `
Ești Sniper, evaluator financiar expert pentru platforma QuickExit (lichidare rapidă de active).
Analizezi datele activului trimise de client și comparabilele de piață.
Ții cont de uzură, an, suprafață, locație, brand, model, revenue și alți factori relevanți.
Calculezi realist 4 niveluri de preț:
- estimated_market_price: prețul real de piață
- quick_exit_price: vânzare rapidă în 7-14 zile
- strong_exit_price: preț de start licitație/panic sell
- liquidation_price: cash instant ultra-redus

Răspuns OBLIGATORIU:
- Returnezi EXCLUSIV JSON valid, fără markdown, fără explicații în afara JSON.
- JSON-ul trebuie să conțină EXACT aceste câmpuri:
  estimated_market_price, quick_exit_price, strong_exit_price, liquidation_price, confidence_score, explanation
- Toate câmpurile de preț sunt numere întregi >= 0.
- confidence_score este număr întreg între 1 și 99.
- explanation este un singur paragraf scurt în limba română.
          `.trim(),
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const geminiPrompt = {
          category: catKey,
          asset_details: body,
          comparables: comps ?? [],
          data_quality: {
            data_quality_label,
            live_comparable_count,
            seed_comparable_count,
          },
          warnings,
          instruction: "Generează evaluarea finală conform regulilor și răspunde strict în JSON.",
        };

        const geminiResult = await model.generateContent(JSON.stringify(geminiPrompt));
        const geminiText = geminiResult.response.text();
        const parsed = JSON.parse(extractJsonPayload(geminiText));

        estimated_market_price = toSafeInt(parsed.estimated_market_price);
        quick_exit_price = toSafeInt(parsed.quick_exit_price);
        strong_exit_price = toSafeInt(parsed.strong_exit_price);
        liquidation_price = toSafeInt(parsed.liquidation_price);
        confidence_score = toConfidence(parsed.confidence_score);
        explanation =
          typeof parsed.explanation === "string" && parsed.explanation.trim().length > 0
            ? parsed.explanation.trim()
            : fallbackEvaluation.explanation;
      } catch (geminiError) {
        console.warn("[evaluate] Gemini fallback activated", {
          category: catKey,
          comparable_count: comps?.length || 0,
          data_quality_label,
          reason: geminiError instanceof Error ? geminiError.message : "unknown_error",
        });
        // Silent fallback: păstrăm valorile deterministice pentru robusteză în producție.
      }
    }

    // 4. Salvare Raport
    let reportId = null;
    if (body.save_report) {
      const { data: r } = await supabase.from("valuation_reports").insert({
        vehicle_profile_id: body.vehicle_profile_id || null,
        market_anchor_price: estimated_market_price,
        quick_exit_price,
        strong_exit_price,
        liquidation_price,
        confidence_score,
        ai_strategy_explanation: explanation,
      }).select("id").single();
      reportId = r?.id;
    }

    // Returnăm Răspunsul Final incluzând toate etichetele de calitate (FĂRĂ a șterge vechile date)
    return NextResponse.json({
      success: true,
      category: catKey,
      estimated_market_price,
      quick_exit_price,
      strong_exit_price,
      liquidation_price,
      confidence_score,
      comparable_count: comps?.length || 0,
      data_quality_label, 
      live_comparable_count, 
      seed_comparable_count, 
      explanation,
      warnings,
      valuation_report_id: reportId
    });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}