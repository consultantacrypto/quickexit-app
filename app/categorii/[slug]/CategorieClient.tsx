"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdCard from "../../components/AdCard";
import Link from "next/link";
import { normalizeSaleType } from "@/utils/normalizeSaleType";

// Am extras subcategoriile EXACT cum apar ele în formularele tale din pune-anunt
const categoryDataMap: Record<string, { name: string; subs: string[] }> = {
  auto: {
    name: "Auto & Moto",
    subs: ["Sedan", "SUV", "Coupe", "Cabrio", "Off-Road"],
  },
  imobiliare: {
    name: "Imobiliare",
    subs: ["Apartament", "Casă / Vilă", "Teren", "Spațiu Comercial"],
  },
  lux: {
    name: "Lux & Ceasuri",
    subs: ["Rolex", "Patek Philippe", "Audemars Piguet", "Bijuterii"],
  }, // Ajustate pentru lux
  business: {
    name: "Afaceri de vânzare",
    subs: ["E-commerce", "Restaurant", "Producție", "HORECA"],
  }, // Ajustate pentru business
  gadgets: { name: "Gadgets", subs: ["Apple", "Telefoane", "Laptopuri", "Tablete"] },
  foto: { name: "Foto & Audio", subs: ["Camere Foto", "Obiective", "Echipament Audio"] },
};

function CategoryContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = params.slug as string;
  const activeSub = searchParams.get("sub") || ""; // Citim subcategoria activă din URL

  const categoryConfig = categoryDataMap[slug] || { name: "Categorie Generală", subs: [] };
  const categoryName = categoryConfig.name;

  const [listings, setListings] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCategoryData() {
      setIsLoading(true);
      try {
        const { data: listData } = await supabase
          .from("listings")
          .select(
            "id,title,images,market_price,exit_price,discount,deal_score,sale_strategy,offer_count,highest_offer,expires_at,status,is_seed,category,details,created_at"
          )
          .eq("category", categoryName)
          .eq("status", "active")
          .eq("is_seed", false) // Protecție menținută
          .order("created_at", { ascending: false });

        const { data: demandData } = await supabase
          .from("demands")
          .select("id,target_asset,description,budget,category,status,created_at")
          .eq("category", categoryName)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        setListings(listData || []);
        setDemands(demandData || []);
      } catch (err) {
        console.error("Eroare fetch terminal:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (slug) fetchCategoryData();
  }, [slug, categoryName]);

  // LOGICA DE FILTRARE DINAMICĂ
  const filterBySubcategory = (items: any[]) => {
    if (!activeSub) return items;

    return items.filter((item) => {
      // Căutăm cuvântul cheie în titlu sau în obiectul JSON 'details'
      const detailsValues = Object.values(item.details || {}).map((v) =>
        String(v).toLowerCase()
      );
      const titleMatch = item.title?.toLowerCase().includes(activeSub.toLowerCase());
      const targetMatch = item.target_asset?.toLowerCase().includes(activeSub.toLowerCase()); // Pentru cereri de cumpărare

      // La Auto & Moto, verificăm dacă bodyType sau make/model conține cuvântul
      return (
        detailsValues.includes(activeSub.toLowerCase()) || titleMatch || targetMatch
      );
    });
  };

  const filteredListings = filterBySubcategory(listings);
  const filteredDemands = filterBySubcategory(demands);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 overflow-x-hidden">
      <section className="mb-10 border-[3px] border-black bg-black text-white rounded-[2rem] px-5 md:px-8 py-7 md:py-9 shadow-[8px_8px_0_0_rgba(255,209,0,1)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD100] mb-3">
          Categorie Quick Exit
        </p>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tight leading-tight">
              Active din {categoryName}
            </h1>
            <div className="mt-4 inline-flex items-center border-2 border-[#FFD100] px-3 py-1 rounded-full bg-[#FFD100] text-black text-xs font-black uppercase tracking-widest">
              vânzare rapidă
            </div>
            <p className="mt-4 text-sm md:text-base text-neutral-200 leading-relaxed">
              Explorează active listate pentru lichiditate rapidă, cu prețuri orientate
              spre oportunitate.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pune-anunt"
              className="inline-flex items-center justify-center border-[3px] border-black bg-[#FFD100] text-black px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white transition-colors"
            >
              Publică anunț
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center border-[3px] border-white bg-transparent text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
            >
              ← Terminal lichiditate
            </Link>
          </div>
        </div>
      </section>

      {/* BARA DE SUBCATEGORII */}
      {categoryConfig.subs.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2 md:gap-3 items-center bg-[#FDFCF8] p-3 md:p-4 rounded-2xl border-[3px] border-black shadow-[6px_6px_0_0_rgba(255,209,0,0.9)]">
          <span className="text-xs font-black uppercase tracking-widest text-neutral-700 mr-2 italic">
            Afișare rapidă:
          </span>

          <button
            onClick={() => router.push(`/categorii/${slug}`)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest italic transition-all border-2 ${!activeSub ? "bg-black text-[#FFD100] border-black shadow-[2px_2px_0_0_rgba(255,209,0,1)]" : "bg-white text-neutral-700 border-black hover:text-black"}`}
          >
            Toate activele
          </button>

          {categoryConfig.subs.map((sub) => (
            <button
              key={sub}
              onClick={() => router.push(`/categorii/${slug}?sub=${encodeURIComponent(sub)}`)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest italic transition-all border-2 ${activeSub === sub ? "bg-black text-[#FFD100] border-black shadow-[2px_2px_0_0_rgba(255,209,0,1)]" : "bg-white text-black border-black shadow-[2px_2px_0_0_rgba(0,0,0,0.12)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]"}`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-24 text-center italic font-black text-neutral-500 animate-pulse uppercase tracking-widest text-sm">
          Sincronizare terminal...
        </div>
      ) : (
        <div className="space-y-20">
          {/* 1. Licitație deschisă (strategie auction) */}
          {filteredListings.some((l) => normalizeSaleType(l.sale_strategy) === "auction") && (
            <section className="bg-[#FDFCF8] border-[3px] border-black rounded-[2rem] p-5 md:p-8 shadow-[6px_6px_0_0_rgba(255,209,0,0.8)]">
              <div className="mb-8 md:mb-10">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-4 h-10 bg-red-600 border-2 border-black animate-pulse"></div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-red-600">
                    Licitație deschisă 30 zile
                  </h2>
                </div>
                <p className="ml-[3.25rem] max-w-xl text-[10px] font-bold uppercase tracking-widest text-neutral-700">
                  Nu există câștigător automat. Plata și predarea se stabilesc direct între părți.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                {filteredListings
                  .filter((l) => normalizeSaleType(l.sale_strategy) === "auction")
                  .map((item) => (
                    <div key={item.id} className="relative">
                      <div className="absolute -top-4 -right-4 z-20 bg-red-600 text-white px-4 py-2 font-black uppercase italic text-[10px] shadow-[4px_4px_0_0_rgba(0,0,0,1)] border-2 border-black animate-bounce">
                        30 ZILE
                      </div>
                      <AdCard
                        id={item.id}
                        title={item.title}
                        image={
                          item.images?.[0] ||
                          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                        }
                        marketPrice={`€${item.market_price.toLocaleString("ro-RO")}`}
                        exitPrice={`€${item.exit_price.toLocaleString("ro-RO")}`}
                        discount={item.discount?.toString() || "0"}
                        score={item.deal_score ? item.deal_score / 10 : 9.5}
                        type="auction"
                        offerCount={item.offer_count}
                        highestOffer={item.highest_offer}
                        expiresAt={item.expires_at}
                      />
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* 2. SECȚIUNEA VÂNZĂRI STANDARD & URGENT */}
          <section className="bg-[#FDFCF8] border-[3px] border-black rounded-[2rem] p-5 md:p-8 shadow-[6px_6px_0_0_rgba(255,209,0,0.8)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-2 border-neutral-200 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-4 h-10 bg-[#FFD100] border-2 border-black"></div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">
                  Oportunități de Vânzare
                </h2>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-neutral-700 bg-white border-2 border-black px-3 py-1 rounded-md">
                {
                  filteredListings.filter(
                    (l) => normalizeSaleType(l.sale_strategy) !== "auction"
                  ).length
                }{" "}
                rezultate
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {filteredListings
                .filter((l) => normalizeSaleType(l.sale_strategy) !== "auction")
                .map((item) => (
                  <AdCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    image={
                      item.images?.[0] ||
                      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                    }
                    marketPrice={`€${item.market_price.toLocaleString("ro-RO")}`}
                    exitPrice={`€${item.exit_price.toLocaleString("ro-RO")}`}
                    discount={item.discount?.toString() || "0"}
                    score={item.deal_score ? item.deal_score / 10 : 9.0}
                    type={normalizeSaleType(item.sale_strategy)}
                  />
                ))}
            </div>

            {/* Afișăm un mesaj dacă nu există rezultate pentru filtru */}
            {filteredListings.filter((l) => normalizeSaleType(l.sale_strategy) !== "auction")
              .length === 0 && (
              <div className="text-center py-16 border-[3px] border-black rounded-[2rem] bg-white shadow-[5px_5px_0_0_rgba(255,209,0,0.7)]">
                <p className="font-black uppercase tracking-widest text-neutral-700 italic">
                  Nu există anunțuri active în această categorie momentan.
                </p>
                {activeSub && (
                  <button
                    onClick={() => router.push(`/categorii/${slug}`)}
                    className="mt-4 bg-black text-[#FFD100] px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                  >
                    Resetează Filtrul
                  </button>
                )}
                <Link
                  href="/pune-anunt"
                  className="mt-4 ml-2 inline-block bg-[#FFD100] text-black border-[3px] border-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic hover:bg-black hover:text-[#FFD100] transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                >
                  Publică primul anunț
                </Link>
              </div>
            )}
          </section>

          {/* 3. SECȚIUNEA INVESTITORI (CERERI) */}
          <section className="bg-[#FDFCF8] border-[3px] border-black rounded-[2rem] p-5 md:p-8 shadow-[6px_6px_0_0_rgba(255,209,0,0.8)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-2 border-neutral-200 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-4 h-10 bg-black"></div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-black">
                  Capital Disponibil (Investitori)
                </h2>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-neutral-700 bg-white border-2 border-black px-3 py-1 rounded-md">
                {filteredDemands.length} rezultate
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {filteredDemands.length > 0 ? (
                filteredDemands.map((demand) => (
                  <div
                    key={demand.id}
                    className="bg-white border-[3px] border-black p-8 rounded-[2.5rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col justify-between hover:translate-y-[-5px] transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-8">
                        <span className="bg-black text-[#FFD100] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase italic tracking-widest border border-black">
                          CASH PREGĂTIT
                        </span>
                        <span className="text-[11px] font-black uppercase text-neutral-600 italic tracking-widest">
                          ID: {demand.id.split("-")[0]}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black uppercase italic leading-tight mb-4 tracking-tighter">
                        {demand.target_asset}
                      </h3>
                      <p className="text-[13px] font-bold text-neutral-700 italic line-clamp-3 leading-relaxed mb-10">
                        &quot;{demand.description}&quot;
                      </p>
                    </div>

                    <div className="mt-4 pt-8 border-t-[3px] border-neutral-200">
                      <p className="text-[11px] font-black uppercase tracking-widest text-neutral-600 mb-2">
                        Buget Alocat
                      </p>
                      <p className="text-4xl font-black italic tracking-tighter text-black mb-8">
                        €{demand.budget.toLocaleString("ro-RO")}
                      </p>

                      <Link
                        href={`/trimite-oferta/${demand.id}`}
                        className="w-full bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-xl font-black uppercase tracking-widest text-[11px] italic hover:bg-black hover:text-[#FFD100] transition-colors shadow-[5px_5px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 block text-center"
                      >
                        Vinde-i Activul Tău
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center bg-white border-[3px] border-black rounded-[2rem] shadow-[5px_5px_0_0_rgba(255,209,0,0.7)]">
                  <p className="font-black uppercase italic text-neutral-700">
                    Nicio cerere de cumpărare găsită pentru acest filtru.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// Învelim componenta în Suspense pentru a fi compatibilă cu `useSearchParams` în Next.js
export default function CategorieClient() {
  return (
    <div className="min-h-screen bg-[#F7F4EC] pt-20 pb-24 font-sans text-black antialiased">
      <Suspense
        fallback={
          <div className="py-24 text-center italic font-black text-neutral-500 animate-pulse uppercase tracking-widest text-sm">
            Sincronizare terminal...
          </div>
        }
      >
        <CategoryContent />
      </Suspense>
    </div>
  );
}
