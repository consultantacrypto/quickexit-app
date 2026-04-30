"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function PostDemandPage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Auto & Moto");
  
  // State-uri pentru colectarea datelor
  const [targetAsset, setTargetAsset] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  
  // Obiect generic pentru cerințe specifice
  const [requirements, setRequirements] = useState<Record<string, string>>({});

  // State-uri pentru UI (Loading, Success, Eroare)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categoriesList = [
    'Auto & Moto', 'Imobiliare', 'Lux & Ceasuri', 
    'Afaceri de vânzare', 'Gadgets', 'Foto & Audio'
  ];

  const updateRequirement = (key: string, value: string) => {
    setRequirements(prev => ({ ...prev, [key]: value }));
  };

  // Funcția MAGICĂ: Modificată pentru a încasa cei 99 RON prin Stripe
  const handleSubmitDemand = async () => {
    if (!targetAsset || !budget) {
      setErrorMsg("Titlul activului și bugetul sunt obligatorii, tati!");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // 1. VERIFICĂM DACĂ USERUL ESTE LOGAT
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setErrorMsg("Trebuie să fii logat pentru a posta o cerere de capital. Folosește butonul 'Contul Meu'.");
        setIsSubmitting(false);
        return;
      }

      // 2. INSERĂM DATELE + USER_ID (Așteaptă plata)
      const { data: insertedData, error } = await supabase
        .from('demands')
        .insert([
          {
            user_id: user.id,
            target_asset: targetAsset,
            category: category,
            budget: Number(budget),
            description: description,
            requirements: requirements, 
            status: 'pending_payment' // Modificat: Nu e activ până nu plătește
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // 3. APELĂM STRIPE PENTRU PLATA DE 99 RON
      const stripeRes = await fetch("/api/checkout-demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          demandId: insertedData.id,
          title: targetAsset,
          price: 99 // Prețul fix setat de tine
        }),
      });

      const stripeData = await stripeRes.json();
      
      if (stripeData.url) {
        // Redirecționăm către Stripe
        window.location.href = stripeData.url;
      } else {
        throw new Error(stripeData.error || "Eroare la generarea plății.");
      }
      
    } catch (error: any) {
      console.error("Eroare la inserare/plată:", error.message);
      setErrorMsg("A apărut o eroare la salvare sau plată. Verifică conexiunea.");
      setIsSubmitting(false);
    }
  };

  // ECRANUL DE SUCCES (Va fi accesat doar dacă forțăm manual, altfel merge spre Stripe)
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FFD100] flex flex-col items-center justify-center p-4 font-sans antialiased">
        <div className="bg-white p-10 rounded-3xl border-[4px] border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] max-w-lg w-full text-center animate-in zoom-in duration-300">
          <span className="text-7xl mb-6 block">🎯</span>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-4">Ofertă Lansată!</h1>
          <p className="text-sm font-bold text-gray-600 mb-8">
            Cererea ta pentru <span className="text-black font-black">{targetAsset}</span> a fost înregistrată în baza de date Sniper.
          </p>
          <Link href="/dashboard" className="block w-full bg-black text-[#FFD100] py-4 rounded-xl font-black uppercase tracking-widest text-sm italic hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none text-center">
            Vezi în Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ECRANUL PRINCIPAL
  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100] antialiased">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 italic">Terminal de Cumpărare</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
            Formulează <span className="text-[#FFD100]">Oferta</span>
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-4 uppercase italic">Specifică detaliile exacte pentru a atrage active sub prețul pieței.</p>
        </div>

        <div className="flex justify-between mb-8 border-b-4 border-black pb-4">
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 1 ? 'text-black' : 'text-gray-300'}`}>1. Filtre Specifice</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 2 ? 'text-black' : 'text-gray-300'}`}>2. Buget & Activare</div>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-2xl border-[3px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          
          {step === 1 && (
            <div className="space-y-8">
              
              <div>
                 <h2 className="text-xl font-black uppercase italic mb-4">În ce domeniu investești?</h2>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                   {categoriesList.map((cat) => (
                     <button 
                       key={cat}
                       onClick={() => { setCategory(cat); setRequirements({}); }}
                       className={`p-3 border-[3px] rounded-xl font-black uppercase text-[10px] md:text-xs italic transition-all ${category === cat ? 'border-black bg-black text-[#FFD100] shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 hover:border-black hover:bg-gray-50'}`}
                     >
                       {cat}
                     </button>
                   ))}
                 </div>
              </div>

              <div className="pt-6 border-t-2 border-gray-100">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Ce vrei să cumperi exact? (Atrage atenția)</label>
                <input 
                  type="text" 
                  value={targetAsset}
                  onChange={(e) => setTargetAsset(e.target.value)}
                  placeholder="Ex: Caut S-Class 2022 / Caut Teren Pipera" 
                  className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-black uppercase focus:outline-none focus:bg-[#FFD100]/10 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-colors" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                
                {/* 1. AUTO & MOTO */}
                {category === 'Auto & Moto' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Modele Acceptate</label>
                      <input type="text" onChange={(e) => updateRequirement('modele', e.target.value)} placeholder="Ex: Mercedes S-Class, BMW Seria 7" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Minim</label>
                      <input type="number" onChange={(e) => updateRequirement('an_minim', e.target.value)} placeholder="Ex: 2021" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rulaj Maxim KM</label>
                      <input type="number" onChange={(e) => updateRequirement('km_max', e.target.value)} placeholder="Ex: 50000" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Culoare / Finisaje</label>
                      <input type="text" onChange={(e) => updateRequirement('culoare', e.target.value)} placeholder="Ex: Negru / AMG" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                     <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Localizare Preferată</label>
                      <input type="text" onChange={(e) => updateRequirement('locatie', e.target.value)} placeholder="Ex: București / Ilfov" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 2. IMOBILIARE */}
                {category === 'Imobiliare' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tip Proprietate Dorită</label>
                      <input type="text" onChange={(e) => updateRequirement('tip_proprietate', e.target.value)} placeholder="Ex: Penthouse, Teren Intravilan" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suprafață Minimă (mp)</label>
                      <input type="number" onChange={(e) => updateRequirement('suprafata_min', e.target.value)} placeholder="Ex: 120" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stadiu / Finisaje Acceptate</label>
                      <select onChange={(e) => updateRequirement('stadiu', e.target.value)} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option value="">Alege o opțiune</option>
                        <option>La cheie / Lux</option>
                        <option>Necesită renovare (Pt. Flip)</option>
                        <option>La roșu / Construcție nouă</option>
                        <option>Teren liber</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Localizare Exactă</label>
                      <input type="text" onChange={(e) => updateRequirement('locatie', e.target.value)} placeholder="Ex: Pipera, Herăstrău" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 3. LUX & CEASURI */}
                {category === 'Lux & Ceasuri' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Brand & Referință dorită</label>
                      <input type="text" onChange={(e) => updateRequirement('brand_model', e.target.value)} placeholder="Ex: Rolex Daytona 116500LN" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stare Acceptată</label>
                      <select onChange={(e) => updateRequirement('stare', e.target.value)} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option value="">Alege o opțiune</option>
                        <option>Doar Nou / Nepurtat (MINT)</option>
                        <option>Purtat / Stare Impecabilă</option>
                        <option>Accept urme de uzură (Preț bun)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Documente & Cutie</label>
                      <select onChange={(e) => updateRequirement('acte', e.target.value)} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option value="">Alege o opțiune</option>
                        <option>Full Set Obligatoriu</option>
                        <option>Doar Acte / Card</option>
                        <option>Accept Watch Only (Verificare specialist)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Preferat</label>
                      <input type="text" onChange={(e) => updateRequirement('an', e.target.value)} placeholder="Ex: După 2020" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 4. AFACERI DE VÂNZARE */}
                {category === 'Afaceri de vânzare' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Domeniu Vizat</label>
                      <input type="text" onChange={(e) => updateRequirement('domeniu', e.target.value)} placeholder="Ex: E-commerce, HORECA, Producție" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vechime Minimă (Ani)</label>
                      <input type="number" onChange={(e) => updateRequirement('vechime_min', e.target.value)} placeholder="Ex: 3" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Condiții Achiziție (Foarte important)</label>
                      <input type="text" onChange={(e) => updateRequirement('conditii_achizitie', e.target.value)} placeholder="Ex: Fără datorii, cer profit minim 50k EUR/an, preiau tot SRL-ul" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 5 & 6. GADGETS / FOTO & AUDIO */}
                {(category === 'Gadgets' || category === 'Foto & Audio') && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Echipament & Specificații Cerute</label>
                      <input type="text" onChange={(e) => updateRequirement('model_specs', e.target.value)} placeholder="Ex: MacBook Pro M3 Max, 36GB RAM minim" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stare Tehnică</label>
                      <select onChange={(e) => updateRequirement('stare', e.target.value)} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option value="">Alege o opțiune</option>
                        <option>Doar Sigilat</option>
                        <option>Ca Nou / Fără Uzură</option>
                        <option>Uzură Normală Acceptată</option>
                      </select>
                    </div>
                  </>
                )}

                {/* CÂMP COMUN PENTRU TOATE: Descriere / Conditii */}
                <div className="md:col-span-3 pt-4 border-t-2 border-gray-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Notă Pentru Vânzători / Mod de plată</label>
                  <textarea 
                    rows={3} 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Am banii pregătiți. Plătesc pe loc transfer bancar imediat după verificare. Vă rog fără oferte la prețul pieței, caut doar oferte sub preț..." 
                    className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold italic focus:outline-none focus:bg-gray-50 resize-none shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  ></textarea>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t-2 border-gray-100">
                <button 
                  onClick={() => setStep(2)} 
                  disabled={!targetAsset}
                  className="w-full bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:bg-gray-900 transition-colors shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:shadow-none"
                >
                  Continuă la Buget →
                </button>
                 {!targetAsset && <p className="text-center text-[9px] font-bold text-red-500 mt-3 uppercase tracking-widest">Introdu ce vrei să cumperi pentru a continua.</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 text-center min-h-[400px] flex flex-col justify-center">
              
              <div className="bg-gray-50 p-8 rounded-2xl border-[3px] border-black text-left shadow-[inner_0_0_10px_rgba(0,0,0,0.05)]">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Bugetul Tău Maxim (EUR)</label>
                <div className="relative mt-2">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl text-black">€</span>
                  <input 
                    type="number" 
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="100000" 
                    className="w-full p-4 border-[3px] border-black rounded-xl font-black text-4xl italic pl-14 focus:outline-none focus:bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]" 
                  />
                </div>
                <p className="text-[9px] font-bold text-gray-400 mt-3 uppercase tracking-widest">
                  Acesta este bugetul maxim. Dacă un vânzător e presat, poți cumpăra mult mai ieftin.
                </p>
              </div>

              <div className="pt-4 text-left">
                <h2 className="text-xl font-black uppercase italic mb-4">Confirmare Listare Ofertă</h2>
                <div className="p-6 border-[3px] border-black bg-black text-white rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[6px_6px_0_0_rgba(255,209,0,1)] cursor-pointer hover:scale-[1.01] transition-transform">
                  <div className="absolute top-0 right-0 bg-[#FFD100] text-black text-[8px] font-black px-3 py-1 uppercase tracking-widest rounded-bl-lg">Live Matching</div>
                  <div>
                    <p className="font-black uppercase italic text-xl text-[#FFD100]">Standard Buy Offer</p>
                    <p className="text-xs font-bold text-gray-300 mt-1 max-w-[250px]">
                      Valabilitate: <span className="text-white">30 Zile</span>.<br/>Alerte AI către vânzătorii compatibili.
                    </p>
                  </div>
                  <div className="font-black text-4xl text-[#FFD100]">99 RON</div>
                </div>
              </div>

              <p className="text-[9px] font-bold text-gray-400 text-center uppercase leading-relaxed max-w-sm mx-auto italic">
                *KYC (Verificarea identității) se va face automat după efectuarea plății cu cardul prin Stripe.
              </p>

              {errorMsg && (
                <div className="bg-red-50 border-[3px] border-red-500 text-red-600 p-4 rounded-xl font-bold text-xs uppercase tracking-widest">
                  ⚠ {errorMsg}
                </div>
              )}

              <div className="flex gap-4 pt-6 border-t-2 border-gray-100">
                <button onClick={() => setStep(1)} className="w-1/3 border-[3px] border-black py-5 rounded-2xl font-black uppercase text-xs italic hover:bg-gray-50 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none">
                  Înapoi
                </button>
                <button 
                  onClick={handleSubmitDemand}
                  disabled={isSubmitting || !budget}
                  className="w-2/3 bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:scale-[1.01] transition-transform shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Se Conectează la Bancă..." : "Plătește & Postează →"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}