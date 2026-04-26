"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdCard from "../../components/AdCard";
import Link from "next/link";
// IMPORT GLOBAL NOU
import { normalizeSaleType } from "@/utils/normalizeSaleType";

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [listings, setListings] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categoryMap: Record<string, string> = {
    'auto': 'Auto & Moto',
    'imobiliare': 'Imobiliare',
    'lux': 'Lux & Ceasuri',
    'business': 'Afaceri de vânzare',
    'gadgets': 'Gadgets',
    'foto': 'Foto & Audio'
  };

  const categoryName = categoryMap[slug] || "Categorie Generală";

  useEffect(() => {
    async function fetchCategoryData() {
      setIsLoading(true);
      try {
        const { data: listData } = await supabase
          .from('listings')
          .select('*')
          .eq('category', categoryName)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        const { data: demandData } = await supabase
          .from('demands')
          .select('*')
          .eq('category', categoryName)
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

  return (
    <div className="min-h-screen bg-white pt-20 pb-24 font-sans text-black antialiased">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* HEADER CATEGORIE - BRUTALIST STYLE */}
        <div className="mb-16 border-b-[6px] border-black pb-10">
          <Link href="/" className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black italic mb-4 block transition-colors">
            ← TERMINAL LICHIDITATE
          </Link>
          <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
            {categoryName}
          </h1>
        </div>

        {isLoading ? (
          <div className="py-24 text-center italic font-black text-gray-300 animate-pulse uppercase tracking-widest text-sm">Sincronizare terminal...</div>
        ) : (
          <div className="space-y-28">
            
            {/* 1. SECȚIUNEA LICITAȚII (Bazată pe normalizarea strategiei) */}
            {listings.some(l => normalizeSaleType(l.sale_strategy) === 'auction') && (
              <section>
                <div className="flex items-center gap-4 mb-12">
                  <div className="w-4 h-10 bg-red-600 border-2 border-black animate-pulse"></div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-red-600">Licitații Flash Live</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {listings.filter(l => normalizeSaleType(l.sale_strategy) === 'auction').map((item) => (
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

            {/* 2. SECȚIUNEA VÂNZĂRI STANDARD & URGENT (Celelalte strategii) */}
            <section>
              <div className="flex items-center gap-4 mb-12">
                <div className="w-4 h-10 bg-[#FFD100] border-2 border-black"></div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Oportunități de Vânzare</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {listings.filter(l => normalizeSaleType(l.sale_strategy) !== 'auction').map((item) => (
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
            </section>

            {/* 3. SECȚIUNEA INVESTITORI (CERERI) */}
            <section>
              <div className="flex items-center gap-4 mb-12">
                <div className="w-4 h-10 bg-black"></div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-black">Capital Disponibil (Investitori)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {demands.length > 0 ? demands.map((demand) => (
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
                    <p className="font-black uppercase italic text-gray-300">Nicio cerere de capital în această categorie.</p>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}