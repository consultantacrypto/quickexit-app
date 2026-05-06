"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

export default function CapitalDisponibilClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");

  // State-uri pentru datele reale
  const [demands, setDemands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extragem cererile live din Supabase
  useEffect(() => {
    trackEvent("view_capital_disponibil", { page_path: "/capital-disponibil" });
  }, []);

  useEffect(() => {
    async function fetchDemands() {
      try {
        const { data, error } = await supabase
          .from("demands")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDemands(data || []);
      } catch (error) {
        console.error("Eroare la extragerea cererilor:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDemands();
  }, []);

  // Logica de filtrare în timp real
  const filteredBuyers = demands.filter((buyer) => {
    const asset = buyer.target_asset || "";
    const desc = buyer.description || "";

    const matchesSearch =
      asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Toate" || buyer.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#F7F4EC] pt-8 pb-20 font-sans text-black selection:bg-black selection:text-[#FFD100]">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-10">
          <Link
            href="/"
            className="text-[11px] font-black uppercase tracking-[0.3em] italic border-b-[3px] border-black pb-1 hover:text-[#FFD100] hover:border-[#FFD100] transition-all"
          >
            ← Înapoi Acasă
          </Link>

          <div className="mt-7 bg-black text-white border-[3px] border-black rounded-[2rem] p-6 md:p-8 shadow-[8px_8px_0_0_rgba(255,209,0,1)]">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FFD100] mb-3 italic">
              Capital disponibil
            </p>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-[0.95] mb-4">
              Cumpărători pregătiți{" "}
              <span className="text-[#FFD100]">pentru oportunități reale</span>
            </h1>
            <p className="text-sm md:text-base font-bold text-neutral-200 max-w-3xl italic leading-relaxed">
              Vezi cererile active ale cumpărătorilor care caută active sub prețul
              pieței.
            </p>
            <Link
              href="/posteaza-cerere"
              className="mt-6 inline-block w-full md:w-auto bg-[#FFD100] text-black px-7 py-4 rounded-xl border-[3px] border-black font-black uppercase tracking-widest text-xs italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-white transition-colors text-center"
            >
              Publică cerere de cumpărare
            </Link>
          </div>
        </div>

        {/* Panoul de Comandă / Filtre */}
        <div className="bg-[#FFFCF4] p-6 md:p-7 rounded-[2rem] border-[3px] border-black shadow-[7px_7px_0_0_rgba(255,209,0,1)] mb-14 flex flex-col md:flex-row gap-4 items-center z-20 relative">
          <div className="w-full md:w-1/2 relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">
              🔍
            </span>
            <input
              type="text"
              placeholder="CAUTĂ (EX: MERCEDES, TEREN, ROLEX)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-[3px] border-black p-4 pl-14 rounded-xl font-black text-sm italic uppercase focus:outline-none focus:bg-[#FFFCF4] focus:border-[#FFD100] transition-colors"
            />
          </div>

          <div className="w-full md:w-1/4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border-[3px] border-black p-4 rounded-xl font-black text-sm italic uppercase focus:outline-none focus:bg-[#FFFCF4] appearance-none cursor-pointer"
            >
              <option value="Toate">Toate Categoriile</option>
              <option value="Auto & Moto">Auto & Moto</option>
              <option value="Imobiliare">Imobiliare</option>
              <option value="Lux & Ceasuri">Lux & Ceasuri</option>
              <option value="Afaceri de vânzare">Afaceri de vânzare</option>
              <option value="Gadgets">Gadgets</option>
              <option value="Foto & Audio">Foto & Audio</option>
            </select>
          </div>

          {/* Numărul afișat aici este dinamic (filteredBuyers.length) */}
          <div className="w-full md:w-1/4 bg-black text-[#FFD100] p-4 rounded-xl border-[3px] border-black flex flex-col justify-center items-center h-full shadow-[4px_4px_0_0_rgba(255,209,0,1)]">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/80">
              Rezultate Filtrare
            </span>
            <span className="text-2xl font-black italic leading-none">
              {filteredBuyers.length} Cereri
            </span>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="py-24 text-center bg-white border-[3px] border-dashed border-black/30 rounded-[2rem]">
            <div className="w-16 h-16 border-[6px] border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-neutral-600">
              Scuturăm baza de date...
            </p>
          </div>
        ) : filteredBuyers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredBuyers.map((buyer) => (
              <div
                key={buyer.id}
                className="bg-white border-[3px] border-black rounded-[2rem] p-6 md:p-7 shadow-[6px_6px_0_0_rgba(255,209,0,1)] hover:-translate-y-1 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-[#FFD100] text-black px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest italic border-2 border-black">
                      {buyer.budget >= 100000
                        ? "Capital verificat"
                        : "Capital disponibil"}
                    </span>
                    <span className="text-2xl opacity-70 group-hover:opacity-100 transition-all">
                      💰
                    </span>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight leading-none mb-3 text-black">
                    {buyer.target_asset}
                  </h3>

                  <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-widest bg-[#F7F4EC] px-2 py-1 rounded border border-black/20">
                      {buyer.category || "General"}
                    </span>
                    <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-widest">
                      Status: <span className="text-black">Cerere activă</span>
                    </span>
                  </div>

                  <p className="text-sm font-bold text-neutral-700 italic line-clamp-3 leading-relaxed">
                    &quot;{buyer.description}&quot;
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t-[3px] border-black/10">
                  <p className="text-[11px] font-black uppercase tracking-widest text-neutral-600 mb-1">
                    Buget Maxim Alocat
                  </p>
                  <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-black mb-8 break-words">
                    €{buyer.budget.toLocaleString("ro-RO")}
                  </p>

                  <Link
                    href={`/trimite-oferta/${buyer.id}`}
                    onClick={() =>
                      trackEvent("click_send_demand_offer", {
                        demand_id: buyer.id,
                        category: buyer.category || "unknown",
                      })
                    }
                    className="w-full bg-[#FFD100] border-[3px] border-black text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs italic hover:bg-black hover:text-[#FFD100] transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 block text-center"
                  >
                    Trimite ofertă
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border-[3px] border-black rounded-[2rem] shadow-[7px_7px_0_0_rgba(255,209,0,1)]">
            <span className="text-5xl mb-5 block">🧭</span>
            <h3 className="text-2xl md:text-3xl font-black uppercase italic mb-3">
              Nu există cereri active momentan.
            </h3>
            <p className="text-neutral-700 font-bold mb-8">
              Revino în curând sau publică prima ta cerere de cumpărare.
            </p>
            <Link
              href="/posteaza-cerere"
              className="inline-block w-full sm:w-auto bg-black text-[#FFD100] px-8 py-4 rounded-xl border-[3px] border-black font-black uppercase text-xs italic shadow-[4px_4px_0_0_rgba(255,209,0,1)]"
            >
              Publică prima cerere de cumpărare
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
