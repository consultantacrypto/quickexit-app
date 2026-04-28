import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// --- TOOLKIT MATEMATIC ---
const clamp = (value: number, min?: number | null, max?: number | null) => {
  let result = value;
  if (typeof min === "number") result = Math.max(result, min);
  if (typeof max === "number") result = Math.min(result, max);
  return result;
};

const safeNumber = (val: any) => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : Math.round(sorted[mid]);
};

// --- CONFIGURAȚIA CELOR 6 CATEGORII ---
const categoryConfig: Record<string, any> = {
  auto: {
    accepted: ["Auto & Moto", "auto"],
    requiredFields: ["make", "model", "year"],
    baseDiscount: 0.85, // Quick Exit
    strongDiscount: 0.79, // Standard
  },
  imobiliare: {
    accepted: ["Imobiliare", "real_estate"],
    requiredFields: ["surface", "location"],
    baseDiscount: 0.82,
    strongDiscount: 0.75,
  },
  lux: {
    accepted: ["Lux & Ceasuri", "lux", "ceasuri"],
    requiredFields: ["brand", "model"],
    baseDiscount: 0.78,
    strongDiscount: 0.70,
  },
  business: {
    accepted: ["Afaceri de vânzare", "business"],
    requiredFields: ["industry", "revenue"],
    baseDiscount: 0.75,
    strongDiscount: 0.65,
  },
  gadgets: {
    accepted: ["Gadgets", "laptop", "phone"],
    requiredFields: ["brand", "model"],
    baseDiscount: 0.80,
    strongDiscount: 0.70,
  },
  foto: {
    accepted: ["Foto & Audio", "foto", "audio"],
    requiredFields: ["brand", "model"],
    baseDiscount: 0.80,
    strongDiscount: 0.70,
  }
};

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    // -----------------------------------

    if (fetchError || !comps || comps.length < 2) {
      return NextResponse.json({ 
        success: true, 
        confidence_score: 15, 
        message: "Date insuficiente pentru o evaluare granulară.",
        warning: "Scor de încredere scăzut. Se recomandă consultarea unui expert.",
        data_quality_label,
        live_comparable_count,
        seed_comparable_count,
        explanation: dynamic_explanation
      });
    }

    // 3. Calcul Mediană și Ajustări specifice
    const adjustedPrices = comps.map(item => {
      let price = safeNumber(item.exit_price || item.market_price);
      if (price === 0) return null;

      // Ajustare m2 Imobiliare
      if (catKey === "imobiliare" && body.surface && item.details?.surface) {
        price = (price / item.details.surface) * body.surface;
      }
      
      // Ajustare Multiplicator Afaceri (dacă avem revenue)
      if (catKey === "business" && body.revenue && item.details?.revenue) {
        const itemMultiple = price / item.details.revenue;
        price = body.revenue * itemMultiple;
      }

      return price;
    }).filter(Boolean) as number[];

    const marketMedian = median(adjustedPrices);
    const confidence = Math.min((adjustedPrices.length * 8) + (warnings.length ? 10 : 30), 95);

    // 4. Salvare Raport
    let reportId = null;
    if (body.save_report || body.vehicle_profile_id) {
      const { data: r } = await supabase.from("valuation_reports").insert({
        vehicle_profile_id: body.vehicle_profile_id || null,
        market_anchor_price: marketMedian,
        quick_exit_price: Math.round(marketMedian * config.baseDiscount),
        strong_exit_price: Math.round(marketMedian * config.strongDiscount),
        liquidation_price: Math.round(marketMedian * 0.60),
        confidence_score: confidence,
        ai_strategy_explanation: `Evaluare v1.5 finală pentru ${catKey.toUpperCase()}.`
      }).select("id").single();
      reportId = r?.id;
    }

    // Returnăm Răspunsul Final incluzând toate etichetele de calitate (FĂRĂ a șterge vechile date)
    return NextResponse.json({
      success: true,
      category: catKey,
      estimated_market_price: marketMedian,
      quick_exit_price: Math.round(marketMedian * config.baseDiscount),
      strong_exit_price: Math.round(marketMedian * config.strongDiscount),
      liquidation_price: Math.round(marketMedian * 0.60),
      confidence_score: confidence,
      comparable_count: adjustedPrices.length,
      data_quality_label, 
      live_comparable_count, 
      seed_comparable_count, 
      explanation: dynamic_explanation, 
      warnings,
      valuation_report_id: reportId
    });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}