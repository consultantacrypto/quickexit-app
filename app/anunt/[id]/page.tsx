"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase"; 
import AdCard from "../../components/AdCard";
// IMPORTUL GLOBAL
import { normalizeSaleType } from "@/utils/normalizeSaleType"; 

export default function AdDetail() {
  const params = useParams();
  const id = params.id as string;

  const [isFavorite, setIsFavorite] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Stări pentru datele reale ale anunțului
  const [adData, setAdData] = useState<any>(null);
  const [similarAds, setSimilarAds] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [offerPrice, setOfferPrice] = useState(0);

  // Stări pentru Trimitere Ofertă (Negociere)
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);

  // Stări pentru "Acceptă Prețul de Exit"
  const [acceptPhone, setAcceptPhone] = useState("");
  const [acceptEmail, setAcceptEmail] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  useEffect(() => {
    async function fetchAd() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setAdData(data);
        setOfferPrice(data.exit_price); 

        // Extragem Oportunități Similare din aceeași categorie
        if (data.category) {
          const { data: similarData } = await supabase
            .from('listings')
            .select('*')
            .eq('category', data.category)
            .eq('status', 'active')
            .neq('id', data.id)
            .limit(3);
            
          if (similarData) setSimilarAds(similarData);
        }

      } catch (error) {
        console.error("Eroare la extragerea anunțului:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAd();
  }, [id]);

  // FUNCȚIA DE NEGOCIERE
  const submitListingOffer = async () => {
    if (!buyerPhone || !offerPrice) return;
    setIsSubmittingOffer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('listing_offers').insert({
          listing_id: adData.id,
          buyer_user_id: user ? user.id : null,
          offer_price: Number(offerPrice),
          buyer_phone: buyerPhone,
          buyer_email: buyerEmail,
          message: offerMessage,
          status: 'new'
        });
      if (error) throw error;
      setOfferSuccess(true);
      setBuyerPhone(""); setBuyerEmail(""); setOfferMessage("");
    } catch (err) {
      console.error(err);
      alert("Eroare la trimiterea ofertei.");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  // FUNCȚIA DE ACCEPTARE EXIT PRICE
  const submitAcceptExitPrice = async () => {
    if (!acceptPhone) return;
    setIsAccepting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('listing_offers').insert({
          listing_id: adData.id,
          buyer_user_id: user ? user.id : null,
          offer_price: adData.exit_price,
          buyer_phone: acceptPhone,
          buyer_email: acceptEmail,
          message: "⚠️ CLIENTUL A ACCEPTAT PREȚUL DE EXIT ȘI DOREȘTE TRANZACȚIA ACUM!",
          status: 'accepted_exit_price'
        });
      if (error) throw error;
      setAcceptSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Eroare la confirmare.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 border-[6px] border-gray-100 border-t-black rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">Se încarcă activele...</p>
      </div>
    );
  }

  if (!adData) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center p-4 font-sans">
        <span className="text-6xl mb-6 opacity-50">🕵️‍♂️</span>
        <h1 className="text-4xl font-black uppercase italic mb-4 tracking-tighter">Activ Indisponibil</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest mb-8 text-xs">Acest activ a fost vândut sau eliminat din terminal.</p>
        <Link href="/">
          <button className="bg-black text-[#FFD100] px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs italic shadow-[6px_6px_0_0_rgba(255,209,0,1)] hover:-translate-y-1 transition-all">
            Înapoi la Oportunități
          </button>
        </Link>
      </div>
    );
  }

  const minOffer = adData.exit_price * 0.7;
  const maxOffer = adData.exit_price;
  const displayImages = (adData.images && adData.images.length > 0) ? adData.images : ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"];

  const renderTitle = (title: string) => {
    if (!title) return null;
    const words = title.split(" ");
    const lastWord = words.pop();
    return (
      <>{words.join(" ")} <span className="text-[#FFD100] underline decoration-black decoration-[3px] underline-offset-4">{lastWord}</span></>
    );
  };

  // Helper funcție pentru a extrage datele tehnice relevante
  const renderTechnicalDetails = () => {
    if (!adData.details) return null;
    
    // Extragem doar field-urile care au o valoare reală și nu sunt goale
    const validDetails = Object.entries(adData.details).filter(([key, value]) => {
      // Ignoram campurile de sistem sau cele goale
      return value && value !== "" && !['package', 'strategy', 'source', 'observed_at'].includes(key);
    });

    if (validDetails.length === 0) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {validDetails.map(([key, value]) => (
          <div key={key} className="bg-gray-50 p-4 rounded-xl border-[2px] border-black">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{key}</p>
            <p className="font-bold italic uppercase text-black">{String(value)}</p>
          </div>
        ))}
      </div>
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
          <button onClick={() => setIsFavorite(!isFavorite)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-[3px] border-black font-black uppercase text-[9px] md:text-[10px] tracking-widest italic transition-all shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 ${isFavorite ? 'bg-red-600 text-white border-red-600' : 'bg-white text-black hover:bg-gray-50'}`}>
            {isFavorite ? '❤ Salvat' : '♡ Adaugă Favorite'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-20">
          
          {/* COLOANA STÂNGA */}
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <div className="relative h-[300px] md:h-[400px] lg:h-[450px] w-full rounded-[2rem] overflow-hidden border-[3px] border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] cursor-pointer group bg-gray-50">
                <Image src={displayImages[currentImageIndex]} alt={adData.title} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.02]" priority />
                <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-1.5 rounded-lg font-black uppercase text-[9px] tracking-widest italic border-2 border-black">
                  {adData.sale_strategy}
                </div>
              </div>
              
              {displayImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                  {displayImages.map((img: string, index: number) => (
                    <button key={index} onClick={() => setCurrentImageIndex(index)} className={`relative h-16 md:h-20 lg:h-24 w-full rounded-xl overflow-hidden border-[3px] transition-all ${currentImageIndex === index ? 'border-[#FFD100] scale-[1.02] shadow-[4px_4px_0_0_rgba(0,0,0,1)] opacity-100' : 'border-black opacity-60 hover:opacity-100'}`}>
                      <Image src={img} alt={`Thumbnail ${index + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                 <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-md border border-gray-200">{adData.category}</span>
                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ID: {adData.id.split('-')[0]}</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase italic tracking-tighter leading-[0.9] text-black">
                {renderTitle(adData.title)}
              </h1>
              
              {/* MODIFICAREA LOGICĂ: Afișarea Datelor Tehnice */}
              {renderTechnicalDetails()}

              <div className="flex flex-wrap gap-2.5 mt-6">
                <button onClick={() => setActiveModal('verified')} className="flex items-center gap-1.5 bg-black text-[#FFD100] px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest italic border-2 border-black hover:scale-105 transition-transform"><span className="text-sm">★</span> Vânzător Verificat</button>
                <button onClick={() => setActiveModal('docs')} className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest italic border-2 border-black hover:bg-[#FFD100] transition-all"><span className="text-sm">📁</span> Documente Gata</button>
                <button onClick={() => setActiveModal('ai-score')} className="flex items-center gap-1.5 bg-[#FFD100] text-black px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest italic border-2 border-black hover:scale-105 transition-transform shadow-[3px_3px_0_0_rgba(0,0,0,1)]"><span className="text-sm">⚡</span> Scor AI {adData.deal_score || 90}</button>
              </div>
              <div className="border-t-[3px] border-black pt-6">
                <h2 className="text-lg md:text-xl font-black uppercase italic mb-3 tracking-tight">Analiză <span className="text-gray-400">Investiție</span></h2>
                <p className="text-sm md:text-base font-bold text-gray-700 leading-relaxed max-w-3xl italic whitespace-pre-wrap">{adData.description}</p>
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
                    €{(adData.market_price - adData.exit_price).toLocaleString('ro-RO')}
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex flex-wrap items-center justify-between border-b-2 border-gray-100 pb-2 gap-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 italic">Evaluat:</span>
                    <span className="text-lg md:text-xl font-black italic line-through opacity-30 text-black">€{adData.market_price.toLocaleString('ro-RO')}</span>
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <span className="text-[10px] font-black uppercase text-black italic">Preț Quick Exit (Cash):</span>
                    <span className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none text-black break-words w-full">
                      €{adData.exit_price.toLocaleString('ro-RO')}
                    </span>
                  </div>
                  <div className="inline-block bg-black text-[#FFD100] px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest italic border-2 border-transparent">
                    Discount Aplicat: -{adData.discount}%
                  </div>
                </div>

                <div className="space-y-3">
                  <button onClick={() => { setActiveModal('accept'); setAcceptSuccess(false); }} className="w-full bg-black text-[#FFD100] py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm italic border-b-[6px] border-yellow-700 active:border-b-0 active:translate-y-1 transition-all">
                    Acceptă Prețul de Exit
                  </button>
                  <button onClick={() => { setActiveModal('offer'); setOfferSuccess(false); }} className="w-full bg-white text-black py-4 md:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs italic border-[3px] border-black hover:bg-gray-50 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none">
                    Trimite Ofertă Cash
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t-[3px] border-gray-100 flex flex-col items-center opacity-50 relative group cursor-not-allowed">
                   <button disabled className="text-[10px] md:text-[11px] font-black uppercase italic border-b-[3px] border-gray-400 pb-1">
                     Activează Alerta Sniper
                   </button>
                   <div className="absolute -top-6 bg-black text-[#FFD100] px-2 py-1 rounded text-[8px] font-black tracking-widest uppercase hidden group-hover:block">În Curând</div>
                   <p className="text-[10px] font-bold text-gray-800 mt-3 max-w-[240px] text-center italic leading-snug">
                     Filtru indisponibil temporar. Sistem de notificări AI în dezvoltare.
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OPORTUNITĂȚI SIMILARE */}
        <div className="border-t-[3px] border-black pt-12 md:pt-16">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8 md:mb-10">Oportunități <span className="text-[#FFD100]">Similare</span></h2>
          
          {similarAds.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {similarAds.map((item) => (
                <AdCard 
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.images?.[0] || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"}
                  marketPrice={`€${item.market_price.toLocaleString('ro-RO')}`}
                  exitPrice={`€${item.exit_price.toLocaleString('ro-RO')}`}
                  discount={item.discount?.toString() || "0"}
                  score={item.deal_score ? item.deal_score / 10 : 9.0} 
                  type={normalizeSaleType(item.sale_strategy)}
                />
              ))}
            </div>
          ) : (
            <div className="p-10 bg-gray-50 border-[3px] border-dashed border-gray-300 rounded-[2rem] text-center">
              <p className="font-black uppercase italic text-gray-400">Nu există alte active disponibile momentan în categoria {adData.category}.</p>
            </div>
          )}
        </div>

        {/* MODALE SISTEM */}
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
                  <p className="text-base md:text-lg font-bold italic text-gray-700">Scorul de {adData.deal_score || 90} este calculat pe baza:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 border-[3px] border-black rounded-2xl bg-gray-50"><p className="text-xl md:text-2xl font-black italic leading-none">40%</p><p className="text-[7px] md:text-[8px] font-black uppercase mt-2">Preț vs Piață</p></div>
                    <div className="text-center p-3 border-[3px] border-black rounded-2xl bg-gray-50"><p className="text-xl md:text-2xl font-black italic leading-none">35%</p><p className="text-[7px] md:text-[8px] font-black uppercase mt-2">Lichiditate Locație</p></div>
                    <div className="text-center p-3 border-[3px] border-black rounded-2xl bg-gray-50"><p className="text-xl md:text-2xl font-black italic leading-none">25%</p><p className="text-[7px] md:text-[8px] font-black uppercase mt-2">Cerere Activ</p></div>
                  </div>
                </div>
              )}

              {activeModal === 'accept' && (
                <div className="text-center space-y-8 pt-4">
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Notifică <span className="text-[#FFD100]">Vânzătorul</span></h3>
                  
                  {acceptSuccess ? (
                    <div className="bg-[#FFD100] p-6 rounded-2xl border-[3px] border-black text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] animate-in zoom-in duration-300">
                      <span className="text-5xl block mb-4">🤝</span>
                      <p className="text-xl font-black uppercase italic text-black mb-2">Felicitări! Ai rezervat activul.</p>
                      <p className="text-[10px] font-bold text-gray-800 uppercase tracking-widest leading-relaxed">Vânzătorul a fost notificat de acordul tău ferm pentru prețul de €{adData.exit_price.toLocaleString('ro-RO')}. Te va suna imediat.</p>
                      <button onClick={() => { setActiveModal(null); setAcceptSuccess(false); }} className="mt-6 w-full bg-black text-[#FFD100] px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic hover:bg-gray-900 transition-colors">Închide și Revino</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-base font-bold italic text-gray-800">Ești de acord cu achiziția la prețul exact cerut de <span className="font-black">€{adData.exit_price.toLocaleString('ro-RO')}</span>.</p>
                      <div className="space-y-4">
                        <div className="pt-4 border-t-2 border-gray-100">
                          <p className="text-[10px] font-black uppercase text-gray-400 mb-4 text-left">Lasă-ți datele și te sună proprietarul:</p>
                          <input 
                            type="tel" 
                            value={acceptPhone}
                            onChange={(e) => setAcceptPhone(e.target.value)}
                            placeholder="NUMĂRUL TĂU DE TELEFON" 
                            className="w-full border-[3px] border-black p-4 rounded-xl font-black text-sm italic uppercase focus:outline-none focus:border-[#FFD100] mb-3" 
                          />
                          <input 
                            type="email" 
                            value={acceptEmail}
                            onChange={(e) => setAcceptEmail(e.target.value)}
                            placeholder="EMAIL (OPȚIONAL)" 
                            className="w-full border-[3px] border-black p-4 rounded-xl font-black text-sm italic uppercase focus:outline-none focus:border-[#FFD100] mb-3" 
                          />
                          <button 
                            onClick={submitAcceptExitPrice}
                            disabled={isAccepting || !acceptPhone}
                            className="w-full bg-black text-[#FFD100] py-4 rounded-xl font-black uppercase tracking-widest text-xs italic hover:bg-gray-900 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none active:translate-y-1 active:shadow-none"
                          >
                            {isAccepting ? "Se trimite..." : "Trimite Acordul Oficial"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeModal === 'offer' && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">Trimite <span className="text-[#FFD100]">Ofertă Cash</span></h3>
                  
                  {offerSuccess ? (
                    <div className="bg-[#FFD100] p-6 rounded-2xl border-[3px] border-black text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] animate-in zoom-in duration-300">
                      <span className="text-5xl block mb-4">📬</span>
                      <p className="text-xl font-black uppercase italic text-black mb-2">Oferta a fost trimisă!</p>
                      <p className="text-[10px] font-bold text-gray-800 uppercase tracking-widest leading-relaxed">Vânzătorul a fost notificat și te va contacta direct în cel mai scurt timp.</p>
                      <button onClick={() => { setActiveModal(null); setOfferSuccess(false); }} className="mt-6 w-full bg-black text-[#FFD100] px-6 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest italic hover:bg-gray-900 transition-colors">Închide și Revino</button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-50 p-6 rounded-2xl border-[3px] border-black">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Oferta ta curentă:</p>
                        <p className="text-4xl font-black italic tracking-tighter text-black mb-4">€{offerPrice.toLocaleString('ro-RO')}</p>
                        <input 
                          type="range" min={minOffer} max={maxOffer} step="1000" value={offerPrice} 
                          onChange={(e) => setOfferPrice(Number(e.target.value))}
                          className="w-full accent-black cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                        />
                        <div className="flex justify-between mt-3 text-[9px] font-black uppercase italic text-gray-400">
                          <span className="text-red-500">Min: €{minOffer.toLocaleString('ro-RO')} (-30%)</span>
                          <span>Max: €{maxOffer.toLocaleString('ro-RO')}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <input 
                          type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
                          placeholder="NUMĂR DE TELEFON" className="w-full bg-gray-50 border-[3px] border-black p-4 rounded-xl font-black text-sm italic focus:outline-none focus:bg-white" 
                        />
                        <input 
                          type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="ADRESA DE EMAIL (Opțional)" className="w-full bg-gray-50 border-[3px] border-black p-4 rounded-xl font-black text-sm italic focus:outline-none focus:bg-white" 
                        />
                        <textarea 
                          value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)}
                          placeholder="DESCRIERE PROPUNERE (EX: PLĂTESC MÂINE CASH ȘI MĂ OCUP DE ACTE)..." 
                          rows={3} className="w-full bg-gray-50 border-[3px] border-black p-4 rounded-xl font-black text-xs italic focus:outline-none focus:bg-white resize-none"
                        ></textarea>
                      </div>
                      
                      <button 
                        onClick={submitListingOffer}
                        disabled={isSubmittingOffer || !buyerPhone}
                        className="w-full bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm italic hover:bg-gray-900 transition-colors mt-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none"
                      >
                        {isSubmittingOffer ? "Se Trimite..." : "Notifică Vânzătorul"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}