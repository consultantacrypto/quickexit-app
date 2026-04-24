"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Baza de date a investitorilor (pe viitor va fi apel din Supabase)
const buyersDB = [
  { 
    slug: "gigi-v",
    name: "Gigi V.", target: "Mercedes S-Class / BMW 7", budget: 100000, 
    description: "Caut model după 2021, istoric curat, unic proprietar. Ofer cash pe loc după verificare la reprezentanță și semnare acte." 
  },
  { 
    slug: "andrei-p",
    name: "Andrei P.", target: "Teren Bran / Moieciu", budget: 450000, 
    description: "Interesat exclusiv de parcele cu utilități la teren și PUZ aprobat pentru turism. Fără probleme litigioase, plătesc azi." 
  },
  { 
    slug: "investgroup",
    name: "InvestGroup", target: "Penthouses Phuket", budget: 1200000, 
    description: "Cumpărăm urgent pentru portofoliu de randament. Doar proiecte finalizate sau cu predare în următoarele 3 luni." 
  }
];

export default function PitchOfferPage() {
  const params = useParams(); // Prindem [id]-ul din URL
  const [step, setStep] = useState(1);
  const [offerPrice, setOfferPrice] = useState("");
  const [buyer, setBuyer] = useState<any>(null);

  // Căutăm investitorul corect când se încarcă pagina
  useEffect(() => {
    if (params?.id) {
      const foundBuyer = buyersDB.find(b => b.slug === params.id);
      setBuyer(foundBuyer);
    }
  }, [params]);

  // Loading state cat timp se cauta
  if (!buyer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl font-black uppercase italic animate-pulse">Se încarcă detaliile investitorului...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100]">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigare Sus */}
        <div className="mb-10 text-center">
          <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors italic mb-4 inline-block border-b-2 border-transparent hover:border-black">
            ← Înapoi la Cereri Capital
          </Link>
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
            Trimite <span className="text-red-600">Oferta Ta</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLOANA STÂNGA - Detalii Investitor Dinamice (Sticky) */}
          <div className="lg:col-span-1">
            <div className="bg-black text-white p-6 rounded-[2rem] border-[3px] border-black shadow-[6px_6px_0_0_rgba(255,209,0,1)] sticky top-24">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#FFD100] mb-4">Investitor Țintă</p>
              <h3 className="text-xl font-black uppercase italic leading-tight mb-2">{buyer.target}</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{buyer.name}</p>
              
              <div className="border-t border-gray-800 pt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Buget Maxim</p>
                <p className="text-3xl font-black italic tracking-tighter text-white">€{buyer.budget.toLocaleString('ro-RO')}</p>
              </div>

              <div className="mt-6 p-4 bg-gray-900 rounded-xl border border-gray-800">
                <p className="text-[10px] font-bold text-gray-300 italic leading-snug">
                  &quot;{buyer.description}&quot;
                </p>
              </div>
            </div>
          </div>

          {/* COLOANA DREAPTĂ - Formularul de Ofertare */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-[3px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
              
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black uppercase italic mb-6">Detaliile Activului Tău</h2>
                  
                  {/* Upload Poze */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Imagini (Minim 3 foto reale)</label>
                    <div className="w-full h-32 border-[3px] border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-black transition-colors cursor-pointer">
                      <span className="text-2xl mb-2">📸</span>
                      <span className="text-[10px] font-black uppercase text-gray-400 italic">Click pentru Upload</span>
                    </div>
                  </div>

                  {/* Preț cu Validare Visuală */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex justify-between">
                      <span>Prețul Solicitat (Cash)</span>
                      <span className="text-red-500">Max €{buyer.budget.toLocaleString('ro-RO')}</span>
                    </label>
                    <div className="relative mt-2">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl">€</span>
                      <input 
                        type="number" 
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        placeholder="Ex: 85000" 
                        max={buyer.budget}
                        className={`w-full p-4 pl-10 border-[3px] rounded-xl font-black text-xl italic focus:outline-none ${Number(offerPrice) > buyer.budget ? 'border-red-500 bg-red-50' : 'border-black bg-gray-50'}`} 
                      />
                    </div>
                    {Number(offerPrice) > buyer.budget && (
                      <p className="text-[9px] font-black uppercase text-red-500 mt-2">Prețul tău depășește bugetul investitorului!</p>
                    )}
                  </div>

                  {/* Detalii text */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Mesaj / Stare Activ</label>
                    <textarea rows={4} placeholder="Argumentează de ce activul tău se potrivește cu cererea..." className="w-full p-4 border-[3px] border-black rounded-xl font-bold italic focus:outline-none focus:bg-gray-50 resize-none"></textarea>
                  </div>

                  {/* Date contact */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Telefonul tău</label>
                    <input type="tel" placeholder="07XX XXX XXX" className="w-full p-4 border-[3px] border-black rounded-xl font-black text-sm italic focus:outline-none focus:bg-gray-50 uppercase" />
                  </div>

                  <button 
                    onClick={() => setStep(2)} 
                    disabled={Number(offerPrice) > buyer.budget || !offerPrice}
                    className="w-full mt-6 bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:bg-gray-900 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    Pasul Următor →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 text-center">
                  <h2 className="text-2xl font-black uppercase italic mb-2">Filtru de <span className="text-[#FFD100]">Securitate</span></h2>
                  <p className="text-xs font-bold text-gray-500 uppercase italic px-4">Pentru a proteja investitorii de oferte false, solicităm verificarea profilului.</p>
                  
                  <div className="grid grid-cols-1 gap-4 pt-4 text-left">
                    <div className="p-6 border-[3px] border-black bg-white rounded-2xl relative overflow-hidden group hover:bg-gray-50 cursor-pointer">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-black uppercase italic text-lg text-black">Cont Verificat (KYC)</p>
                        <p className="font-black text-xl text-green-600 italic text-right">GRATUIT</p>
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-1">Dacă ai deja cont cu identitate verificată, trimiterea ofertelor este 100% gratuită.</p>
                      <button className="mt-4 w-full border-[3px] border-black text-black py-3 rounded-xl font-black uppercase text-[10px] tracking-widest italic group-hover:bg-black group-hover:text-white transition-colors">Loghează-te</button>
                    </div>

                    <div className="text-center font-black text-gray-300 uppercase tracking-widest text-[10px] my-2">SAU</div>

                    <div className="p-6 border-[3px] border-black bg-black text-white rounded-2xl relative shadow-[6px_6px_0_0_rgba(255,209,0,1)] cursor-pointer">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-black uppercase italic text-lg text-[#FFD100]">Trimite ca Guest</p>
                        <p className="font-black text-2xl text-[#FFD100]">49 RON</p>
                      </div>
                      <p className="text-xs font-bold text-gray-300 mt-1">Taxă unică de procesare a ofertei. Ajunge garantat la {buyer.name}.</p>
                      <button className="mt-6 w-full bg-[#FFD100] text-black border-[3px] border-black py-4 rounded-xl font-black uppercase text-[11px] tracking-widest italic hover:scale-[1.02] transition-transform">
                        Plătește & Trimite Oferta
                      </button>
                    </div>
                  </div>

                  <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors italic border-b-2 border-transparent hover:border-black mt-4">
                    ← Editează detaliile ofertei
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}