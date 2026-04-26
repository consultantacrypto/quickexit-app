"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function GlobalStats() {
  const [stats, setStats] = useState({
    activeListings: 0,
    activeDemands: 0,
    totalValue: 0,
    soldItems: 0
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: listings } = await supabase
          .from('listings')
          .select('exit_price')
          .eq('status', 'active');
          
        const { data: demands } = await supabase
          .from('demands')
          .select('budget')
          .eq('status', 'active');

        const { count: soldCount } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sold');

        const valoareVanzari = listings ? listings.reduce((acc, curr) => acc + (Number(curr.exit_price) || 0), 0) : 0;
        const valoareCumparari = demands ? demands.reduce((acc, curr) => acc + (Number(curr.budget) || 0), 0) : 0;

        setStats({
          activeListings: listings ? listings.length : 0,
          activeDemands: demands ? demands.length : 0,
          totalValue: valoareVanzari + valoareCumparari,
          soldItems: soldCount || 0
        });
      } catch (error) {
        console.error("Eroare la fetch statistici:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <section className="bg-black py-10 md:py-12 border-t-[8px] border-black font-sans z-20 relative">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Structură clară, pe înțelesul tuturor */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0 divide-y-2 md:divide-y-0 md:divide-x-2 divide-gray-800">
          
          {/* 1. Valoare Totală */}
          <div className="flex-1 w-full text-center md:px-6 pt-4 md:pt-0">
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-1 md:mb-2 italic">Valoare Totală Platformă</p>
            <p className="text-4xl md:text-5xl font-black italic text-[#FFD100] tracking-tighter">
              €{stats.totalValue > 0 ? stats.totalValue.toLocaleString('ro-RO') : "..."}
            </p>
            <p className="text-[9px] font-bold text-gray-600 uppercase mt-2 tracking-widest">Bani pregătiți + Bunuri la vânzare</p>
          </div>

          {/* 2. Cumpărători Activi (Demands) */}
          <div className="flex-1 w-full text-center md:px-6 pt-6 md:pt-0">
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-1 md:mb-2 italic">Cumpărători Activi</p>
            <p className="text-3xl md:text-4xl font-black italic text-white tracking-tighter">
              {stats.activeDemands}
            </p>
            <p className="text-[9px] font-bold text-gray-600 uppercase mt-2 tracking-widest">Așteaptă să cumpere cu cash</p>
          </div>

          {/* 3. Anunțuri (Listings) */}
          <div className="flex-1 w-full text-center md:px-6 pt-6 md:pt-0">
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-1 md:mb-2 italic">Anunțuri la Vânzare</p>
            <p className="text-3xl md:text-4xl font-black italic text-white tracking-tighter">
              {stats.activeListings}
            </p>
            <p className="text-[9px] font-bold text-gray-600 uppercase mt-2 tracking-widest">Active disponibile chiar acum</p>
          </div>

          {/* 4. Tranzacții Finalizate */}
          <div className="flex-1 w-full text-center md:px-6 pt-6 md:pt-0 pb-4 md:pb-0">
            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-1 md:mb-2 italic">Vânzări Finalizate</p>
            <p className="text-3xl md:text-4xl font-black italic text-white tracking-tighter">
              {stats.soldItems}
            </p>
            <p className="text-[9px] font-bold text-gray-600 uppercase mt-2 tracking-widest">Tranzacții încheiate cu succes</p>
          </div>

        </div>
      </div>
    </section>
  );
}