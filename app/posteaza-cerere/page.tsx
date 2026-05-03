"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const labelBase =
  "block text-[10px] font-black uppercase tracking-widest text-neutral-500";
const inputBase =
  "w-full mt-2 rounded-xl border-[3px] border-black bg-white p-3 md:p-4 font-semibold text-black placeholder:text-neutral-500 outline-none transition focus:border-[#FFD100] focus:ring-4 focus:ring-[#FFD100]/30";

export default function PostDemandPage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Auto & Moto");

  const [targetAsset, setTargetAsset] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");

  const [requirements, setRequirements] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categoriesList = [
    "Auto & Moto",
    "Imobiliare",
    "Lux & Ceasuri",
    "Afaceri de vânzare",
    "Gadgets",
    "Foto & Audio",
  ];

  const updateRequirement = (key: string, value: string) => {
    setRequirements((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitDemand = async () => {
    if (!targetAsset || !budget) {
      setErrorMsg("Activul căutat și bugetul sunt obligatorii.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMsg(
          "Trebuie să fii logat pentru a posta o cerere de capital. Folosește butonul „Contul meu”."
        );
        setIsSubmitting(false);
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          user_type: "buyer",
        },
        { onConflict: "id" }
      );

      if (profileError) {
        setErrorMsg(`Eroare profil: ${profileError.message}`);
        setIsSubmitting(false);
        return;
      }

      const { data: insertedData, error } = await supabase
        .from("demands")
        .insert([
          {
            buyer_id: user.id,
            target_asset: targetAsset,
            category: category,
            budget: Number(budget),
            description: description,
            requirements: requirements,
            status: "pending_payment",
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Eroare Supabase demands insert:", error.message);
        setErrorMsg(`Eroare Supabase: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      const stripeRes = await fetch("/api/checkout-demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demandId: insertedData.id,
          title: targetAsset,
          price: 99,
        }),
      });

      const stripeData = await stripeRes.json();

      if (stripeData.url) {
        window.location.href = stripeData.url;
      } else {
        if (stripeData.error) {
          setErrorMsg(`Eroare Stripe: ${stripeData.error}`);
        } else {
          throw new Error("Eroare la generarea plății.");
        }
        setIsSubmitting(false);
      }
    } catch (error: any) {
      console.error("Eroare la inserare/plată:", error.message);
      setErrorMsg(`A apărut o eroare: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  const StepPill = ({ index, title }: { index: number; title: string }) => (
    <div
      className={`rounded-full border-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors md:px-4 md:text-[10px] ${
        step >= index
          ? "border-black bg-black text-[#FFD100]"
          : "border-black/15 bg-white text-neutral-600"
      }`}
    >
      {index}. {title}
    </div>
  );

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EC] p-6 antialiased">
        <div className="w-full max-w-md rounded-[2rem] border-[3px] border-black bg-white p-10 text-center shadow-[12px_12px_0_0_#FFD100]">
          <span className="mb-6 block text-5xl" aria-hidden>
            ✓
          </span>
          <h1 className="mb-4 text-2xl font-black uppercase italic leading-tight tracking-tight text-black md:text-3xl">
            Cererea este pregătită
          </h1>
          <p className="mb-8 text-sm font-medium leading-relaxed text-neutral-600">
            După confirmarea plății, cererea va fi publicată și va putea primi oferte.
          </p>
          <Link
            href="/dashboard"
            className="block w-full rounded-2xl border-[3px] border-black bg-black py-4 text-sm font-black uppercase tracking-widest text-[#FFD100] transition hover:brightness-110"
          >
            Vezi în Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <div className="mx-auto max-w-7xl space-y-10 md:space-y-14">
        <div className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
              Capital disponibil
            </p>
            <h1 className="mt-5 text-3xl font-black uppercase italic leading-[1.05] tracking-tight md:text-5xl">
              Publică cererea{" "}
              <span className="text-[#FFD100]">de cumpărare</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[11px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-neutral-300 md:text-xs">
              Spune ce cauți, setează bugetul și atrage vânzători compatibili.
            </p>
          </div>
          <div className="mx-auto mt-10 flex flex-wrap justify-center gap-2 md:gap-3">
            <StepPill index={1} title="Activ căutat" />
            <StepPill index={2} title="Buget și condiții" />
            <StepPill index={3} title="Plată și publicare" />
          </div>
        </div>

        <div className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.12)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          {step === 1 && (
            <div className="space-y-8 md:space-y-10">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
                  1. Activ căutat
                </h2>
                <p className="mt-2 text-sm font-medium text-neutral-600">
                  Alege categoria și descrie cât mai clar ce vrei să cumperi.
                </p>
              </div>

              <div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setRequirements({});
                      }}
                      className={`rounded-2xl border-2 border-black p-5 text-left transition-all duration-150 md:p-6 ${
                        category === cat
                          ? "bg-black text-[#FFD100] shadow-[6px_6px_0_0_#FFD100]"
                          : "bg-white text-black hover:border-[#FFD100] hover:shadow-[6px_6px_0_0_rgba(255,209,0,0.65)] active:translate-y-px"
                      }`}
                    >
                      <p className="text-xs font-black uppercase tracking-wider md:text-sm">
                        {cat}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-black/[0.08] bg-[#F7F4EC]/80 p-6 md:border-2 md:border-black/[0.06] md:p-10">
                <label className={labelBase}>Ce vrei să cumperi?</label>
                <input
                  type="text"
                  value={targetAsset}
                  onChange={(e) => setTargetAsset(e.target.value)}
                  placeholder="Ex: Caut Mercedes S-Class 2022 / Teren Pipera / Rolex Daytona"
                  className={`${inputBase} font-bold normal-case`}
                />

                <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-5">
                  {category === "Auto & Moto" && (
                    <>
                      <div className="md:col-span-2">
                        <label className={labelBase}>Modele acceptate</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("modele", e.target.value)}
                          placeholder="Ex: Mercedes S-Class, BMW Seria 7"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>An minim</label>
                        <input
                          type="number"
                          onChange={(e) => updateRequirement("an_minim", e.target.value)}
                          placeholder="Ex: 2021"
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>Rulaj maxim (km)</label>
                        <input
                          type="number"
                          onChange={(e) => updateRequirement("km_max", e.target.value)}
                          placeholder="Ex: 50000"
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>Culoare / finisaje</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("culoare", e.target.value)}
                          placeholder="Ex: Negru / AMG"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>Localizare preferată</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("locatie", e.target.value)}
                          placeholder="Ex: București / Ilfov"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                    </>
                  )}

                  {category === "Imobiliare" && (
                    <>
                      <div className="md:col-span-2">
                        <label className={labelBase}>Tip proprietate dorită</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("tip_proprietate", e.target.value)}
                          placeholder="Ex: Penthouse, teren intravilan"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>Suprafață minimă (mp)</label>
                        <input
                          type="number"
                          onChange={(e) => updateRequirement("suprafata_min", e.target.value)}
                          placeholder="Ex: 120"
                          className={inputBase}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelBase}>Stadiu / finisaje acceptate</label>
                        <select
                          onChange={(e) => updateRequirement("stadiu", e.target.value)}
                          className={`${inputBase} cursor-pointer appearance-none`}
                        >
                          <option value="">Alege o opțiune</option>
                          <option>La cheie / Lux</option>
                          <option>Necesită renovare (Pt. Flip)</option>
                          <option>La roșu / Construcție nouă</option>
                          <option>Teren liber</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelBase}>Localizare</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("locatie", e.target.value)}
                          placeholder="Ex: Pipera, Herăstrău"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                    </>
                  )}

                  {category === "Lux & Ceasuri" && (
                    <>
                      <div className="md:col-span-2">
                        <label className={labelBase}>Brand și referință dorită</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("brand_model", e.target.value)}
                          placeholder="Ex: Rolex Daytona 116500LN"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>Stare acceptată</label>
                        <select
                          onChange={(e) => updateRequirement("stare", e.target.value)}
                          className={`${inputBase} cursor-pointer appearance-none`}
                        >
                          <option value="">Alege o opțiune</option>
                          <option>Doar Nou / Nepurtat (MINT)</option>
                          <option>Purtat / Stare Impecabilă</option>
                          <option>Accept urme de uzură (Preț bun)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelBase}>Documente și cutie</label>
                        <select
                          onChange={(e) => updateRequirement("acte", e.target.value)}
                          className={`${inputBase} cursor-pointer appearance-none`}
                        >
                          <option value="">Alege o opțiune</option>
                          <option>Set complet obligatoriu</option>
                          <option>Doar acte / card</option>
                          <option>Accept doar ceasul (verificare specialist)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelBase}>An preferat</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("an", e.target.value)}
                          placeholder="Ex: După 2020"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                    </>
                  )}

                  {category === "Afaceri de vânzare" && (
                    <>
                      <div className="md:col-span-2">
                        <label className={labelBase}>Domeniu vizat</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("domeniu", e.target.value)}
                          placeholder="Ex: E-commerce, HORECA, producție"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>Vechime minimă (ani)</label>
                        <input
                          type="number"
                          onChange={(e) => updateRequirement("vechime_min", e.target.value)}
                          placeholder="Ex: 3"
                          className={inputBase}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className={labelBase}>Condiții de achiziție</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("conditii_achizitie", e.target.value)}
                          placeholder="Ex: Fără datorii, profit minim 50k EUR/an, preiau SRL-ul"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                    </>
                  )}

                  {(category === "Gadgets" || category === "Foto & Audio") && (
                    <>
                      <div className="md:col-span-2">
                        <label className={labelBase}>Echipament și specificații</label>
                        <input
                          type="text"
                          onChange={(e) => updateRequirement("model_specs", e.target.value)}
                          placeholder="Ex: MacBook Pro M3 Max, 36 GB RAM minim"
                          className={`${inputBase} normal-case`}
                        />
                      </div>
                      <div>
                        <label className={labelBase}>Stare tehnică</label>
                        <select
                          onChange={(e) => updateRequirement("stare", e.target.value)}
                          className={`${inputBase} cursor-pointer appearance-none`}
                        >
                          <option value="">Alege o opțiune</option>
                          <option>Doar Sigilat</option>
                          <option>Ca Nou / Fără Uzură</option>
                          <option>Uzură Normală Acceptată</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!targetAsset}
                  className="w-full rounded-2xl border-[3px] border-black bg-[#FFD100] py-5 text-sm font-black uppercase tracking-[0.15em] text-black shadow-[6px_6px_0_0_#000] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continuă la buget și condiții →
                </button>
                {!targetAsset && (
                  <p className="mt-3 text-center text-xs font-semibold text-red-700">
                    Completează ce vrei să cumperi pentru a continua.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 md:space-y-10">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
                  2. Buget și condiții
                </h2>
                <p className="mt-2 text-sm font-medium text-neutral-600">
                  Stabilește bugetul și mesajul pentru vânzători.
                </p>
              </div>

              <div className="rounded-3xl border border-black/[0.08] bg-[#F7F4EC]/80 p-6 md:border-2 md:border-black/[0.06] md:p-10">
                <label className={labelBase}>Buget maxim</label>
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-black">
                    €
                  </span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="100000"
                    className={`${inputBase} pl-12 text-2xl font-black tabular-nums md:text-3xl`}
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-neutral-600">
                  Acesta este bugetul maxim. Vânzătorii pot veni cu oferte sub acest prag.
                </p>

                <label className={`${labelBase} mt-8`}>Mesaj pentru vânzători</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Am fondurile pregătite. Pot plăti rapid după verificare. Caut doar oferte sub prețul pieței."
                  className={`${inputBase} resize-none font-medium leading-relaxed normal-case`}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full rounded-2xl border-[3px] border-black bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:bg-neutral-50 sm:w-1/3"
                >
                  Înapoi
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!budget}
                  className="w-full flex-1 rounded-2xl border-[3px] border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-[#FFD100] shadow-[6px_6px_0_0_#000] transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continuă la plată →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 md:space-y-10">
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
                  3. Activează cererea
                </h2>
                <p className="mt-2 text-sm font-medium text-neutral-600">
                  Publică cererea și primește oferte de la vânzători.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[2rem] border-[3px] border-black bg-[#F7F4EC]/80 p-6 md:p-8">
                <span className="absolute right-4 top-4 rounded-full border-2 border-black bg-black px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#FFD100]">
                  Potrivire automată
                </span>
                <h3 className="pr-24 text-lg font-black uppercase italic text-black md:text-xl">
                  Cerere activă 30 zile
                </h3>
                <p className="mt-4 font-black tabular-nums text-4xl text-black">99 RON</p>
                <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-neutral-700">
                  Cererea ta devine vizibilă pentru vânzători și poate primi oferte compatibile.
                </p>
                <p className="mt-6 text-xs font-medium leading-relaxed text-neutral-600">
                  Verificarea identității poate fi cerută pentru protecția cumpărătorilor și
                  vânzătorilor.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-2xl border-2 border-red-800/40 bg-red-50/90 px-4 py-3 text-sm font-semibold text-red-900"
                >
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full rounded-2xl border-[3px] border-black bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:bg-neutral-50 sm:w-1/3"
                >
                  Înapoi
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitDemand()}
                  disabled={isSubmitting || !budget}
                  className="w-full flex-1 rounded-2xl border-[3px] border-black bg-[#FFD100] py-4 text-xs font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_#000] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSubmitting ? "Se pregătește plata..." : "Plătește și publică cererea"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
