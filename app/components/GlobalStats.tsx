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
        // Tragem doar anunțurile active
        const { data: listings } = await supabase
          .from('listings')
          .select('exit_price')
          .eq('status', 'active');
          
        // Tragem doar cererile active
        const { data: demands } = await supabase
          .from('demands')
          .select('budget')
          .eq('status', 'active');

        // Numărăm tranzacțiile finalizate
        const { count: soldCount } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'sold');

        // Calculăm banii reali (dacă arrays sunt goale, dă 0)
        const valoareVanzari = listings ? listings.reduce((acc, curr) => acc + (Number(curr.exit_price) || 0), 0) : 0;
        const valoareCumparari = demands ? demands.reduce((acc, curr) => acc + (Number(curr.budget) || 0), 0) : 0;

        setStats({
          activeListings: listings ? listings.length : 0,
          activeDemands: demands ? demands.length : 0,
          totalValue: valoareVanzari + valoareCumparari,
          soldItems: soldCount || 0
        });

      } catch (error) {
        console.error("Eroare la extragerea statisticilor live:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="w-full bg-black py-16 px-4 font-sans border-t-[6px] border-[#FFD100]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD100] mb-2 italic">Transparență Totală</p>
          <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white">
            Activitatea <span className="text-[#FFD100]">Platformei</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-[#111] border-[3px] border-[#FFD100] rounded-2xl p-6 text-center shadow-[6px_6px_0_0_rgba(255,209,0,1)] hover:-translate-y-2 transition-transform">
            <span className="text-4xl block mb-2">💰</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Valoare Oportunități (Live)</p>
            <p className="text-3xl md:text-4xl font-black italic text-[#FFD100]">
              €{stats.totalValue >= 1000000 ? (stats.totalValue / 1000000).toFixed(1) + 'M' : stats.totalValue.toLocaleString('ro-RO')}
            </p>
          </div>

          <div className="bg-[#111] border-[3px] border-gray-800 rounded-2xl p-6 text-center hover:border-[#FFD100] hover:-translate-y-2 transition-all">
            <span className="text-4xl block mb-2">💼</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Cumpărători cu Cash</p>
            <p className="text-3xl md:text-4xl font-black italic text-white">
              {stats.activeDemands} <span className="text-sm text-gray-500">cereri</span>
            </p>
          </div>

          <div className="bg-[#111] border-[3px] border-gray-800 rounded-2xl p-6 text-center hover:border-[#FFD100] hover:-translate-y-2 transition-all">
            <span className="text-4xl block mb-2">🏷️</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Oportunități de Vânzare</p>
            <p className="text-3xl md:text-4xl font-black italic text-white">
              {stats.activeListings} <span className="text-sm text-gray-500">active</span>
            </p>
          </div>

          <div className="bg-[#111] border-[3px] border-gray-800 rounded-2xl p-6 text-center hover:border-[#FFD100] hover:-translate-y-2 transition-all relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-[#FFD100]/5 group-hover:to-[#FFD100]/20 transition-colors"></div>
            <span className="text-4xl block mb-2">🏆</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Tranzacții Finalizate</p>
            <p className="text-3xl md:text-4xl font-black italic text-green-400">
              {stats.soldItems} <span className="text-sm text-gray-500">produse vândute</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}