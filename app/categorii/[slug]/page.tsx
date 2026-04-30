"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdCard from "../../components/AdCard";
import Link from "next/link";
import { normalizeSaleType } from "@/utils/normalizeSaleType";

// Am extras subcategoriile EXACT cum apar ele în formularele tale din pune-anunt
const categoryDataMap: Record<string, { name: string, subs: string[] }> = {
  'auto': { name: 'Auto & Moto', subs: ["Sedan", "SUV", "Coupe", "Cabrio", "Off-Road"] },
  'imobiliare': { name: 'Imobiliare', subs: ["Apartament", "Casă / Vilă", "Teren", "Spațiu Comercial"] },
  'lux': { name: 'Lux & Ceasuri', subs: ["Rolex", "Patek Philippe", "Audemars Piguet", "Bijuterii"] }, // Ajustate pentru lux
  'business': { name: 'Afaceri de vânzare', subs: ["E-commerce", "Restaurant", "Producție", "HORECA"] }, // Ajustate pentru business
  'gadgets': { name: 'Gadgets', subs: ["Apple", "Telefoane", "Laptopuri", "Tablete"] },
  'foto': { name: 'Foto & Audio', subs: ["Camere Foto", "Obiective", "Echipament Audio"] }
};

function CategoryContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const slug = params.slug as string;
  const activeSub = searchParams.get('sub') || ""; // Citim subcategoria activă din URL
  
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
          .from('listings')
          .select('*')
          .eq('category', categoryName)
          .eq('status', 'active')
          .eq('is_seed', false) // Protecție menținută
          .order('created_at', { ascending: false });

        const { data: demandData } = await supabase
          .from('demands')
          .select('*')
          .eq('category', categoryName)
          .eq('status', 'active')
          .eq('is_seed', false) // Protecție menținută
          .order('created_at', { ascending: false });

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
    
    return items.filter(item => {
      // Căutăm cuvântul cheie în titlu sau în obiectul JSON 'details'
      const detailsValues = Object.values(item.details || {}).map(v => String(v).toLowerCase());
      const titleMatch = item.title?.toLowerCase().includes(activeSub.toLowerCase());
      const targetMatch = item.target_asset?.toLowerCase().includes(activeSub.toLowerCase()); // Pentru cereri de cumpărare
      
      // La Auto & Moto, verificăm dacă bodyType sau make/model conține cuvântul
      return detailsValues.includes(activeSub.toLowerCase()) || titleMatch || targetMatch;
    });
  };

  const filteredListings = filterBySubcategory(listings);
  const filteredDemands = filterBySubcategory(demands);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      
      {/* HEADER CATEGORIE - BRUTALIST STYLE */}
      <div className="mb-10 border-b-[6px] border-black pb-10">
        <Link href="/" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black italic mb-4 block transition-colors">
          ← TERMINAL LICHIDITATE
        </Link>
        <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-8">
          {categoryName}
        </h1>

        {/* BARA DE SUBCATEGORII */}
        {categoryConfig.subs.length > 0 && (
          <div className="flex flex-wrap gap-2 md:gap-3 items-center bg-gray-50 p-3 md:p-4 rounded-2xl border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
             <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mr-2 italic">Afișare Rapidă:</span>
             
             <button 
                onClick={() => router.push(`/categorii/${slug}`)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all border-2 ${!activeSub ? 'bg-black text-[#FFD100] border-black shadow-[2px_2px_0_0_rgba(255,209,0,1)]' : 'bg-white text-gray-500 border-transparent hover:border-black hover:text-black'}`}
             >
               Toate Activele
             </button>

             {categoryConfig.subs.map(sub => (
               <button 
                  key={sub}
                  onClick={() => router.push(`/categorii/${slug}?sub=${encodeURIComponent(sub)}`)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all border-2 ${activeSub === sub ? 'bg-black text-[#FFD100] border-black shadow-[2px_2px_0_0_rgba(255,209,0,1)]' : 'bg-white text-black border-black shadow-[2px_2px_0_0_rgba(0,0,0,0.1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)]'}`}
               >
                 {sub}
               </button>
             ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-24 text-center italic font-black text-gray-300 animate-pulse uppercase tracking-widest text-sm">Sincronizare terminal...</div>
      ) : (
        <div className="space-y-28">
          
          {/* 1. SECȚIUNEA LICITAȚII */}
          {filteredListings.some(l => normalizeSaleType(l.sale_strategy) === 'auction') && (
            <section>
              <div className="flex items-center gap-4 mb-12">
                <div className="w-4 h-10 bg-red-600 border-2 border-black animate-pulse"></div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-red-600">Licitații Flash Live</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {filteredListings.filter(l => normalizeSaleType(l.sale_strategy) === 'auction').map((item) => (
                  <div key={item.id} className="relative">
                     <div className="absolute -top-4 -right-4 z-20 bg-red-600 text-white px-4 py-2 font-black uppercase italic text-[10px] shadow-[4px_4px_0_0_rgba(0,0,0,1)] border-2 border-black animate-bounce">Live 24H</div>
                     <AdCard 
                      id={item.id}
                      title={item.title}
                      image={item.images?.[0] || "/placeholder-exit.jpg"}
                      marketPrice={`€${item.market_price.toLocaleString('ro-RO')}`}
                      exitPrice={`€${item.exit_price.toLocaleString('ro-RO')}`}
                      discount={item.discount?.toString() || "0"}
                      score={item.deal_score ? item.deal_score / 10 : 9.5}
                      type="auction" 
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. SECȚIUNEA VÂNZĂRI STANDARD & URGENT */}
          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12 border-b-2 border-gray-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-4 h-10 bg-[#FFD100] border-2 border-black"></div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Oportunități de Vânzare</h2>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-3 py-1 rounded-md">{filteredListings.filter(l => normalizeSaleType(l.sale_strategy) !== 'auction').length} Rezultate</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredListings.filter(l => normalizeSaleType(l.sale_strategy) !== 'auction').map((item) => (
                <AdCard 
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.images?.[0] || "/placeholder-exit.jpg"}
                  marketPrice={`€${item.market_price.toLocaleString('ro-RO')}`}
                  exitPrice={`€${item.exit_price.toLocaleString('ro-RO')}`}
                  discount={item.discount?.toString() || "0"}
                  score={item.deal_score ? item.deal_score / 10 : 9.0}
                  type={normalizeSaleType(item.sale_strategy)} 
                />
              ))}
            </div>

            {/* Afișăm un mesaj dacă nu există rezultate pentru filtru */}
            {filteredListings.filter(l => normalizeSaleType(l.sale_strategy) !== 'auction').length === 0 && (
              <div className="text-center py-16 border-[3px] border-dashed border-gray-200 rounded-[2rem] bg-gray-50">
                 <p className="font-black uppercase tracking-widest text-gray-400 italic">Nu s-au găsit oferte de vânzare pentru acest filtru.</p>
                 {activeSub && (
                   <button onClick={() => router.push(`/categorii/${slug}`)} className="mt-4 bg-black text-[#FFD100] px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                     Resetează Filtrul
                   </button>
                 )}
              </div>
            )}
          </section>

          {/* 3. SECȚIUNEA INVESTITORI (CERERI) */}
          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12 border-b-2 border-gray-100 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-4 h-10 bg-black"></div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-black">Capital Disponibil (Investitori)</h2>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-3 py-1 rounded-md">{filteredDemands.length} Rezultate</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredDemands.length > 0 ? filteredDemands.map((demand) => (
                <div key={demand.id} className="bg-white border-[3px] border-black p-8 rounded-[2.5rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col justify-between hover:translate-y-[-5px] transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-8">
                       <span className="bg-black text-[#FFD100] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase italic tracking-widest border border-black">
                        CASH PREGĂTIT
                       </span>
                       <span className="text-[10px] font-black uppercase text-gray-300 italic tracking-widest">ID: {demand.id.split('-')[0]}</span>
                    </div>
                    <h3 className="text-2xl font-black uppercase italic leading-tight mb-4 tracking-tighter">
                      {demand.target_asset}
                    </h3>
                    <p className="text-[13px] font-bold text-gray-600 italic line-clamp-3 leading-relaxed mb-10">
                      &quot;{demand.description}&quot;
                    </p>
                  </div>

                  <div className="mt-4 pt-8 border-t-[3px] border-gray-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Buget Alocat</p>
                    <p className="text-4xl font-black italic tracking-tighter text-black mb-8">
                      €{demand.budget.toLocaleString('ro-RO')}
                    </p>
                    
                    <Link 
                      href={`/trimite-oferta/${demand.id}`} 
                      className="w-full bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-xl font-black uppercase tracking-widest text-[11px] italic hover:bg-black hover:text-[#FFD100] transition-colors shadow-[5px_5px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 block text-center"
                    >
                      Vinde-i Activul Tău
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-16 text-center bg-gray-50 border-[3px] border-dashed border-gray-200 rounded-[2rem]">
                  <p className="font-black uppercase italic text-gray-400">Nicio cerere de cumpărare găsită pentru acest filtru.</p>
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
export default function CategoryPage() {
  return (
    <div className="min-h-screen bg-white pt-20 pb-24 font-sans text-black antialiased">
      <Suspense fallback={<div className="py-24 text-center italic font-black text-gray-300 animate-pulse uppercase tracking-widest text-sm">Sincronizare terminal...</div>}>
        <CategoryContent />
      </Suspense>
    </div>
  );
}