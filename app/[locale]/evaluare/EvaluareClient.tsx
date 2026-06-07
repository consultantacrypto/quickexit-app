"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/src/i18n/navigation";
import { Clock3, ShieldCheck } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import EvaluateTurnstile, { type EvaluateTurnstileHandle } from "@/components/EvaluateTurnstile";
import { isEvaluateTurnstileUiEnabled } from "@/lib/turnstilePublic";
import {
  buildEvaluationDraft,
  buildListingHrefForStrategy,
  computeReferenceMarketPrice,
  EVALUATION_PRICE_STRATEGIES,
  getEvaluationPriceFromResult,
  saveEvaluationDraftToSession,
  type EvaluationPriceType,
} from "@/lib/evaluationDraft";

type ApiResult = {
  success: boolean;
  estimated_market_price: number;
  quick_exit_price: number;
  strong_exit_price: number;
  liquidation_price: number;
  confidence_score: number;
  explanation?: string;
  data_quality_label?: string;
  comparable_count?: number;
  google_result_count?: number;
  cache_hit?: boolean;
  warnings?: string[];
  [key: string]: unknown;
};

type CategoryId = "auto" | "imobiliare" | "lux" | "business" | "gadgets" | "foto";

type CategoryOption = {
  id: CategoryId;
  title: string;
  hint: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "auto", title: "Auto & Moto", hint: "estimare după marcă, model, an, km" },
  { id: "imobiliare", title: "Imobiliare", hint: "estimare după zonă, suprafață, camere" },
  { id: "lux", title: "Lux & Ceasuri", hint: "estimare după brand, model, acte/stare" },
  { id: "business", title: "Afaceri de vânzare", hint: "estimare după domeniu, venit, locație" },
  { id: "gadgets", title: "Gadgets", hint: "estimare după brand, model, stare" },
  { id: "foto", title: "Foto & Audio", hint: "estimare după brand, model, stare" },
];

const LOADING_MESSAGES = [
  "Scanăm piața din România...",
  "Eliminăm semnalele false: leasing, rate, piese...",
  "Calculăm prețurile de exit...",
];

const LABEL_MAP: Record<string, string> = {
  external_search_strong: "Încredere bună",
  external_search: "Încredere medie",
  low_data: "Date insuficiente",
  vip_asset: "Evaluare specială necesară",
};

function getPublicEvaluationDisclaimer(dataQuality?: string): string {
  if (dataQuality === "external_search_strong") {
    return "Estimare orientativă bazată pe surse publice disponibile la momentul evaluării. Nu garantează vânzarea.";
  }
  return "Estimare orientativă calculată din rezultate de piață disponibile. Prețurile nu garantează vânzarea și trebuie validate de vânzător.";
}

function formatConfidenceScore(score: unknown): number {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(99, Math.round(n)));
}

function validateEvaluationForm(
  category: CategoryId,
  formData: {
    make: string;
    model: string;
    year: string;
    location: string;
    surface: string;
    brand: string;
    industry: string;
    revenue: string;
  },
): string | null {
  switch (category) {
    case "auto":
      if (!formData.make.trim()) return "Completează marca.";
      if (!formData.model.trim()) return "Completează modelul.";
      if (!formData.year.trim()) return "Completează anul.";
      return null;
    case "imobiliare":
      if (!formData.location.trim()) return "Completează localizarea.";
      if (!formData.surface.trim()) return "Completează suprafața.";
      return null;
    case "lux":
    case "gadgets":
    case "foto":
      if (!formData.brand.trim()) return "Completează brandul.";
      if (!formData.model.trim()) return "Completează modelul.";
      return null;
    case "business":
      if (!formData.industry.trim()) return "Completează domeniul.";
      if (!formData.revenue.trim()) return "Completează venitul anual.";
      return null;
    default:
      return null;
  }
}

function buildManualListingHref(category: CategoryId): string {
  return `/pune-anunt?source=evaluation&category=${category}`;
}

function priceStrategyCardClass(type: EvaluationPriceType): string {
  switch (type) {
    case "market":
      return "rounded-2xl border-2 border-black bg-white p-6 md:p-7 shadow-[6px_6px_0_0_rgba(0,0,0,0.12)]";
    case "quick_exit":
      return "rounded-2xl border-[3px] border-black bg-[#FFD100] p-6 md:p-7 shadow-[6px_6px_0_0_#000]";
    case "fast_sale":
      return "rounded-2xl border-2 border-black bg-white p-6 md:p-7 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]";
    case "liquidation":
      return "rounded-2xl border-2 border-red-700/55 bg-neutral-950 p-6 md:p-7 shadow-[6px_6px_0_0_rgba(220,38,38,0.25)]";
    default:
      return "rounded-2xl border-2 border-black bg-white p-6 md:p-7";
  }
}

function priceStrategySubtitle(type: EvaluationPriceType): string | null {
  switch (type) {
    case "quick_exit":
      return "recomandat pentru vânzare accelerată";
    case "fast_sale":
      return "vânzare rapidă cu discount controlat";
    case "liquidation":
      return "încasare rapidă / lichidare agresivă";
    default:
      return null;
  }
}

function priceStrategyTitleClass(type: EvaluationPriceType): string {
  if (type === "liquidation") return "text-[10px] font-bold uppercase tracking-[0.22em] text-red-400";
  if (type === "quick_exit") return "text-[10px] font-bold uppercase tracking-[0.22em] text-black/75";
  return "text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500";
}

function priceStrategyValueClass(type: EvaluationPriceType): string {
  return type === "liquidation"
    ? "mt-4 text-2xl font-black tabular-nums text-white md:text-3xl"
    : "mt-3 text-2xl font-black tabular-nums text-black md:text-3xl";
}

function priceStrategyCtaClass(type: EvaluationPriceType, enabled: boolean): string {
  const base =
    "mt-5 block w-full rounded-xl px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest transition";
  if (!enabled) {
    return `${base} cursor-not-allowed border-2 border-neutral-400 bg-neutral-200 text-neutral-500`;
  }
  if (type === "quick_exit") {
    return `${base} border-[3px] border-black bg-black text-[#FFD100] shadow-[4px_4px_0_0_#000] hover:brightness-110`;
  }
  if (type === "liquidation") {
    return `${base} border-2 border-red-400 bg-red-950 text-red-100 hover:bg-red-900`;
  }
  return `${base} border-2 border-black bg-white text-black hover:bg-[#FFD100]`;
}

function formatPrice(price: unknown) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  return `EUR ${n.toLocaleString("ro-RO")}`;
}

export default function EvaluareClient() {
  const [category, setCategory] = useState<CategoryId>("auto");
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: "",
    km: "",
    property_type: "Apartament",
    location: "",
    surface: "",
    rooms: "",
    brand: "",
    condition: "Foarte buna",
    optionalYear: "",
    industry: "",
    revenue: "",
  });

  const turnstileRef = useRef<EvaluateTurnstileHandle>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileUiEnabled = isEvaluateTurnstileUiEnabled();

  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [phase]);

  const activeStep = phase === "form" ? 2 : phase === "loading" ? 3 : 4;

  const qualityLabel = useMemo(() => {
    if (!result?.data_quality_label) return "";
    return LABEL_MAP[result.data_quality_label] || "Evaluare disponibilă";
  }, [result]);

  const publicExplanation = useMemo(
    () => getPublicEvaluationDisclaimer(result?.data_quality_label),
    [result?.data_quality_label],
  );

  const analyzedSources = Number(result?.google_result_count ?? result?.comparable_count ?? 0);

  const manualListingHref = useMemo(
    () => buildManualListingHref(category),
    [category],
  );

  const handleManualListingClick = () => {
    saveEvaluationDraftToSession(
      buildEvaluationDraft({
        category,
        formData,
      }),
    );

    trackEvent("click_evaluation_to_listing", {
      category,
      data_quality_label: result?.data_quality_label
        ? String(result.data_quality_label)
        : "unknown",
      confidence_score: formatConfidenceScore(result?.confidence_score),
      source: "evaluation_result",
      selected_price_type: "manual",
    });
  };

  const handlePriceStrategyClick = (priceType: EvaluationPriceType) => () => {
    const strategy = EVALUATION_PRICE_STRATEGIES.find((s) => s.type === priceType);
    if (!strategy) return;

    const selectedExitPrice = getEvaluationPriceFromResult(result, priceType);
    const estimatedMarketPrice = getEvaluationPriceFromResult(result, "market");

    saveEvaluationDraftToSession(
      buildEvaluationDraft({
        category,
        formData,
        selectedExitPrice,
        selectedPriceType: priceType,
        selectedPriceLabel: strategy.label,
        estimatedMarketPrice,
        confidenceScore: formatConfidenceScore(result?.confidence_score),
      }),
    );

    trackEvent("selected_price_strategy", {
      category,
      selected_price_type: priceType,
      data_quality_label: result?.data_quality_label
        ? String(result.data_quality_label)
        : "unknown",
      confidence_score: formatConfidenceScore(result?.confidence_score),
    });

    trackEvent("click_evaluation_to_listing", {
      category,
      data_quality_label: result?.data_quality_label
        ? String(result.data_quality_label)
        : "unknown",
      confidence_score: formatConfidenceScore(result?.confidence_score),
      source: "evaluation_result",
      selected_price_type: priceType,
    });
  };

  const resultWarnings = useMemo(() => {
    if (!result?.warnings || !Array.isArray(result.warnings)) return [];
    return result.warnings.map((w) => String(w)).filter(Boolean);
  }, [result?.warnings]);

  const confidencePercent = formatConfidenceScore(result?.confidence_score);

  const buildPayload = () => ({
    category,
    make: category === "auto" ? formData.make : undefined,
    model:
      category === "auto"
        ? formData.model
        : category === "lux" || category === "gadgets" || category === "foto"
          ? formData.model
          : undefined,
    year: category === "auto" ? Number(formData.year) || undefined : undefined,
    km: category === "auto" ? Number(formData.km) || undefined : undefined,
    vehicle_km: category === "auto" ? Number(formData.km) || undefined : undefined,
    surface: category === "imobiliare" ? Number(formData.surface) || undefined : undefined,
    rooms: category === "imobiliare" ? Number(formData.rooms) || undefined : undefined,
    location:
      category === "imobiliare" || category === "business" ? formData.location : undefined,
    brand:
      category === "lux" || category === "gadgets" || category === "foto"
        ? formData.brand
        : undefined,
    revenue: category === "business" ? Number(formData.revenue) || undefined : undefined,
    industry: category === "business" ? formData.industry : undefined,
    details: {
      property_type: formData.property_type,
      condition: formData.condition,
      optionalYear: formData.optionalYear,
      domain: formData.industry,
    },
    extraDetails: formData,
    save_report: true,
    ...(turnstileToken ? { turnstileToken } : {}),
  });

  const runEvaluation = async () => {
    const validationMessage = validateEvaluationForm(category, formData);
    if (validationMessage) {
      setEvaluationError(validationMessage);
      return;
    }

    if (turnstileUiEnabled && !turnstileToken) {
      setEvaluationError(
        "Completează verificarea de securitate de mai jos, apoi încearcă din nou.",
      );
      return;
    }

    trackEvent("start_evaluation", { category });
    setEvaluationError(null);
    setPhase("loading");
    setLoadingIndex(0);
    setResult(null);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = (await response.json()) as ApiResult & { message?: string };
      if (!response.ok || !data.success) {
        trackEvent("evaluation_failed", {
          category,
          status_code: response.status,
          reason:
            response.status === 429
              ? "rate_limit"
              : response.status === 403
                ? "turnstile"
                : response.status === 400
                  ? "validation"
                  : response.status === 413
                    ? "payload_too_large"
                    : "api_error",
        });
        setEvaluationError(
          typeof data.message === "string" && data.message.trim()
            ? data.message
            : "Evaluarea nu a putut fi procesată. Te rugăm să încerci din nou.",
        );
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        setPhase("form");
        return;
      }

      setResult(data);
      trackEvent("evaluation_success", {
        category,
        data_quality_label: data.data_quality_label ? String(data.data_quality_label) : "unknown",
        confidence_score: Number(data.confidence_score ?? 0),
      });
      setPhase("result");
    } catch {
      trackEvent("evaluation_failed", {
        category,
        reason: "network",
      });
      setEvaluationError("Serviciul de evaluare este temporar indisponibil. Te rugăm să încerci mai târziu.");
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setPhase("form");
    }
  };

  const StepPill = ({ index, title }: { index: number; title: string }) => (
    <div
      className={`rounded-full border-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
        activeStep >= index
          ? "border-black bg-black text-[#FFD100]"
          : "border-black/15 bg-white text-neutral-600"
      }`}
    >
      {index}. {title}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <div className="mx-auto max-w-7xl space-y-10 md:space-y-14">
        {/* Hero — zonă premium neagră, limitată */}
        <div className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
              Quick Exit Terminal
            </p>
            <h1 className="mt-5 text-3xl font-black uppercase italic leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              Evaluare <span className="text-[#FFD100]">Lichiditate</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[11px] font-semibold uppercase leading-relaxed tracking-[0.2em] text-neutral-300 md:text-xs">
              Nu vindem visuri. Calculăm lichiditate.
            </p>
          </div>
          <div className="mx-auto mt-10 flex flex-wrap justify-center gap-2 md:gap-3">
            <StepPill index={1} title="Alege categoria" />
            <StepPill index={2} title="Completează detaliile" />
            <StepPill index={3} title="Scanare piață" />
            <StepPill index={4} title="Rezultat + actiune" />
          </div>
        </div>

        {/* Terminal card — corp deschis, brutalist */}
        <div className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.12)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          {phase !== "result" && (
            <>
              {evaluationError && phase === "form" && (
                <div
                  role="alert"
                  className="mb-8 rounded-2xl border-2 border-red-800/40 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
                >
                  {evaluationError}
                </div>
              )}
              <section className="mb-14 md:mb-16">
                <h2 className="mb-8 text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
                  1. Alege categoria
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setCategory(opt.id);
                        setEvaluationError(null);
                      }}
                      className={`rounded-2xl border-2 border-black p-6 text-left transition-all duration-150 md:p-7 ${
                        category === opt.id
                          ? "bg-black text-[#FFD100] shadow-[6px_6px_0_0_#FFD100]"
                          : "bg-white text-black hover:border-[#FFD100] hover:shadow-[6px_6px_0_0_rgba(255,209,0,0.65)] active:translate-y-[1px]"
                      }`}
                    >
                      <p className="text-sm font-black uppercase tracking-wider">{opt.title}</p>
                      <p
                        className={`mt-2 text-[11px] font-semibold uppercase leading-relaxed tracking-wide ${
                          category === opt.id ? "text-[#FFD100]/85" : "text-neutral-600"
                        }`}
                      >
                        {opt.hint}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-black/[0.08] bg-[#F7F4EC]/80 p-6 md:border-2 md:border-black/[0.06] md:p-10 lg:p-12">
                <h2 className="mb-8 text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
                  2. Completează detaliile
                </h2>
                <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                  {category === "auto" && (
                    <>
                      <input placeholder="Marca" value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} className="input" />
                      <input placeholder="Model" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="input" />
                      <input placeholder="An" type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} className="input" />
                      <input placeholder="Kilometraj (km)" type="number" value={formData.km} onChange={(e) => setFormData({ ...formData, km: e.target.value })} className="input" />
                    </>
                  )}

                  {category === "imobiliare" && (
                    <>
                      <input placeholder="Tip proprietate" value={formData.property_type} onChange={(e) => setFormData({ ...formData, property_type: e.target.value })} className="input" />
                      <input placeholder="Localizare" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="input" />
                      <input placeholder="Suprafata (mp)" type="number" value={formData.surface} onChange={(e) => setFormData({ ...formData, surface: e.target.value })} className="input" />
                      <input placeholder="Numar camere" type="number" value={formData.rooms} onChange={(e) => setFormData({ ...formData, rooms: e.target.value })} className="input" />
                    </>
                  )}

                  {(category === "lux" || category === "gadgets" || category === "foto") && (
                    <>
                      <input placeholder="Brand" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="input" />
                      <input placeholder="Model" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className="input" />
                      <input placeholder="Stare" value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} className="input" />
                      <input placeholder="An (optional)" value={formData.optionalYear} onChange={(e) => setFormData({ ...formData, optionalYear: e.target.value })} className="input" />
                    </>
                  )}

                  {category === "business" && (
                    <>
                      <input placeholder="Domeniu" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="input" />
                      <input placeholder="Venit anual (EUR)" type="number" value={formData.revenue} onChange={(e) => setFormData({ ...formData, revenue: e.target.value })} className="input" />
                      <input placeholder="Locatie" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="input md:col-span-2" />
                    </>
                  )}
                </div>

                <p className="mt-6 text-[11px] font-bold uppercase tracking-wider text-neutral-500 md:text-xs">
                  Cu cât datele sunt mai exacte, cu atât raportul va fi mai precis.
                </p>

                {turnstileUiEnabled && (
                  <EvaluateTurnstile
                    ref={turnstileRef}
                    className="mt-8 flex justify-center"
                    onTokenChange={setTurnstileToken}
                  />
                )}

                <button
                  type="button"
                  onClick={runEvaluation}
                  disabled={phase === "loading"}
                  className="mt-10 w-full rounded-2xl border-[3px] border-black bg-[#FFD100] px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-black shadow-[6px_6px_0_0_#000] transition hover:bg-[#f5e008] hover:shadow-[8px_8px_0_0_#000] disabled:pointer-events-none disabled:opacity-50 active:translate-y-0.5 active:shadow-[4px_4px_0_0_#000]"
                >
                  3. Scanare piață
                </button>
              </section>
            </>
          )}

          {phase === "loading" && (
            <section className="flex justify-center py-12 md:py-16">
              <div className="w-full max-w-lg rounded-[1.75rem] border-[3px] border-black bg-black px-8 py-12 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:px-12 md:py-14">
                <Clock3 className="mx-auto h-12 w-12 animate-pulse text-[#FFD100]" aria-hidden />
                <p className="mt-6 text-base font-black uppercase tracking-wider text-white md:text-lg">
                  {LOADING_MESSAGES[loadingIndex]}
                </p>
                <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 md:text-[11px]">
                  Analiza rulează în timp real
                </p>
              </div>
            </section>
          )}

          {phase === "result" && result && (
            <section className="space-y-8 md:space-y-10">
              <div
                role="note"
                className="rounded-xl border-2 border-amber-600/40 bg-amber-50 px-4 py-3 text-center text-[10px] font-black uppercase leading-relaxed tracking-wide text-amber-950 md:text-[11px]"
              >
                Estimare orientativă — nu evaluare oficială, nu garanție de preț sau vânzare.
              </div>

              {result.data_quality_label === "vip_asset" ? (
                <div className="rounded-[2rem] border-[3px] border-black bg-black px-8 py-10 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:px-14 md:py-12">
                  <h3 className="text-2xl font-black uppercase italic tracking-tight md:text-4xl">
                    Activ exclusivist detectat
                  </h3>
                  <p className="mx-auto mt-6 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300 md:text-[15px]">
                    Acest activ depășește zona de evaluare automată standard. Poți stabili manual prețul de referință sau poți solicita evaluare asistată.
                  </p>
                  <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                      href={manualListingHref}
                      onClick={handleManualListingClick}
                      className="rounded-xl border-2 border-white bg-transparent px-8 py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
                    >
                      Stabilesc manual prețul
                    </Link>
                    <Link
                      href="/posteaza-cerere"
                      className="rounded-xl border-[3px] border-black bg-[#FFD100] px-8 py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_rgba(0,0,0,0.9)] transition hover:brightness-105"
                    >
                      Solicit evaluare premium
                    </Link>
                  </div>
                </div>
              ) : result.data_quality_label === "low_data" ? (
                <div className="rounded-[2rem] border-[3px] border-black bg-black px-8 py-10 text-center shadow-[10px_10px_0_0_rgba(0,0,0,0.15)] md:px-14 md:py-12">
                  <div className="mx-auto mb-6 h-px max-w-[120px] bg-[#FFD100]" aria-hidden />
                  <h3 className="text-2xl font-black uppercase italic text-white md:text-4xl">Piata subtire pentru acest activ</h3>
                  <p className="mx-auto mt-6 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300 md:text-[15px]">
                    Nu avem suficiente semnale curate pentru o estimare de precizie ridicată. Poți continua cu un preț manual, iar Quick Exit îți va calcula strategia de lichidare.
                  </p>
                  <div className="mt-10">
                    <Link
                      href={manualListingHref}
                      onClick={handleManualListingClick}
                      className="inline-block rounded-xl border-[3px] border-black bg-[#FFD100] px-10 py-3.5 text-[11px] font-black uppercase tracking-widest text-black shadow-[5px_5px_0_0_rgba(0,0,0,0.9)] transition hover:brightness-105"
                    >
                      Continuu cu preț manual
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="rounded-[2rem] border-[3px] border-black bg-black p-6 md:p-10 lg:p-12">
                  <div className="mb-8 flex flex-col gap-6 border-b border-white/15 pb-8 md:flex-row md:items-end md:justify-between md:gap-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#FFD100]/90">4. Rezultat + actiune</p>
                      <p className="mt-3 text-2xl font-black uppercase italic tracking-tight text-white md:text-3xl">
                        {qualityLabel}
                      </p>
                    </div>
                    <div className="md:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">
                        Surse publice analizate
                      </p>
                      <p className="mt-2 text-3xl font-black tabular-nums text-white md:text-4xl">{analyzedSources}</p>
                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
                        rezultate de piață (surse publice)
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                      Încredere estimare: {confidencePercent}%
                    </span>
                  </div>

                  <div className="mb-8 grid gap-4 md:grid-cols-2 md:gap-5">
                    {EVALUATION_PRICE_STRATEGIES.map((strategy) => {
                      const price = getEvaluationPriceFromResult(result, strategy.type);
                      const estimatedMarketPrice = getEvaluationPriceFromResult(result, "market");
                      const referenceMarketPrice = computeReferenceMarketPrice(
                        estimatedMarketPrice,
                        price,
                        strategy.type,
                      );
                      const href = buildListingHrefForStrategy(
                        category,
                        price,
                        strategy.type,
                        referenceMarketPrice,
                      );
                      const subtitle = priceStrategySubtitle(strategy.type);
                      const priceEnabled = Boolean(price);

                      return (
                        <div
                          key={strategy.type}
                          className={`flex flex-col ${priceStrategyCardClass(strategy.type)}`}
                        >
                          <p className={priceStrategyTitleClass(strategy.type)}>
                            {strategy.type === "market"
                              ? "Preț piață estimat"
                              : strategy.type === "quick_exit"
                                ? "Preț recomandat Quick Exit"
                                : strategy.type === "fast_sale"
                                  ? "Preț pentru vânzare foarte rapidă"
                                  : "Preț de lichidare"}
                          </p>
                          {subtitle && (
                            <p
                              className={`mt-2 text-[10px] font-semibold uppercase leading-snug tracking-wide ${
                                strategy.type === "quick_exit"
                                  ? "text-black/65"
                                  : strategy.type === "liquidation"
                                    ? "text-neutral-400"
                                    : "text-neutral-500"
                              }`}
                            >
                              {subtitle}
                            </p>
                          )}
                          <p className={priceStrategyValueClass(strategy.type)}>
                            {formatPrice(price ?? result[strategy.resultKey])}
                          </p>
                          {priceEnabled ? (
                            <Link
                              href={href}
                              onClick={handlePriceStrategyClick(strategy.type)}
                              className={priceStrategyCtaClass(strategy.type, true)}
                            >
                              {strategy.ctaLabel}
                            </Link>
                          ) : (
                            <span
                              className={priceStrategyCtaClass(strategy.type, false)}
                              aria-disabled
                            >
                              Preț indisponibil
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {result.explanation && String(result.explanation).trim() && (
                    <div className="mb-6 rounded-2xl border border-white/15 bg-white/5 p-5 md:p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD100]/85">
                        Raționament estimare
                      </p>
                      <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-200 md:text-[15px]">
                        {String(result.explanation)}
                      </p>
                    </div>
                  )}

                  {resultWarnings.length > 0 && (
                    <ul className="mb-6 space-y-1 rounded-xl border border-white/10 bg-neutral-950/50 px-4 py-3 text-[11px] font-medium text-neutral-400">
                      {resultWarnings.map((warning) => (
                        <li key={warning}>• {warning}</li>
                      ))}
                    </ul>
                  )}

                  <div className="rounded-2xl border border-white/20 bg-neutral-950/80 p-5 md:p-6">
                    <div className="flex items-start gap-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#FFD100]" aria-hidden />
                      <div>
                        <p className="text-sm font-medium leading-relaxed text-neutral-200 md:text-[15px]">
                          {publicExplanation}
                        </p>
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                          {result.cache_hit ? "Rezultat recalculat recent" : "Evaluare generata acum"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                    <button
                      type="button"
                      onClick={() => setPhase("form")}
                      className="min-w-[200px] rounded-xl border-2 border-white/30 bg-transparent px-6 py-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition hover:border-white hover:text-white"
                    >
                      Reiau evaluarea
                    </button>
                  </div>
                </div>
              )}

              <p className="mx-auto max-w-xl text-center text-[10px] font-semibold uppercase leading-relaxed tracking-wider text-neutral-500 md:text-[11px]">
                Estimare orientativă, nu evaluare autorizată sau garanție de vânzare.
              </p>
            </section>
          )}
        </div>
      </div>

      <style jsx>{`
        .input {
          border: 2px solid #000000;
          background: #ffffff;
          color: #0a0a0a;
          border-radius: 0.875rem;
          padding: 0.9rem 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.045em;
          font-size: 0.76rem;
        }
        .input:focus {
          outline: none;
          border-color: #ffd100;
          box-shadow: 0 0 0 3px rgba(255, 209, 0, 0.35);
        }
        .input::placeholder {
          color: #71717a;
        }
      `}</style>
    </div>
  );
}
