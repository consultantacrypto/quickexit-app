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
      className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
        activeStep >= index
          ? "border-[#FFD100] bg-[#FFD100] text-black"
          : "border-neutral-700 bg-neutral-900 text-neutral-400"
      }`}
    >
      {index}. {title}
    </div>
  );

  return (
    <div className="min-h-screen bg-black px-4 pb-16 pt-20 text-white antialiased">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-400">Quick Exit Terminal</p>
          <h1 className="mt-3 text-4xl font-black uppercase italic tracking-tight md:text-6xl">
            Evaluare <span className="text-[#FFD100]">Lichiditate</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold uppercase tracking-widest text-neutral-300">
            Nu vindem visuri. Calculam lichiditate.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <StepPill index={1} title="Alege categoria" />
          <StepPill index={2} title="Completeaza detaliile" />
          <StepPill index={3} title="Scanare piata" />
          <StepPill index={4} title="Rezultat + actiune" />
        </div>

        <div className="rounded-[2rem] border-4 border-white bg-neutral-950 p-6 shadow-[10px_10px_0_0_rgba(255,255,255,0.2)] md:p-10">
          {phase !== "result" && (
            <>
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-black uppercase italic">1. Alege categoria</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCategory(opt.id)}
                      className={`rounded-2xl border-2 p-5 text-left transition-all ${
                        category === opt.id
                          ? "border-[#FFD100] bg-[#FFD100] text-black"
                          : "border-neutral-700 bg-neutral-900 hover:border-neutral-400"
                      }`}
                    >
                      <p className="text-sm font-black uppercase tracking-wider">{opt.title}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide opacity-80">{opt.hint}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-xl font-black uppercase italic">2. Completeaza detaliile</h2>
                <div className="grid gap-4 md:grid-cols-2">
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

                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Cu cat datele sunt mai exacte, cu atat raportul va fi mai precis.
                </p>

                <button
                  type="button"
                  onClick={runEvaluation}
                  disabled={phase === "loading"}
                  className="mt-6 w-full rounded-2xl border-2 border-[#FFD100] bg-[#FFD100] px-6 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-yellow-300 disabled:opacity-60"
                >
                  3. Scanare piata
                </button>
              </section>
            </>
          )}

          {phase === "loading" && (
            <section className="space-y-4 py-10 text-center">
              <Clock3 className="mx-auto h-10 w-10 animate-pulse text-[#FFD100]" />
              <p className="text-lg font-black uppercase tracking-wider">{LOADING_MESSAGES[loadingIndex]}</p>
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Analiza ruleaza in timp real</p>
            </section>
          )}

          {phase === "result" && result && (
            <section>
              {result.data_quality_label === "vip_asset" ? (
                <div className="rounded-3xl border-2 border-[#FFD100] bg-neutral-900 p-8 text-center">
                  <h3 className="text-3xl font-black uppercase italic">Activ exclusivist detectat</h3>
                  <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold text-neutral-300">
                    Acest activ depaseste zona de evaluare automata standard. Poti seta manual pretul de referinta sau poti solicita evaluare asistata.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-center">
                    <Link href="/pune-anunt" className="rounded-xl border-2 border-white px-6 py-3 text-xs font-black uppercase tracking-wider">Setez manual pretul</Link>
                    <Link href="/posteaza-cerere" className="rounded-xl border-2 border-[#FFD100] bg-[#FFD100] px-6 py-3 text-xs font-black uppercase tracking-wider text-black">Solicit evaluare premium</Link>
                  </div>
                </div>
              ) : result.data_quality_label === "low_data" ? (
                <div className="rounded-3xl border-2 border-orange-400 bg-neutral-900 p-8 text-center">
                  <h3 className="text-3xl font-black uppercase italic">Piata subtire pentru acest activ</h3>
                  <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold text-neutral-300">
                    Nu avem suficiente semnale curate pentru o estimare de precizie ridicata. Poti continua cu un pret manual, iar Quick Exit iti va calcula strategia de lichidare.
                  </p>
                  <div className="mt-6">
                    <Link href="/pune-anunt" className="rounded-xl border-2 border-[#FFD100] bg-[#FFD100] px-6 py-3 text-xs font-black uppercase tracking-wider text-black">Continui cu pret manual</Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-neutral-700 bg-neutral-900 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-neutral-300">4. Rezultat + actiune</p>
                      <p className="mt-1 text-lg font-black uppercase">{qualityLabel}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Surse analizate</p>
                      <p className="text-2xl font-black">{analyzedSources}</p>
                    </div>
                  </div>

                  <div className="mb-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border-2 border-white bg-neutral-950 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Pret piata estimat</p>
                      <p className="mt-2 text-3xl font-black">{formatPrice(result.estimated_market_price)}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-[#FFD100] bg-[#FFD100] p-5 text-black">
                      <p className="text-xs font-bold uppercase tracking-widest">Quick Exit Price</p>
                      <p className="mt-1 text-xs font-semibold uppercase">recomandat pentru vanzare accelerata</p>
                      <p className="mt-2 text-3xl font-black">{formatPrice(result.quick_exit_price)}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-neutral-600 bg-neutral-900 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-300">Strong Exit Price</p>
                      <p className="mt-1 text-xs font-semibold uppercase text-neutral-400">vanzare rapida cu discount controlat</p>
                      <p className="mt-2 text-3xl font-black">{formatPrice(result.strong_exit_price)}</p>
                    </div>
                    <div className="rounded-2xl border-2 border-red-400 bg-neutral-900 p-5">
                      <p className="text-xs font-bold uppercase tracking-widest text-red-300">Liquidation Price</p>
                      <p className="mt-1 text-xs font-semibold uppercase text-neutral-400">cash rapid / lichidare agresiva</p>
                      <p className="mt-2 text-3xl font-black">{formatPrice(result.liquidation_price)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-1 h-5 w-5 text-[#FFD100]" />
                      <div>
                        <p className="text-sm font-semibold text-neutral-200">{typeof result.explanation === "string" ? result.explanation : "Estimare disponibila."}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
                          {result.cache_hit ? "Rezultat recalculat recent" : "Evaluare generata acum"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 md:flex-row">
                    <Link href="/pune-anunt" className="flex-1 rounded-xl border-2 border-[#FFD100] bg-[#FFD100] px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-black">
                      Publica anunt cu pretul Quick Exit
                    </Link>
                    <Link href="/pune-anunt" className="flex-1 rounded-xl border-2 border-white px-6 py-4 text-center text-xs font-black uppercase tracking-widest">
                      Aleg alta strategie
                    </Link>
                    <button onClick={() => setPhase("form")} className="flex-1 rounded-xl border-2 border-neutral-500 bg-neutral-900 px-6 py-4 text-xs font-black uppercase tracking-widest">
                      Reiau evaluarea
                    </button>
                  </div>
                </>
              )}

              <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Estimare orientativa, nu evaluare autorizata sau garantie de vanzare.
              </p>
            </section>
          )}
        </div>
      </div>

      <style jsx>{`
        .input {
          border: 2px solid #3f3f46;
          background: #171717;
          color: #fafafa;
          border-radius: 0.9rem;
          padding: 0.95rem 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-size: 0.78rem;
        }
        .input:focus {
          outline: none;
          border-color: #ffd100;
          box-shadow: 0 0 0 2px rgba(255, 209, 0, 0.2);
        }
        .input::placeholder {
          color: #737373;
        }
      `}</style>
    </div>
  );
}
