"use client";

import { useState } from "react";
import Link from "next/link";

export default function PostDemandPage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Auto & Moto");

  // Categoriile corecte preluate de pe Homepage
  const categoriesList = [
    'Auto & Moto', 'Imobiliare', 'Lux & Ceasuri', 
    'Afaceri de vânzare', 'Gadgets', 'Foto & Audio'
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100]">
      <div className="max-w-3xl mx-auto">
        
        <div className="mb-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 italic">Terminal de Cumpărare</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
            Formulează <span className="text-[#FFD100]">Oferta de Cumpărare</span>
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-4 uppercase italic">Specifică detaliile exacte pentru a atrage active sub prețul pieței.</p>
        </div>

        <div className="flex justify-between mb-8 border-b-4 border-black pb-4">
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 1 ? 'text-black' : 'text-gray-300'}`}>1. Filtre Specifice</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 2 ? 'text-black' : 'text-gray-300'}`}>2. Buget & Plată</div>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border-[3px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase italic mb-6">În ce domeniu investești?</h2>
              
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t-2 border-gray-100">
                
                {/* 1. AUTO & MOTO */}
                {category === 'Auto & Moto' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Model / Denumire Activ</label>
                      <input type="text" placeholder="Ex: Mercedes S-Class, BMW Seria 7" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Preferat (Limita minimă)</label>
                      <input type="number" placeholder="Ex: 2021" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rulaj Maxim</label>
                      <input type="text" placeholder="Ex: 50.000 KM" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Culoare / Finisaje</label>
                      <input type="text" placeholder="Ex: Negru / Pachet AMG" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Localizare Preferată</label>
                      <input type="text" placeholder="Ex: București / Ilfov" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 2. IMOBILIARE */}
                {category === 'Imobiliare' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tip Proprietate Căutată</label>
                      <input type="text" placeholder="Ex: Penthouse, Teren Intravilan, Vilă" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suprafață Minimă (mp)</label>
                      <input type="number" placeholder="Ex: 120 mp" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stadiu / Finisaje</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>La cheie / Lux</option>
                        <option>Necesită renovare (Flip)</option>
                        <option>La roșu / Construcție nouă</option>
                        <option>Teren liber</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Localizare Exactă</label>
                      <input type="text" placeholder="Ex: Nordul Capitalei, Pipera, Cluj-Central" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 3. LUX & CEASURI */}
                {category === 'Lux & Ceasuri' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Brand & Model Exact</label>
                      <input type="text" placeholder="Ex: Rolex Daytona, Patek Philippe Nautilus" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stare Acceptată</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Doar Nou / Nepurtat</option>
                        <option>Purtat / Stare Impecabilă</option>
                        <option>Accept urme de uzură</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Documente & Cutie</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Full Set Obligatoriu</option>
                        <option>Doar Acte / Card</option>
                        <option>Accept Watch Only (Verificare la ceasornicar)</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An de Fabricație / Epocă</label>
                      <input type="text" placeholder="Ex: După 2020 sau modele Vintage pre-1990" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 4. AFACERI DE VÂNZARE */}
                {category === 'Afaceri de vânzare' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Domeniu de Activitate</label>
                      <input type="text" placeholder="Ex: HoReCa, IT, Ecommerce, Producție" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vechime Minimă (Ani pe piață)</label>
                      <input type="number" placeholder="Ex: 3" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cifră de Afaceri Dorită</label>
                      <input type="text" placeholder="Ex: Minim 500k EUR/an" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Condiții Achiziție</label>
                      <input type="text" placeholder="Ex: Fără datorii, echipă formată, preluare 100% acțiuni" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 5. GADGETS / FOTO & AUDIO */}
                {(category === 'Gadgets' || category === 'Foto & Audio') && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Echipament / Model</label>
                      <input type="text" placeholder="Ex: MacBook Pro M3 Max, Sony A7S III" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stare Tehnică</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Doar Sigilat</option>
                        <option>Ca Nou / Fără Uzură</option>
                        <option>Uzură Normală Acceptată</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Garanție Valabilă</label>
                      <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Obligatoriu</option>
                        <option>Nu contează dacă prețul e bun</option>
                      </select>
                    </div>
                  </>
                )}

                {/* CÂMP COMUN PENTRU TOATE: Detalii Extra */}
                <div className="md:col-span-2 pt-2 border-t-2 border-gray-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Notă Pentru Vânzători / Mod de plată</label>
                  <textarea rows={3} placeholder="Ex: Plătesc pe loc transfer bancar imediat după verificare. Vă rog fără oferte la preț de piață, caut strict lichidări..." className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold italic focus:outline-none focus:bg-gray-50 resize-none"></textarea>
                </div>
              </div>

              <button onClick={() => setStep(2)} className="w-full mt-8 bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:bg-gray-900 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">
                Continuă la Buget →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 text-center">
              
              <div className="bg-gray-50 p-6 rounded-2xl border-[3px] border-black text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Bugetul Tău Maxim (EUR)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl">€</span>
                  <input type="number" placeholder="250000" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-black text-3xl italic pl-12 focus:outline-none focus:bg-white" />
                </div>
              </div>

              <div className="pt-4">
                <h2 className="text-xl font-black uppercase italic mb-4 text-left">Confirmare Pachet Cerere</h2>
                <div className="p-6 border-[3px] border-black bg-black text-white rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[6px_6px_0_0_rgba(255,209,0,1)] text-left">
                  <div>
                    <p className="font-black uppercase italic text-xl text-[#FFD100]">Standard Buy Offer</p>
                    <p className="text-xs font-bold text-gray-300 mt-1 max-w-[250px]">
                      Valabilitate: <span className="text-white">30 Zile</span>.<br/>Vizibilitate maximă în Directorul de Capital.
                    </p>
                  </div>
                  <div className="font-black text-4xl text-[#FFD100]">99 RON</div>
                </div>
              </div>

              <p className="text-[9px] font-bold text-gray-400 text-center uppercase leading-relaxed max-w-sm mx-auto">
                *Pentru a garanta seriozitatea investitorilor, KYC-ul (Verificarea Identității) este obligatoriu după efectuarea plății.
              </p>

              <div className="flex gap-4 pt-4 border-t-2 border-gray-100">
                <button onClick={() => setStep(1)} className="w-1/3 border-[3px] border-black py-5 rounded-2xl font-black uppercase text-xs italic hover:bg-gray-50 transition-colors">
                  Înapoi
                </button>
                <button className="w-2/3 bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  Plătește & Postează
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}