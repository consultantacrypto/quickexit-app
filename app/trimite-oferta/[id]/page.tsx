"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

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
  const [offerImages, setOfferImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    setErrorMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uploadedImageUrls: string[] = [];

      if (offerImages.length > 0) {
        setIsUploadingImages(true);
        for (const file of offerImages) {
          const fileExt = file.name.split(".").pop() || "jpg";
          const safeName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
          const baseFolder = user?.id || "guest";
          const filePath = `${baseFolder}/demand-offers/${id}/${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from("listings")
            .upload(filePath, file);

          if (uploadError) {
            throw new Error("Nu am putut încărca imaginile. Te rugăm să reîncerci.");
          }

          const { data: publicUrlData } = supabase.storage
            .from("listings")
            .getPublicUrl(filePath);

          if (!publicUrlData?.publicUrl) {
            throw new Error("Nu am putut încărca imaginile. Te rugăm să reîncerci.");
          }

          uploadedImageUrls.push(publicUrlData.publicUrl);
        }
      }

      const { error } = await supabase
        .from('demand_offers')
        .insert({
          demand_id: id,
          seller_user_id: user ? user.id : null,
          offer_price: Number(offerPrice),
          asset_description: assetDescription,
          seller_phone: sellerPhone,
          seller_email: sellerEmail,
          images: uploadedImageUrls,
          status: 'new'
        });

      if (error) throw error;
      trackEvent("submit_demand_offer", {
        demand_id: id,
        category: buyer?.category || "unknown",
      });
      setIsSuccess(true);
    } catch (error) {
      console.error("Eroare trimitere ofertă:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "A apărut o eroare la trimiterea ofertei. Încearcă din nou.";
      setErrorMessage(message);
    } finally {
      setIsUploadingImages(false);
      setIsSubmitting(false);
    }
  };

  const handleOfferImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setOfferImages(Array.from(e.target.files));
    }
  };

  // UI: Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F4EC] px-4">
        <div className="w-16 h-16 border-[6px] border-black/20 border-t-[#FFD100] rounded-full animate-spin mb-4"></div>
        <div className="text-sm font-black uppercase tracking-widest text-neutral-700">Se pregătesc detaliile cererii...</div>
      </div>
    );
  }

  // UI: Not Found / Expirat
  if (!buyer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F4EC] p-4">
        <span className="text-6xl mb-4 opacity-50">🕵️‍♂️</span>
        <div className="text-3xl font-black uppercase italic mb-4 text-center">Cerere Indisponibilă</div>
        <p className="font-bold text-neutral-700 tracking-wide text-sm text-center mb-8">Acest investitor și-a închis bugetul sau cererea a expirat.</p>
        <Link href="/capital-disponibil" className="bg-black text-[#FFD100] border-[3px] border-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-[4px_4px_0_0_rgba(255,209,0,1)]">
          Înapoi la Capital
        </Link>
      </div>
    );
  }

  // UI: Succes
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F4EC] p-4 selection:bg-black selection:text-white">
        <div className="bg-white p-10 rounded-[2.5rem] border-[3px] border-black shadow-[10px_10px_0_0_rgba(255,209,0,1)] text-center max-w-lg">
          <span className="text-6xl block mb-6">📬</span>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4">Oferta a fost trimisă</h2>
          <p className="text-sm font-bold text-neutral-700 mb-8 leading-relaxed">
            Cumpărătorul va putea analiza propunerea ta și te poate contacta prin datele transmise.
          </p>
          <Link href="/capital-disponibil" className="block w-full bg-black text-[#FFD100] border-[3px] border-black py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">
            Înapoi la capital disponibil
          </Link>
        </div>
      </div>
    );
  }

  // UI: Ecran Principal
  return (
    <div className="min-h-screen bg-[#F7F4EC] pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100] antialiased">
      <div className="max-w-7xl mx-auto">
        <section className="mb-8 border-[3px] border-black bg-black text-white rounded-[2rem] px-5 md:px-8 py-7 shadow-[8px_8px_0_0_rgba(255,209,0,1)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD100] mb-3">Capital disponibil</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight leading-tight">
                Trimite oferta <span className="inline-block bg-[#FFD100] text-black px-2 py-1 rounded-md">potrivită</span>
              </h1>
              <p className="mt-4 text-sm md:text-base text-neutral-200 leading-relaxed">
                Răspunde unei cereri active și propune activul tău către un cumpărător pregătit.
              </p>
            </div>
            <Link href="/capital-disponibil" className="inline-flex items-center justify-center bg-transparent border-[3px] border-white text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white hover:text-black transition-colors">
              ← Înapoi la cereri
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLOANA STÂNGA - Detalii Investitor Dinamice (Sticky) */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-[2rem] border-[3px] border-black shadow-[6px_6px_0_0_rgba(255,209,0,0.85)] sticky top-24">
              <p className="text-xs font-black uppercase tracking-widest text-neutral-700 mb-4">Sumar cerere activă</p>
              <h3 className="text-2xl font-black italic leading-tight mb-4">{buyer.target_asset}</h3>
              <div className="inline-flex items-center px-3 py-1 rounded-full border-2 border-black bg-[#FFD100] text-black text-xs font-black uppercase tracking-widest mb-6">
                Status activ
              </div>
              
              <div className="space-y-4">
                <div className="border-t-2 border-neutral-200 pt-4">
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-1">Activ căutat</p>
                  <p className="text-sm font-bold text-neutral-800">{buyer.target_asset || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-1">Categorie</p>
                  <p className="text-sm font-bold text-neutral-800">{buyer.category || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-1">Buget maxim</p>
                  <p className="text-3xl font-black italic tracking-tighter text-black">€{buyer.budget.toLocaleString('ro-RO')}</p>
                </div>
              </div>

              {buyer.description && (
                <div className="mt-6 p-4 bg-[#FDFCF8] rounded-xl border-2 border-black">
                  <p className="text-sm font-medium text-neutral-700 leading-relaxed">
                    {buyer.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* COLOANA DREAPTĂ - Formularul de Ofertare */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border-[3px] border-black shadow-[10px_10px_0_0_rgba(255,209,0,0.85)]">
              {errorMessage && (
                <div className="mb-6 p-4 rounded-xl border-2 border-red-600 bg-red-50 text-red-700 text-sm font-semibold">
                  {errorMessage}
                </div>
              )}
              
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black uppercase italic mb-6">Detaliile activului tău</h2>
                  
                  {/* Upload Poze */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-700 block mb-2">Adaugă poze cu activul</label>
                    <div className="relative w-full h-32 border-[3px] border-dashed border-black/30 rounded-2xl flex flex-col items-center justify-center bg-[#FDFCF8] hover:border-black transition-colors">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleOfferImagesUpload}
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      />
                      <span className="text-2xl mb-2">📸</span>
                      <span className="text-xs font-black uppercase text-neutral-700">Click pentru upload</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-neutral-600">
                      Pozele ajută cumpărătorul să evalueze oferta.
                    </p>
                    {offerImages.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {offerImages.map((file, index) => (
                          <li key={`${file.name}-${index}`} className="text-xs font-semibold text-neutral-700">
                            {file.name}
                          </li>
                        ))}
                      </ul>
                    )}
                    {isUploadingImages && (
                      <p className="mt-2 text-xs font-black uppercase text-neutral-600">
                        Se încarcă imaginile...
                      </p>
                    )}
                  </div>

                  {/* Preț cu Validare Visuală */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-700 flex justify-between gap-2">
                      <span>Prețul solicitat</span>
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
                        className={`w-full p-4 pl-10 border-[3px] rounded-xl font-black text-lg focus:outline-none focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/30 ${Number(offerPrice) > buyer.budget ? 'border-red-500 bg-red-50' : 'border-black bg-white'}`} 
                      />
                    </div>
                    {Number(offerPrice) > buyer.budget && (
                      <p className="text-xs font-black uppercase text-red-600 mt-2">Prețul tău depășește bugetul investitorului.</p>
                    )}
                  </div>

                  {/* Detalii text */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-700 block mb-2">Mesaj / stare activ</label>
                    <textarea 
                      rows={4} 
                      value={assetDescription}
                      onChange={(e) => setAssetDescription(e.target.value)}
                      placeholder="Argumentează de ce activul tău se potrivește cu cererea..." 
                      className="w-full p-4 border-[3px] border-black rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/30 resize-none"
                    ></textarea>
                  </div>

                  {/* Date contact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-700 block mb-2">Telefonul tău</label>
                      <input 
                        type="tel" 
                        value={sellerPhone}
                        onChange={(e) => setSellerPhone(e.target.value)}
                        placeholder="07XX XXX XXX" 
                        className="w-full p-4 border-[3px] border-black rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/30" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-neutral-700 block mb-2">Email contact</label>
                      <input 
                        type="email" 
                        value={sellerEmail}
                        onChange={(e) => setSellerEmail(e.target.value)}
                        placeholder="contact@email.com" 
                        className="w-full p-4 border-[3px] border-black rounded-xl text-sm font-semibold focus:outline-none focus:border-[#FFD100] focus:ring-2 focus:ring-[#FFD100]/30" 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setStep(2)} 
                    disabled={Number(offerPrice) > buyer.budget || !offerPrice || !sellerPhone}
                    className="w-full mt-6 bg-[#FFD100] text-black border-[3px] border-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:brightness-95 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed active:translate-y-1 active:shadow-none"
                  >
                    Pasul Următor →
                  </button>
                  <p className="text-xs text-neutral-600">
                    Datele tale de contact sunt transmise doar în contextul acestei oferte.
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8 text-center">
                  <h2 className="text-2xl font-black uppercase italic mb-2">Confirmă trimiterea ofertei</h2>
                  <p className="text-sm font-semibold text-neutral-700 px-4">Alege modul în care trimiți oferta către cumpărător.</p>
                  
                  <div className="grid grid-cols-1 gap-4 pt-4 text-left">
                    <div onClick={submitOffer} className="p-6 border-[3px] border-black bg-white rounded-2xl relative overflow-hidden group hover:bg-[#FDFCF8] cursor-pointer transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-black uppercase italic text-lg text-black">Sunt utilizator logat</p>
                        <p className="font-black text-xl text-neutral-800 text-right">GRATUIT</p>
                      </div>
                      <p className="text-sm font-semibold text-neutral-700 mt-1">Sistemul detectează automat contul tău activ.</p>
                      <button disabled={isSubmitting || isUploadingImages} className="mt-4 w-full border-[3px] border-black text-black py-3 rounded-xl font-black uppercase text-xs tracking-widest group-hover:bg-black group-hover:text-[#FFD100] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                        {isUploadingImages ? "Se încarcă imaginile..." : isSubmitting ? "Se trimite oferta..." : "Trimite oferta"}
                      </button>
                    </div>

                    <div className="text-center font-black text-neutral-600 uppercase tracking-widest text-xs my-2">SAU</div>

                    <div onClick={submitOffer} className="p-6 border-[3px] border-black bg-black text-white rounded-2xl relative shadow-[6px_6px_0_0_rgba(255,209,0,1)] cursor-pointer hover:bg-black/90 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-black uppercase italic text-lg text-[#FFD100]">Trimite ca Guest</p>
                        <p className="font-black text-2xl text-[#FFD100]">49 RON</p>
                      </div>
                      <p className="text-sm font-semibold text-neutral-200 mt-1">Taxă unică de procesare a ofertei. Ajunge garantat la investitor.</p>
                      <button disabled={isSubmitting || isUploadingImages} className="mt-6 w-full bg-[#FFD100] text-black border-[3px] border-black py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed">
                        {isUploadingImages ? "Se încarcă imaginile..." : isSubmitting ? "Se trimite oferta..." : "Plătește și trimite oferta"}
                      </button>
                    </div>
                  </div>

                  <button onClick={() => setStep(1)} className="text-xs font-black uppercase tracking-widest text-neutral-600 hover:text-black transition-colors border-b-2 border-transparent hover:border-black mt-4">
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