"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("anunturi"); // 'anunturi', 'cereri', 'favorite', 'istoric'
  const [listings, setListings] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/");
        return;
      }

      // Tragem toate anunțurile utilizatorului
      const { data: userListings } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userListings) setListings(userListings);

      // Tragem toate cererile utilizatorului
      const { data: userDemands } = await supabase
        .from('demands')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userDemands) setDemands(userDemands);

      setIsLoading(false);
    }

    loadDashboardData();
  }, [router]);

  // FUNCȚIA DE ȘTAMPILARE (LIVE)
  const markAsSold = async (id: string) => {
    const confirmare = window.confirm("Felicitări! Ești sigur că vrei să marchezi acest activ ca VÂNDUT? Această acțiune nu poate fi anulată.");
    if (!confirmare) return;

    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', id);

      if (error) throw error;

      // Actualizăm UI-ul instantaneu
      setListings(listings.map(item => item.id === id ? { ...item, status: 'sold' } : item));
      setActiveTab("istoric"); // Îl mutăm pe tab-ul de istoric să vadă ștampila
    } catch (err) {
      console.error("Eroare la marcare sold:", err);
      alert("A apărut o eroare la procesarea comenzii.");
    }
  };

  // Filtrăm inteligent pentru tab-uri
  const activeListings = listings.filter(item => item.status === 'active');
  const soldListings = listings.filter(item => item.status === 'sold');
  
  // Calculăm valoarea doar pentru activele care sunt încă la vânzare
  const totalValue = activeListings.reduce((acc, curr) => acc + (curr.exit_price || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black antialiased">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER DASHBOARD */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b-[4px] border-black pb-8 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#FFD100] border-2 border-black px-3 py-1.5 rounded-full mb-4 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse border border-black"></span> 
              <p className="text-[10px] font-black uppercase tracking-widest text-black italic">
                Cont Verificat
              </p>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
              Contul <span className="text-black underline decoration-[#FFD100] decoration-8 underline-offset-4">Meu</span>
            </h1>
            <p className="text-sm font-bold text-gray-500 mt-4 uppercase tracking-widest">
              Gestionează-ți vânzările, ofertele și achizițiile.
            </p>
          </div>
          
          <div className="bg-white border-[3px] border-black p-5 rounded-2xl shadow-[6px_6px_0_0_rgba(0,0,0,1)] min-w-[220px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Valoare Așteptată (Vânzări)</p>
            <p className="text-3xl font-black italic">€{totalValue.toLocaleString('ro-RO')}</p>
          </div>
        </div>

        {/* TABS (Scrollabile pe mobil) */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide">
          <button 
            onClick={() => setActiveTab("anunturi")}
            className={`px-6 py-3.5 rounded-xl font-black uppercase text-[10px] md:text-xs italic transition-all border-[3px] whitespace-nowrap ${activeTab === "anunturi" ? 'bg-black text-[#FFD100] border-black shadow-[4px_4px_0_0_rgba(255,209,0,1)]' : 'bg-white border-gray-200 text-gray-500 hover:border-black shadow-sm'}`}
          >
            Anunțurile Mele ({activeListings.length})
          </button>
          <button 
            onClick={() => setActiveTab("cereri")}
            className={`px-6 py-3.5 rounded-xl font-black uppercase text-[10px] md:text-xs italic transition-all border-[3px] whitespace-nowrap ${activeTab === "cereri" ? 'bg-black text-[#FFD100] border-black shadow-[4px_4px_0_0_rgba(255,209,0,1)]' : 'bg-white border-gray-200 text-gray-500 hover:border-black shadow-sm'}`}
          >
            Oferte de Cumpărare ({demands.length})
          </button>
          <button 
            onClick={() => setActiveTab("favorite")}
            className={`px-6 py-3.5 rounded-xl font-black uppercase text-[10px] md:text-xs italic transition-all border-[3px] whitespace-nowrap ${activeTab === "favorite" ? 'bg-black text-[#FFD100] border-black shadow-[4px_4px_0_0_rgba(255,209,0,1)]' : 'bg-white border-gray-200 text-gray-500 hover:border-black shadow-sm'}`}
          >
            Favorite ({favorites.length})
          </button>
          <button 
            onClick={() => setActiveTab("istoric")}
            className={`px-6 py-3.5 rounded-xl font-black uppercase text-[10px] md:text-xs italic transition-all border-[3px] whitespace-nowrap ${activeTab === "istoric" ? 'bg-black text-[#FFD100] border-black shadow-[4px_4px_0_0_rgba(255,209,0,1)]' : 'bg-white border-gray-200 text-gray-500 hover:border-black shadow-sm'}`}
          >
            Istoric ({soldListings.length})
          </button>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="py-32 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-[4px] border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Se încarcă datele...</p>
          </div>
        ) : (
          <div>
            {/* 1. ANUNȚURILE MELE (Active) */}
            {activeTab === "anunturi" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeListings.length === 0 ? (
                  <div className="col-span-full py-24 text-center bg-white border-[3px] border-dashed border-gray-300 rounded-[2rem]">
                    <span className="text-6xl mb-4 block opacity-50">🏷️</span>
                    <h3 className="text-2xl font-black uppercase italic mb-2 text-black">Niciun anunț activ</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Nu ai pus nimic la vânzare încă.</p>
                    <Link href="/pune-anunt">
                      <button className="bg-[#FFD100] text-black border-[3px] border-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs italic hover:bg-black hover:text-[#FFD100] transition-colors shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
                        + Vinde Urgent Acum
                      </button>
                    </Link>
                  </div>
                ) : (
                  activeListings.map((item) => (
                    <div key={item.id} className="bg-white border-[3px] border-black rounded-[1.5rem] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col justify-between hover:-translate-y-1 transition-transform group">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-gray-100 text-black px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border-2 border-transparent group-hover:border-black transition-colors">{item.category}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-100 px-2.5 py-1.5 rounded-md border-2 border-green-200">Activ</span>
                        </div>
                        <h3 className="text-xl font-black uppercase italic leading-tight mb-4">{item.title}</h3>
                        
                        <div className="bg-gray-50 p-3 rounded-xl border-2 border-gray-100 mb-4 flex justify-between items-center">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Preț Piață</p>
                            <p className="text-sm font-bold text-gray-600 line-through">€{item.market_price}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Discount Oferit</p>
                            <p className="text-sm font-black text-red-500">-{item.discount}%</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t-[3px] border-gray-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Preț Vânzare (CASH)</p>
                        <p className="text-3xl font-black italic mb-4">€{item.exit_price}</p>
                        
                        <div className="flex gap-2 mb-4">
                          <div className="flex-1 bg-blue-50 border-2 border-blue-100 p-2 rounded-lg text-center">
                            <p className="text-lg font-black text-blue-600">0</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-blue-400">Vizualizări</p>
                          </div>
                          <div className="flex-1 bg-gray-50 border-2 border-gray-200 p-2 rounded-lg text-center relative">
                            <p className="text-lg font-black text-gray-400">0</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Oferte</p>
                          </div>
                        </div>

                        {/* BUTOANE SPLIT: Oferte + Ștampilă */}
                        <div className="flex gap-2">
                          <button className="flex-1 bg-white text-black py-3.5 rounded-xl font-black uppercase tracking-widest text-[9px] italic hover:bg-gray-50 transition-colors border-[3px] border-black">
                            Oferte
                          </button>
                          <button 
                            onClick={() => markAsSold(item.id)}
                            className="flex-1 bg-black text-[#FFD100] py-3.5 rounded-xl font-black uppercase tracking-widest text-[9px] italic hover:bg-gray-800 transition-all border-[3px] border-black shadow-[4px_4px_0_0_rgba(255,209,0,0.5)] active:translate-y-1 active:shadow-none"
                          >
                            ✓ Vândut
                          </button>
                        </div>

                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 2. OFERTE DE CUMPĂRARE (Cereri) */}
            {activeTab === "cereri" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {demands.length === 0 ? (
                  <div className="col-span-full py-24 text-center bg-white border-[3px] border-dashed border-gray-300 rounded-[2rem]">
                    <span className="text-6xl mb-4 block opacity-50">💼</span>
                    <h3 className="text-2xl font-black uppercase italic mb-2 text-black">Nicio ofertă de cumpărare</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Ai bani cash și cauți oportunități? Anunță piața.</p>
                    <Link href="/posteaza-cerere">
                      <button className="bg-black text-[#FFD100] border-[3px] border-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs italic hover:scale-105 transition-transform shadow-[6px_6px_0_0_rgba(255,209,0,1)]">
                        + Lansează O Cerere
                      </button>
                    </Link>
                  </div>
                ) : (
                  demands.map((demand) => (
                    <div key={demand.id} className="bg-white border-[3px] border-black rounded-[1.5rem] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-2xl font-black uppercase italic leading-tight text-black">{demand.target_asset}</h3>
                          <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-100 px-2.5 py-1.5 rounded-md border-2 border-blue-200">Publicat</span>
                        </div>
                        <p className="text-sm font-bold text-gray-500 mb-6 line-clamp-3 leading-relaxed">&quot;{demand.description}&quot;</p>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pt-4 border-t-[3px] border-gray-100 gap-4">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Buget Alocat</p>
                          <p className="text-3xl font-black italic text-black">€{demand.budget}</p>
                        </div>
                        <button className="w-full sm:w-auto bg-gray-100 text-black px-5 py-3 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-gray-200 hover:border-black transition-colors">
                          Modifică
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. FAVORITE */}
            {activeTab === "favorite" && (
              <div className="py-24 text-center bg-white border-[3px] border-black rounded-[2rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-[#FFD100] text-black text-[9px] font-black px-4 py-2 uppercase tracking-widest border-b-[3px] border-l-[3px] border-black rounded-bl-xl">În Curând</div>
                <span className="text-6xl mb-6 block">⭐</span>
                <h3 className="text-2xl font-black uppercase italic mb-2 text-black">Anunțuri Urmărite</h3>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                  Aici vor apărea anunțurile pe care le salvezi. Te vom notifica instant prin SMS când proprietarul le scade prețul.
                </p>
              </div>
            )}

            {/* 4. ISTORIC TRANZACȚII */}
            {activeTab === "istoric" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {soldListings.length === 0 ? (
                  <div className="col-span-full py-24 text-center bg-white border-[3px] border-black rounded-[2rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                    <span className="text-6xl mb-6 block opacity-80">📖</span>
                    <h3 className="text-2xl font-black uppercase italic mb-2 text-black">Istoric Tranzacții</h3>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                      Aici vor apărea tranzacțiile tale finalizate. Momentan nu ai niciun activ marcat ca vândut prin QuickExit.
                    </p>
                  </div>
                ) : (
                  soldListings.map((item) => (
                    <div key={item.id} className="bg-gray-100 border-[3px] border-gray-300 rounded-[1.5rem] p-6 flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest">{item.category}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-black bg-[#FFD100] px-2.5 py-1.5 rounded-md border-2 border-black">Vândut</span>
                        </div>
                        <h3 className="text-xl font-black uppercase italic leading-tight text-gray-600 mb-4 line-through decoration-2 decoration-gray-400">{item.title}</h3>
                      </div>
                      <div className="pt-4 border-t-[3px] border-gray-200 flex justify-between items-end">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Preț Încasat</p>
                          <p className="text-3xl font-black italic text-black">€{item.exit_price}</p>
                        </div>
                        <button className="bg-white text-black px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] border-2 border-gray-300 hover:border-black transition-colors">
                          Vezi Chitanța
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}