"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CapitalDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");
  
  // State-uri pentru datele reale
  const [demands, setDemands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extragem cererile live din Supabase
  useEffect(() => {
    async function fetchDemands() {
      try {
        const { data, error } = await supabase
          .from('demands')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

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
  const filteredBuyers = demands.filter(buyer => {
    const asset = buyer.target_asset || "";
    const desc = buyer.description || "";
    
    const matchesSearch = asset.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Toate" || buyer.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 font-sans text-black selection:bg-black selection:text-[#FFD100]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        
        <div className="mb-12">
          <Link href="/" className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] italic border-b-[3px] border-black pb-1 hover:text-[#FFD100] hover:border-[#FFD100] transition-all">
            ← Înapoi Acasă
          </Link>
          
          <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-4">
                Oferte <span className="text-[#FFD100] underline decoration-black decoration-[4px] underline-offset-4">Cumpărători</span>
              </h1>
              <p className="text-base md:text-lg font-bold text-gray-600 max-w-xl italic">
                Aici sunt ofertele de la cumpărători ce au capital pregătit. Verifică cererile, vezi bugetele și trimite-le oferta ta.
              </p>
            </div>
            <Link href="/posteaza-cerere">
              <button className="bg-black text-[#FFD100] px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm italic hover:scale-105 transition-transform shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none whitespace-nowrap">
                + Adaugă o Ofertă de Cumpărare
              </button>
            </Link>
          </div>
        </div>

        {/* Panoul de Comandă / Filtre */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border-[3px] border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] mb-16 flex flex-col md:flex-row gap-4 items-center z-20 relative">
          
          <div className="w-full md:w-1/2 relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            <input 
              type="text" 
              placeholder="CAUTĂ (EX: MERCEDES, TEREN, ROLEX)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-[3px] border-black p-4 pl-14 rounded-xl font-black text-sm italic uppercase focus:outline-none focus:bg-white focus:border-[#FFD100] transition-colors"
            />
          </div>

          <div className="w-full md:w-1/4">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-50 border-[3px] border-black p-4 rounded-xl font-black text-sm italic uppercase focus:outline-none focus:bg-white appearance-none cursor-pointer"
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
          <div className="w-full md:w-1/4 bg-black text-[#FFD100] p-4 rounded-xl border-[3px] border-black flex flex-col justify-center items-center h-full">
             <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Rezultate Filtrare</span>
             <span className="text-2xl font-black italic leading-none">{filteredBuyers.length} Cereri</span>
          </div>

        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="py-24 text-center bg-white border-[3px] border-dashed border-gray-300 rounded-[2rem]">
            <div className="w-16 h-16 border-[6px] border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Scuturăm baza de date...</p>
          </div>
        ) : filteredBuyers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
            {filteredBuyers.map((buyer) => (
              <div key={buyer.id} className="bg-white border-[4px] border-[#FFD100] rounded-[2rem] p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[12px_12px_0_0_rgba(0,0,0,1)] transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="bg-[#FFD100] text-black px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest italic border-2 border-black">
                      {buyer.budget >= 100000 ? "FONDURI VERIFICATE" : "CASH PREGĂTIT"}
                    </span>
                    <span className="text-2xl grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">💰</span>
                  </div>
                  
                  <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight leading-none mb-3 text-black">
                    {buyer.target_asset}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      {buyer.category || "General"}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Investitor: <span className="text-black">Investitor Verificat</span>
                    </span>
                  </div>
                  
                  <p className="text-sm font-bold text-gray-600 italic line-clamp-3 leading-relaxed">
                    &quot;{buyer.description}&quot;
                  </p>
                </div>
                
                <div className="mt-8 pt-6 border-t-[3px] border-gray-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Buget Maxim Alocat</p>
                  <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-black mb-8 break-words">
                    €{buyer.budget.toLocaleString('ro-RO')}
                  </p>
                  
                  <Link href={`/trimite-oferta/${buyer.id}`} className="w-full bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] md:text-xs italic hover:bg-black hover:text-[#FFD100] transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 block text-center">
                    Vinde-i Activul Tău
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white border-[3px] border-black rounded-[2rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <span className="text-6xl mb-6 block">🧭</span>
            <h3 className="text-3xl font-black uppercase italic mb-2">Niciun investitor găsit</h3>
            <p className="text-gray-500 font-bold mb-8">Nu am găsit oferte de cumpărare pentru acești termeni.</p>
            <button onClick={() => {setSearchTerm(""); setSelectedCategory("Toate");}} className="bg-black text-[#FFD100] px-8 py-4 rounded-xl font-black uppercase text-xs italic">
              Resetează Filtrele
            </button>
          </div>
        )}
      </div>
    </div>
  );
}