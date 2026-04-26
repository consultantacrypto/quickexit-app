"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminHQ() {
  const router = useRouter();
  
  // ⚠️ SCHIMBĂ ASTA CU EMAIL-UL TĂU DE ADMIN!
  // Doar acest email va avea acces la God Mode.
  const MASTER_EMAIL = "consultantacrypto.ro@gmail.com"; 

  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("listings"); 
  
  const [allListings, setAllListings] = useState<any[]>([]);
  const [allDemands, setAllDemands] = useState<any[]>([]);
  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifyAdminAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Verificare de securitate absolută
      if (!user || user.email !== MASTER_EMAIL) {
        router.push("/"); // Îl dăm afară dacă nu e șeful
        return;
      }
      setIsAdmin(true);

      // Tragem absolut tot din baza de date
      const [listingsData, demandsData, offersData] = await Promise.all([
        supabase.from('listings').select('*').order('created_at', { ascending: false }),
        supabase.from('demands').select('*').order('created_at', { ascending: false }),
        supabase.from('listing_offers').select('*').order('created_at', { ascending: false })
      ]);

      if (listingsData.data) setAllListings(listingsData.data);
      if (demandsData.data) setAllDemands(demandsData.data);
      if (offersData.data) setAllOffers(offersData.data);

      setIsLoading(false);
    }
    verifyAdminAndLoad();
  }, [router]);

  // Funcție de Ștergere Absolută (Kill Switch)
  const forceDeleteListing = async (id: string) => {
    const confirm = window.confirm("EȘTI SIGUR? Această acțiune șterge definitiv anunțul din baza de date.");
    if (!confirm) return;
    
    await supabase.from('listings').delete().eq('id', id);
    setAllListings(allListings.filter(l => l.id !== id));
  };

  const forceDeleteDemand = async (id: string) => {
    const confirm = window.confirm("EȘTI SIGUR? Ștergi cererea de capital.");
    if (!confirm) return;
    
    await supabase.from('demands').delete().eq('id', id);
    setAllDemands(allDemands.filter(d => d.id !== id));
  };

  if (!isAdmin || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-[#FFD100] font-black uppercase tracking-widest animate-pulse">AUTENTIFICARE HQ...</p>
      </div>
    );
  }

  // Calculăm metricile platformei
  const totalMarketValue = allListings.reduce((acc, curr) => acc + (curr.market_price || 0), 0);
  const totalCapitalAvailable = allDemands.reduce((acc, curr) => acc + (curr.budget || 0), 0);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#FFD100] selection:text-black">
      <div className="max-w-7xl mx-auto px-4 py-10">
        
        {/* HEADER GOD MODE */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b-4 border-[#FFD100] pb-6 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-red-600 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-white mb-4">
              <span>⚠️</span> GOD MODE ACTIVAT
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-[#FFD100] leading-none">
              QuickExit <span className="text-white">HQ</span>
            </h1>
            <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">
              Control absolut asupra platformei.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-gray-900 border-2 border-gray-800 p-4 rounded-xl text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Capital Căutat</p>
              <p className="text-2xl font-black italic text-[#FFD100]">€{totalCapitalAvailable.toLocaleString('ro-RO')}</p>
            </div>
            <div className="bg-gray-900 border-2 border-gray-800 p-4 rounded-xl text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Valoare Active</p>
              <p className="text-2xl font-black italic text-white">€{totalMarketValue.toLocaleString('ro-RO')}</p>
            </div>
          </div>
        </div>

        {/* CONTROALE TABS */}
        <div className="flex gap-2 mb-8">
          <button onClick={() => setActiveTab("listings")} className={`px-6 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === "listings" ? 'bg-[#FFD100] text-black' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}>
            Toate Activele ({allListings.length})
          </button>
          <button onClick={() => setActiveTab("demands")} className={`px-6 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === "demands" ? 'bg-[#FFD100] text-black' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}>
            Bază Cumpărători ({allDemands.length})
          </button>
          <button onClick={() => setActiveTab("offers")} className={`px-6 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest transition-colors ${activeTab === "offers" ? 'bg-[#FFD100] text-black' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}>
            Radar Oferte ({allOffers.length})
          </button>
        </div>

        {/* TAB 1: LISTINGS (ACTIVE) */}
        {activeTab === "listings" && (
          <div className="overflow-x-auto rounded-xl border-2 border-gray-800">
            <table className="w-full text-left bg-gray-900">
              <thead className="bg-black border-b-2 border-gray-800">
                <tr>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">ID / Data</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Titlu / Categorie</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Exit Price</th>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {allListings.map(listing => (
                  <tr key={listing.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <p className="text-xs font-black text-gray-300">{listing.id.split('-')[0]}</p>
                      <p className="text-[9px] text-gray-500">{new Date(listing.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-[#FFD100]">{listing.title}</p>
                      <p className="text-[10px] uppercase text-gray-400">{listing.category}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${listing.status === 'active' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-black italic">€{listing.exit_price.toLocaleString()}</td>
                    <td className="p-4">
                      <button onClick={() => forceDeleteListing(listing.id)} className="bg-red-900/30 text-red-500 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-colors">
                        KILL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: DEMANDS (CUMPĂRĂTORI) */}
        {activeTab === "demands" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allDemands.map(demand => (
              <div key={demand.id} className="bg-gray-900 border border-gray-800 p-5 rounded-xl relative">
                <button onClick={() => forceDeleteDemand(demand.id)} className="absolute top-4 right-4 text-gray-600 hover:text-red-500 text-lg">✕</button>
                <p className="text-[9px] font-black uppercase text-gray-500 mb-1">{demand.category}</p>
                <h3 className="text-lg font-black text-[#FFD100] leading-tight mb-2">{demand.target_asset}</h3>
                <p className="text-2xl font-black italic mb-4">€{demand.budget.toLocaleString()}</p>
                <p className="text-xs text-gray-400 line-clamp-2">{demand.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: OFERTE TRIMISE (SPIONAJ) */}
        {activeTab === "offers" && (
          <div className="space-y-4">
            {allOffers.map(offer => (
              <div key={offer.id} className="bg-gray-900 border-l-4 border-[#FFD100] p-5 rounded-r-xl flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                    Către Listing ID: <span className="text-gray-300">{offer.listing_id.split('-')[0]}</span>
                  </p>
                  <p className="text-lg font-black italic text-white mb-2">Ofertă: €{offer.offer_price.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">&quot;{offer.message}&quot;</p>
                </div>
                <div className="bg-black p-3 rounded-lg border border-gray-800 md:min-w-[200px]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Contact Trimis</p>
                  <p className="text-xs font-bold text-[#FFD100]">{offer.buyer_phone}</p>
                  <p className="text-xs font-bold text-gray-400">{offer.buyer_email}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}