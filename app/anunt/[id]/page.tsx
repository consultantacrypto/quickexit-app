"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdCard from "../../components/AdCard";

export default function AdDetail() {
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const ad = {
    id: "penthouse-phuket",
    title: "Penthouse Panwa Bay Phuket",
    marketPrice: 850000,
    exitPrice: 590000,
    discount: 30,
    score: 9.8,
    phone: "+40722000000",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Proprietate ultra-premium situată pe coasta de sud-est a insulei Phuket. Vedere panoramică la ocean, piscină infinită privată și finisaje de lux. Se lichidează din motive de restructurare a portofoliului. Oportunitate rară de investiție cu randament imediat."
  };

  // Logica pentru Slider-ul de Ofertă (-30% max din Exit Price)
  const minOffer = ad.exitPrice * 0.7; 
  const maxOffer = ad.exitPrice;
  const [offerPrice, setOfferPrice] = useState(ad.exitPrice);

  const renderTitle = (title: string) => {
    const words = title.split(" ");
    const lastWord = words.pop();
    return (
      <>
        {words.join(" ")} <span className="text-[#FFD100] underline decoration-black decoration-[3px] underline-offset-4">{lastWord}</span>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans text-black selection:bg-[#FFD100] selection:text-black">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
        
        {/* Navigare Sus */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="group flex items-center gap-2">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] italic border-b-[3px] border-black pb-1 group-hover:text-[#FFD100] group-hover:border-[#FFD100] transition-all">
              ← Explorează Active
            </span>
          </Link>
          <button 
            onClick={() => setIsFavorite(!isFavorite)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-[3px] border-black font-black uppercase text-[9px] md:text-[10px] tracking-widest italic transition-all shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 ${isFavorite ? 'bg-red-600 text-white border-red-600' : 'bg-white text-black hover:bg-gray-50'}`}
          >
            {isFavorite ? '❤ Salvat' : '♡ Adaugă Favorite'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-20">
          
          {/* COLOANA STÂNGA */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <div className="relative h-[300px] md:h-[400px] lg:h-[450px] w-full rounded-[2rem] overflow-hidden border-[3px] border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] cursor-pointer group">
                <Image src={ad.images[currentImageIndex]} alt={ad.title} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" priority />
                <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest italic border-2 border-black">
                  Lichidare
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 md:gap-4">
                {ad.images.map((img, index) => (
                  <button 
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative h-16 md:h-20 lg:h-24 w-full rounded-xl overflow-hidden border-[3px] transition-all ${currentImageIndex === index ? 'border-[#FFD100] scale-[1.02] shadow-[4px_4px_0_0_rgba(0,0,0,1)] opacity-100' : 'border-black opacity-60 hover:opacity-100'}`}
                  >
                    <Image src={img} alt={`Thumbnail ${index + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase italic tracking-tighter leading-[0.9] text-black">
                {renderTitle(ad.title)}
              </h1>
              <div className="flex flex-wrap gap-2.5">
                <button onClick={() => setActiveModal('verified')} className="flex items-center gap-1.5 bg-black text-[#FFD100] px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest italic border-2 border-black hover:scale-105 transition-transform">
                  <span className="text-sm">★</span> Vânzător Verificat
                </button>
                <button onClick={() => setActiveModal('docs')} className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest italic border-2 border-black hover:bg-[#FFD100] transition-all">
                  <span className="text-sm">📁</span> Documente Gata
                </button>
                <button onClick={() => setActiveModal('ai-score')} className="flex items-center gap-1.5 bg-[#FFD100] text-black px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest italic border-2 border-black hover:scale-105 transition-transform shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                  <span className="text-sm">⚡</span> Scor AI {ad.score}
                </button>
              </div>
              <div className="border-t-[3px] border-black pt-6">
                <h2 className="text-lg md:text-xl font-black uppercase italic mb-3 tracking-tight">Analiză <span className="text-gray-400">Investiție</span></h2>
                <p className="text-sm md:text-base font-bold text-gray-700 leading-relaxed max-w-3xl italic">
                  {ad.description}
                </p>
              </div>
            </div>
          </div>

          {/* COLOANA DREAPTĂ (Terminal) */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white border-[3px] border-black p-6 rounded-[2rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                
                <div className="mb-6 p-5 bg-[#FFD100] rounded-[1.5rem] border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col justify-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-black/60 mb-1">Profit Potențial</p>
                  <p className="text-3xl md:text-4xl font-black italic tracking-tighter text-black uppercase leading-none break-words">
                    €{(ad.marketPrice - ad.exitPrice).toLocaleString('ro-RO')}
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex flex-wrap items-center justify-between border-b-2 border-gray-100 pb-2 gap-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 italic">Evaluat:</span>
                    <span className="text-lg md:text-xl font-black italic line-through opacity-30 text-black">€{ad.marketPrice.toLocaleString('ro-RO')}</span>
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <span className="text-[10px] font-black uppercase text-black italic">Preț Quick Exit (Cash):</span>
                    <span className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none text-black break-words w-full">
                      €{ad.exitPrice.toLocaleString('ro-RO')}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button onClick={() => setActiveModal('accept')} className="w-full bg-black text-[#FFD100] py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm italic border-b-[6px] border-yellow-700 active:border-b-0 active:translate-y-1 transition-all">
                    Acceptă Prețul de Exit
                  </button>
                  <button onClick={() => setActiveModal('offer')} className="w-full bg-white text-black py-4 md:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs italic border-[3px] border-black hover:bg-gray-50 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none">
                    Trimite Ofertă Cash
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t-[3px] border-gray-100 flex flex-col items-center">
                   <button onClick={() => setActiveModal('sniper')} className="text-[10px] md:text-[11px] font-black uppercase italic border-b-[3px] border-[#FFD100] pb-1 hover:text-red-600 hover:border-red-600 transition-all">
                     Activează Alerta Sniper
                   </button>
                   <p className="text-[10px] font-bold text-gray-800 mt-3 max-w-[240px] text-center italic leading-snug">
                     * <span className="font-black text-black">Ești notificat automat</span> pe email în secunda în care prețul scade.
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECȚIUNE OPORTUNITĂȚI SIMILARE */}
        <div className="border-t-[3px] border-black pt-12 md:pt-16">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8 md:mb-10">Oportunități <span className="text-[#FFD100]">Similare</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <AdCard id="mercedes-s-class" title="Mercedes S-Class 2022" image="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80" marketPrice="€95.000" exitPrice="€72.000" discount="24" score={8.5} type="urgent" />
            <AdCard id="rolex-daytona" title="Rolex Daytona Gold" image="https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=800&q=80" marketPrice="€45.000" exitPrice="€31.000" discount="31" score={9.2} type="extreme" />
            <AdCard id="apartament-herastrau" title="Apartament Herastrau" image="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80" marketPrice="€420.000" exitPrice="€315.000" discount="25" score={8.9} type="urgent" />
          </div>
        </div>

        {/* MODAL SISTEM */}
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveModal(null)} />
            <div className="relative bg-white border-[3px] border-black p-8 md:p-10 rounded-[2.5rem] max-w-xl w-full shadow-[15px_15px_0_0_rgba(0,0,0,1)] overflow-y-auto max-h-[90vh]">
              <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 font-black uppercase text-[10px] md:text-xs border-[3px] border-black px-3 py-1.5 md:px-4 md:py-2 hover:bg-black hover:text-white transition-all rounded-xl">Închide ✕</button>
              
              {activeModal === 'verified' && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Vânzător <span className="text-[#FFD100]">Verificat</span></h3>
                  <div className="space-y-4 text-base md:text-lg font-bold italic text-gray-700">
                    <p className="flex items-center gap-3">✓ Identitate confirmată (KYC)</p>
                    <p className="flex items-center gap-3">✓ Istoric tranzacții pozitive</p>
                    <p className="flex items-center gap-3">✓ Active deținute în proprietate directă</p>
                  </div>
                </div>
              )}

              {activeModal === 'docs' && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Documentație <span className="text-[#FFD100]">Completă</span></h3>
                  <p className="text-base md:text-lg font-bold italic text-gray-700">Acest activ are următoarele documente verificate:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm font-black uppercase italic">
                    <li className="bg-gray-50 p-4 rounded-xl border-[3px] border-black">Act Proprietate</li>
                    <li className="bg-gray-50 p-4 rounded-xl border-[3px] border-black">Intabulare</li>
                    <li className="bg-gray-50 p-4 rounded-xl border-[3px] border-black">Certificat Fiscal</li>
                    <li className="bg-gray-50 p-4 rounded-xl border-[3px] border-black">Raport Evaluare</li>
                  </ul>
                </div>
              )}

              {activeModal === 'ai-score' && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Algoritm <span className="text-[#FFD100]">Scor AI</span></h3>
                  <p className="text-base md:text-lg font-bold italic text-gray-700">Scorul de {ad.score} este calculat pe baza:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 border-[3px] border-black rounded-2xl bg-gray-50">
                       <p className="text-xl md:text-2xl font-black italic leading-none">40%</p>
                       <p className="text-[7px] md:text-[8px] font-black uppercase mt-2">Preț vs Piață</p>
                    </div>
                    <div className="text-center p-3 border-[3px] border-black rounded-2xl bg-gray-50">
                       <p className="text-xl md:text-2xl font-black italic leading-none">35%</p>
                       <p className="text-[7px] md:text-[8px] font-black uppercase mt-2">Lichiditate Locație</p>
                    </div>
                    <div className="text-center p-3 border-[3px] border-black rounded-2xl bg-gray-50">
                       <p className="text-xl md:text-2xl font-black italic leading-none">25%</p>
                       <p className="text-[7px] md:text-[8px] font-black uppercase mt-2">Cerere Activ</p>
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'accept' && (
                <div className="text-center space-y-8 pt-4">
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Notifică <span className="text-[#FFD100]">Vânzătorul</span></h3>
                  <p className="text-base font-bold italic text-gray-800">Ai acceptat prețul de €{ad.exitPrice.toLocaleString()}. Sistemul îi va trimite automat un email cu datele tale pentru a te contacta imediat.</p>
                  <div className="space-y-4">
                    <a href={`https://wa.me/${ad.phone}?text=Salut! Accept pretul de ${ad.exitPrice}€ pentru ${ad.title} listat pe QuickExit.`} className="bg-[#25D366] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2">
                      <span>💬</span> Trimite Mesaj WhatsApp Acum
                    </a>
                    
                    <div className="pt-4 border-t-2 border-gray-100 mt-4">
                      <p className="text-[10px] font-black uppercase text-gray-400 mb-4">Sau lasă-ți datele și te sună el:</p>
                      <input type="tel" placeholder="NUMĂRUL TĂU DE TELEFON" className="w-full border-[3px] border-black p-4 rounded-xl font-black text-sm italic uppercase text-center focus:outline-none focus:border-[#FFD100] mb-3" />
                      <button className="w-full bg-black text-[#FFD100] py-4 rounded-xl font-black uppercase tracking-widest text-xs italic hover:bg-gray-900 transition-colors">
                        Trimite Notificare Email
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeModal === 'offer' && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Trimite <span className="text-[#FFD100]">Ofertă Cash</span></h3>
                  
                  {/* Slider & Pret Box */}
                  <div className="bg-gray-50 p-6 rounded-2xl border-[3px] border-black">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Oferta ta curentă:</p>
                    <p className="text-4xl font-black italic tracking-tighter text-black mb-4">€{offerPrice.toLocaleString('ro-RO')}</p>
                    
                    <input 
                      type="range" 
                      min={minOffer} 
                      max={maxOffer} 
                      step="1000" 
                      value={offerPrice} 
                      onChange={(e) => setOfferPrice(Number(e.target.value))}
                      className="w-full accent-black cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                    />
                    <div className="flex justify-between mt-3 text-[9px] font-black uppercase italic text-gray-400">
                      <span className="text-red-500">Min: €{minOffer.toLocaleString('ro-RO')} (-30%)</span>
                      <span>Max: €{maxOffer.toLocaleString('ro-RO')}</span>
                    </div>
                  </div>

                  {/* Formular Contact */}
                  <div className="space-y-3">
                    <input type="tel" placeholder="NUMĂR DE TELEFON" className="w-full bg-gray-50 border-[3px] border-black p-4 rounded-xl font-black text-sm italic focus:outline-none focus:bg-white" />
                    <input type="email" placeholder="ADRESA DE EMAIL" className="w-full bg-gray-50 border-[3px] border-black p-4 rounded-xl font-black text-sm italic focus:outline-none focus:bg-white" />
                    <textarea placeholder="DESCRIERE PROPUNERE (EX: PLĂTESC MÂINE CASH ȘI MĂ OCUP DE ACTE)..." rows={3} className="w-full bg-gray-50 border-[3px] border-black p-4 rounded-xl font-black text-xs italic focus:outline-none focus:bg-white resize-none"></textarea>
                  </div>
                  
                  <button className="w-full bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm italic hover:bg-gray-900 transition-colors mt-2">
                    Notifică Vânzătorul
                  </button>
                  <p className="text-[9px] font-bold text-center text-gray-400 italic">Oferta va fi trimisă automat pe email-ul vânzătorului.</p>
                </div>
              )}

              {activeModal === 'sniper' && (
                <div className="text-center space-y-6 pt-4">
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Alerta <span className="text-red-600">Sniper</span></h3>
                  <p className="text-base font-bold italic text-gray-700">Te anunțăm instant pe email dacă prețul scade.</p>
                  <input type="email" placeholder="EMAIL-UL TĂU" className="w-full border-[3px] border-black p-5 rounded-2xl font-black text-lg md:text-xl italic uppercase text-center focus:outline-none focus:border-[#FFD100]" />
                  <button className="w-full bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm italic hover:bg-gray-900 transition-colors">Setează Alerta</button>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}