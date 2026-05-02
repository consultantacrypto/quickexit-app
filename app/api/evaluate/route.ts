import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import dns from "node:dns";
import https from "https";

export const runtime = "nodejs";

dns.setDefaultResultOrder("ipv4first");

/** Convenție: lei → EUR pentru fallback-uri numerice în snippet-uri. */
const EUR_PER_RON = 1 / 5.05;

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
  const idx = Math.max(
    0,
    Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))
  );
  return sorted[idx];
};

const trimmedValues = (values: number[]) => {
  if (values.length <= 8) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const trim = Math.floor(sorted.length * 0.1);
  return sorted.slice(trim, sorted.length - trim);
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

type SerpOrganicLite = {
  title: string;
  snippet: string;
  link: string;
};

// --- CONFIGURAȚIA CELOR 6 CATEGORII ---
const categoryConfig: Record<
  string,
  { accepted: string[]; requiredFields: string[] }
> = {
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

function tokenizeQuotedSearchParts(parts: string[]): string {
  const inner = parts
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return inner.length ? `"${inner.replace(/"/g, "").slice(0, 180)}"` : "";
}

/** Construiește query-ul Google pentru SerpApi, pe categorii. */
function buildSerpSearchQuery(body: Record<string, unknown>, catKey: string): string {
  const details = (body.details as Record<string, unknown> | undefined) ?? {};

  const get = (keys: string[]) => {
    for (const k of keys) {
      const v = body[k] ?? details[k];
      const s =
        typeof v === "number" ? String(v) : typeof v === "string" ? v : "";
      if (s.trim()) return s.trim();
    }
    return "";
  };

  if (catKey === "auto") {
    const make = get(["vehicle_make", "make"]);
    const model = get(["vehicle_model", "model"]);
    const year = get(["vehicle_year", "year"]);
    const quoted = tokenizeQuotedSearchParts([make, model, year]);
    const core = quoted || `"${make} ${model}`.trim();
    return `site:autovit.ro OR site:olx.ro ${core}`.slice(0, 400);
  }

  if (catKey === "imobiliare") {
    const title = get(["title"]);
    const propType =
      get(["prop_type", "property_type"]) ||
      (body.extraDetails as Record<string, string> | undefined)?.propType ||
      "apartament";
    const loc = get(["location"]);
    const surface = get(["surface"]);
    const rooms =
      get(["rooms"]) ||
      (body.extraDetails as Record<string, string> | undefined)?.rooms ||
      "";

    const quotePhrase = (s: string) => {
      const t = String(s).replace(/"/g, "").trim();
      return t ? `"${t}"` : "";
    };

    const typePhrase = title || propType;
    const tail = [
      quotePhrase(typePhrase),
      quotePhrase(loc),
      rooms ? `${rooms} camere` : "",
      surface ? `${surface} mp` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `site:olx.ro OR site:imobiliare.ro OR site:storia.ro OR site:lajumate.ro ${tail}`.slice(
      0,
      400
    );
  }

  const title = get(["title"]);
  const brand = get(["brand"]);
  const model = get(["model"]);
  const industry =
    get(["businessDomain", "industry"]) ||
    (body.extraDetails as Record<string, string> | undefined)?.businessDomain ||
    "";

  if (catKey === "business") {
    const quoted = tokenizeQuotedSearchParts(
      [title || "afacere", industry].filter(Boolean)
    );
    const core = quoted || `"afacere România"`;
    return `site:olx.ro OR site:lajumate.ro OR site:intreprinzator.ro ${core}`.slice(
      0,
      400
    );
  }

  const gadgetSites =
    "site:olx.ro OR site:emag.ro OR site:altex.ro OR site:pcgarage.ro";

  const quoted = tokenizeQuotedSearchParts([title, brand, model]);
  const fallbackCore =
    quoted ||
    tokenizeQuotedSearchParts(
      [catKey === "lux" ? "ceas luxury" : "", brand, model].filter(Boolean)
    ) ||
    `${catKey} România`;

  return `${gadgetSites} ${fallbackCore}`.slice(0, 400);
}

/** Parse numeric price token (format RO comun în snippet-uri Google). */
function parseRoAdvertNumber(numPart: string): number | null {
  const trimmed = numPart.replace(/\u00a0/g, " ").trim();
  if (!trimmed) return null;

  const noSpaces = trimmed.replace(/\s+/g, "");

  if (/^\d{1,3}([.,]\d{3})+$/.test(noSpaces)) {
    const asInt = noSpaces.replace(/[.,]/g, "");
    const n = parseInt(asInt, 10);
    return Number.isFinite(n) ? n : null;
  }

  if (/^\d{1,3}([.\s]\d{3})*(,\d{1,2})?$/.test(noSpaces.replace(/\./g, "."))) {
    const hasCommaDecimals = /,\d{1,2}$/.test(noSpaces);

    if (hasCommaDecimals) {
      const main = noSpaces.replace(/,(.*)$/, "").replace(/\./g, "");
      const n = parseFloat(main.replace(/,/g, "."));
      return Number.isFinite(n) ? n : null;
    }

    const digits = noSpaces.replace(/\./g, "").replace(/\s/g, "");
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : null;
  }

  const simple = parseFloat(noSpaces.replace(/,/g, "."));
  return Number.isFinite(simple) && simple >= 30 ? Math.round(simple) : null;
}

function extractPricesEURFromOrganic(
  organic: SerpOrganicLite[],
  catKey: string
): number[] {
  const text = organic.map((o) => `${o.title}\n${o.snippet}`).join("\n");

  const skipContext = [
    "/lună",
    " lunar",
    "leasing",
    "avans",
    "rate ",
    "/mo",
    "schi",
    "schimb ",
    "piesă",
    "piese",
    "dezmembr",
  ];

  const maxReasonable =
    catKey === "imobiliare"
      ? 50_000_000
      : catKey === "business"
        ? 100_000_000
        : 2_500_000;
  const minReasonableEUR =
    catKey === "gadgets" || catKey === "foto"
      ? 25
      : catKey === "lux"
        ? 75
        : 400;

  const eurVals: number[] = [];

  const numericPrefix = String.raw`\b(\d[\d\s\u00a0.,]{1,}?)`; // include și prețuri din 2 cifre (ex: 49 EUR)
  const eurRe = new RegExp(`${numericPrefix}\\s*(?:€|EUR|euro)\\b`, "gi");
  const ronRe = new RegExp(
    `${numericPrefix}\\s*(?:lei\\s*RON|lei\\b|RON\\b|r\\.\\s*lei)\\b`,
    "gi"
  );

  const run = (r: RegExp, isEur: boolean) => {
    let m: RegExpExecArray | null;
    const copy = new RegExp(r.source, r.flags);

    while ((m = copy.exec(text)) !== null) {
      const start = Math.max(0, m.index - 28);
      const ctx = text.slice(start, m.index + m[0].length).toLowerCase();

      if (skipContext.some((s) => ctx.includes(s))) continue;

      const raw = parseRoAdvertNumber(m[1]);
      if (raw == null || raw < minReasonableEUR || raw > maxReasonable) continue;

      const inEur = isEur ? raw : Math.round(raw * EUR_PER_RON);
      if (Number.isFinite(inEur) && inEur >= minReasonableEUR) {
        eurVals.push(inEur);
      }
    }
  };

  run(eurRe, true);
  run(ronRe, false);

  return [...new Set(eurVals)].sort((a, b) => a - b);
}

const buildDeterministicFallback = (params: {
  serpOrganic: SerpOrganicLite[];
  dataQualityLabel: string;
  liveCount: number;
  seedCount: number;
  warningsCount: number;
  dynamicExplanation: string;
  extractedPricesEUR: number[];
  catKey: string;
}) => {
  const {
    serpOrganic,
    liveCount,
    seedCount,
    warningsCount,
    dynamicExplanation,
    extractedPricesEUR,
    catKey,
  } = params;

  const usablePrices =
    extractedPricesEUR.length > 0
      ? extractedPricesEUR
      : extractPricesEURFromOrganic(serpOrganic, catKey);

  const cleanedPrices = trimmedValues(usablePrices);
  const marketBase = cleanedPrices.length ? percentile(cleanedPrices, 0.5) : 0;
  const quickExit = Math.round(marketBase * 0.86);
  const strongExit = Math.round(marketBase * 0.75);
  const liquidation = Math.round(marketBase * 0.58);

  const priceSignal = usablePrices.length;
  const confidenceRaw =
    20 +
    Math.min(priceSignal, 20) * 2 +
    Math.min(liveCount, 15) +
    Math.min(seedCount, 5) -
    Math.min(warningsCount, 8) * 3;

  return {
    estimated_market_price: toSafeInt(marketBase),
    quick_exit_price: toSafeInt(quickExit),
    strong_exit_price: toSafeInt(strongExit),
    liquidation_price: toSafeInt(liquidation),
    confidence_score: toConfidence(confidenceRaw),
    explanation:
      `${dynamicExplanation} ` +
      (usablePrices.length
        ? "Fallback-ul deterministic a extras prețuri din titlurile și snippet-uri (EUR/lei) și a aplicat discounturi quick/strong/lichidare."
        : "Fallback-ul nu a găsit suficiente prețuri interpretabile în texte — rezultatele rămân la 0 pentru a nu halucina sume."),
  };
};

async function fetchSerpOrganicLite(
  searchQuery: string
): Promise<{ organic: SerpOrganicLite[] }> {
  const key = process.env.SERPAPI_KEY;

  if (!key) throw new Error("SERPAPI_KEY missing");

  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
    searchQuery
  )}&api_key=${encodeURIComponent(key)}&gl=ro&hl=ro`;

  console.log("[evaluate] SerpApi request", {
    host: "serpapi.com",
    query: searchQuery.slice(0, 160),
  });

  const res = await new Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }>((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: { Accept: "application/json" },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        incoming.on("end", () => {
          const bodyStr = Buffer.concat(chunks).toString("utf8");
          const status = incoming.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            async json() {
              if (!bodyStr.trim()) return {};
              try {
                return JSON.parse(bodyStr) as unknown;
              } catch {
                return {};
              }
            },
          });
        });
        incoming.on("error", reject);
      }
    );
    req.on("error", reject);
  });

  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const msg =
      typeof raw?.error === "string" ? raw.error : `SerpApi HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (typeof raw?.error === "string" && raw.error) {
    throw new Error(raw.error);
  }

  const list = Array.isArray(raw.organic_results) ? raw.organic_results : [];

  const organic: SerpOrganicLite[] = list.slice(0, 25).map((row: Record<string, unknown>) => {
    let snippet = "";
    if (typeof row.snippet === "string") {
      snippet = row.snippet;
    } else if (Array.isArray(row.snippet_highlighted_words)) {
      snippet = row.snippet_highlighted_words
        .filter((x): x is string => typeof x === "string")
        .join(" ");
    }

    return {
      title: typeof row.title === "string" ? row.title : "",
      snippet,
      link: typeof row.link === "string" ? row.link : "",
    };
  });

  return { organic };
}

type GeminiFetchResponseLike = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const normalizeHeaderRecord = (
  headers: RequestInit["headers"]
): Record<string, string> => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return Object.entries(headers).reduce<Record<string, string>>((acc, [k, v]) => {
    acc[k] = String(v);
    return acc;
  }, {});
};

const geminiFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<GeminiFetchResponseLike> => {
  const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
  const method = init?.method ?? "GET";
  const headers = normalizeHeaderRecord(init?.headers);
  const body =
    typeof init?.body === "string"
      ? init.body
      : init?.body
        ? String(init.body)
        : undefined;

  return new Promise<GeminiFetchResponseLike>((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
        incoming.on("error", reject);
        incoming.on("end", () => {
          const responseText = Buffer.concat(chunks).toString("utf8");
          const status = incoming.statusCode ?? 0;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: incoming.statusMessage ?? "",
            async json() {
              if (!responseText.trim()) return {};
              return JSON.parse(responseText) as unknown;
            },
            async text() {
              return responseText;
            },
          });
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
};

const extractGeminiText = (payload: unknown): string => {
  const root = payload as Record<string, unknown>;
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];
  if (!candidates.length) return "";
  const first = candidates[0] as Record<string, unknown>;
  const content = (first?.content as Record<string, unknown>) ?? {};
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const textPart = parts.find((p) => typeof (p as Record<string, unknown>)?.text === "string") as
    | Record<string, unknown>
    | undefined;
  return typeof textPart?.text === "string" ? textPart.text : "";
};

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SERPAPI_KEY) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Eroare Server: SERPAPI_KEY lipsește. Configurați cheia pentru căutare Google (SerpApi).",
        },
        { status: 500 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, message: "Eroare Server: Chei lipsă." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const catInput =
      typeof body.category === "string" ? body.category.toLowerCase() : "auto";

    let catKey = "auto";
    if (catInput.includes("imobil")) catKey = "imobiliare";
    else if (catInput.includes("lux") || catInput.includes("ceas")) catKey = "lux";
    else if (
      catInput.includes("afacer") ||
      catInput.includes("business")
    )
      catKey = "business";
    else if (
      catInput.includes("gadget") ||
      catInput.includes("phone") ||
      catInput.includes("laptop")
    )
      catKey = "gadgets";
    else if (catInput.includes("foto") || catInput.includes("audio")) catKey = "foto";

    const config = categoryConfig[catKey];

    const payloadString = JSON.stringify(body).toLowerCase();

    /** Keyword VIP: cuvânt-întreg / frază, ca substring-uri gen „fabricație” să nu declanșeze VIP. */
    const vipMegaAssetKeywords =
      /\b(?:resort|hotel|pensiune|aquapark|fabrica|hala|penthouse)\b|\bcomplex\s+turistic\b/;

    const surfaceNum = Number(body.surface);
    const revenueNum = Number(body.revenue);

    const isVipAsset =
      (catKey === "imobiliare" &&
        Number.isFinite(surfaceNum) &&
        surfaceNum > 500) ||
      (catKey === "business" &&
        Number.isFinite(revenueNum) &&
        revenueNum > 500_000) ||
      vipMegaAssetKeywords.test(payloadString);

    if (isVipAsset) {
      return NextResponse.json({
        success: true,
        category: catKey,
        estimated_market_price: 0,
        quick_exit_price: 0,
        strong_exit_price: 0,
        liquidation_price: 0,
        confidence_score: 0,
        comparable_count: 0,
        google_result_count: 0,
        market_source: "serpapi_google",
        data_quality_label: "vip_asset",
        live_comparable_count: 0,
        seed_comparable_count: 0,
        explanation:
          "Algoritmul a detectat un activ comercial sau exclusivist. Evaluările standard nu se pot aplica.",
        warnings: ["Activ VIP detectat. Necesită setare manuală a prețului."],
      });
    }

    const warnings: string[] = [];
    config.requiredFields.forEach((f: string) => {
      if (!body[f] && !(body.details as Record<string, unknown> | undefined)?.[f]) {
        warnings.push(`Lipsește: ${f}`);
      }
    });

    const searchQuery = buildSerpSearchQuery(body, catKey);

    let serpOrganic: SerpOrganicLite[] = [];
    try {
      const fetched = await fetchSerpOrganicLite(searchQuery);
      serpOrganic = fetched.organic;
    } catch (serpErr) {
      console.error("Eroare Detaliată Fetch:", serpErr);
      console.error("[evaluate] SerpApi failure", {
        category: catKey,
        query: searchQuery.slice(0, 120),
        reason:
          serpErr instanceof Error ? serpErr.message : String(serpErr),
      });

      return NextResponse.json(
        {
          success: false,
          message:
            serpErr instanceof Error
              ? `Căutare piață eșuată: ${serpErr.message}`
              : "Căutare piață eșuată (SerpApi).",
        },
        { status: 502 }
      );
    }

    const organicCount = serpOrganic.length;
    const live_comparable_count = 0;
    const seed_comparable_count = 0;

    let data_quality_label = "low_data";
    if (organicCount >= 10) {
      data_quality_label = "external_search_strong";
    } else if (organicCount >= 4) {
      data_quality_label = "external_search";
    }

    let dynamic_explanation =
      "Date limitate în rezultatele de căutare Google pentru această interogare.";
    if (data_quality_label === "external_search") {
      dynamic_explanation =
        "Analiză pe baza unui volum moderat de rezultate Google spre portaluri cu anunțuri din România.";
    } else if (data_quality_label === "external_search_strong") {
      dynamic_explanation =
        "Analiză bazată pe un set bogat de rezultate organice către marketplace-uri RO.";
    }

    const extractedPricesEUR = extractPricesEURFromOrganic(serpOrganic, catKey);

    const fallbackEvaluation = buildDeterministicFallback({
      serpOrganic,
      dataQualityLabel: data_quality_label,
      liveCount: live_comparable_count,
      seedCount: seed_comparable_count,
      warningsCount: warnings.length,
      dynamicExplanation: dynamic_explanation,
      extractedPricesEUR,
      catKey,
    });

    let estimated_market_price = fallbackEvaluation.estimated_market_price;
    let quick_exit_price = fallbackEvaluation.quick_exit_price;
    let strong_exit_price = fallbackEvaluation.strong_exit_price;
    let liquidation_price = fallbackEvaluation.liquidation_price;
    let confidence_score = fallbackEvaluation.confidence_score;
    let explanation = fallbackEvaluation.explanation;

    if (geminiApiKey) {
      try {
        const geminiSystemInstruction =
          `
Ești Sniper, evaluator financiar pentru QuickExit (lichidare rapidă).
Primești ca intrare rezultate de căutare Google BRUTE (organic_results din SerpApi) de pe și spre portaluri cu anunțuri din România.
Nu este JSON structural de anunțuri: fiecare rând este doar title, snippet și link.

Îndatoriri:
1) Citești textul și scoți PREȚURI REALE pentru bunuri echivalente (vânzare).
2) Ignori zgomotul: avans/leasing/rate lunare sau „de la …/lună”, schimb/schimburi, piese/auto dezmembrări, servicii, job-uri, rezultate fără preț numeric.
3) Mixed RON/EUR în snippet-uri este posibil — output-ul tău de preț trebuie să fie consecvent în EUR (numere întregi), echivalând lei atunci când e clar că prețul e în lei.

Calculezi 4 niveluri (EUR): estimated_market_price, quick_exit_price (7–14 zile),
strong_exit_price (panic/licitație), liquidation_price (cash imediat, foarte mic).

Răspuns OBLIGATORIU:
Returnezi EXCLUSIV JSON valid — fără markdown, fără text în afara obiectului.
Câmpuri EXACTe: estimated_market_price, quick_exit_price, strong_exit_price,
liquidation_price, confidence_score, explanation.
Prețuri: întregi ≥ 0. confidence_score: întreg între 1 și 99. explanation: română, un singur paragraf scurt.
          `.trim();

        const geminiPrompt = {
          category: catKey,
          asset_details: body,
          google_organic_results_romania: serpOrganic,
          data_quality: {
            data_quality_label,
            google_organic_count: organicCount,
            heuristic_prices_eur_from_snippets: extractedPricesEUR.slice(-20),
          },
          warnings,
          instruction:
            "Extrage prețuri reale pentru comparabile și răspunde strict în schema JSON solicitată.",
        };

        const geminiUrl =
          "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent";

        const geminiResponse = await geminiFetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiApiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: JSON.stringify(geminiPrompt) }],
              },
            ],
            system_instruction: {
              parts: [{ text: geminiSystemInstruction }],
            },
            generation_config: { response_mime_type: "application/json" },
          }),
        });

        const geminiJson = (await geminiResponse.json()) as Record<string, unknown>;
        if (!geminiResponse.ok) {
          const apiError = (geminiJson?.error as Record<string, unknown>) ?? {};
          const message =
            typeof apiError.message === "string"
              ? apiError.message
              : `Gemini HTTP ${geminiResponse.status}`;
          throw new Error(message);
        }

        const geminiText = extractGeminiText(geminiJson);
        if (!geminiText) throw new Error("Gemini response missing text payload");
        const parsed = JSON.parse(extractJsonPayload(geminiText));

        estimated_market_price = toSafeInt(parsed.estimated_market_price);
        quick_exit_price = toSafeInt(parsed.quick_exit_price);
        strong_exit_price = toSafeInt(parsed.strong_exit_price);
        liquidation_price = toSafeInt(parsed.liquidation_price);
        confidence_score = toConfidence(parsed.confidence_score);
        explanation =
          typeof parsed.explanation === "string" &&
          parsed.explanation.trim().length > 0
            ? parsed.explanation.trim()
            : fallbackEvaluation.explanation;
      } catch (geminiError) {
        console.warn("[evaluate] Gemini fallback activated", {
          category: catKey,
          google_organic_count: organicCount,
          data_quality_label,
          hint_prices_found: extractedPricesEUR.length,
          reason:
            geminiError instanceof Error
              ? geminiError.message
              : "unknown_error",
        });
      }
    }

    let reportId = null;
    if (body.save_report) {
      const { data: r } = await supabase
        .from("valuation_reports")
        .insert({
          vehicle_profile_id: body.vehicle_profile_id || null,
          market_anchor_price: estimated_market_price,
          quick_exit_price,
          strong_exit_price,
          liquidation_price,
          confidence_score,
          ai_strategy_explanation: explanation,
        })
        .select("id")
        .single();
      reportId = r?.id;
    }

    return NextResponse.json({
      success: true,
      category: catKey,
      estimated_market_price,
      quick_exit_price,
      strong_exit_price,
      liquidation_price,
      confidence_score,
      comparable_count: organicCount,
      google_result_count: organicCount,
      market_source: "serpapi_google",
      data_quality_label,
      live_comparable_count,
      seed_comparable_count,
      explanation,
      warnings,
      valuation_report_id: reportId,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Eroare necunoscută";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
