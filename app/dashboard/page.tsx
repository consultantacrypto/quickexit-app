"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import AdCard from "../components/AdCard";
import { normalizeSaleType } from "@/utils/normalizeSaleType";
import { Wallet, Inbox, PlusCircle, Search, Settings, Power, Play, PiggyBank } from "lucide-react";
// Importul corectat cu calea relativă
import KycBanner from "../components/KycBanner"; 

type DashboardTab = "portofoliu" | "cumparari" | "oferte";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const paymentStatus = searchParams.get("payment");
  const listingId = searchParams.get("listing");
  const demandId = searchParams.get("demand");
  const checkoutTypeParam = searchParams.get("type");
  const sessionIdParam = searchParams.get("session_id");
  const listingIdParam = searchParams.get("listingId");
  const demandIdParam = searchParams.get("demandId");
  const tabParam = searchParams.get("tab");
  const getValidTab = (value: string | null): DashboardTab => {
    if (value === "portofoliu" || value === "cumparari" || value === "oferte") {
      return value;
    }
    return "portofoliu";
  };

  const [activeTab, setActiveTab] = useState<DashboardTab>(getValidTab(tabParam));
  
  // Stare pentru profilul utilizatorului (pentru KYC)
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const [myListings, setMyListings] = useState<any[]>([]);
  const [myOffers, setMyOffers] = useState<any[]>([]);
  const [mySentListingOffers, setMySentListingOffers] = useState<any[]>([]);
  const [sentOffersListingMeta, setSentOffersListingMeta] = useState<Record<string, { title: string; category: string | null }>>({});
  
  const [myDemands, setMyDemands] = useState<any[]>([]);
  const [myDemandOffers, setMyDemandOffers] = useState<any[]>([]);
  const [mySentDemandOffers, setMySentDemandOffers] = useState<any[]>([]);
  const [sentDemandMeta, setSentDemandMeta] = useState<Record<string, { targetAsset: string; category: string | null; status: string | null }>>({});
  const [confirmResolvedDemandId, setConfirmResolvedDemandId] = useState<string | null>(null);
  const [demandResolveMessage, setDemandResolveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmSoldOfferId, setConfirmSoldOfferId] = useState<string | null>(null);
  const [confirmCancelledOfferId, setConfirmCancelledOfferId] = useState<string | null>(null);
  const [soldActionMessage, setSoldActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [demandOfferActionMessage, setDemandOfferActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [statusActionMessage, setStatusActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const normalizedTab = getValidTab(tabParam);
    setActiveTab((prev) => (prev === normalizedTab ? prev : normalizedTab));
  }, [tabParam]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "portofoliu") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
  };

  useEffect(() => {
    fetchDashboardData();
    
    if (paymentStatus === "success" || paymentStatus === "success_demand") {
      setIsLoading(true);
      const timer = setTimeout(() => {
        fetchDashboardData();
        router.replace('/dashboard', { scroll: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, listingId, demandId, router]);

  useEffect(() => {
    if (!paymentStatus) return;

    const normalizedType =
      checkoutTypeParam === "listing" || checkoutTypeParam === "demand"
        ? checkoutTypeParam
        : paymentStatus === "success_demand" || demandId || demandIdParam
          ? "demand"
          : "listing";

    const normalizedPayment =
      paymentStatus === "success" || paymentStatus === "success_demand"
        ? "success"
        : paymentStatus === "cancel"
          ? "cancel"
          : null;
    if (!normalizedPayment) return;

    const effectiveListingId = listingIdParam || listingId || undefined;
    const effectiveDemandId = demandIdParam || demandId || undefined;
    const effectiveId = normalizedType === "listing" ? effectiveListingId : effectiveDemandId;
    const searchSignature =
      typeof window !== "undefined" ? window.location.search || "" : "";
    const dedupeKey = [
      "checkout_result",
      normalizedType,
      effectiveId || "no_id",
      sessionIdParam || "no_session",
      normalizedPayment,
      searchSignature || "no_search",
    ].join(":");

    if (typeof window !== "undefined") {
      if (window.sessionStorage.getItem(dedupeKey)) return;
      window.sessionStorage.setItem(dedupeKey, "1");
    }

    const baseParams = {
      source: "dashboard",
      checkout_type: normalizedType,
      status: normalizedPayment,
      session_id: sessionIdParam || undefined,
      payment: normalizedPayment,
      listing_id: effectiveListingId,
      demand_id: effectiveDemandId,
    };

    if (normalizedType === "listing" && normalizedPayment === "success") {
      trackEvent("checkout_listing_success", baseParams);
      return;
    }
    if (normalizedType === "listing" && normalizedPayment === "cancel") {
      trackEvent("checkout_listing_cancel", baseParams);
      return;
    }
    if (normalizedType === "demand" && normalizedPayment === "success") {
      trackEvent("checkout_demand_success", baseParams);
      return;
    }
    if (normalizedType === "demand" && normalizedPayment === "cancel") {
      trackEvent("checkout_demand_cancel", baseParams);
    }
  }, [
    paymentStatus,
    checkoutTypeParam,
    sessionIdParam,
    listingId,
    demandId,
    listingIdParam,
    demandIdParam,
  ]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Salvăm ID-ul și tragem profilul pentru KYC
      setCurrentUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles') 
        .select('*')
        .eq('id', user.id)
        .single();
      setUserProfile(profile);

      // 1. Tragem Anunțurile de Vânzare
      const { data: listings } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      setMyListings(listings || []);

      if (listings && listings.length > 0) {
        const listingIds = listings.map(l => l.id);
        const { data: offers } = await supabase
          .from('listing_offers')
          .select('*')
          .in('listing_id', listingIds)
          .order('created_at', { ascending: false });
        setMyOffers(offers || []);
      } else {
        setMyOffers([]);
      }

      // 2. Tragem Cererile de Cumpărare (Demands)
      const { data: demands } = await supabase
        .from('demands')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      
      setMyDemands(demands || []);

      if (demands && demands.length > 0) {
        const demandIds = demands.map(d => d.id);
        const { data: demandOffers } = await supabase
          .from('demand_offers')
          .select('id, demand_id, offer_price, asset_description, seller_phone, seller_email, status, created_at, images')
          .in('demand_id', demandIds)
          .order('created_at', { ascending: false });
        setMyDemandOffers(demandOffers || []);
      } else {
        setMyDemandOffers([]);
      }

      // 3. Tragem ofertele trimise de user către cereri (seller-side visibility pentru demand offers)
      const { data: sentDemandOffers, error: sentDemandOffersError } = await supabase
        .from('demand_offers')
        .select('id, demand_id, offer_price, status, created_at')
        .eq('seller_user_id', user.id)
        .order('created_at', { ascending: false });

      if (sentDemandOffersError) {
        console.error("Eroare preluare oferte trimise către cereri:", sentDemandOffersError);
        setMySentDemandOffers([]);
        setSentDemandMeta({});
      } else {
        const normalizedSentDemandOffers = sentDemandOffers || [];
        setMySentDemandOffers(normalizedSentDemandOffers);

        const demandIdsFromSent = Array.from(
          new Set(
            normalizedSentDemandOffers
              .map((offer: any) => String(offer?.demand_id || "").trim())
              .filter(Boolean)
          )
        );

        if (demandIdsFromSent.length > 0) {
          const { data: sentDemands, error: sentDemandsError } = await supabase
            .from('demands')
            .select('id, target_asset, category, status')
            .in('id', demandIdsFromSent);

          if (sentDemandsError) {
            console.error("Eroare preluare metadata cereri pentru ofertele trimise:", sentDemandsError);
            setSentDemandMeta({});
          } else {
            const meta = (sentDemands || []).reduce<Record<string, { targetAsset: string; category: string | null; status: string | null }>>(
              (acc, demand: any) => {
                acc[String(demand.id)] = {
                  targetAsset: String(demand.target_asset || "").trim() || "Cerere de cumpărare",
                  category: demand.category || null,
                  status: demand.status || null,
                };
                return acc;
              },
              {}
            );
            setSentDemandMeta(meta);
          }
        } else {
          setSentDemandMeta({});
        }
      }

      // 4. Tragem ofertele trimise de user către listing-urile altora (buyer-side visibility)
      const { data: sentOffers, error: sentOffersError } = await supabase
        .from('listing_offers')
        .select('id, listing_id, offer_price, status, created_at')
        .eq('buyer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (sentOffersError) {
        console.error("Eroare preluare oferte trimise:", sentOffersError);
        setMySentListingOffers([]);
        setSentOffersListingMeta({});
      } else {
        const normalizedSentOffers = sentOffers || [];
        setMySentListingOffers(normalizedSentOffers);

        const sentListingIds = Array.from(
          new Set(
            normalizedSentOffers
              .map((offer: any) => String(offer?.listing_id || "").trim())
              .filter(Boolean)
          )
        );

        if (sentListingIds.length > 0) {
          const { data: sentListings, error: sentListingsError } = await supabase
            .from('listings')
            .select('id, title, category')
            .in('id', sentListingIds);

          if (sentListingsError) {
            console.error("Eroare preluare metadata listing pentru ofertele trimise:", sentListingsError);
            setSentOffersListingMeta({});
          } else {
            const meta = (sentListings || []).reduce<Record<string, { title: string; category: string | null }>>(
              (acc, listing: any) => {
                acc[String(listing.id)] = {
                  title: String(listing.title || "").trim() || "Anunț Quick Exit",
                  category: listing.category || null,
                };
                return acc;
              },
              {}
            );
            setSentOffersListingMeta(meta);
          }
        } else {
          setSentOffersListingMeta({});
        }
      }

    } catch (error) {
      console.error("Eroare preluare date dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (item: any) => {
    const newStatus = item.status === 'active' ? 'suspended' : 'active';
    
    if (newStatus === 'active') {
      if (item.expires_at && new Date() > new Date(item.expires_at)) {
        setStatusActionMessage({
          type: "error",
          text: "Perioada plătită a expirat. Reînnoiește pachetul pentru a reactiva acest anunț.",
        });
        return;
      }
    }

    const { error } = await supabase
      .from('listings')
      .update({ status: newStatus })
      .eq('id', item.id);

    if (!error) {
      setStatusActionMessage({
        type: "success",
        text: "Statusul anunțului a fost actualizat.",
      });
      fetchDashboardData();
    } else {
      setStatusActionMessage({
        type: "error",
        text: "Nu am putut actualiza statusul anunțului. Te rugăm să reîncerci.",
      });
    }
  };

  // Oprim/Pornim Cereri de capital
  const toggleDemandStatus = async (item: any) => {
    const newStatus = item.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase
      .from('demands')
      .update({ status: newStatus })
      .eq('id', item.id);

    if (!error) {
      setStatusActionMessage({
        type: "success",
        text: "Statusul cererii a fost actualizat.",
      });
      fetchDashboardData();
    } else {
      setStatusActionMessage({
        type: "error",
        text: "Nu am putut actualiza statusul cererii. Te rugăm să reîncerci.",
      });
    }
  }

  const markDemandAsResolved = async (demandId: string) => {
    const { data, error } = await supabase
      .from('demands')
      .update({ status: 'resolved' })
      .eq('id', demandId)
      .select('id,status')
      .single();

    if (error || !data?.id || !data?.status) {
      console.error("Eroare marcare cerere ca rezolvată:", {
        demandId,
        errorMessage: error?.message || null,
      });
      setDemandResolveMessage({
        type: "error",
        text: "Nu am putut marca cererea ca rezolvată. Te rugăm să reîncerci.",
      });
      return;
    }

    setMyDemands((prev) =>
      prev.map((demand) =>
        demand.id === demandId ? { ...demand, status: data.status } : demand
      )
    );
    setDemandResolveMessage({
      type: "success",
      text: "Cererea a fost marcată ca rezolvată.",
    });
  };

  const markListingAsSold = async (item: any) => {
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'sold' })
      .eq('id', item.id)
      .select('id,status')
      .single();

    if (error || !data?.id || !data?.status) {
      console.error("Eroare marcare anunț ca vândut:", {
        listingId: item.id,
        errorMessage: error?.message || null,
      });
      setSoldActionMessage({
        type: "error",
        text: "Nu am putut marca anunțul ca vândut. Te rugăm să reîncerci.",
      });
      return;
    }

    setMyListings((prev) =>
      prev.map((listing) =>
        listing.id === item.id ? { ...listing, status: data.status } : listing
      )
    );
    setSoldActionMessage({
      type: "success",
      text: "Anunțul a fost marcat ca vândut.",
    });
  };

  const handleOfferAction = async (offerId: string, action: 'accepted' | 'rejected' | 'cancelled', type: 'listing' | 'demand' = 'listing') => {
    const table = type === 'listing' ? 'listing_offers' : 'demand_offers';
    const matchedOffer =
      type === "listing"
        ? myOffers.find((offer) => offer.id === offerId)
        : myDemandOffers.find((offer) => offer.id === offerId);
    
    const { data: updatedOffer, error } = await supabase
      .from(table)
      .update({ status: action })
      .eq('id', offerId)
      .select('id,status')
      .single();

    if (error || !updatedOffer?.id || !updatedOffer?.status) {
      console.error("Offer status update failed or no row updated", {
        table,
        offerId,
        action,
        errorMessage: error?.message || null,
      });
      if (type === "demand" && (action === "accepted" || action === "rejected")) {
        setDemandOfferActionMessage({
          type: "error",
          text: "Nu am putut actualiza oferta. Te rugăm să reîncerci.",
        });
      }
      if (type === "listing" && action === "cancelled") {
        setSoldActionMessage({
          type: "error",
          text: "Nu am putut actualiza oferta. Te rugăm să reîncerci.",
        });
      }
      return false;
    }

    if (type === 'listing') {
      setMyOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: updatedOffer.status } : o));
    } else {
      setMyDemandOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: updatedOffer.status } : o));
    }

    if (action === "accepted" || action === "rejected") {
      if (type === "demand") {
        setDemandOfferActionMessage({
          type: "success",
          text: action === "accepted" ? "Oferta a fost acceptată." : "Oferta a fost respinsă.",
        });
      }
      trackEvent(action === "accepted" ? "dashboard_offer_accept" : "dashboard_offer_reject", {
        source: "dashboard",
        offer_id: offerId,
        listing_id: type === "listing" ? matchedOffer?.listing_id : undefined,
        demand_id: type === "demand" ? matchedOffer?.demand_id : undefined,
        offer_context: type || "unknown",
        status: updatedOffer.status,
      });
    }
    return true;
  };

  const newOffersCount = myOffers.filter(o => o.status === 'new' || o.status === 'accepted_exit_price').length;
  const newDemandOffersCount = myDemandOffers.filter(o => o.status === 'new').length;
  const totalNotifications = newOffersCount + newDemandOffersCount;

  const kycStatusLabel = (status?: string) => {
    switch (status) {
      case "verified":
        return "Identitate verificată";
      case "pending":
        return "Verificare în așteptare";
      case "processing":
        return "Verificare în procesare";
      case "requires_input":
        return "Verificare de reluat";
      case "canceled":
        return "Verificare anulată";
      default:
        return "Verificare neinițiată";
    }
  };

  const statusLabel = (status?: string) => {
    switch (status) {
      case "active":
        return "Activ";
      case "pending_payment":
        return "Așteaptă plata";
      case "seed":
        return "Index piață";
      case "hidden":
      case "admin_removed":
        return "Ascuns";
      case "new":
        return "În așteptare";
      case "pending":
        return "În așteptare";
      case "suspended":
        return "Suspendat";
      case "sold":
        return "Vândut";
      case "resolved":
        return "Rezolvată";
      default:
        return "În așteptare";
    }
  };

  const sentOfferStatusLabel = (status?: string) => {
    switch (status) {
      case "new":
        return "În așteptare";
      case "accepted":
        return "Acceptată";
      case "rejected":
        return "Respinsă";
      case "accepted_exit_price":
        return "Preț de exit acceptat";
      case "cancelled":
        return "Nefinalizată";
      default:
        return status || "Necunoscut";
    }
  };

  const sentDemandOfferStatusLabel = (status?: string) => {
    switch (status) {
      case "new":
        return "În așteptare";
      case "accepted":
        return "Acceptată";
      case "rejected":
        return "Respinsă";
      case "cancelled":
        return "Nefinalizată";
      default:
        return status || "Necunoscut";
    }
  };

  // Logica de afișare a banner-ului KYC
  const hasItemsInPortfolio = myListings.length > 0 || myDemands.length > 0;
  const needsKyc = userProfile && userProfile.kyc_status !== 'verified' && hasItemsInPortfolio;

  return (
    <div className="max-w-7xl mx-auto min-h-screen pb-20 overflow-x-hidden">
      {statusActionMessage && (
        <div className={`mb-4 rounded-xl border-2 px-4 py-3 text-sm font-black ${statusActionMessage.type === "success" ? "border-green-700 bg-green-100 text-green-900" : "border-red-700 bg-red-100 text-red-900"}`}>
          {statusActionMessage.text}
        </div>
      )}
      <section className="mb-8 border-[3px] border-black bg-black text-white rounded-[2rem] px-5 md:px-8 py-6 md:py-8 shadow-[8px_8px_0_0_rgba(255,209,0,1)]">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD100] mb-3">Dashboard</p>
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight leading-tight">
              Centrul tău <span className="inline-block bg-[#FFD100] text-black px-2 py-1 rounded-md">Quick Exit</span>
            </h1>
            <p className="text-sm md:text-base text-neutral-200 mt-3">
              Urmărește anunțurile, cererile, ofertele și verificarea contului tău.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button onClick={() => router.push('/pune-anunt')} className="bg-[#FFD100] text-black px-4 py-3 rounded-lg font-black uppercase text-xs border-[3px] border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-px hover:shadow-none transition-all flex items-center justify-center gap-2">
              <PlusCircle size={14} /> Publică anunț
            </button>
            <button onClick={() => router.push('/posteaza-cerere')} className="bg-white text-black px-4 py-3 rounded-lg font-black uppercase text-xs border-[3px] border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:-translate-y-px hover:shadow-none transition-all flex items-center justify-center gap-2">
              <Search size={14} /> Publică cerere
            </button>
          </div>
        </div>
      </section>

      <div className="bg-[#FDFCF8] border-[3px] border-black rounded-2xl p-4 md:p-5 shadow-[5px_5px_0_0_rgba(255,209,0,0.75)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-1">Status cont</p>
            <p className="text-lg font-black italic">{kycStatusLabel(userProfile?.kyc_status)}</p>
            <p className="text-sm text-neutral-700 mt-1">Verificarea identității ajută la protejarea cumpărătorilor și vânzătorilor.</p>
          </div>
          <button onClick={() => router.push('/profil')} className="bg-white border-[3px] border-black px-4 py-3 rounded-xl font-black uppercase text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:bg-black hover:text-[#FFD100] transition-all inline-flex items-center justify-center gap-2">
            <Settings size={16} /> Setări cont
          </button>
        </div>
      </div>

      {/* Randăm Banner-ul KYC DOAR dacă are elemente în portofoliu și nu e verificat */}
      {!isLoading && needsKyc && (
        <KycBanner 
          userId={currentUserId} 
          kycStatus={userProfile.kyc_status || 'unverified'} 
        />
      )}

      {/* KPI-URI COMPACTE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border-[3px] border-black p-4 rounded-xl shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          <span className="text-xs font-black uppercase text-neutral-600 block mb-1">Anunțuri active</span>
          <p className="text-2xl font-black italic">{myListings.filter(l => l.status === "active").length}</p>
        </div>
        <div className="bg-white border-[3px] border-black p-4 rounded-xl shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          <span className="text-xs font-black uppercase text-neutral-600 block mb-1">Cereri active</span>
          <p className="text-2xl font-black italic">{myDemands.filter(d => d.status === "active").length}</p>
        </div>
        <div className="bg-white border-[3px] border-black p-4 rounded-xl shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          <span className="text-xs font-black uppercase text-neutral-600 block mb-1">Oferte primite</span>
          <p className="text-2xl font-black italic">{myOffers.length + myDemandOffers.length}</p>
        </div>
        <div className="bg-[#FDFCF8] border-[3px] border-black p-4 rounded-xl shadow-[3px_3px_0_0_rgba(255,209,0,0.8)]">
          <span className="text-xs font-black uppercase text-neutral-600 block mb-1">Verificare cont</span>
          <p className="text-sm font-black">{kycStatusLabel(userProfile?.kyc_status)}</p>
        </div>
      </div>

      {/* TAB-URI NAVIGARE */}
      <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-black/20 pb-3">
        <button onClick={() => handleTabChange('portofoliu')} className={`px-4 py-2 rounded-md font-black uppercase text-xs transition-colors border-2 border-black ${activeTab === 'portofoliu' ? 'bg-black text-[#FFD100]' : 'bg-white text-neutral-700 hover:text-black'}`}>
          Activele Mele (Vânzare)
        </button>
        <button onClick={() => handleTabChange('cumparari')} className={`px-4 py-2 rounded-md font-black uppercase text-xs transition-colors border-2 border-black ${activeTab === 'cumparari' ? 'bg-black text-[#FFD100]' : 'bg-white text-neutral-700 hover:text-black'}`}>
          Oferte Cumpărare
        </button>
        <button onClick={() => handleTabChange('oferte')} className={`flex items-center gap-2 px-4 py-2 rounded-md font-black uppercase text-xs transition-colors border-2 border-black ${activeTab === 'oferte' ? 'bg-black text-[#FFD100]' : 'bg-white text-neutral-700 hover:text-black'}`}>
          Cameră Negociere
          {totalNotifications > 0 && (
            <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs animate-pulse">{totalNotifications} Noi</span>
          )}
        </button>
      </div>

      {/* TAB PORTOFOLIU (Vânzări) */}
      {activeTab === 'portofoliu' && (
        <div className="animate-in fade-in duration-500">
          {isLoading && paymentStatus ? (
             <div className="bg-[#FFD100] p-4 rounded-xl border-2 border-black mb-8 animate-pulse flex items-center justify-center gap-3">
               <span className="text-xl">⚡</span>
               <p className="font-black uppercase italic text-black text-xs">Așteptăm confirmarea plății. Te rugăm să aștepți...</p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-[#FDFCF8] h-64 rounded-xl border-[3px] border-black"></div>)}
            </div>
          ) : myListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myListings.map(item => (
                <div key={item.id} className="relative group flex flex-col">
                  {/* Badge Dinamic de Status */}
                  <div className={`absolute -top-3 -right-3 z-20 px-3 py-1.5 font-black uppercase text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] border-2 border-black ${item.status === 'active' ? 'bg-green-500 text-black' : item.status === 'suspended' ? 'bg-neutral-400 text-white' : item.status === 'sold' ? 'bg-black text-[#FFD100]' : 'bg-red-600 text-white'}`}>
                    {statusLabel(item.status)}
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

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => router.push(`/editeaza-anunt/${item.id}`)}
                      className="bg-white border-2 border-black py-2.5 rounded-lg text-xs font-black uppercase hover:bg-black hover:text-[#FFD100] transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-px active:shadow-none"
                    >
                      Editează Detalii
                    </button>
                    
                    {item.status === 'pending_payment' ? (
                      <button className="bg-[#FDFCF8] border-2 border-neutral-300 py-2.5 rounded-lg text-xs font-black uppercase text-neutral-500 cursor-not-allowed">
                        Așteaptă Plata
                      </button>
                    ) : item.status === 'sold' ? (
                      <button className="bg-[#FDFCF8] border-2 border-neutral-300 py-2.5 rounded-lg text-xs font-black uppercase text-neutral-500 cursor-not-allowed">
                        Anunț vândut
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleStatus(item)}
                        className={`border-2 border-black py-2.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-px active:shadow-none ${item.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-green-400 text-black hover:bg-green-500'}`}
                      >
                        {item.status === 'active' ? <><Power size={12}/> Oprește</> : <><Play size={12}/> Repune Live</>}
                      </button>
                    )}
                  </div>
                  {item.status !== 'pending_payment' && item.status !== 'sold' && (
                    <div className="mt-3">
                      <button
                        onClick={() => markListingAsSold(item)}
                        className="w-full bg-[#FDFCF8] border-2 border-black py-2.5 rounded-lg text-xs font-black uppercase hover:bg-black hover:text-[#FFD100] transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-px active:shadow-none"
                      >
                        Marchează ca vândut
                      </button>
                      <p className="mt-2 text-[11px] font-bold text-neutral-600">
                        Folosește această acțiune doar după ce tranzacția este finalizată între părți.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-16 flex flex-col items-center justify-center text-center rounded-3xl border-2 border-dashed border-gray-300">
              <Wallet className="w-12 h-12 text-neutral-300 mb-4" />
              <h3 className="text-xl font-black uppercase italic mb-2">Portofoliu Inactiv</h3>
              <p className="font-bold text-neutral-700 text-sm mb-8">Nu ai anunțuri active momentan.</p>
              <button onClick={() => router.push('/pune-anunt')} className="bg-[#FFD100] text-black border-[3px] border-black px-8 py-4 rounded-xl font-black uppercase text-xs shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-none transition-all">
                Publică anunț
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CUMPĂRĂRI (Cereri de Capital) */}
      {activeTab === 'cumparari' && (
        <div className="animate-in fade-in duration-500">
          {demandResolveMessage && (
            <div className={`mb-4 rounded-xl border-2 px-4 py-3 text-sm font-black ${demandResolveMessage.type === "success" ? "border-green-700 bg-green-100 text-green-900" : "border-red-700 bg-red-100 text-red-900"}`}>
              {demandResolveMessage.text}
            </div>
          )}
          {isLoading && paymentStatus ? (
             <div className="bg-[#FFD100] p-4 rounded-xl border-2 border-black mb-8 animate-pulse flex items-center justify-center gap-3">
               <span className="text-xl">⚡</span>
               <p className="font-black uppercase italic text-black text-xs">Așteptăm confirmarea plății. Te rugăm să aștepți...</p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-[#FDFCF8] h-48 rounded-xl border-[3px] border-black"></div>)}
            </div>
          ) : myDemands.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myDemands.map(demand => (
                <div key={demand.id} className="bg-white border-[3px] border-black rounded-[2rem] p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] flex flex-col justify-between relative">
                  <div className={`absolute top-0 right-0 px-3 py-1 font-black uppercase text-xs rounded-bl-xl border-b-2 border-l-2 border-black ${demand.status === 'active' ? 'bg-green-500 text-black' : demand.status === 'suspended' ? 'bg-neutral-400 text-white' : 'bg-red-600 text-white'}`}>
                    {statusLabel(demand.status)}
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase text-neutral-600 mb-1 inline-block">{demand.category}</span>
                    <h3 className="text-xl font-black uppercase italic leading-tight mb-4">{demand.target_asset}</h3>
                    <p className="text-xs font-bold text-neutral-600 uppercase mb-1">Buget</p>
                    <p className="text-3xl font-black italic">€{demand.budget?.toLocaleString('ro-RO')}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t-2 border-gray-100">
                    {demand.status === 'pending_payment' ? (
                      <button className="w-full bg-[#FDFCF8] border-2 border-neutral-300 py-3 rounded-lg text-xs font-black uppercase text-neutral-500 cursor-not-allowed">
                        Așteaptă Plata
                      </button>
                    ) : demand.status === 'resolved' ? (
                      <button className="w-full bg-[#FDFCF8] border-2 border-neutral-300 py-3 rounded-lg text-xs font-black uppercase text-neutral-500 cursor-not-allowed">
                        Cerere rezolvată
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleDemandStatus(demand)}
                        className={`w-full border-2 border-black py-3 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-px active:shadow-none ${demand.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-green-400 text-black hover:bg-green-500'}`}
                      >
                        {demand.status === 'active' ? <><Power size={12}/> Oprește Căutarea</> : <><Play size={12}/> Reia Căutarea</>}
                      </button>
                    )}
                    {demand.status !== 'pending_payment' && demand.status !== 'resolved' && (
                      <div className="mt-3">
                        <p className="mb-2 text-[11px] font-bold text-neutral-600 leading-relaxed">
                          Acceptarea unei oferte nu marchează automat cererea ca rezolvată. Marchează cererea ca rezolvată doar după ce tranzacția este finalizată între părți sau dacă nu mai cauți acest tip de achiziție.
                        </p>
                        {confirmResolvedDemandId === demand.id ? (
                          <div className="rounded-xl border-2 border-black bg-[#FDFCF8] p-3">
                            <p className="text-xs font-black text-black">Confirmi că această cerere este rezolvată?</p>
                            <p className="mt-2 text-[11px] font-bold text-neutral-700 leading-relaxed">
                              Cererea va fi scoasă din lista publică de cereri active. Folosește această acțiune doar după ce nu mai cauți acest activ sau după ce ai finalizat cumpărarea direct cu ofertantul.
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-2">
                              <button
                                onClick={() => {
                                  markDemandAsResolved(demand.id);
                                  setConfirmResolvedDemandId(null);
                                }}
                                className="w-full rounded-lg border-[3px] border-black bg-white py-2 text-[11px] font-black uppercase tracking-widest hover:bg-black hover:text-[#FFD100] transition-all"
                              >
                                Da, marchează ca rezolvată
                              </button>
                              <button
                                onClick={() => setConfirmResolvedDemandId(null)}
                                className="w-full rounded-lg border-[3px] border-black bg-[#FDFCF8] py-2 text-[11px] font-black uppercase tracking-widest hover:bg-black hover:text-[#FFD100] transition-all"
                              >
                                Renunță
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmResolvedDemandId(demand.id)}
                            className="w-full rounded-lg border-[3px] border-black bg-white py-2.5 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-[#FFD100] transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-px active:shadow-none"
                          >
                            Marchează ca rezolvată
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="bg-white p-16 flex flex-col items-center justify-center text-center rounded-3xl border-2 border-dashed border-gray-300">
              <PiggyBank className="w-12 h-12 text-neutral-300 mb-4" />
              <h3 className="text-xl font-black uppercase italic mb-2">Fără Capital Listat</h3>
              <p className="font-bold text-neutral-700 text-sm mb-8">Nu ai cereri active momentan.</p>
              <button onClick={() => router.push('/posteaza-cerere')} className="bg-[#FFD100] text-black border-[3px] border-black px-8 py-4 rounded-xl font-black uppercase text-xs shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-none transition-all">
                Publică cerere
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB OFERTE (Deal Room) */}
      {activeTab === 'oferte' && (
        <div className="animate-in fade-in slide-in-from-right-2 duration-500">
          <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-200 pb-4">
            <Inbox className="w-8 h-8 md:w-10 md:h-10 text-[#FFD100]" />
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">Cameră de <span className="text-[#FFD100]">Negociere</span></h2>
              <p className="text-xs font-bold text-neutral-700">Aici primești oferte și contraoferte.</p>
            </div>
          </div>
          <div className="mb-6 rounded-2xl border-2 border-amber-900/30 bg-[#FFF8E7] px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5">
            <div className="max-w-3xl space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-amber-950">
                Siguranță la tranzacții directe
              </p>
              <p className="text-xs font-semibold leading-relaxed text-neutral-900 sm:text-sm">
                Quick Exit nu intermediază plata și nu ține fonduri în custodie. Nu introduce datele cardului în linkuri
                primite de la alți utilizatori.
              </p>
              <p className="text-xs font-semibold leading-relaxed text-neutral-900 sm:text-sm">
                Marchează o tranzacție ca finalizată doar după ce ai verificat direct cu cealaltă parte.
              </p>
              <p className="text-[11px] font-medium leading-relaxed text-neutral-800 sm:text-xs">
                Quick Exit facilitează contactul și negocierea directă între părți. Plata și finalizarea tranzacției se fac
                direct între cumpărător și vânzător.
              </p>
            </div>
          </div>
          {soldActionMessage && (
            <div className={`mb-6 rounded-xl border-2 px-4 py-3 text-sm font-black ${soldActionMessage.type === "success" ? "border-green-700 bg-green-100 text-green-900" : "border-red-700 bg-red-100 text-red-900"}`}>
              {soldActionMessage.text}
            </div>
          )}

          {isLoading ? (
             <div className="text-center py-20 animate-pulse font-black uppercase tracking-widest text-xs text-neutral-600">Sincronizare mesaje...</div>
          ) : (myOffers.length > 0 || myDemandOffers.length > 0 || mySentListingOffers.length > 0 || mySentDemandOffers.length > 0) ? (
            <div className="space-y-12">
              
              {/* SECȚIUNE: Oferte primite pentru Activele Tale (Vânzări) */}
              {myOffers.length > 0 && (
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-widest text-neutral-600 mb-4 border-b-2 border-black inline-block">Oferte Pentru Activele Mele</h3>
                  <div className="space-y-6">
                    {myOffers.map(offer => {
                      const listing = myListings.find(l => l.id === offer.listing_id);
                      const isListingSold = listing?.status === "sold";
                      const isConfirmingSold = confirmSoldOfferId === offer.id;
                      return (
                        <div key={offer.id} className={`bg-white border-[3px] border-black rounded-[2rem] p-6 md:p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative overflow-hidden transition-all ${offer.status === 'rejected' ? 'opacity-60 grayscale' : ''}`}>
                          
                          <div className={`absolute top-0 right-0 px-4 py-2 text-xs font-black uppercase rounded-bl-xl border-b-[3px] border-l-[3px] border-black ${offer.status === 'new' ? 'bg-[#FFD100] text-black animate-pulse' : offer.status === 'accepted_exit_price' ? 'bg-red-600 text-white animate-pulse' : offer.status === 'accepted' ? 'bg-green-500 text-black' : offer.status === 'cancelled' ? 'bg-neutral-800 text-white' : 'bg-neutral-200 text-neutral-600'}`}>
                            {offer.status === 'new' ? 'Ofertă Nouă' : offer.status === 'accepted_exit_price' ? 'A Acceptat Prețul' : offer.status === 'accepted' ? 'Ofertă Acceptată' : offer.status === 'cancelled' ? 'Ofertă Nefinalizată' : 'Ofertă Refuzată'}
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                            
                            <div className="lg:col-span-2">
                              {(() => {
                                const buyerMessage = String(offer.message || "").trim();
                                return (
                                  <div className="bg-[#FDFCF8] p-5 rounded-xl border-[3px] border-neutral-200 mb-4">
                                    <p className="text-xs font-black uppercase text-neutral-600 mb-2">Mesajul cumpărătorului:</p>
                                    <p className="text-sm font-bold italic text-neutral-700 leading-relaxed">
                                      {buyerMessage ? `"${buyerMessage}"` : "Nu a fost furnizat"}
                                    </p>
                                  </div>
                                );
                              })()}
                              <p className="text-xs font-black uppercase text-neutral-600 mb-1">Pentru activul:</p>
                              <p className="text-xl md:text-2xl font-black uppercase italic tracking-tight mb-6">{listing?.title || "Activ Nelistat/Șters"}</p>
                              
                              <div className="flex flex-wrap items-center gap-4 md:gap-8 mb-6">
                                <div>
                                  <p className="text-xs font-black uppercase text-neutral-600 mb-1">Oferta primită:</p>
                                  <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-black leading-none">
                                    €{offer.offer_price?.toLocaleString('ro-RO')}
                                  </p>
                                </div>
                                {listing?.exit_price && (
                                  <div className="bg-[#FDFCF8] border-[3px] border-black px-4 py-3 rounded-xl text-center shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                                    <p className="text-xs font-black uppercase text-neutral-600 mb-1">Prețul tău afișat</p>
                                    <p className="text-lg font-black italic text-neutral-500 line-through">€{listing.exit_price.toLocaleString('ro-RO')}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="lg:col-span-1 border-t-[3px] lg:border-t-0 lg:border-l-[3px] border-gray-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col h-full justify-between">
                              <div className="mb-6">
                                <p className="text-xs font-black uppercase text-neutral-600 mb-3">Contact direct:</p>
                                {String(offer.buyer_phone || "").trim() ? (
                                  <>
                                    <a href={`tel:${offer.buyer_phone}`} className="flex items-center justify-center gap-2 bg-black text-[#FFD100] px-4 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-[4px_4px_0_0_rgba(255,209,0,1)] hover:scale-105 active:translate-y-1 active:shadow-none transition-all mb-3 w-full border-2 border-black">
                                      📞 Sună Cumpărătorul
                                    </a>
                                    <p className="text-center font-black text-xl italic mt-3">{offer.buyer_phone}</p>
                                  </>
                                ) : (
                                  <p className="text-sm font-bold text-neutral-700">Telefon: Nu a fost furnizat</p>
                                )}
                                {String(offer.buyer_email || "").trim() ? (
                                  <a href={`mailto:${offer.buyer_email}`} className="block text-center text-xs font-bold text-neutral-700 hover:text-black mt-2">
                                    ✉️ {offer.buyer_email}
                                  </a>
                                ) : (
                                  <p className="text-sm font-bold text-neutral-700 mt-2">Email: Nu a fost furnizat</p>
                                )}
                                <p className="text-[11px] font-bold text-neutral-600 mt-4 leading-relaxed">
                                  Contactează cumpărătorul doar pentru pașii necesari tranzacției și verifică toate detaliile înainte de plată sau predare.
                                </p>
                                <p className="text-[11px] font-semibold text-neutral-700 mt-2 leading-relaxed">
                                  Nu introduce datele cardului în linkuri primite de la alți utilizatori. Quick Exit nu
                                  îți va cere niciodată datele cardului pentru a primi bani.
                                </p>
                              </div>

                              {offer.status === 'new' || offer.status === 'accepted_exit_price' ? (
                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                  <button onClick={() => handleOfferAction(offer.id, 'accepted', 'listing')} className="bg-white border-[3px] border-black text-black py-3 rounded-xl font-black uppercase text-xs hover:bg-green-400 hover:border-green-400 transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
                                    Acceptă oferta
                                  </button>
                                  <button onClick={() => handleOfferAction(offer.id, 'rejected', 'listing')} className="bg-[#FDFCF8] border-[3px] border-transparent text-neutral-600 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-colors">
                                    Refuză
                                  </button>
                                </div>
                              ) : offer.status === 'accepted' ? (
                                <div className="mt-auto">
                                  <p className="text-xs font-bold text-neutral-600 mb-3 leading-relaxed">
                                    Acceptarea unei oferte nu marchează automat activul ca vândut. Marchează activul ca vândut doar după ce tranzacția este finalizată între părți.
                                  </p>
                                  {isListingSold ? (
                                    <div className="rounded-xl border-2 border-black bg-[#FDFCF8] px-4 py-3">
                                      <p className="text-xs font-black uppercase tracking-wider text-black">
                                        Anunț vândut
                                      </p>
                                    </div>
                                  ) : isConfirmingSold ? (
                                    <div className="rounded-xl border-2 border-black bg-[#FDFCF8] p-4">
                                      <p className="text-sm font-black text-black">Confirmi că activul a fost vândut?</p>
                                      <p className="mt-2 text-xs font-bold text-neutral-700 leading-relaxed">
                                        Anunțul va fi scos din marketplace-ul public. Folosește această acțiune doar după ce tranzacția este finalizată între părți.
                                      </p>
                                      <div className="mt-4 grid grid-cols-1 gap-2">
                                        <button
                                          onClick={() => {
                                            if (!listing) {
                                              setSoldActionMessage({
                                                type: "error",
                                                text: "Nu am putut identifica anunțul asociat ofertei.",
                                              });
                                              setConfirmSoldOfferId(null);
                                              return;
                                            }
                                            markListingAsSold(listing);
                                            setConfirmSoldOfferId(null);
                                          }}
                                          className="w-full bg-white border-[3px] border-black text-black py-2.5 rounded-xl font-black uppercase text-xs hover:bg-black hover:text-[#FFD100] transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
                                        >
                                          Da, marchează ca vândut
                                        </button>
                                        <button
                                          onClick={() => setConfirmSoldOfferId(null)}
                                          className="w-full bg-[#FDFCF8] border-[3px] border-black text-black py-2.5 rounded-xl font-black uppercase text-xs hover:bg-black hover:text-[#FFD100] transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
                                        >
                                          Renunță
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                      <button
                                        onClick={() => setConfirmSoldOfferId(offer.id)}
                                        className="w-full bg-white border-[3px] border-black text-black py-3 rounded-xl font-black uppercase text-xs hover:bg-black hover:text-[#FFD100] transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
                                      >
                                        Marchează ca vândut
                                      </button>
                                      {confirmCancelledOfferId === offer.id ? (
                                        <div className="rounded-xl border-2 border-black bg-[#FDFCF8] p-4">
                                          <p className="text-sm font-black text-black">Confirmi că oferta nu s-a finalizat?</p>
                                          <p className="mt-2 text-xs font-bold text-neutral-700 leading-relaxed">
                                            Oferta va fi marcată ca nefinalizată, iar anunțul va rămâne activ.
                                          </p>
                                          <div className="mt-4 grid grid-cols-1 gap-2">
                                            <button
                                              onClick={async () => {
                                                const updated = await handleOfferAction(offer.id, 'cancelled', 'listing');
                                                setConfirmCancelledOfferId(null);
                                                if (updated) {
                                                  setSoldActionMessage({
                                                    type: "success",
                                                    text: "Oferta a fost marcată ca nefinalizată.",
                                                  });
                                                }
                                              }}
                                              className="w-full bg-white border-[3px] border-black text-black py-2.5 rounded-xl font-black uppercase text-xs hover:bg-black hover:text-[#FFD100] transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
                                            >
                                              Da, marchează ca nefinalizată
                                            </button>
                                            <button
                                              onClick={() => setConfirmCancelledOfferId(null)}
                                              className="w-full bg-[#FDFCF8] border-[3px] border-black text-black py-2.5 rounded-xl font-black uppercase text-xs hover:bg-black hover:text-[#FFD100] transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
                                            >
                                              Renunță
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmCancelledOfferId(offer.id)}
                                          className="w-full bg-[#FDFCF8] border-[3px] border-black text-black py-3 rounded-xl font-black uppercase text-xs hover:bg-black hover:text-[#FFD100] transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"
                                        >
                                          Marchează ca nefinalizată
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center mt-auto border-t-2 border-gray-100 pt-4">
                                  <span className={`text-xs font-black uppercase ${offer.status === 'cancelled' ? 'text-neutral-800' : 'text-neutral-600'}`}>
                                    {offer.status === 'cancelled' ? '↺ Ofertă marcată ca nefinalizată' : '✕ Ofertă închisă / Refuzată'}
                                  </span>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECȚIUNE: Oferte primite pentru cererile mele */}
              {myDemandOffers.length > 0 && (
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-widest text-neutral-600 mb-4 border-b-2 border-black inline-block">Oferte primite pentru cererile mele</h3>
                  {demandOfferActionMessage && (
                    <div className={`mb-4 rounded-xl border-2 px-4 py-3 text-sm font-black ${demandOfferActionMessage.type === "success" ? "border-green-700 bg-green-100 text-green-900" : "border-red-700 bg-red-100 text-red-900"}`}>
                      {demandOfferActionMessage.text}
                    </div>
                  )}
                  <p className="mb-4 text-xs font-bold text-neutral-700 leading-relaxed">
                    Acceptarea unei oferte nu marchează automat cererea ca rezolvată. Marchează cererea ca rezolvată sau finalizează tranzacția doar după ce ai verificat direct cu cealaltă parte.
                  </p>
                  <div className="space-y-6">
                    {myDemandOffers.map(offer => {
                      const demand = myDemands.find(d => d.id === offer.demand_id);
                      const isDemandResolved = demand?.status === "resolved";
                      return (
                        <div key={offer.id} className={`bg-[#FDFCF8] border-[3px] border-black rounded-[2rem] p-6 md:p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative overflow-hidden transition-all ${offer.status === 'rejected' ? 'opacity-60 grayscale' : ''}`}>
                          
                          <div className={`absolute top-0 right-0 px-4 py-2 text-xs font-black uppercase rounded-bl-xl border-b-[3px] border-l-[3px] border-black ${offer.status === 'new' ? 'bg-[#FFD100] text-black animate-pulse' : offer.status === 'accepted' ? 'bg-green-500 text-black' : 'bg-neutral-200 text-neutral-600'}`}>
                            {offer.status === 'new' ? 'Ofertă nouă' : offer.status === 'accepted' ? 'Ofertă acceptată' : 'Ofertă respinsă'}
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                            
                            <div className="lg:col-span-2">
                              {isDemandResolved && (
                                <div className="mb-4 inline-block rounded-lg border-2 border-black bg-black px-3 py-1">
                                  <p className="text-[10px] font-black uppercase tracking-wider text-[#FFD100]">
                                    Cerere rezolvată
                                  </p>
                                </div>
                              )}
                              <p className="text-xs font-black uppercase text-neutral-600 mb-1">Pentru bugetul tău de:</p>
                              <p className="text-xl md:text-2xl font-black uppercase italic tracking-tight mb-6">{demand?.target_asset || "Cerere Nelistată"} <span className="text-sm font-bold text-neutral-500">(Max €{demand?.budget?.toLocaleString()})</span></p>
                              
                              <div>
                                <p className="text-xs font-black uppercase text-neutral-600 mb-1">Preț solicitat de vânzător:</p>
                                <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-black leading-none mb-6">
                                  €{offer.offer_price?.toLocaleString('ro-RO')}
                                </p>
                              </div>

                              <div className="bg-white p-5 rounded-xl border-[3px] border-gray-200 mb-4 shadow-sm">
                                <p className="text-xs font-black uppercase text-neutral-600 mb-2">Detalii activ vânzător:</p>
                                <p className="text-sm font-bold italic text-neutral-700 leading-relaxed">&quot;{offer.asset_description || "Sunt interesat să vă vând."}&quot;</p>
                              </div>
                              {Array.isArray(offer.images) && offer.images.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-xs font-black uppercase text-neutral-600 mb-2">Poze atașate</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {offer.images.map((imageUrl: string, idx: number) => (
                                      <a
                                        key={`${offer.id}-img-${idx}`}
                                        href={imageUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-lg border-2 border-black bg-white"
                                      >
                                        <img
                                          src={imageUrl}
                                          alt={`Poză ofertă ${idx + 1}`}
                                          className="h-20 w-full object-cover"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="lg:col-span-1 border-t-[3px] lg:border-t-0 lg:border-l-[3px] border-gray-200 pt-6 lg:pt-0 lg:pl-6 flex flex-col h-full justify-between">
                              <div className="mb-6">
                                <p className="text-xs font-black uppercase text-neutral-600 mb-3">Contact vânzător:</p>
                                <a href={`tel:${offer.seller_phone}`} className="flex items-center justify-center gap-2 bg-black text-[#FFD100] px-4 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-[4px_4px_0_0_rgba(255,209,0,1)] hover:scale-105 active:translate-y-1 active:shadow-none transition-all mb-3 w-full border-2 border-black">
                                  📞 Sună Vânzătorul
                                </a>
                                {offer.seller_email && (
                                  <a href={`mailto:${offer.seller_email}`} className="block text-center text-xs font-bold text-neutral-700 hover:text-black">
                                    ✉️ {offer.seller_email}
                                  </a>
                                )}
                                <p className="text-center font-black text-xl italic mt-3">{offer.seller_phone}</p>
                                <p className="mt-4 text-[11px] font-bold text-neutral-600 leading-relaxed text-left">
                                  Contactează vânzătorul doar pentru pașii necesari tranzacției și verifică detaliile înainte de plată sau predare. Nu introduce datele cardului în linkuri primite de la alți utilizatori.
                                </p>
                              </div>

                              {offer.status === 'new' && !isDemandResolved ? (
                                <div className="grid grid-cols-2 gap-3 mt-auto">
                                  <button onClick={() => handleOfferAction(offer.id, 'accepted', 'demand')} className="bg-white border-[3px] border-black text-black py-3 rounded-xl font-black uppercase text-xs hover:bg-green-400 hover:border-green-400 transition-colors shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
                                    Acceptă oferta
                                  </button>
                                  <button onClick={() => handleOfferAction(offer.id, 'rejected', 'demand')} className="bg-[#FDFCF8] border-[3px] border-transparent text-neutral-600 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-colors">
                                    Refuză oferta
                                  </button>
                                </div>
                              ) : (
                                <div className="text-center mt-auto border-t-2 border-gray-100 pt-4">
                                  <span className={`text-xs font-black uppercase ${offer.status === 'accepted' ? 'text-green-600' : 'text-neutral-600'}`}>
                                    {offer.status === 'accepted' ? '✓ Ofertă acceptată' : '✕ Ofertă respinsă'}
                                  </span>
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECȚIUNE: Ofertele trimise de mine către cereri de cumpărare */}
              <div>
                <h3 className="text-lg font-black uppercase italic tracking-widest text-neutral-600 mb-4 border-b-2 border-black inline-block">
                  Ofertele mele trimise către cereri
                </h3>

                {mySentDemandOffers.length > 0 ? (
                  <div className="space-y-4">
                    {mySentDemandOffers.map((offer) => {
                      const demandId = String(offer?.demand_id || "");
                      const offerIdShort = String(offer?.id || "").slice(0, 6) || "N/A";
                      const demandMeta = sentDemandMeta[demandId];
                      const demandTitle = demandMeta?.targetAsset || `Cerere #${demandId.slice(0, 8)}`;
                      const demandCategory = demandMeta?.category || null;
                      const demandStatus = demandMeta?.status || null;

                      return (
                        <div
                          key={offer.id}
                          className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-1">
                                Cerere de cumpărare
                              </p>
                              <p className="text-base font-black italic text-black">{demandTitle}</p>
                              <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500 mt-1">
                                Oferta #{offerIdShort}
                              </p>
                              {demandCategory && (
                                <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mt-1">
                                  {demandCategory}
                                </p>
                              )}
                              {demandStatus && (
                                <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mt-1">
                                  Status cerere: {statusLabel(demandStatus)}
                                </p>
                              )}
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-1">
                                Sumă ofertată
                              </p>
                              <p className="text-2xl font-black italic text-black">
                                €{Number(offer.offer_price || 0).toLocaleString("ro-RO")}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t-2 border-neutral-100 pt-4">
                            <p className="text-xs font-black uppercase tracking-wider text-neutral-700">
                              Status:{" "}
                              <span className="text-black">{sentDemandOfferStatusLabel(offer.status)}</span>
                            </p>
                            <p className="text-xs font-bold text-neutral-500">
                              Trimisă la:{" "}
                              {offer.created_at
                                ? new Date(offer.created_at).toLocaleString("ro-RO")
                                : "N/A"}
                            </p>
                          </div>

                          {demandId && (
                            <div className="mt-3">
                              <button
                                onClick={() => router.push("/capital-disponibil")}
                                className="bg-[#FDFCF8] border-2 border-black px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black hover:text-[#FFD100] transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-px active:shadow-none"
                              >
                                Vezi cererile active
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border-[3px] border-dashed border-gray-300 rounded-2xl p-8 text-center">
                    <p className="text-sm font-bold text-neutral-700">
                      Nu ai trimis încă oferte către cereri de cumpărare.
                    </p>
                  </div>
                )}
              </div>

              {/* SECȚIUNE: Ofertele trimise de mine către anunțuri (buyer-side) */}
              <div>
                <h3 className="text-lg font-black uppercase italic tracking-widest text-neutral-600 mb-4 border-b-2 border-black inline-block">
                  Ofertele mele trimise
                </h3>

                {mySentListingOffers.length > 0 ? (
                  <div className="space-y-4">
                    {mySentListingOffers.map((offer) => {
                      const listingId = String(offer?.listing_id || "");
                      const offerIdShort = String(offer?.id || "").slice(0, 6) || "N/A";
                      const listingMeta = sentOffersListingMeta[listingId];
                      const listingTitle = listingMeta?.title || `Anunț #${listingId.slice(0, 8)}`;
                      const listingCategory = listingMeta?.category || null;

                      return (
                        <div
                          key={offer.id}
                          className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-1">
                                Anunț
                              </p>
                              <p className="text-base font-black italic text-black">{listingTitle}</p>
                              <p className="text-[11px] font-black uppercase tracking-wider text-neutral-500 mt-1">
                                Oferta #{offerIdShort}
                              </p>
                              {listingCategory && (
                                <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mt-1">
                                  {listingCategory}
                                </p>
                              )}
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-1">
                                Sumă ofertată
                              </p>
                              <p className="text-2xl font-black italic text-black">
                                €{Number(offer.offer_price || 0).toLocaleString("ro-RO")}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t-2 border-neutral-100 pt-4">
                            <p className="text-xs font-black uppercase tracking-wider text-neutral-700">
                              Status:{" "}
                              <span className="text-black">{sentOfferStatusLabel(offer.status)}</span>
                            </p>
                            <p className="text-xs font-bold text-neutral-500">
                              Trimisă la:{" "}
                              {offer.created_at
                                ? new Date(offer.created_at).toLocaleString("ro-RO")
                                : "N/A"}
                            </p>
                          </div>

                          {listingId && (
                            <div className="mt-3">
                              <button
                                onClick={() => router.push(`/anunt/${listingId}`)}
                                className="bg-[#FDFCF8] border-2 border-black px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-black hover:text-[#FFD100] transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-px active:shadow-none"
                              >
                                Vezi anunțul
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border-[3px] border-dashed border-gray-300 rounded-2xl p-8 text-center">
                    <p className="text-sm font-bold text-neutral-700">
                      Nu ai trimis încă oferte către anunțuri.
                    </p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white p-16 flex flex-col items-center justify-center text-center rounded-[3rem] border-[4px] border-dashed border-gray-200 shadow-sm">
               <Inbox className="w-20 h-20 text-neutral-300 mb-6" />
               <h2 className="text-3xl font-black uppercase italic mb-3 tracking-tighter text-neutral-600">Nicio ofertă momentan</h2>
               <p className="text-sm font-bold text-neutral-700 max-w-md leading-relaxed">
                 Nu ai oferte momentan. Ofertele vor apărea aici după ce utilizatorii interacționează cu anunțurile sau cererile tale.
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
    <div className="p-4 md:p-8 bg-[#F7F4EC] min-h-screen font-sans text-black selection:bg-[#FFD100] antialiased">
      <Suspense fallback={<div className="text-center font-black uppercase text-xs mt-20 animate-pulse">Sincronizare dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}