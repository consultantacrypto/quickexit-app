"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdCard from "../components/AdCard";
import { normalizeSaleType } from "@/utils/normalizeSaleType";
import { Wallet, Inbox, ShieldCheck, Activity, PlusCircle, Search, Settings, Power, Play } from "lucide-react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const paymentStatus = searchParams.get("payment");
  const listingId = searchParams.get("listing");

  const [activeTab, setActiveTab] = useState('portofoliu');
  const [myListings, setMyListings] = useState<any[]>([]);
  
  // STATE NOU PENTRU OFERTELE DIN NEGOCIERE
  const [myOffers, setMyOffers] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    fetchMyListingsAndOffers();
    if (paymentStatus === "success" && listingId) {
      activateWithExpiry(listingId);
    }
  }, [paymentStatus, listingId]);

  // FUNCȚIE MODIFICATĂ: Extrage anunțurile și ofertele pentru ele
  const fetchMyListingsAndOffers = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // 1. Tragem Anunțurile
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      setMyListings(listings || []);

      // 2. Tragem Ofertele (dacă există anunțuri)
      if (listings && listings.length > 0) {
        const listingIds = listings.map(l => l.id);
        const { data: offers } = await supabase
          .from('listing_offers')
          .select('*')
          .in('listing_id', listingIds)
          .order('created_at', { ascending: false });
          
        setMyOffers(offers || []);
      }
    } catch (error) {
      console.error("Eroare preluare date:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const activateWithExpiry = async (id: string) => {
    setIsActivating(true);
    try {
      const { data: listing } = await supabase
        .from('listings')
        .select('sale_strategy')
        .eq('id', id)
        .single();
        
      const pachet = listing?.sale_strategy || 'economy';

      const expiryDate = new Date();
      if (pachet === 'urgent') {
        expiryDate.setHours(expiryDate.getHours() + 48);
      } else if (pachet === 'licitatie') {
        expiryDate.setHours(expiryDate.getHours() + 24);
      } else if (pachet === 'standard') {
        expiryDate.setDate(expiryDate.getDate() + 14);
      } else {
        expiryDate.setDate(expiryDate.getDate() + 30);
      }

      const { error } = await supabase
        .from('listings')
        .update({ 
          status: 'active',
          expires_at: expiryDate.toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
      
      router.replace('/dashboard', { scroll: false });
      fetchMyListingsAndOffers(); // Modificat aici
    } catch (error) {
      console.error("Eroare la activare:", error);
    } finally {
      setIsActivating(false);
    }
  };

  const toggleStatus = async (item: any) => {
    const newStatus = item.status === 'active' ? 'suspended' : 'active';
    
    if (newStatus === 'active') {
      if (item.expires_at && new Date() > new Date(item.expires_at)) {
        alert("⚠️ Perioada plătită a expirat! Trebuie să reînnoiești pachetul pentru a reactiva acest anunț.");
        return;
      }
    }

    const { error } = await supabase
      .from('listings')
      .update({ status: newStatus })
      .eq('id', item.id);

    if (!error) fetchMyListingsAndOffers(); // Modificat aici
    else alert("Eroare status. Ai rulat codul SQL în Supabase? Mesaj eroare: " + error.message);
  };

  // FUNCȚIE NOUĂ: Acceptă / Refuză oferta
  const handleOfferAction = async (offerId: string, action: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('listing_offers')
      .update({ status: action })
      .eq('id', offerId);

    if (!error) {
      // Actualizăm starea vizuală a ofertei direct în interfață
      setMyOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: action } : o));
    } else {
      alert("Eroare la actualizarea ofertei: " + error.message);
    }
  };

  const valoareTotala = myListings.reduce((sum, item) => sum + (item.exit_price || 0), 0);
  
  // CALCULĂM CÂTE OFERTE SUNT NECITITE SAU NE-ACȚIONATE
  const newOffersCount = myOffers.filter(o => o.status === 'new' || o.status === 'accepted_exit_price').length;

  return (
    <div className="max-w-[1200px] mx-auto min-h-screen pb-20">
      
      {/* HEADER COMPACT */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b-2 border-black pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
            CENTRU DE <span className="text-[#FFD100]">COMANDĂ</span>
          </h1>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-1 italic">Monitorizare Portofoliu QuickExit</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <button onClick={() => router.push('/pune-anunt')} className="bg-black text-[#FFD100] px-4 py-3 rounded-lg font-black uppercase text-[9px] italic border-2 border-black shadow-[3px_3px_0_0_rgba(255,209,0,1)] hover:-translate-y-px hover:shadow-none transition-all flex items-center justify-center gap-2">
            <PlusCircle size={14} /> Pune Anunț Vânzare
          </button>
          <button onClick={() => router.push('/pune-cerere')} className="bg-white text-black px-4 py-3 rounded-lg font-black uppercase text-[9px] italic border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-px hover:shadow-none transition-all flex items-center justify-center gap-2">
            <Search size={14} /> Pune Cerere Cumpărare
          </button>
        </div>
      </div>

      {/* KPI-URI COMPACTE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          <span className="text-[8px] font-black uppercase text-gray-400 block mb-1">Valoare Portofoliu</span>
          <p className="text-xl font-black italic">€{valoareTotala.toLocaleString('ro-RO')}</p>
        </div>
        <div className="bg-black text-white border-2 border-black p-4 rounded-xl shadow-[3px_3px_0_0_rgba(255,209,0,1)]">
          <span className="text-[8px] font-black uppercase text-gray-500 block mb-1">Status Active</span>
          <p className="text-xl font-black italic text-[#FFD100]">{myListings.filter(i => i.status === 'active').length} Live</p>
        </div>
        <div className="hidden md:flex bg-white border-2 border-black p-4 rounded-xl items-center justify-center gap-2 shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
           <ShieldCheck className="w-5 h-5 text-gray-300" />
           <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest italic">KYC Inactiv</span>
        </div>
        <div onClick={() => router.push('/profil')} className="bg-[#FFD100] border-2 border-black p-4 rounded-xl flex items-center justify-center cursor-pointer hover:bg-black hover:text-[#FFD100] transition-all shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
           <Settings size={16} />
           <span className="text-[9px] font-black uppercase ml-2 italic">Setări Cont</span>
        </div>
      </div>

      {/* TAB-URI NAVIGARE - MODIFICAT PENTRU NOTIFICĂRI */}
      <div className="flex gap-2 mb-8 border-b border-gray-200 pb-2">
        <button onClick={() => setActiveTab('portofoliu')} className={`px-4 py-2 rounded-md font-black uppercase text-[10px] tracking-widest italic transition-colors ${activeTab === 'portofoliu' ? 'bg-black text-[#FFD100]' : 'text-gray-400 hover:text-black'}`}>
          Portofoliu
        </button>
        <button onClick={() => setActiveTab('oferte')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-black uppercase text-[10px] tracking-widest italic transition-colors ${activeTab === 'oferte' ? 'bg-black text-[#FFD100]' : 'text-gray-400 hover:text-black'}`}>
          Cameră Negociere
          {newOffersCount > 0 && (
            <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[8px] animate-pulse">{newOffersCount} Noi</span>
          )}
        </button>
      </div>

      {/* TAB PORTOFOLIU (Neschimbat, preluat exact din fișierul tău) */}
      {activeTab === 'portofoliu' && (
        <div className="animate-in fade-in duration-500">
          {isActivating && (
            <div className="bg-[#FFD100] p-4 rounded-xl border-2 border-black mb-8 animate-pulse flex items-center justify-center gap-3">
               <span className="text-xl">⚡</span>
               <p className="font-black uppercase italic text-black text-[10px]">Sincronizare terminal... Activul devine public.</p>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-gray-100 h-64 rounded-xl border-2 border-black"></div>)}
            </div>
          ) : myListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myListings.map(item => (
                <div key={item.id} className="relative group flex flex-col">
                  {/* Badge Dinamic de Status */}
                  <div className={`absolute -top-3 -right-3 z-20 px-3 py-1.5 font-black uppercase italic text-[9px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] border-2 border-black ${item.status === 'active' ? 'bg-green-500 text-black' : item.status === 'suspended' ? 'bg-gray-400 text-white' : 'bg-red-600 text-white'}`}>
                    {item.status === 'active' ? '✓ LIVE' : item.status === 'suspended' ? '⏸ OPRIT' : 'NEPLĂTIT'}
                  </div>

                  <div className={`transition-all flex-grow ${item.status !== 'active' ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                    <AdCard
                      id={item.id}
                      title={item.title}
                      image={item.images?.[0] || "/placeholder-exit.jpg"}
                      marketPrice={`€${item.market_price?.toLocaleString('ro-RO')}`}
                      exitPrice={`€${item.exit_price?.toLocaleString('ro-RO')}`}
                      discount={item.discount?.toString() || "0"}
                      score={item.deal_score ? item.deal_score / 10 : 9.0}
                      type={normalizeSaleType(item.sale_strategy)}
                    />
                  </div>

                  {/* ACTIUNI REALE: EDITARE SI START/STOP */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => router.push(`/editeaza-anunt/${item.id}`)}
                      className="bg-white border-2 border-black py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black hover:text-[#FFD100] transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-px active:shadow-none"
                    >
                      Editează Detalii
                    </button>
                    
                    {item.status === 'pending_payment' ? (
                      <button className="bg-gray-100 border-2 border-gray-300 py-2.5 rounded-lg text-[9px] font-black uppercase text-gray-400 cursor-not-allowed">
                        Așteaptă Plata
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleStatus(item)}
                        className={`border-2 border-black py-2.5 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-px active:shadow-none ${item.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-green-400 text-black hover:bg-green-500'}`}
                      >
                        {item.status === 'active' ? <><Power size={12}/> Oprește</> : <><Play size={12}/> Repune Live</>}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-16 flex flex-col items-center justify-center text-center rounded-3xl border-2 border-dashed border-gray-300">
              <Wallet className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="text-xl font-black uppercase italic mb-2">Portofoliu Inactiv</h3>
              <p className="font-bold text-gray-400 uppercase tracking-widest text-[9px] mb-8">Nu ai adăugat niciun activ pentru lichidare.</p>
              <button onClick={() => router.push('/pune-anunt')} className="bg-[#FFD100] text-black border-2 border-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-none transition-all">
                Lichidează Primul Activ
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB OFERTE (Deal Room) - ACUM IMPLEMENTAT CU DATE REALE */}
      {activeTab === 'oferte' && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-500">
          <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-200 pb-4">
            <Inbox className="w-8 h-8 md:w-10 md:h-10 text-[#FFD100]" />
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">Cameră de <span className="text-[#FFD100]">Negociere</span></h2>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aici primești ofertele cash de la investitori.</p>
            </div>
          </div>

          {isLoading ? (
             <div className="text-center py-20 animate-pulse font-black uppercase tracking-widest text-xs text-gray-400">Sincronizare mesaje...</div>
          ) : myOffers.length > 0 ? (
            <div className="space-y-6">
              {myOffers.map(offer => {
                // Găsim detaliile anunțului asociat ofertei curente
                const listing = myListings.find(l => l.id === offer.listing_id); 
                
                return (
                  <div key={offer.id} className={`bg-white border-[3px] border-black rounded-[2rem] p-6 md:p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative overflow-hidden transition-all ${offer.status === 'rejected' ? 'opacity-60 grayscale' : ''}`}>
                    
                    {/* Badge Status Explicit */}
                    <div className={`absolute top-0 right-0 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-bl-xl border-b-[3px] border-l-[3px] border-black ${offer.status === 'new' ? 'bg-[#FFD100] text-black animate-pulse' : offer.status === 'accepted_exit_price' ? 'bg-red-600 text-white animate-pulse' : offer.status === 'accepted' ? 'bg-green-500 text-black' : 'bg-gray-200 text-gray-500'}`}>
                      {offer.status === 'new' ? 'Ofertă Nouă' : offer.status === 'accepted_exit_price' ? 'A Acceptat Prețul' : offer.status === 'accepted' ? 'Ofertă Acceptată' : 'Ofertă Refuzată'}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                      
                      {/* Coloana de Detalii Ofertă */}
                      <div className="lg:col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 italic">Pentru Activul:</p>
                        <p className="text-xl md:text-2xl font-black uppercase italic tracking-tight mb-6">{listing?.title || "Activ Nelistat/Șters"}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 md:gap-8 mb-6">
                           <div>
                             <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Oferta Primită (Cash):</p>
                             <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-black leading-none">
                               €{offer.offer_price?.toLocaleString('ro-RO')}
                             </p>
                           </div>
                           {listing?.exit_price && (
                             <div className="bg-gray-50 border-[3px] border-black px-4 py-3 rounded-xl text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                               <p className="text-[8px] font-black uppercase text-gray-400 mb-1">Prețul tău afișat</p>
                               <p className="text-lg font-black italic text-gray-500 line-through">€{listing.exit_price.toLocaleString('ro-RO')}</p>
                             </div>
                           )}
                        </div>

                        <div className="bg-gray-50 p-5 rounded-xl border-[3px] border-gray-100 mb-4">
                          <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Mesajul Cumpărătorului:</p>
                          <p className="text-sm font-bold italic text-gray-700 leading-relaxed">&quot;{offer.message || "Sunt interesat să cumpăr."}&quot;</p>
                        </div>
                      </div>

                      {/* Coloana de Acțiuni și Contact */}
                      <div className="lg:col-span-1 border-t-[3px] lg:border-t-0 lg:border-l-[3px] border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col h-full justify-between">
                        <div className="mb-6">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Contact Direct:</p>
                          <a href={`tel:${offer.buyer_phone}`} className="flex items-center justify-center gap-2 bg-black text-[#FFD100] px-4 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-[4px_4px_0_0_rgba(255,209,0,1)] hover:scale-105 active:translate-y-1 active:shadow-none transition-all mb-3 w-full border-2 border-black">
                            📞 Sună Cumpărătorul
                          </a>
                          {offer.buyer_email && (
                            <a href={`mailto:${offer.buyer_email}`} className="block text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-black">
                              ✉️ {offer.buyer_email}
                            </a>
                          )}
                          <p className="text-center font-black text-xl italic mt-3">{offer.buyer_phone}</p>
                        </div>

                        {offer.status === 'new' || offer.status === 'accepted_exit_price' ? (
                          <div className="grid grid-cols-2 gap-3 mt-auto">
                            <button onClick={() => handleOfferAction(offer.id, 'accepted')} className="bg-white border-[3px] border-black text-black py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-green-400 hover:border-green-400 transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
                              Accept Oferta
                            </button>
                            <button onClick={() => handleOfferAction(offer.id, 'rejected')} className="bg-gray-50 border-[3px] border-transparent text-gray-400 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-colors">
                              Refuză
                            </button>
                          </div>
                        ) : (
                          <div className="text-center mt-auto border-t-2 border-gray-100 pt-4">
                             <span className={`text-[10px] font-black uppercase tracking-widest ${offer.status === 'accepted' ? 'text-green-600' : 'text-gray-400'}`}>
                               {offer.status === 'accepted' ? '✓ Ai acceptat această ofertă' : '✕ Ofertă închisă / Refuzată'}
                             </span>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-16 flex flex-col items-center justify-center text-center rounded-[3rem] border-[4px] border-dashed border-gray-200 shadow-sm">
               <Inbox className="w-20 h-20 text-gray-200 mb-6" />
               <h2 className="text-3xl font-black uppercase italic mb-3 tracking-tighter text-gray-400">Nicio ofertă momentan</h2>
               <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest max-w-sm leading-relaxed">
                 Ofertele primite pentru activele tale listate vor apărea aici. Rămâi pe recepție.
               </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen font-sans text-black selection:bg-[#FFD100] antialiased">
      <Suspense fallback={<div className="text-center font-black uppercase text-[10px] tracking-widest mt-20 animate-pulse">Sincronizare Terminal Securizat...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}