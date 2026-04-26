"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("anunturi"); // 'anunturi', 'oferte_primite', 'cererile_mele', 'oferte_catre_cereri', 'istoric'
  const [listings, setListings] = useState<any[]>([]);
  const [demands, setDemands] = useState<any[]>([]);
  const [listingOffers, setListingOffers] = useState<any[]>([]); // Oferte primite la anunțurile mele
  const [demandOffers, setDemandOffers] = useState<any[]>([]);   // Oferte primite la cererile mele de capital
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/");
        return;
      }

      // 1. Tragem anunțurile utilizatorului (listings)
      const { data: userListings } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userListings) {
        setListings(userListings);
        
        // Dacă are anunțuri, tragem ofertele primite pentru ele (listing_offers)
        const listingIds = userListings.map(l => l.id);
        if (listingIds.length > 0) {
          const { data: lOffers } = await supabase
            .from('listing_offers')
            .select('*, listings(title)')
            .in('listing_id', listingIds)
            .order('created_at', { ascending: false });
          
          if (lOffers) setListingOffers(lOffers);
        }
      }

      // 2. Tragem cererile utilizatorului (demands) - ALINIAT CU buyer_id
      const { data: userDemands } = await supabase
        .from('demands')
        .select('*')
        .eq('buyer_id', user.id) // MODIFICAT DIN user_id ÎN buyer_id PENTRU ALINIERE DB
        .order('created_at', { ascending: false });

      if (userDemands) {
        setDemands(userDemands);

        // Dacă are cereri, tragem ofertele primite pentru ele (demand_offers)
        const demandIds = userDemands.map(d => d.id);
        if (demandIds.length > 0) {
          const { data: dOffers } = await supabase
            .from('demand_offers')
            .select('*, demands(target_asset)')
            .in('demand_id', demandIds)
            .order('created_at', { ascending: false });
          
          if (dOffers) setDemandOffers(dOffers);
        }
      }

      setIsLoading(false);
    }

    loadDashboardData();
  }, [router]);

  const activeListings = listings.filter(item => item.status === 'active');
  const soldListings = listings.filter(item => item.status === 'sold');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-[4px] border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Accesăm Terminalul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black antialiased">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b-[4px] border-black pb-8 gap-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
              Dashboard <span className="text-[#FFD100]">Personal</span>
            </h1>
            <p className="text-sm font-bold text-gray-500 mt-4 uppercase tracking-widest">
              Gestionarea activelor și monitorizarea ofertelor în timp real.
            </p>
          </div>
          <div className="flex gap-4">
             <Link href="/pune-anunt" className="bg-black text-[#FFD100] px-6 py-3 rounded-xl font-black uppercase text-xs italic shadow-[4px_4px_0_0_rgba(255,209,0,1)]">Vinde Activ</Link>
             <Link href="/posteaza-cerere" className="bg-[#FFD100] text-black border-[3px] border-black px-6 py-3 rounded-xl font-black uppercase text-xs italic shadow-[4px_4px_0_0_rgba(0,0,0,1)]">Cumpără</Link>
          </div>
        </div>

        {/* TABS SISTEM */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setActiveTab("anunturi")} className={`px-5 py-3 rounded-xl font-black uppercase text-[10px] italic border-[3px] transition-all whitespace-nowrap ${activeTab === "anunturi" ? 'bg-black text-[#FFD100] border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-black'}`}>
            Anunțurile Mele ({activeListings.length})
          </button>
          <button onClick={() => setActiveTab("oferte_primite")} className={`px-5 py-3 rounded-xl font-black uppercase text-[10px] italic border-[3px] transition-all whitespace-nowrap ${activeTab === "oferte_primite" ? 'bg-black text-[#FFD100] border-black shadow-[4px_4px_0_0_rgba(255,209,0,1)]' : 'bg-white text-gray-400 border-gray-200 hover:border-black'}`}>
            Oferte Primite ({listingOffers.length})
          </button>
          <button onClick={() => setActiveTab("cererile_mele")} className={`px-5 py-3 rounded-xl font-black uppercase text-[10px] italic border-[3px] transition-all whitespace-nowrap ${activeTab === "cererile_mele" ? 'bg-black text-[#FFD100] border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-black'}`}>
            Cererile Mele ({demands.length})
          </button>
          <button onClick={() => setActiveTab("oferte_catre_cereri")} className={`px-5 py-3 rounded-xl font-black uppercase text-[10px] italic border-[3px] transition-all whitespace-nowrap ${activeTab === "oferte_catre_cereri" ? 'bg-black text-[#FFD100] border-black shadow-[4px_4px_0_0_rgba(255,209,0,1)]' : 'bg-white text-gray-400 border-gray-200 hover:border-black'}`}>
            Oferte pt. Cereri ({demandOffers.length})
          </button>
        </div>

        {/* 1. ANUNȚURILE MELE */}
        {activeTab === "anunturi" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeListings.length > 0 ? activeListings.map((item) => (
              <div key={item.id} className="bg-white border-[3px] border-black p-6 rounded-2xl shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <div className="flex justify-between mb-4">
                   <span className="text-[9px] font-black uppercase bg-gray-100 px-2 py-1 rounded">{item.category}</span>
                   <span className="text-[9px] font-black uppercase text-green-600">Activ</span>
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">{item.title}</h3>
                <p className="text-3xl font-black italic mb-6">€{item.exit_price.toLocaleString()}</p>
                <div className="flex gap-2">
                   <button onClick={() => setActiveTab("oferte_primite")} className="flex-1 bg-black text-white py-3 rounded-xl font-black uppercase text-[10px] italic">Vezi Oferte</button>
                   <Link href={`/anunt/${item.id}`} className="flex-1 border-[3px] border-black py-3 rounded-xl font-black uppercase text-[10px] italic text-center">Vezi Anunț</Link>
                </div>
              </div>
            )) : <p className="text-gray-400 font-bold italic uppercase text-sm">Nu ai niciun anunț activ.</p>}
          </div>
        )}

        {/* 2. OFERTE PRIMITE */}
        {activeTab === "oferte_primite" && (
          <div className="space-y-4">
            {listingOffers.length > 0 ? listingOffers.map((offer) => (
              <div key={offer.id} className="bg-white border-[4px] border-black p-6 rounded-[2rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <div className="flex gap-2 mb-2">
                    {offer.status === 'new' ? (
                      <span className="bg-[#FFD100] text-black px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 border-black">Ofertă Nouă</span>
                    ) : (
                      <span className="bg-black text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 border-black">🤝 ACCEPTĂ PREȚUL</span>
                    )}
                  </div>
                  <h3 className="text-xl font-black uppercase italic leading-none mb-1">Pentru: {offer.listings?.title}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-4">{new Date(offer.created_at).toLocaleDateString()}</p>
                  <p className="text-sm font-bold text-gray-600 italic leading-relaxed">&quot;{offer.message}&quot;</p>
                </div>
                <div className="bg-gray-50 border-[3px] border-black p-5 rounded-2xl min-w-[240px]">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Preț Oferit</p>
                  <p className="text-3xl font-black italic mb-4">€{offer.offer_price.toLocaleString()}</p>
                  <div className="space-y-1">
                    <p className="text-xs font-black tracking-widest italic">📞 {offer.buyer_phone}</p>
                    {offer.buyer_email && <p className="text-[10px] font-bold text-gray-400">{offer.buyer_email}</p>}
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center border-[3px] border-dashed border-gray-300 rounded-[2rem]">
                <p className="font-black uppercase italic text-gray-400">Nu ai primit încă nicio ofertă pentru activele tale.</p>
              </div>
            )}
          </div>
        )}

        {/* 3. CERERILE MELE DE CAPITAL */}
        {activeTab === "cererile_mele" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {demands.length > 0 ? demands.map((demand) => (
              <div key={demand.id} className="bg-white border-[3px] border-black p-6 rounded-2xl">
                <div className="flex justify-between mb-4">
                   <span className="text-[9px] font-black uppercase bg-gray-100 px-2 py-1 rounded">{demand.category}</span>
                </div>
                <h3 className="text-xl font-black uppercase italic mb-4">{demand.target_asset}</h3>
                <p className="text-2xl font-black italic mb-6">Buget: €{demand.budget.toLocaleString()}</p>
                <button onClick={() => setActiveTab("oferte_catre_cereri")} className="w-full bg-black text-white py-3 rounded-xl font-black uppercase text-[10px] italic">Vezi Oferte Primite</button>
              </div>
            )) : <p className="text-gray-400 font-bold italic uppercase text-sm">Nu ai postat nicio cerere de capital.</p>}
          </div>
        )}

        {/* 4. OFERTE CĂTRE CERERI */}
        {activeTab === "oferte_catre_cereri" && (
          <div className="space-y-4">
            {demandOffers.length > 0 ? demandOffers.map((offer) => (
              <div key={offer.id} className="bg-white border-[4px] border-black p-6 rounded-[2rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <span className="bg-black text-[#FFD100] px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 border-black mb-2 inline-block">Propunere Activ</span>
                  <h3 className="text-xl font-black uppercase italic leading-none mb-4">Către cererea: {offer.demands?.target_asset}</h3>
                  <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-100">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Descriere Activ Propus:</p>
                    <p className="text-sm font-bold text-gray-700 italic leading-relaxed">{offer.asset_description}</p>
                  </div>
                  {offer.message && (
                    <p className="mt-4 text-xs font-bold text-gray-400 uppercase italic tracking-widest">&quot;{offer.message}&quot;</p>
                  )}
                </div>
                <div className="bg-[#FFD100]/10 border-[3px] border-black p-5 rounded-2xl min-w-[240px]">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Preț Solicitat</p>
                  <p className="text-3xl font-black italic mb-4">€{offer.offer_price.toLocaleString()}</p>
                  <div className="space-y-1">
                    <p className="text-xs font-black tracking-widest italic">📞 {offer.seller_phone}</p>
                    {offer.seller_email && <p className="text-[10px] font-bold text-gray-400">{offer.seller_email}</p>}
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center border-[3px] border-dashed border-gray-300 rounded-[2rem]">
                <p className="font-black uppercase italic text-gray-400">Investitorii nu au primit încă propuneri pentru cererile lor.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}