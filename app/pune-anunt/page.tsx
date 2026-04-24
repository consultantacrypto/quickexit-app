"use client";

import { useState } from "react";
import Link from "next/link";

export default function PostAdPage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Auto & Moto");

  // Categoriile oficiale
  const categoriesList = [
    'Auto & Moto', 'Imobiliare', 'Lux & Ceasuri', 
    'Afaceri de vânzare', 'Gadgets', 'Foto & Audio'
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100]">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Terminal */}
        <div className="mb-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 italic">Terminal de Lichiditate</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
            Listează <span className="text-[#FFD100]">Activul</span>
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-4 uppercase italic">Introdu datele corecte pentru a obține o evaluare AI precisă.</p>
        </div>

        {/* Progresie */}
        <div className="flex justify-between mb-8 border-b-4 border-black pb-4">
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 1 ? 'text-black' : 'text-gray-300'}`}>1. Detalii Activ</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 2 ? 'text-black' : 'text-gray-300'}`}>2. AI Pricing</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 3 ? 'text-black' : 'text-gray-300'}`}>3. Pachet & Plată</div>
        </div>

        {/* Container Formular Brutalist */}
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border-[3px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase italic mb-6">Ce dorești să vinzi?</h2>
              
              {/* Selectie Categorie */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {categoriesList.map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`p-3 border-[3px] rounded-xl font-black uppercase text-[9px] md:text-[10px] italic transition-all ${category === cat ? 'border-black bg-black text-[#FFD100]' : 'border-gray-200 hover:border-black hover:bg-gray-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Titlu Anunt (Global) */}
              <div className="pt-2 border-t-2 border-gray-100">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-4 block">Titlu Anunț (Atrage atenția)</label>
                <input type="text" placeholder="Ex: Mercedes S-Class 2022 / Penthouse Pipera" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-black uppercase focus:outline-none focus:bg-gray-50" />
              </div>

              {/* DATE DINAMICE IN FUNCTIE DE CATEGORIE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                
                {/* 1. AUTO & MOTO */}
                {category === 'Auto & Moto' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Fabricație</label>
                      <input type="number" placeholder="Ex: 2021" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rulaj (KM Curenți)</label>
                      <input type="number" placeholder="Ex: 45000" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Motorizare / Putere</label>
                      <input type="text" placeholder="Ex: 3.0 Diesel / 286 CP" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Istoric Daune (Sinceritate pt AI)</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Fără Daune / Istoric Curat</option>
                        <option>Daune Minore (Ex: Zgârieturi, Bară)</option>
                        <option>Daune Majore Reparate</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 2. IMOBILIARE */}
                {category === 'Imobiliare' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suprafață Utilă (mp)</label>
                      <input type="number" placeholder="Ex: 85" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Construcție</label>
                      <input type="number" placeholder="Ex: 2018" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stadiu / Finisaje</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>La cheie / Lux</option>
                        <option>Standard / Utilat</option>
                        <option>Necesită renovare totală</option>
                        <option>La roșu / Teren</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Localizare (Județ/Oraș)</label>
                      <input type="text" placeholder="Ex: Cluj-Napoca / Centru" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 3. LUX & CEASURI */}
                {category === 'Lux & Ceasuri' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Brand / Producător</label>
                      <input type="text" placeholder="Ex: Rolex, Audemars Piguet" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stare Activ</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Nou / Nepurtat (MINT)</option>
                        <option>Condiție Excelentă</option>
                        <option>Prezintă urme de uzură</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pachet & Proveniență</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Full Set (Cutie, Acte originale)</option>
                        <option>Doar Cutie sau Doar Acte</option>
                        <option>Fără accesorii (Doar produsul)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 4. AFACERI DE VÂNZARE */}
                {category === 'Afaceri de vânzare' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Domeniu / Nișă</label>
                      <input type="text" placeholder="Ex: HoReCa, Ecommerce" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vechime Business (Ani)</label>
                      <input type="number" placeholder="Ex: 5" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cifră Afaceri Ultimul An (EUR)</label>
                      <input type="number" placeholder="Ex: 250000" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Profit Net Ultimul An (EUR)</label>
                      <input type="number" placeholder="Ex: 45000" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 5. GADGETS / FOTO & AUDIO */}
                {(category === 'Gadgets' || category === 'Foto & Audio') && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Model Exact / Specificații</label>
                      <input type="text" placeholder="Ex: MacBook Pro M3 Max, 36GB RAM, 1TB" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stare Tehnică / Estetică</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Nou / Sigilat</option>
                        <option>Folosit (Impecabil 10/10)</option>
                        <option>Uzură normală</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Garanție Rămasă</label>
                      <input type="text" placeholder="Ex: 12 Luni Apple / Fără" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* Descriere Generala (Global) */}
                <div className="md:col-span-2 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Descriere Detaliată (Important pt AI)</label>
                  <textarea rows={4} placeholder="Scrie defectele ascunse, motivul vânzării sau extra dotările. Fii sincer, AI-ul depistează discrepanțele." className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold italic focus:outline-none focus:bg-gray-50 resize-none"></textarea>
                </div>
              </div>

              <button onClick={() => setStep(2)} className="w-full mt-8 bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:bg-gray-900 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">
                Generează AI Pricing →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 text-center">
              <h2 className="text-2xl font-black uppercase italic mb-2">Evaluare & <span className="text-red-600">Urgență</span></h2>
              <p className="text-xs font-bold text-gray-500 uppercase italic px-4">Pentru a declanșa alertele Sniper la investitori, prețul de vânzare trebuie să aibă un discount față de piață.</p>
              
              <div className="bg-gray-50 p-6 rounded-2xl border-[3px] border-black text-left mt-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Prețul tău de lichidare (EUR)</label>
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl">€</span>
                  <input type="number" placeholder="50000" className="w-full p-4 pl-10 border-[3px] border-black rounded-xl font-black text-3xl italic focus:outline-none focus:bg-white" />
                </div>
              </div>

              <div className="bg-[#FFD100] p-6 rounded-2xl border-[3px] border-black text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Strategia de Vânzare</p>
                <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-black text-sm uppercase bg-white focus:outline-none appearance-none cursor-pointer">
                  <option>Vânzare Standard (Nu mă grăbesc)</option>
                  <option>Lichidare (Vreau oferte rapide)</option>
                  <option>Panic Sell (Preț tăiat extrem - Cash azi)</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4 border-t-2 border-gray-100">
                <button onClick={() => setStep(1)} className="w-1/3 border-[3px] border-black py-5 rounded-2xl font-black uppercase text-xs italic hover:bg-gray-50 transition-colors">
                  Înapoi
                </button>
                <button onClick={() => setStep(3)} className="w-2/3 bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  Spre Pachete →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase italic mb-6">Activează Expunerea</h2>
              
              <div className="space-y-4">
                {/* Pachet Standard */}
                <div className="p-6 border-[3px] border-gray-200 rounded-2xl flex justify-between items-center hover:border-black cursor-pointer group transition-colors">
                  <div>
                    <p className="font-black uppercase italic text-lg">Standard <span className="text-[10px] bg-gray-100 px-2 py-1 rounded ml-2">30 Zile</span></p>
                    <p className="text-xs font-bold text-gray-500 mt-1">Expunere normală în platformă.</p>
                  </div>
                  <div className="font-black text-3xl group-hover:text-[#FFD100] transition-colors">99 RON</div>
                </div>

                {/* Pachet Flash */}
                <div className="p-6 border-[3px] border-black bg-black text-white rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-[6px_6px_0_0_rgba(255,209,0,1)] cursor-pointer">
                  <div className="absolute top-0 right-0 bg-[#FFD100] text-black text-[8px] font-black px-3 py-1 uppercase tracking-widest rounded-bl-lg">Recomandat</div>
                  <div>
                    <p className="font-black uppercase italic text-lg text-[#FFD100]">Flash Liquidity <span className="text-[10px] border border-[#FFD100] px-2 py-1 rounded text-white ml-2">48 ORE</span></p>
                    <p className="text-xs font-bold text-gray-300 mt-1 max-w-[220px]">Trimitere instantă SMS/Email către toți investitorii Sniper.</p>
                  </div>
                  <div className="font-black text-4xl text-[#FFD100]">149 RON</div>
                </div>
              </div>

              <p className="text-[9px] font-bold text-gray-400 text-center uppercase pt-4 leading-relaxed max-w-sm mx-auto">
                *KYC (Verificarea identității) se va face automat după efectuarea plății cu cardul prin Stripe.
              </p>

              <button className="w-full mt-4 bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                Plătește & Activează Anunțul
              </button>
              
              <button onClick={() => setStep(2)} className="w-full mt-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors italic border-b-2 border-transparent hover:border-black text-center pb-1">
                ← Înapoi la Evaluare
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}