"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AdCard from "../../components/AdCard";
import { normalizeSaleType } from "@/utils/normalizeSaleType";
import {
  auctionOffersReceivedLineDetail,
  detailHighestOfferLine,
  formatFereastraOfertariiRo,
  parseListingOfferCount,
} from "@/utils/auctionListingUi";
import { buildSocialShareKit } from "@/lib/socialShare";
import { trackEvent } from "@/lib/analytics";
import type {
  ListingSellerContext,
  PublicListingRow,
} from "@/lib/listingSeo";
import {
  labelBase,
  kycStatusRo,
  type ListingModalId,
} from "./listingModalShared";

const ListingModals = dynamic(() => import("./ListingModals"), {
  ssr: false,
  loading: () => null,
});

function strategyBadgeRo(strategy?: string | null): string {
  const n = normalizeSaleType(strategy);
  switch (n) {
    case "auction":
      return "Licitație deschisă";
    case "urgent":
      return "Urgență";
    case "extreme":
      return "Oportunitate";
    default:
      return "Standard";
  }
}

function formatMemberSinceRo(createdAt: string | null | undefined): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  const s = new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function userTypeRo(t: string | null | undefined): string {
  if (t === "buyer") return "Cumpărător";
  if (t === "seller") return "Vânzător";
  if (t === "guest") return "Utilizator";
  return "Utilizator Quick Exit";
}

type DetailFormat = "plain" | "mp" | "km" | "eur" | "tva_boolean";

type DetailDef = {
  keys: readonly string[];
  labelRo: string;
  format: DetailFormat;
};

const DETAILS_BY_CATEGORY: Record<string, readonly DetailDef[]> = {
  "Auto & Moto": [
    { keys: ["vehicle_year", "year"], labelRo: "An", format: "plain" },
    { keys: ["vehicle_km", "km", "kilometers"], labelRo: "Kilometraj", format: "km" },
    { keys: ["transmission"], labelRo: "Transmisie", format: "plain" },
    { keys: ["fuel"], labelRo: "Combustibil", format: "plain" },
    { keys: ["bodyType", "body_type"], labelRo: "Caroserie", format: "plain" },
    { keys: ["drivetrain", "traction"], labelRo: "Tracțiune", format: "plain" },
    { keys: ["accident_status", "accidents"], labelRo: "Istoric daune", format: "plain" },
  ],
  Imobiliare: [
    { keys: ["propType", "property_type", "tip_proprietate"], labelRo: "Tip proprietate", format: "plain" },
    { keys: ["location", "locatie", "zona"], labelRo: "Localizare", format: "plain" },
    { keys: ["surface", "suprafata"], labelRo: "Suprafață utilă", format: "mp" },
    { keys: ["landSurface", "land_surface"], labelRo: "Teren", format: "mp" },
    { keys: ["rooms", "camere"], labelRo: "Camere", format: "plain" },
    { keys: ["buildYear", "build_year", "an_constructie"], labelRo: "An construcție", format: "plain" },
    { keys: ["parking", "parcaj"], labelRo: "Parcare", format: "plain" },
    { keys: ["tva"], labelRo: "TVA", format: "tva_boolean" },
  ],
  "Lux & Ceasuri": [
    { keys: ["brand"], labelRo: "Brand", format: "plain" },
    { keys: ["model", "refModel"], labelRo: "Model", format: "plain" },
    { keys: ["boxPapers", "box_papers", "documents"], labelRo: "Cutie și acte", format: "plain" },
    { keys: ["mechanism"], labelRo: "Mecanism", format: "plain" },
    { keys: ["condition", "conditie", "stare"], labelRo: "Stare", format: "plain" },
    { keys: ["year", "optionalYear", "purchaseYear"], labelRo: "An", format: "plain" },
  ],
  Gadgets: [
    { keys: ["brand"], labelRo: "Brand", format: "plain" },
    { keys: ["model", "specs"], labelRo: "Model", format: "plain" },
    { keys: ["condition", "stare"], labelRo: "Stare", format: "plain" },
    { keys: ["storage"], labelRo: "Stocare", format: "plain" },
    { keys: ["warranty", "waranty"], labelRo: "Garanție", format: "plain" },
  ],
  "Foto & Audio": [
    { keys: ["brand"], labelRo: "Brand", format: "plain" },
    { keys: ["model", "specs"], labelRo: "Model", format: "plain" },
    { keys: ["condition", "stare"], labelRo: "Stare", format: "plain" },
    { keys: ["warranty", "waranty"], labelRo: "Garanție", format: "plain" },
  ],
  "Afaceri de vânzare": [
    { keys: ["industry", "businessDomain", "domeniu"], labelRo: "Domeniu", format: "plain" },
    { keys: ["location", "locatie"], labelRo: "Localizare", format: "plain" },
    { keys: ["revenue", "cifra"], labelRo: "Venit anual", format: "eur" },
    { keys: ["profit"], labelRo: "Profit", format: "eur" },
    { keys: ["employees", "employees_count"], labelRo: "Angajați", format: "plain" },
  ],
};

function detailValuePresent(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "boolean") return true;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

function getDetailValue(adData: Record<string, unknown>, key: string): unknown {
  const root = adData[key];
  if (detailValuePresent(root)) return root;
  const details = adData.details;
  if (details !== null && details !== undefined && typeof details === "object" && !Array.isArray(details)) {
    const d = details as Record<string, unknown>;
    const nested = d[key];
    if (detailValuePresent(nested)) return nested;
  }
  return undefined;
}

function pickFirstPresent(adData: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const k of keys) {
    const v = getDetailValue(adData, k);
    if (detailValuePresent(v)) return v;
  }
  return undefined;
}

function formatMoneyEURIfNumeric(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `€${raw.toLocaleString("ro-RO")}`;
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (/[a-zA-ZîâășțÎÂĂȘȚ]/.test(t)) return t;
    if (/^[\d\s.,€-]+$/.test(t)) {
      const normalized = t.replace(/€/g, "").replace(/\u00a0/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
      const n = Number(normalized);
      if (Number.isFinite(n)) return `€${n.toLocaleString("ro-RO")}`;
    }
    return t;
  }
  return String(raw ?? "").trim();
}

function formatSqm(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw))
    return `${raw.toLocaleString("ro-RO")} mp`;
  const s = String(raw).trim();
  if (/mp|m²|m2/i.test(s)) return s;
  return `${s} mp`;
}

function formatKmRo(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw))
    return `${raw.toLocaleString("ro-RO")} km`;
  const s = String(raw).trim();
  if (/km\b/i.test(s)) return s;
  const n = Number(String(s).replace(/\s|\./g, "").replace(",", "."));
  if (Number.isFinite(n)) return `${n.toLocaleString("ro-RO")} km`;
  return `${s} km`;
}

function formatTvaRo(raw: unknown): string {
  if (typeof raw === "boolean") return raw ? "Da" : "Nu";
  if (typeof raw === "string") {
    const low = raw.trim().toLowerCase();
    if (low === "true" || low === "da" || low === "yes" || low === "1") return "Da";
    if (low === "false" || low === "nu" || low === "no" || low === "0") return "Nu";
  }
  return String(raw).trim();
}

function formatDetailField(raw: unknown, format: DetailFormat): string {
  switch (format) {
    case "mp":
      return formatSqm(raw);
    case "km":
      return formatKmRo(raw);
    case "eur":
      return formatMoneyEURIfNumeric(raw);
    case "tva_boolean":
      return formatTvaRo(raw);
    default:
      return typeof raw === "number" ? String(raw) : String(raw).trim();
  }
}

type AnuntClientProps = {
  initialListing: PublicListingRow;
  initialSeller: ListingSellerContext;
  initialSimilar: PublicListingRow[];
};

export default function AnuntClient({
  initialListing,
  initialSeller,
  initialSimilar,
}: AnuntClientProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeModal, setActiveModal] = useState<ListingModalId | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);

  const [adData] = useState<PublicListingRow>(initialListing);
  const [similarAds] = useState<PublicListingRow[]>(initialSimilar);
  const [offerPrice, setOfferPrice] = useState(Number(initialListing.exit_price) || 0);

  const [sellerProfile] = useState(initialSeller.profile);
  const [sellerOtherListings] = useState<PublicListingRow[]>(initialSeller.otherListings);
  const [sellerActiveCount] = useState<number | null>(initialSeller.activeCount);
  const [shareCopiedKey, setShareCopiedKey] = useState<string | null>(null);
  const [shareFallbackText, setShareFallbackText] = useState<string | null>(null);
  const [canQuickShare, setCanQuickShare] = useState(false);

  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [offerActionMessage, setOfferActionMessage] = useState<{ type: "error"; text: string } | null>(null);

  const [acceptPhone, setAcceptPhone] = useState("");
  const [acceptEmail, setAcceptEmail] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [acceptActionMessage, setAcceptActionMessage] = useState<{ type: "error"; text: string } | null>(null);

  useEffect(() => {
    if (!imageLightboxOpen) return;
    if (!adData) {
      setImageLightboxOpen(false);
      return;
    }
    const urls =
      Array.isArray(adData.images) && adData.images.length > 0
        ? adData.images
        : [
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
          ];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setImageLightboxOpen(false);
        return;
      }
      if (urls.length <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentImageIndex((i) => (i - 1 + urls.length) % urls.length);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentImageIndex((i) => (i + 1) % urls.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [imageLightboxOpen, adData]);

  useEffect(() => {
    if (!adData?.id) return;
    if (adData.status !== "active") return;
    trackEvent("view_listing", {
      listing_id: adData.id,
      category: adData.category || "unknown",
      status: "active",
    });
  }, [adData]);

  useEffect(() => {
    setCanQuickShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const submitListingOffer = async () => {
    if (!buyerPhone || !offerPrice) return;
    setIsSubmittingOffer(true);
    setOfferActionMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("listing_offers").insert({
        listing_id: adData.id,
        buyer_user_id: user ? user.id : null,
        offer_price: Number(offerPrice),
        buyer_phone: buyerPhone,
        buyer_email: buyerEmail,
        message: offerMessage,
        status: "new",
      });
      if (error) throw error;
      trackEvent("submit_listing_offer", {
        source: "listing_detail",
        listing_id: adData.id,
        category: adData.category || "unknown",
        offer_type: "custom_offer",
        amount: Number(offerPrice),
        status: "success",
      });
      setOfferSuccess(true);
      setBuyerPhone("");
      setBuyerEmail("");
      setOfferMessage("");
    } catch (err) {
      console.error(err);
      setOfferActionMessage({
        type: "error",
        text: "Nu am putut trimite oferta. Te rugăm să reîncerci.",
      });
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const submitAcceptExitPrice = async () => {
    if (!acceptPhone) return;
    setIsAccepting(true);
    setAcceptActionMessage(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("listing_offers").insert({
        listing_id: adData.id,
        buyer_user_id: user ? user.id : null,
        offer_price: adData.exit_price,
        buyer_phone: acceptPhone,
        buyer_email: acceptEmail,
        message: "⚠️ CLIENTUL A ACCEPTAT PREȚUL DE EXIT ȘI DOREȘTE TRANZACȚIA ACUM!",
        status: "accepted_exit_price",
      });
      if (error) throw error;
      trackEvent("submit_accept_exit_price", {
        source: "listing_detail",
        listing_id: adData.id,
        category: adData.category || "unknown",
        offer_type: "exit_price",
        amount: Number(adData.exit_price),
        status: "success",
      });
      setAcceptSuccess(true);
    } catch (err) {
      console.error(err);
      setAcceptActionMessage({
        type: "error",
        text: "Nu am putut trimite confirmarea. Te rugăm să reîncerci.",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  if (!adData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EC] p-6 text-center font-sans antialiased">
        <div className="w-full max-w-lg rounded-[2rem] border-[3px] border-black bg-white p-10 shadow-[12px_12px_0_0_#FFD100]">
          <span className="mb-6 block text-5xl opacity-70" aria-hidden>
            📭
          </span>
          <h1 className="mb-4 text-2xl font-black uppercase italic leading-tight tracking-tight md:text-3xl">
            Activ indisponibil
          </h1>
          <p className="mb-10 text-sm font-medium text-neutral-600">
            Acest anunț nu mai este disponibil sau a fost retras de pe platformă.
          </p>
          <Link
            href="/"
            className="inline-block w-full rounded-2xl border-[3px] border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-[#FFD100] transition hover:brightness-110"
          >
            Înapoi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  const maxOffer = Math.max(1, Math.round(Number(adData.exit_price) || 0));
  const minOffer = Math.max(1, Math.round(maxOffer * 0.7));
  const offerStep = maxOffer - minOffer <= 1000 ? 100 : 1000;
  const clampOfferPrice = (value: number) => {
    if (!Number.isFinite(value)) return minOffer;
    return Math.min(maxOffer, Math.max(minOffer, Math.round(value)));
  };
  const displayImages =
    adData.images && adData.images.length > 0
      ? adData.images
      : [
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
        ];

  const sellerDisplayName =
    sellerProfile?.full_name?.trim() || "Vânzător Quick Exit";
  const displayedActiveListingCount =
    sellerActiveCount !== null ? sellerActiveCount : sellerOtherListings.length + 1;

  const isAuctionDetail = normalizeSaleType(adData.sale_strategy) === "auction";
  const auctionOfferTotalForUi = isAuctionDetail ? parseListingOfferCount(adData.offer_count) : 0;
  const auctionOffersReceivedRo = isAuctionDetail
    ? auctionOffersReceivedLineDetail(auctionOfferTotalForUi)
    : null;
  const auctionHighestRo = isAuctionDetail ? detailHighestOfferLine(adData.highest_offer) : null;
  const auctionFereastraRo = isAuctionDetail ? formatFereastraOfertariiRo(adData.expires_at) : null;

  const renderTitle = (title: string) => {
    if (!title) return null;
    const words = title.split(" ");
    const lastWord = words.pop();
    return (
      <>
        {words.join(" ")}{" "}
        <span className="text-[#FFD100] underline decoration-black decoration-[3px] underline-offset-4">
          {lastWord}
        </span>
      </>
    );
  };

  const renderTechnicalDetails = () => {
    const ad = adData as Record<string, unknown>;
    const defs =
      typeof adData.category === "string" ? DETAILS_BY_CATEGORY[adData.category] : undefined;

    const rows: { labelRo: string; display: string }[] = [];
    if (defs?.length) {
      for (const def of defs) {
        const raw = pickFirstPresent(ad, def.keys);
        if (!detailValuePresent(raw)) continue;
        rows.push({ labelRo: def.labelRo, display: formatDetailField(raw, def.format) });
      }
    }

    if (rows.length === 0) {
      return (
        <p className="mt-6 text-sm font-medium italic text-neutral-500">
          Detaliile tehnice nu au fost completate.
        </p>
      );
    }

    return (
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {rows.map(({ labelRo, display }, idx) => (
          <div
            key={`${labelRo}-${idx}`}
            className="rounded-xl border-[3px] border-black bg-neutral-50/80 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.08)] md:rounded-2xl"
          >
            <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-neutral-400">
              {labelRo}
            </p>
            <p className="font-bold leading-snug text-black [overflow-wrap:anywhere]">{display}</p>
          </div>
        ))}
      </div>
    );
  };

  const trustKycChipLabel =
    sellerProfile?.kyc_status === "verified"
      ? "Identitate verificată"
      : `Încredere: ${kycStatusRo(sellerProfile?.kyc_status ?? null)}`;

  const canShowShareKit = adData?.status === "active" && adData?.is_seed === false;
  const socialKit = canShowShareKit
    ? buildSocialShareKit({
        id: adData.id,
        title: adData.title,
        category: adData.category,
        market_price:
          typeof adData.market_price === "number" ? adData.market_price : null,
        exit_price: typeof adData.exit_price === "number" ? adData.exit_price : null,
        discount: typeof adData.discount === "number" ? adData.discount : null,
        discount_percentage:
          typeof adData.discount_percentage === "number"
            ? adData.discount_percentage
            : null,
        deal_score: typeof adData.deal_score === "number" ? adData.deal_score : null,
        location: typeof adData.location === "string" ? adData.location : null,
        images: Array.isArray(adData.images) ? adData.images : null,
        sale_strategy:
          typeof adData.sale_strategy === "string" ? adData.sale_strategy : null,
        created_at:
          typeof adData.created_at === "string" ? adData.created_at : null,
        details:
          adData.details !== null &&
          adData.details !== undefined &&
          typeof adData.details === "object" &&
          !Array.isArray(adData.details)
            ? (adData.details as Record<string, unknown>)
            : null,
      })
    : null;

  const copyShareText = async (label: string, text: string) => {
    setShareCopiedKey(null);
    setShareFallbackText(null);
    trackEvent("copy_social_share", {
      listing_id: adData.id,
      channel: label,
    });
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareCopiedKey(label);
        setTimeout(() => setShareCopiedKey((prev) => (prev === label ? null : prev)), 1800);
      } else {
        setShareFallbackText(text);
      }
    } catch {
      setShareFallbackText(text);
    }
  };

  const quickShare = async () => {
    if (!socialKit || !canQuickShare || !navigator.share) return;
    try {
      await navigator.share({
        title: socialKit.headline,
        text: socialKit.shortHook,
        url: socialKit.utm.whatsapp || socialKit.listingUrl,
      });
    } catch {
      // User canceled or platform rejected share; keep silent.
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] font-sans text-black selection:bg-[#FFD100]/40 selection:text-black antialiased">
      <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-6 md:px-8 md:py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-white px-4 py-2 shadow-[4px_4px_0_0_#000] transition hover:-translate-x-px hover:border-[#FFD100]"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black md:text-[11px]">
              ← Acasă
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className={`flex items-center gap-2 rounded-xl border-[3px] border-black px-5 py-2.5 font-black uppercase text-[9px] tracking-widest transition md:text-[10px] ${
              isFavorite ? "border-red-600 bg-red-600 text-white shadow-[4px_4px_0_0_#000]" : "bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:border-[#FFD100]"
            }`}
          >
            {isFavorite ? "Salvat" : "Adaugă la favorite"}
          </button>
        </div>

        <div className="mb-14 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-8 lg:col-span-8">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setImageLightboxOpen(true)}
                className="group relative h-[300px] w-full cursor-pointer overflow-hidden rounded-[2rem] border-[3px] border-black bg-neutral-100 text-left shadow-[10px_10px_0_0_#FFD100] transition hover:border-[#FFD100] md:h-[400px] lg:h-[450px]"
                aria-label="Deschide imaginea mărită"
              >
                <Image
                  src={displayImages[currentImageIndex]}
                  alt={adData.title || "Imagine anunț"}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  priority
                />
                <div className="pointer-events-none absolute left-4 top-4 rounded-lg border-2 border-black bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#FFD100]">
                  {strategyBadgeRo(adData.sale_strategy)}
                </div>
                <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[90%] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
                  Apasă pentru a mări
                </div>
              </button>

              {displayImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                  {displayImages.map((img: string, index: number) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentImageIndex(index)}
                      className={`relative h-16 w-full overflow-hidden rounded-xl border-[3px] transition-all md:h-20 lg:h-24 ${
                        currentImageIndex === index
                          ? "scale-[1.02] border-[#FFD100] opacity-100 shadow-[4px_4px_0_0_#000]"
                          : "border-black opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image src={img} alt={`Miniatură ${index + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.12)] md:p-10 md:shadow-[10px_10px_0_0_#FFD100]">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border-2 border-black bg-[#F7F4EC] px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                  {adData.category}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                  ID: {typeof adData.id === "string" ? adData.id.split("-")[0] : ""}
                </span>
              </div>
              <h1 className="text-3xl font-black uppercase italic leading-[0.95] tracking-tighter text-black md:text-4xl lg:text-5xl">
                {renderTitle(adData.title || "Anunț")}
              </h1>

              {isAuctionDetail && (
                <div className="mt-5 space-y-2 rounded-xl border-[3px] border-black bg-[#FFFEF6] p-4">
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-black border-b border-black/15 pb-2">
                    Licitație deschisă
                  </h2>
                  {auctionOffersReceivedRo ? (
                    <p className="text-xs font-semibold leading-snug text-neutral-900">{auctionOffersReceivedRo}</p>
                  ) : (
                    <p className="text-xs font-semibold leading-snug text-neutral-900">
                      Fii primul care trimite o ofertă.
                    </p>
                  )}
                  {auctionHighestRo ? (
                    <p className="text-xs font-semibold leading-snug text-neutral-900">{auctionHighestRo}</p>
                  ) : null}
                  {auctionFereastraRo ? (
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-800">
                      {auctionFereastraRo}
                    </p>
                  ) : null}
                  <p className="border-t border-black/15 pt-2 text-[11px] font-medium leading-relaxed text-neutral-700">
                    Cea mai mare ofertă nu este câștigătoare automat. Vânzătorul alege manual oferta potrivită,
                    iar tranzacția se finalizează direct între părți.
                  </p>
                </div>
              )}

              {renderTechnicalDetails()}

              <div className="mt-8 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveModal("verified")}
                  className="flex items-center gap-1.5 rounded-xl border-[3px] border-black bg-black px-4 py-2 font-black uppercase text-[9px] tracking-wider text-[#FFD100] transition hover:brightness-110"
                >
                  <span className="text-sm" aria-hidden>
                    ★
                  </span>
                  <span className="leading-tight text-left normal-case">{trustKycChipLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal("docs")}
                  className="flex items-center gap-1.5 rounded-xl border-[3px] border-black bg-white px-4 py-2 font-black uppercase text-[9px] tracking-wider transition hover:bg-[#FFD100]"
                >
                  <span className="text-sm" aria-hidden>
                    📁
                  </span>
                  Fișier documentar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal("ai-score")}
                  className="flex items-center gap-1.5 rounded-xl border-[3px] border-black bg-[#FFD100] px-4 py-2 font-black uppercase text-[9px] tracking-wider shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:brightness-105"
                >
                  <span className="text-sm" aria-hidden>
                    ⚡
                  </span>
                  Scor oportunitate {adData.deal_score ?? "—"}
                </button>
              </div>

              <div className="mt-8 border-t-[3px] border-black pt-6">
                <h2 className="mb-3 text-lg font-black uppercase italic tracking-tight md:text-xl">
                  Despre acest{" "}
                  <span className="text-neutral-500">activ</span>
                </h2>
                <p className="max-w-3xl text-sm font-medium italic leading-relaxed text-neutral-800 md:text-base whitespace-pre-wrap">
                  {adData.description}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.95)] md:shadow-[12px_12px_0_0_#FFD100]">
                <div className="mb-6 flex flex-col justify-center rounded-[1.25rem] border-[3px] border-black bg-[#FFD100] p-5 shadow-[4px_4px_0_0_#000]">
                  <p className={`${labelBase} mb-1 text-black/60`}>Profit potențial</p>
                  <p className="break-words font-black italic leading-none text-black uppercase [font-size:clamp(1.75rem,4vw,2.75rem)]">
                    €{((adData.market_price ?? 0) - (adData.exit_price ?? 0)).toLocaleString("ro-RO")}
                  </p>
                </div>

                <div className="mb-8 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-neutral-100 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500">
                      Preț estimat de piață
                    </span>
                    <span className="font-black italic opacity-35 line-through [font-size:clamp(1rem,3vw,1.35rem)]">
                      €{(adData.market_price ?? 0).toLocaleString("ro-RO")}
                    </span>
                  </div>
                  <div className="flex w-full flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wide text-neutral-700">
                      Preț de vânzare rapidă
                    </span>
                    <span className="w-full break-words font-black italic leading-none [font-size:clamp(2rem,5vw,3rem)]">
                      €{(adData.exit_price ?? 0).toLocaleString("ro-RO")}
                    </span>
                  </div>
                  <div className="inline-flex rounded-lg border-2 border-black bg-black px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#FFD100]">
                    Reducere față de piață: −{adData.discount}%
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal("accept");
                      setAcceptSuccess(false);
                      setAcceptActionMessage(null);
                    }}
                    className="w-full rounded-2xl border-[3px] border-black bg-black py-4 font-black uppercase tracking-wider text-[#FFD100] shadow-[6px_6px_0_0_#000] transition hover:brightness-110 md:py-5 md:text-sm"
                  >
                    Accept prețul de vânzare rapidă
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent("click_listing_offer", {
                        listing_id: adData.id,
                        category: adData.category || "unknown",
                      });
                      setActiveModal("offer");
                      setOfferSuccess(false);
                      setOfferActionMessage(null);
                    }}
                    className="w-full rounded-2xl border-[3px] border-black bg-white py-4 font-black uppercase tracking-wider text-black shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-50 md:text-xs"
                  >
                    Trimite ofertă
                  </button>
                </div>

                <p className="mt-3 max-w-none rounded-xl border border-neutral-200 bg-[#F7F4EC] px-3 py-2.5 text-left text-[11px] font-semibold leading-relaxed text-neutral-800 sm:mt-4 sm:px-4 sm:py-3 sm:text-xs">
                  Nu trimite bani în avans și nu introduce datele cardului în linkuri primite de la alți utilizatori.
                  Verifică activul și detaliile direct cu vânzătorul.
                </p>

                <p className="mt-6 text-center text-[10px] font-medium leading-relaxed text-neutral-500">
                  În curând: poți salva criterii și primi notificări pentru anunțuri noi.
                </p>
              </div>

              {adData.user_id && (
                <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.85)]">
                  <h3 className="mb-4 text-sm font-black uppercase italic tracking-tight text-black">
                    Vânzător
                  </h3>
                  <ul className="space-y-3 text-sm font-medium text-neutral-800">
                    <li>
                      <span className={labelBase}>Nume pe platformă</span>
                      <span className="mt-1 block font-bold text-black">{sellerDisplayName}</span>
                    </li>
                    <li>
                      <span className={labelBase}>Status</span>
                      <span className="mt-1 block font-bold text-black">
                        {kycStatusRo(sellerProfile?.kyc_status ?? null)}
                      </span>
                    </li>
                    {formatMemberSinceRo(sellerProfile?.created_at) && (
                      <li>
                        <span className={labelBase}>Membru din</span>
                        <span className="mt-1 block font-bold capitalize text-black">
                          {formatMemberSinceRo(sellerProfile?.created_at)}
                        </span>
                      </li>
                    )}
                    <li>
                      <span className={labelBase}>Anunțuri active listate</span>
                      <span className="mt-1 block font-bold text-black">{displayedActiveListingCount}</span>
                    </li>
                    <li>
                      <span className={labelBase}>Rol</span>
                      <span className="mt-1 block font-bold text-black">
                        {userTypeRo(sellerProfile?.user_type ?? null)}
                      </span>
                    </li>
                  </ul>
                  <p className="mt-5 border-t border-neutral-200 pt-4 text-xs font-medium leading-relaxed text-neutral-600">
                    Datele de contact se transmit doar prin ofertă, pentru protecția ambelor părți.
                  </p>
                </div>
              )}

              {canShowShareKit && socialKit && (
                <div className="rounded-[2rem] border-[3px] border-black bg-[#FFFEF7] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.65)]">
                  <h3 className="mb-2 text-sm font-black uppercase italic tracking-tight text-black">
                    Distribuie oportunitatea
                  </h3>
                  <p className="mb-5 text-xs font-medium leading-relaxed text-neutral-700">
                    Copiază un mesaj gata pregătit și trimite-l către cumpărători sau comunitatea ta.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {canQuickShare && (
                      <button
                        type="button"
                        onClick={() => void quickShare()}
                        className="col-span-2 rounded-xl border-2 border-black bg-[#FFD100] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black hover:brightness-105"
                      >
                        Distribuie rapid
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void copyShareText("link", socialKit.utm.hq)}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      Copiază link
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("whatsapp", socialKit.whatsappMessage)}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("telegram", socialKit.telegramMessage)}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      Telegram
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("x", socialKit.xPost)}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      X
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("linkedin", socialKit.linkedinPost)}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      LinkedIn
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("instagram", socialKit.instagramCaption)}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      Instagram
                    </button>
                  </div>
                  {shareCopiedKey && (
                    <p className="mt-3 text-xs font-semibold text-neutral-700">Copiat.</p>
                  )}
                  {shareFallbackText && (
                    <textarea
                      readOnly
                      value={shareFallbackText}
                      className="mt-3 h-28 w-full rounded-xl border-2 border-black bg-white p-2 text-xs font-medium text-neutral-700"
                    />
                  )}
                </div>
              )}

              <div className="rounded-[2rem] border-[3px] border-dashed border-black/30 bg-white/90 p-5 text-center shadow-[4px_4px_0_0_rgba(0,0,0,0.06)]">
                <p className="text-xs font-medium leading-relaxed text-neutral-600">
                  Istoricul de tranzacții va fi disponibil după primele vânzări confirmate pe platformă.
                </p>
              </div>
            </div>
          </div>
        </div>

        {adData.user_id && (
          <section className="mb-16 border-t-[3px] border-black pt-12 md:pt-16">
            <h2 className="mb-8 text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              Alte active ale <span className="text-[#FFD100]">vânzătorului</span>
            </h2>
            {sellerOtherListings.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {sellerOtherListings.map((item) => {
                  const st = normalizeSaleType(item.sale_strategy);
                  return (
                  <AdCard
                    key={item.id}
                    id={item.id}
                    title={item.title || ""}
                    image={
                      item.images?.[0] ||
                      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                    }
                    marketPrice={`€${(item.market_price ?? 0).toLocaleString("ro-RO")}`}
                    exitPrice={`€${(item.exit_price ?? 0).toLocaleString("ro-RO")}`}
                    discount={item.discount?.toString() || "0"}
                    score={item.deal_score ? item.deal_score / 10 : 9.0}
                    type={st}
                    {...(st === "auction"
                      ? {
                          offerCount: parseListingOfferCount(item.offer_count),
                          highestOffer: item.highest_offer ?? null,
                          expiresAt:
                            typeof item.expires_at === "string" ? item.expires_at : null,
                        }
                      : {})}
                  />
                );
                })}
              </div>
            ) : (
              <p className="text-sm font-medium text-neutral-600">
                Acesta este singurul activ public al vânzătorului momentan.
              </p>
            )}
          </section>
        )}

        <section className="border-t-[3px] border-black pt-12 md:pt-16">
          <h2 className="mb-8 text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
            Oportunități <span className="text-[#FFD100]">similare</span>
          </h2>

          {similarAds.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {similarAds.map((item) => {
                const st = normalizeSaleType(item.sale_strategy);
                return (
                <AdCard
                  key={item.id}
                  id={item.id}
                  title={item.title || ""}
                  image={
                    item.images?.[0] ||
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                  }
                  marketPrice={`€${(item.market_price ?? 0).toLocaleString("ro-RO")}`}
                  exitPrice={`€${(item.exit_price ?? 0).toLocaleString("ro-RO")}`}
                  discount={item.discount?.toString() || "0"}
                  score={item.deal_score ? item.deal_score / 10 : 9.0}
                  type={st}
                  {...(st === "auction"
                    ? {
                        offerCount: parseListingOfferCount(item.offer_count),
                        highestOffer: item.highest_offer ?? null,
                        expiresAt:
                          typeof item.expires_at === "string" ? item.expires_at : null,
                      }
                    : {})}
                />
              );
              })}
            </div>
          ) : (
            <div className="rounded-[2rem] border-[3px] border-dashed border-black/35 bg-white p-10 text-center">
              <p className="font-bold text-neutral-500">
                Nu există alte active disponibile momentan în categoria „{adData.category}”.
              </p>
            </div>
          )}
        </section>

        {activeModal ? (
          <ListingModals
            activeModal={activeModal}
            onClose={() => setActiveModal(null)}
            adData={adData}
            sellerProfile={sellerProfile}
            acceptSuccess={acceptSuccess}
            acceptActionMessage={acceptActionMessage}
            acceptPhone={acceptPhone}
            acceptEmail={acceptEmail}
            isAccepting={isAccepting}
            onAcceptPhoneChange={setAcceptPhone}
            onAcceptEmailChange={setAcceptEmail}
            onSubmitAccept={() => void submitAcceptExitPrice()}
            onAcceptSuccessClose={() => {
              setActiveModal(null);
              setAcceptSuccess(false);
            }}
            offerSuccess={offerSuccess}
            offerActionMessage={offerActionMessage}
            buyerPhone={buyerPhone}
            buyerEmail={buyerEmail}
            offerMessage={offerMessage}
            offerPrice={offerPrice}
            minOffer={minOffer}
            maxOffer={maxOffer}
            offerStep={offerStep}
            isSubmittingOffer={isSubmittingOffer}
            onBuyerPhoneChange={setBuyerPhone}
            onBuyerEmailChange={setBuyerEmail}
            onOfferMessageChange={setOfferMessage}
            onOfferPriceChange={setOfferPrice}
            onSubmitOffer={() => void submitListingOffer()}
            onOfferSuccessClose={() => {
              setActiveModal(null);
              setOfferSuccess(false);
            }}
            clampOfferPrice={clampOfferPrice}
          />
        ) : null}
      </div>

      {imageLightboxOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Imagine mărită"
          onClick={() => setImageLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute left-3 top-3 z-[210] flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-black text-xl font-black text-white transition hover:bg-[#FFD100] hover:text-black"
            onClick={(e) => {
              e.stopPropagation();
              setImageLightboxOpen(false);
            }}
            aria-label="Închide"
          >
            ✕
          </button>

          {displayImages.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-1 top-1/2 z-[210] -translate-y-1/2 rounded-full border-2 border-white bg-black/85 px-3 py-2 text-sm font-black text-white transition hover:bg-[#FFD100] hover:text-black md:left-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((i) => (i - 1 + displayImages.length) % displayImages.length);
                }}
                aria-label="Imaginea anterioară"
              >
                ←
              </button>
              <button
                type="button"
                className="absolute right-1 top-1/2 z-[210] -translate-y-1/2 rounded-full border-2 border-white bg-black/85 px-3 py-2 text-sm font-black text-white transition hover:bg-[#FFD100] hover:text-black md:right-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((i) => (i + 1) % displayImages.length);
                }}
                aria-label="Imaginea următoare"
              >
                →
              </button>
            </>
          ) : null}

          <div
            className="relative h-[min(85vh,920px)] w-full max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={displayImages[currentImageIndex]}
              alt={adData.title || "Imagine anunț"}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          <p className="pointer-events-none absolute bottom-3 left-0 right-0 px-4 text-center text-[10px] font-semibold uppercase tracking-wide text-white/75">
            Apasă în afara imaginii sau tasta Esc pentru a închide
          </p>
        </div>
      ) : null}
    </div>
  );
}

