"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function PitchOfferPage() {
  const params = useParams();
  const id = params.id as string;

  const [step, setStep] = useState(1);
  const [buyer, setBuyer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State-uri pentru formularul de ofertare
  const [offerPrice, setOfferPrice] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Extragem cererea reală din baza de date
  useEffect(() => {
    async function fetchDemand() {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('demands')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setBuyer(data);
      } catch (error) {
        console.error("Eroare fetching demand:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDemand();
  }, [id]);

  // Funcția MAGICĂ: Trimiterea ofertei către Investitor
  const submitOffer = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('demand_offers')
        .insert({
          demand_id: id,
          seller_user_id: user ? user.id : null,
          offer_price: Number(offerPrice),
          asset_description: assetDescription,
          seller_phone: sellerPhone,
          seller_email: sellerEmail,
          status: 'new'
        });

      if (error) throw error;
      setIsSuccess(true);
    } catch (error) {
      console.error("Eroare trimitere ofertă:", error);
      alert("A apărut o eroare la trimiterea ofertei. Încearcă din nou.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI: Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-[6px] border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
        <div className="text-sm font-black uppercase tracking-widest text-gray-400">Încărcare profil investitor...</div>
      </div>
    );
  }

  // UI: Not Found / Expirat
  if (!buyer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <span className="text-6xl mb-4 opacity-50">🕵️‍♂️</span>
        <div className="text-3xl font-black uppercase italic mb-4 text-center">Cerere Indisponibilă</div>
        <p className="font-bold text-gray-500 uppercase tracking-widest text-xs text-center mb-8">Acest investitor și-a închis bugetul sau cererea a expirat.</p>
        <Link href="/capital-disponibil" className="bg-black text-[#FFD100] px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs italic shadow-[4px_4px_0_0_rgba(255,209,0,1)]">
          Înapoi la Capital
        </Link>
      </div>
    );
  }

  // UI: Succes
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFD100] p-4 selection:bg-black selection:text-white">
        <div className="bg-white p-10 rounded-[2.5rem] border-[4px] border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] text-center max-w-lg animate-in zoom-in duration-300">
          <span className="text-6xl block mb-6">📬</span>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4">Ofertă Trimisă!</h2>
          <p className="text-sm font-bold text-gray-600 mb-8 leading-relaxed">
            Propunerea ta a fost înregistrată cu succes și notificată către investitor. Dacă prețul și specificațiile corespund, te va contacta direct.
          </p>
          <Link href="/capital-disponibil" className="block w-full bg-black text-[#FFD100] py-4 rounded-xl font-black uppercase tracking-widest text-sm italic hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">
            Înapoi la Director
          </Link>
        </div>
      </div>
    );
  }

  // UI: Ecran Principal
  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100] antialiased">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-10 text-center">
          <Link href="/capital-disponibil" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors italic mb-4 inline-block border-b-2 border-transparent hover:border-black">
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
              <h3 className="text-xl font-black uppercase italic leading-tight mb-2">{buyer.target_asset}</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Investitor Verificat</p>
              
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
                  
                  {/* Upload Poze (Vizual) */}
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
                    <textarea 
                      rows={4} 
                      value={assetDescription}
                      onChange={(e) => setAssetDescription(e.target.value)}
                      placeholder="Argumentează de ce activul tău se potrivește cu cererea..." 
                      className="w-full p-4 border-[3px] border-black rounded-xl font-bold italic focus:outline-none focus:bg-gray-50 resize-none shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                    ></textarea>
                  </div>

                  {/* Date contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Telefonul tău</label>
                      <input 
                        type="tel" 
                        value={sellerPhone}
                        onChange={(e) => setSellerPhone(e.target.value)}
                        placeholder="07XX XXX XXX" 
                        className="w-full p-4 border-[3px] border-black rounded-xl font-black text-sm italic focus:outline-none focus:bg-gray-50 uppercase" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">Email Contact</label>
                      <input 
                        type="email" 
                        value={sellerEmail}
                        onChange={(e) => setSellerEmail(e.target.value)}
                        placeholder="contact@email.com" 
                        className="w-full p-4 border-[3px] border-black rounded-xl font-black text-sm italic focus:outline-none focus:bg-gray-50 uppercase" 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setStep(2)} 
                    disabled={Number(offerPrice) > buyer.budget || !offerPrice || !sellerPhone}
                    className="w-full mt-6 bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:bg-gray-900 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed active:translate-y-1 active:shadow-none"
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
                    <div onClick={submitOffer} className="p-6 border-[3px] border-black bg-white rounded-2xl relative overflow-hidden group hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-black uppercase italic text-lg text-black">Sunt Utilizator Logat</p>
                        <p className="font-black text-xl text-green-600 italic text-right">GRATUIT</p>
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-1">Sistemul detectează automat contul tău activ.</p>
                      <button disabled={isSubmitting} className="mt-4 w-full border-[3px] border-black text-black py-3 rounded-xl font-black uppercase text-[10px] tracking-widest italic group-hover:bg-black group-hover:text-[#FFD100] transition-colors">
                        {isSubmitting ? "Se trimite..." : "Trimite Oferta Acum"}
                      </button>
                    </div>

                    <div className="text-center font-black text-gray-300 uppercase tracking-widest text-[10px] my-2">SAU</div>

                    <div onClick={submitOffer} className="p-6 border-[3px] border-black bg-black text-white rounded-2xl relative shadow-[6px_6px_0_0_rgba(255,209,0,1)] cursor-pointer hover:bg-gray-900 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-black uppercase italic text-lg text-[#FFD100]">Trimite ca Guest</p>
                        <p className="font-black text-2xl text-[#FFD100]">49 RON</p>
                      </div>
                      <p className="text-xs font-bold text-gray-300 mt-1">Taxă unică de procesare a ofertei. Ajunge garantat la investitor.</p>
                      <button disabled={isSubmitting} className="mt-6 w-full bg-[#FFD100] text-black border-[3px] border-black py-4 rounded-xl font-black uppercase text-[11px] tracking-widest italic hover:scale-[1.02] transition-transform">
                        {isSubmitting ? "Se procesează..." : "Plătește & Trimite Oferta"}
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