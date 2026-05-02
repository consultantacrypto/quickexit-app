"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";

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
  [key: string]: unknown;
};

type CategoryId = "auto" | "imobiliare" | "lux" | "business" | "gadgets" | "foto";

type CategoryOption = {
  id: CategoryId;
  title: string;
  hint: string;
};

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "auto", title: "Auto & Moto", hint: "estimare dupa marca, model, an, km" },
  { id: "imobiliare", title: "Imobiliare", hint: "estimare dupa zona, suprafata, camere" },
  { id: "lux", title: "Lux & Ceasuri", hint: "estimare dupa brand, model, acte/stare" },
  { id: "business", title: "Afaceri de vanzare", hint: "estimare dupa domeniu, venit, locatie" },
  { id: "gadgets", title: "Gadgets", hint: "estimare dupa brand, model, stare" },
  { id: "foto", title: "Foto & Audio", hint: "estimare dupa brand, model, stare" },
];

const LOADING_MESSAGES = [
  "Scanam piata din Romania...",
  "Eliminam semnalele false: leasing, rate, piese...",
  "Calculam preturile de exit...",
];

const LABEL_MAP: Record<string, string> = {
  external_search_strong: "Incredere buna",
  external_search: "Incredere moderata",
  low_data: "Date insuficiente",
  vip_asset: "Evaluare speciala necesara",
};

function formatPrice(price: unknown) {
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  return `EUR ${n.toLocaleString("ro-RO")}`;
}

export default function EvaluationPage() {
  const [category, setCategory] = useState<CategoryId>("auto");
  const [phase, setPhase] = useState<"form" | "loading" | "result">("form");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [result, setResult] = useState<ApiResult | null>(null);

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
    return LABEL_MAP[result.data_quality_label] || "Evaluare disponibila";
  }, [result]);

  const analyzedSources = Number(result?.google_result_count ?? result?.comparable_count ?? 0);

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
  });

  const runEvaluation = async () => {
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
      if (!data.success) {
        alert(data.message || "Evaluarea nu a putut fi procesata.");
        setPhase("form");
        return;
      }

      setResult(data);
      setPhase("result");
    } catch {
      alert("Serviciul de evaluare este temporar indisponibil.");
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
            <StepPill index={2} title="Completeaza detaliile" />
            <StepPill index={3} title="Scanare piata" />
            <StepPill index={4} title="Rezultat + actiune" />
          </div>
        </div>

        {/* Terminal card — corp deschis, brutalist */}
        <div className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.12)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          {phase !== "result" && (
            <>
              <section className="mb-14 md:mb-16">
                <h2 className="mb-8 text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
                  1. Alege categoria
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCategory(opt.id)}
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
                  2. Completeaza detaliile
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
                  Cu cat datele sunt mai exacte, cu atat raportul va fi mai precis.
                </p>

                <button
                  type="button"
                  onClick={runEvaluation}
                  disabled={phase === "loading"}
                  className="mt-10 w-full rounded-2xl border-[3px] border-black bg-[#FFD100] px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-black shadow-[6px_6px_0_0_#000] transition hover:bg-[#f5e008] hover:shadow-[8px_8px_0_0_#000] disabled:pointer-events-none disabled:opacity-50 active:translate-y-0.5 active:shadow-[4px_4px_0_0_#000]"
                >
                  3. Scanare piata
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
                  Analiza ruleaza in timp real
                </p>
              </div>
            </section>
          )}

          {phase === "result" && result && (
            <section className="space-y-8 md:space-y-10">
              {result.data_quality_label === "vip_asset" ? (
                <div className="rounded-[2rem] border-[3px] border-black bg-black px-8 py-10 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:px-14 md:py-12">
                  <h3 className="text-2xl font-black uppercase italic tracking-tight md:text-4xl">
                    Activ exclusivist detectat
                  </h3>
                  <p className="mx-auto mt-6 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300 md:text-[15px]">
                    Acest activ depaseste zona de evaluare automata standard. Poti seta manual pretul de referinta sau poti solicita evaluare asistata.
                  </p>
                  <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                      href="/pune-anunt"
                      className="rounded-xl border-2 border-white bg-transparent px-8 py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
                    >
                      Setez manual pretul
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
                    Nu avem suficiente semnale curate pentru o estimare de precizie ridicata. Poti continua cu un pret manual, iar Quick Exit iti va calcula strategia de lichidare.
                  </p>
                  <div className="mt-10">
                    <Link
                      href="/pune-anunt"
                      className="inline-block rounded-xl border-[3px] border-black bg-[#FFD100] px-10 py-3.5 text-[11px] font-black uppercase tracking-widest text-black shadow-[5px_5px_0_0_rgba(0,0,0,0.9)] transition hover:brightness-105"
                    >
                      Continui cu pret manual
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
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Surse analizate</p>
                      <p className="mt-2 text-3xl font-black tabular-nums text-white md:text-4xl">{analyzedSources}</p>
                    </div>
                  </div>

                  <div className="mb-8 grid gap-4 md:grid-cols-2 md:gap-5">
                    <div className="rounded-2xl border-2 border-black bg-white p-6 md:p-7 shadow-[6px_6px_0_0_rgba(0,0,0,0.12)]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                        Pret piata estimat
                      </p>
                      <p className="mt-3 text-2xl font-black tabular-nums text-black md:text-3xl">
                        {formatPrice(result.estimated_market_price)}
                      </p>
                    </div>
                    <div className="rounded-2xl border-[3px] border-black bg-[#FFD100] p-6 md:p-7 shadow-[6px_6px_0_0_#000]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/75">Quick Exit Price</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase leading-snug tracking-wide text-black/65">
                        recomandat pentru vanzare accelerata
                      </p>
                      <p className="mt-4 text-2xl font-black tabular-nums text-black md:text-3xl">
                        {formatPrice(result.quick_exit_price)}
                      </p>
                    </div>
                    <div className="rounded-2xl border-2 border-black bg-white p-6 md:p-7 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Strong Exit Price</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase leading-snug tracking-wide text-neutral-500">
                        vanzare rapida cu discount controlat
                      </p>
                      <p className="mt-4 text-2xl font-black tabular-nums text-black md:text-3xl">{formatPrice(result.strong_exit_price)}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-red-700/55 bg-neutral-950 p-6 md:p-7 shadow-[6px_6px_0_0_rgba(220,38,38,0.25)]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-red-400">Liquidation Price</p>
                      <p className="mt-2 text-[10px] font-semibold uppercase leading-snug tracking-wide text-neutral-400">
                        cash rapid / lichidare agresiva
                      </p>
                      <p className="mt-4 text-2xl font-black tabular-nums text-white md:text-3xl">{formatPrice(result.liquidation_price)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/20 bg-neutral-950/80 p-5 md:p-6">
                    <div className="flex items-start gap-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#FFD100]" aria-hidden />
                      <div>
                        <p className="text-sm font-medium leading-relaxed text-neutral-200 md:text-[15px]">
                          {typeof result.explanation === "string" ? result.explanation : "Estimare disponibila."}
                        </p>
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                          {result.cache_hit ? "Rezultat recalculat recent" : "Evaluare generata acum"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      href="/pune-anunt"
                      className="flex-1 min-w-[200px] rounded-xl border-[3px] border-black bg-[#FFD100] px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest text-black shadow-[5px_5px_0_0_#000] transition hover:brightness-105"
                    >
                      Publica anunt cu pretul Quick Exit
                    </Link>
                    <Link
                      href="/pune-anunt"
                      className="flex-1 min-w-[200px] rounded-xl border-2 border-white bg-transparent px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
                    >
                      Aleg alta strategie
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPhase("form")}
                      className="flex-1 min-w-[200px] rounded-xl border-2 border-white/30 bg-transparent px-6 py-4 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition hover:border-white hover:text-white"
                    >
                      Reiau evaluarea
                    </button>
                  </div>
                </div>
              )}

              <p className="mx-auto max-w-xl text-center text-[10px] font-semibold uppercase leading-relaxed tracking-wider text-neutral-500 md:text-[11px]">
                Estimare orientativa, nu evaluare autorizata sau garantie de vanzare.
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
