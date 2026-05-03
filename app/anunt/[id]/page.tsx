"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdCard from "../../components/AdCard";
import { normalizeSaleType } from "@/utils/normalizeSaleType";

type SellerProfileRow = {
  id: string;
  full_name: string | null;
  kyc_status: string | null;
  user_type: string | null;
  created_at: string | null;
};

const labelBase =
  "block text-[10px] font-black uppercase tracking-widest text-neutral-500";
const inputBase =
  "w-full rounded-xl border-[3px] border-black bg-white p-4 font-semibold text-black outline-none transition focus:border-[#FFD100] focus:ring-4 focus:ring-[#FFD100]/30 placeholder:text-neutral-500";

function strategyBadgeRo(strategy?: string | null): string {
  const n = normalizeSaleType(strategy);
  switch (n) {
    case "auction":
      return "Licitație";
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

function kycStatusRo(status: string | null | undefined): string {
  if (status === "verified") return "Identitate verificată";
  if (status === "processing") return "Verificare în procesare";
  if (status === "requires_input") return "Verificare necesară";
  return "Verificare în așteptare";
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

export default function AdDetail() {
  const params = useParams();
  const id = params.id as string;

  const [isFavorite, setIsFavorite] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [adData, setAdData] = useState<any>(null);
  const [similarAds, setSimilarAds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offerPrice, setOfferPrice] = useState(0);

  const [sellerProfile, setSellerProfile] = useState<SellerProfileRow | null>(null);
  const [sellerOtherListings, setSellerOtherListings] = useState<any[]>([]);
  const [sellerActiveCount, setSellerActiveCount] = useState<number | null>(null);

  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);

  const [acceptPhone, setAcceptPhone] = useState("");
  const [acceptEmail, setAcceptEmail] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  useEffect(() => {
    async function fetchAd() {
      if (!id) return;
      setAdData(null);
      setSimilarAds([]);
      setSellerProfile(null);
      setSellerOtherListings([]);
      setSellerActiveCount(null);
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .eq("status", "active")
          .eq("is_seed", false)
          .maybeSingle();

        if (error) {
          console.error("Eroare la extragerea anunțului:", error);
          setAdData(null);
          return;
        }

        if (
          !data ||
          data.status !== "active" ||
          data.is_seed !== false
        ) {
          setAdData(null);
          return;
        }

        setAdData(data);
        setOfferPrice(data.exit_price);

        if (data.user_id) {
          const [profileRes, othersRes, countRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, full_name, kyc_status, user_type, created_at")
              .eq("id", data.user_id)
              .maybeSingle(),
            supabase
              .from("listings")
              .select("*")
              .eq("user_id", data.user_id)
              .eq("status", "active")
              .eq("is_seed", false)
              .neq("id", data.id)
              .order("created_at", { ascending: false })
              .limit(3),
            supabase
              .from("listings")
              .select("id", { count: "exact", head: true })
              .eq("user_id", data.user_id)
              .eq("status", "active")
              .eq("is_seed", false),
          ]);

          setSellerProfile((profileRes.data as SellerProfileRow) ?? null);
          setSellerOtherListings(othersRes.data ?? []);
          setSellerActiveCount(countRes.count ?? null);
        } else {
          setSellerProfile(null);
          setSellerOtherListings([]);
          setSellerActiveCount(null);
        }

        if (data.category) {
          const { data: similarData } = await supabase
            .from("listings")
            .select("*")
            .eq("category", data.category)
            .eq("status", "active")
            .eq("is_seed", false)
            .neq("id", data.id)
            .limit(3);

          if (similarData) setSimilarAds(similarData);
        }
      } catch (error) {
        console.error("Eroare la extragerea anunțului:", error);
        setAdData(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAd();
  }, [id]);

  const submitListingOffer = async () => {
    if (!buyerPhone || !offerPrice) return;
    setIsSubmittingOffer(true);
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
      setOfferSuccess(true);
      setBuyerPhone("");
      setBuyerEmail("");
      setOfferMessage("");
    } catch (err) {
      console.error(err);
      alert("Eroare la trimiterea ofertei.");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const submitAcceptExitPrice = async () => {
    if (!acceptPhone) return;
    setIsAccepting(true);
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
      setAcceptSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Eroare la confirmare.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F4EC] px-6 font-sans antialiased">
        <div className="w-full max-w-md rounded-[2rem] border-[3px] border-black bg-white p-10 text-center shadow-[12px_12px_0_0_#FFD100]">
          <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-[4px] border-neutral-200 border-t-black"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-600">
            Se încarcă anunțul...
          </p>
        </div>
      </div>
    );
  }

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

  const minOffer = adData.exit_price * 0.7;
  const maxOffer = adData.exit_price;
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

  return (
    <div className="min-h-screen bg-[#F7F4EC] font-sans text-black selection:bg-[#FFD100]/40 selection:text-black antialiased">
      <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-6 md:px-8 md:py-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-white px-4 py-2 shadow-[4px_4px_0_0_#000] transition hover:-translate-x-px hover:border-[#FFD100]"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black md:text-[11px]">
              ← Explorează active
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
              <div className="group relative h-[300px] w-full cursor-pointer overflow-hidden rounded-[2rem] border-[3px] border-black bg-neutral-100 shadow-[10px_10px_0_0_#FFD100] md:h-[400px] lg:h-[450px]">
                <Image
                  src={displayImages[currentImageIndex]}
                  alt={adData.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  priority
                />
                <div className="absolute left-4 top-4 rounded-lg border-2 border-black bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#FFD100]">
                  {strategyBadgeRo(adData.sale_strategy)}
                </div>
              </div>

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
                {renderTitle(adData.title)}
              </h1>

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
                    €{(adData.market_price - adData.exit_price).toLocaleString("ro-RO")}
                  </p>
                </div>

                <div className="mb-8 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-neutral-100 pb-2">
                    <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500">
                      Preț estimat de piață
                    </span>
                    <span className="font-black italic opacity-35 line-through [font-size:clamp(1rem,3vw,1.35rem)]">
                      €{adData.market_price.toLocaleString("ro-RO")}
                    </span>
                  </div>
                  <div className="flex w-full flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wide text-neutral-700">
                      Preț de vânzare rapidă
                    </span>
                    <span className="w-full break-words font-black italic leading-none [font-size:clamp(2rem,5vw,3rem)]">
                      €{adData.exit_price.toLocaleString("ro-RO")}
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
                    }}
                    className="w-full rounded-2xl border-[3px] border-black bg-black py-4 font-black uppercase tracking-wider text-[#FFD100] shadow-[6px_6px_0_0_#000] transition hover:brightness-110 md:py-5 md:text-sm"
                  >
                    Accept prețul de vânzare rapidă
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal("offer");
                      setOfferSuccess(false);
                    }}
                    className="w-full rounded-2xl border-[3px] border-black bg-white py-4 font-black uppercase tracking-wider text-black shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-50 md:text-xs"
                  >
                    Trimite ofertă
                  </button>
                </div>

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
                {sellerOtherListings.map((item) => (
                  <AdCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    image={
                      item.images?.[0] ||
                      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                    }
                    marketPrice={`€${item.market_price.toLocaleString("ro-RO")}`}
                    exitPrice={`€${item.exit_price.toLocaleString("ro-RO")}`}
                    discount={item.discount?.toString() || "0"}
                    score={item.deal_score ? item.deal_score / 10 : 9.0}
                    type={normalizeSaleType(item.sale_strategy)}
                  />
                ))}
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
              {similarAds.map((item) => (
                <AdCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={
                    item.images?.[0] ||
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                  }
                  marketPrice={`€${item.market_price.toLocaleString("ro-RO")}`}
                  exitPrice={`€${item.exit_price.toLocaleString("ro-RO")}`}
                  discount={item.discount?.toString() || "0"}
                  score={item.deal_score ? item.deal_score / 10 : 9.0}
                  type={normalizeSaleType(item.sale_strategy)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border-[3px] border-dashed border-black/35 bg-white p-10 text-center">
              <p className="font-bold text-neutral-500">
                Nu există alte active disponibile momentan în categoria „{adData.category}”.
              </p>
            </div>
          )}
        </section>

        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              role="presentation"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActiveModal(null)}
            />
            <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[14px_14px_0_0_#FFD100] md:p-10">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="absolute right-5 top-5 rounded-xl border-[3px] border-black px-3 py-1.5 text-[10px] font-black uppercase transition hover:bg-black hover:text-[#FFD100] md:right-6 md:top-6"
              >
                Închide
              </button>

              {activeModal === "verified" && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
                    Încredere pe{" "}
                    <span className="text-[#FFD100]">platformă</span>
                  </h3>
                  <div className="space-y-3 text-base font-medium text-neutral-800">
                    <p>
                      Situația contului pentru acest utilizator este:{" "}
                      <strong className="font-bold text-black">
                        {kycStatusRo(sellerProfile?.kyc_status ?? null)}
                      </strong>
                      .
                    </p>
                    <p className="text-sm italic text-neutral-600">
                      Nu afișăm public telefon sau e-mail. Contactul legitim se face printr-o ofertă.
                    </p>
                    <p className="rounded-xl border-[3px] border-black/15 bg-[#F7F4EC]/80 p-4 text-sm text-neutral-700">
                      Istoricul de tranzacții va fi disponibil după primele vânzări confirmate pe platformă.
                    </p>
                  </div>
                </div>
              )}

              {activeModal === "docs" && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
                    Fișier <span className="text-[#FFD100]">documentar</span>
                  </h3>
                  <p className="text-base font-medium text-neutral-800">
                    Anunțurile marcate sunt structurate pentru a include documentele uzuale din tranzacția
                    pentru categoria aleasă:
                  </p>
                  <ul className="grid grid-cols-1 gap-3 text-xs font-bold uppercase tracking-wide sm:grid-cols-2">
                    <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">Act proprietate</li>
                    <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">Intabulare</li>
                    <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">Certificat fiscal</li>
                    <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">Evaluare / expertiză</li>
                  </ul>
                  <p className="text-xs font-medium text-neutral-600">
                    Lista exactă variază după tipul activului. Detaliile finale se stabilesc cu vânzătorul după depunerea unei oferte.
                  </p>
                </div>
              )}

              {activeModal === "ai-score" && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
                    Scor <span className="text-[#FFD100]">oportunitate</span>
                  </h3>
                  <p className="text-base font-medium text-neutral-800">
                    Scorul {adData.deal_score ?? "—"} reflectă o combinație de factori de piață și lichiditate (indicativ,
                    nu garanție).
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-3 text-center">
                      <p className="text-xl font-black italic leading-none md:text-2xl">40%</p>
                      <p className="mt-2 text-[7px] font-black uppercase leading-tight md:text-[8px]">
                        Poziție față de piață
                      </p>
                    </div>
                    <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-3 text-center">
                      <p className="text-xl font-black italic leading-none md:text-2xl">35%</p>
                      <p className="mt-2 text-[7px] font-black uppercase leading-tight md:text-[8px]">
                        Lichiditate / cerere
                      </p>
                    </div>
                    <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-3 text-center">
                      <p className="text-xl font-black italic leading-none md:text-2xl">25%</p>
                      <p className="mt-2 text-[7px] font-black uppercase leading-tight md:text-[8px]">
                        Atribute activ
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeModal === "accept" && (
                <div className="space-y-8 pt-4 text-center">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
                    Confirmare <span className="text-[#FFD100]">preț</span>
                  </h3>

                  {acceptSuccess ? (
                    <div className="animate-in zoom-in rounded-2xl border-[3px] border-black bg-[#FFD100] p-6 text-center shadow-[4px_4px_0_0_#000] duration-300">
                      <span className="mb-4 block text-5xl" aria-hidden>
                        🤝
                      </span>
                      <p className="mb-2 text-xl font-black uppercase italic text-black">
                        Cererea ta a fost înregistrată.
                      </p>
                      <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-neutral-900">
                        Vânzătorul a fost notificat în legătură cu acordul tău la prețul de{" "}
                        €{adData.exit_price.toLocaleString("ro-RO")}. Te poate contacta folosind datele transmise prin
                        ofertă.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          setAcceptSuccess(false);
                        }}
                        className="mt-6 w-full rounded-xl border-[3px] border-black bg-black py-4 text-[10px] font-black uppercase tracking-widest text-[#FFD100] transition hover:bg-neutral-900"
                      >
                        Închide
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-left text-base font-medium text-neutral-800">
                        Confirmi achiziția la{" "}
                        <span className="font-black">€{adData.exit_price.toLocaleString("ro-RO")}</span> (preț de vânzare
                        rapidă)?
                      </p>
                      <div className="space-y-4 text-left">
                        <div className="border-t-2 border-neutral-100 pt-4">
                          <p className={`${labelBase} mb-3`}>
                            Lasă datele tale — vânzătorul te contactează prin canalele agreate
                          </p>
                          <input
                            type="tel"
                            value={acceptPhone}
                            onChange={(e) => setAcceptPhone(e.target.value)}
                            placeholder="Număr de telefon"
                            className={`${inputBase} mb-3 font-bold uppercase`}
                          />
                          <input
                            type="email"
                            value={acceptEmail}
                            onChange={(e) => setAcceptEmail(e.target.value)}
                            placeholder="E-mail (opțional)"
                            className={`${inputBase} mb-3 normal-case`}
                          />
                          <button
                            type="button"
                            onClick={submitAcceptExitPrice}
                            disabled={isAccepting || !acceptPhone}
                            className="w-full rounded-xl border-[3px] border-black bg-black py-4 font-black uppercase tracking-widest text-[#FFD100] shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isAccepting ? "Se trimite..." : "Trimite acordul"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeModal === "offer" && (
                <div className="space-y-6 pt-4">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
                    Trimite <span className="text-[#FFD100]">ofertă</span>
                  </h3>

                  {offerSuccess ? (
                    <div className="animate-in zoom-in rounded-2xl border-[3px] border-black bg-[#FFD100] p-6 text-center shadow-[4px_4px_0_0_#000] duration-300">
                      <span className="mb-4 block text-5xl" aria-hidden>
                        📬
                      </span>
                      <p className="mb-2 text-xl font-black uppercase italic text-black">Oferta a fost trimisă.</p>
                      <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-neutral-900">
                        Vânzătorul a fost notificat și te poate contacta folosind datele furnizate.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal(null);
                          setOfferSuccess(false);
                        }}
                        className="mt-6 w-full rounded-xl border-[3px] border-black bg-black py-4 text-[10px] font-black uppercase tracking-widest text-[#FFD100] transition hover:bg-neutral-900"
                      >
                        Închide
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-6">
                        <p className={labelBase}>Oferta ta (EUR)</p>
                        <p className="mb-4 font-black italic tracking-tighter text-black [font-size:clamp(2rem,5vw,2.5rem)]">
                          €{offerPrice.toLocaleString("ro-RO")}
                        </p>
                        <input
                          type="range"
                          min={minOffer}
                          max={maxOffer}
                          step="1000"
                          value={offerPrice}
                          onChange={(e) => setOfferPrice(Number(e.target.value))}
                          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-black"
                        />
                        <div className="mt-3 flex justify-between text-[9px] font-black uppercase text-neutral-500">
                          <span className="text-red-700">Min: €{minOffer.toLocaleString("ro-RO")} (−30%)</span>
                          <span>Max: €{maxOffer.toLocaleString("ro-RO")}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <input
                          type="tel"
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          placeholder="Număr de telefon"
                          className={inputBase}
                        />
                        <input
                          type="email"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="E-mail (opțional)"
                          className={`${inputBase} normal-case`}
                        />
                        <textarea
                          value={offerMessage}
                          onChange={(e) => setOfferMessage(e.target.value)}
                          placeholder="Mesaj pentru vânzător (ex.: termeni de plată, termen de răspuns)..."
                          rows={3}
                          className={`${inputBase} resize-none font-medium normal-case`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={submitListingOffer}
                        disabled={isSubmittingOffer || !buyerPhone}
                        className="mt-2 w-full rounded-2xl border-[3px] border-black bg-black py-5 font-black uppercase tracking-widest text-[#FFD100] shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmittingOffer ? "Se trimite..." : "Trimite oferta"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
