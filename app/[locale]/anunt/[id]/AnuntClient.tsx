"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/src/i18n/navigation";
import { MessagesSquare, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthModal from "@/app/components/AuthModal";
import AdCard from "@/app/components/AdCard";
import { normalizeSaleType } from "@/utils/normalizeSaleType";
import { parseListingOfferCount } from "@/utils/auctionListingUi";
import { buildSocialShareKit } from "@/lib/socialShare";
import { trackEvent } from "@/lib/analytics";
import supabaseImageLoader from "@/lib/supabase-image-loader";
import {
  formatEurAmount,
  formatMemberSince,
  getNumberLocale,
} from "@/lib/i18n/format";
import {
  adCardPricingProps,
  dealScoreForCard,
  hasValidMarketComparison,
  isValidPrice,
} from "@/lib/listingPrice";
import { getPricingMode } from "@/lib/pricingMode";
import { resolveListingField } from "@/lib/i18n/listingContent";
import type {
  ListingSellerContext,
  PublicListingRow,
} from "@/lib/listingSeo";
import { labelBase, type ListingModalId } from "./listingModalShared";
import {
  getFutureMobilityDetails,
  isFutureMobilityOrderLike,
  type FutureMobilityBadgeId,
} from "@/lib/futureMobility";
import FutureMobilitySections, {
  FutureMobilityAvailabilityLine,
  FutureMobilityBadgePills,
  FutureMobilityDealerCard,
  FutureMobilityVideoSection,
} from "./FutureMobilitySections";
import { isPremiumSellerListing } from "@/lib/listingPremium";
import {
  getFinancingVehiclePrice,
  isFinancingCalculatorEnabled,
} from "@/lib/listingFinancing";
import { financingConfig } from "@/lib/financingConfig";
import PremiumSellerCard from "./PremiumSellerCard";
import StickyContactBar from "./StickyContactBar";

const ListingModals = dynamic(() => import("./ListingModals"), {
  ssr: false,
  loading: () => null,
});

const FinancingCalculatorModal = dynamic(() => import("./FinancingCalculatorModal"), {
  ssr: false,
  loading: () => null,
});

type DetailFormat = "plain" | "mp" | "km" | "eur" | "tva_boolean";

type DetailDef = {
  keys: readonly string[];
  labelKey: string;
  format: DetailFormat;
};

const DETAILS_BY_CATEGORY: Record<string, readonly DetailDef[]> = {
  "Auto & Moto": [
    { keys: ["vehicle_year", "year"], labelKey: "year", format: "plain" },
    { keys: ["vehicle_km", "km", "kilometers"], labelKey: "mileage", format: "km" },
    { keys: ["transmission"], labelKey: "transmission", format: "plain" },
    { keys: ["fuel"], labelKey: "fuel", format: "plain" },
    { keys: ["bodyType", "body_type"], labelKey: "bodyType", format: "plain" },
    { keys: ["drivetrain", "traction"], labelKey: "drivetrain", format: "plain" },
    { keys: ["accident_status", "accidents"], labelKey: "accidentHistory", format: "plain" },
  ],
  Imobiliare: [
    { keys: ["propType", "property_type", "tip_proprietate"], labelKey: "propertyType", format: "plain" },
    { keys: ["location", "locatie", "zona"], labelKey: "location", format: "plain" },
    { keys: ["surface", "suprafata"], labelKey: "surface", format: "mp" },
    { keys: ["landSurface", "land_surface"], labelKey: "landSurface", format: "mp" },
    { keys: ["rooms", "camere"], labelKey: "rooms", format: "plain" },
    { keys: ["buildYear", "build_year", "an_constructie"], labelKey: "buildYear", format: "plain" },
    { keys: ["parking", "parcaj"], labelKey: "parking", format: "plain" },
    { keys: ["tva"], labelKey: "vat", format: "tva_boolean" },
  ],
  "Lux & Ceasuri": [
    { keys: ["brand"], labelKey: "brand", format: "plain" },
    { keys: ["model", "refModel"], labelKey: "model", format: "plain" },
    { keys: ["boxPapers", "box_papers", "documents"], labelKey: "boxPapers", format: "plain" },
    { keys: ["mechanism"], labelKey: "mechanism", format: "plain" },
    { keys: ["condition", "conditie", "stare"], labelKey: "condition", format: "plain" },
    { keys: ["year", "optionalYear", "purchaseYear"], labelKey: "year", format: "plain" },
  ],
  Gadgets: [
    { keys: ["brand"], labelKey: "brand", format: "plain" },
    { keys: ["model", "specs"], labelKey: "model", format: "plain" },
    { keys: ["condition", "stare"], labelKey: "condition", format: "plain" },
    { keys: ["storage"], labelKey: "storage", format: "plain" },
    { keys: ["warranty", "waranty"], labelKey: "warranty", format: "plain" },
  ],
  "Foto & Audio": [
    { keys: ["brand"], labelKey: "brand", format: "plain" },
    { keys: ["model", "specs"], labelKey: "model", format: "plain" },
    { keys: ["condition", "stare"], labelKey: "condition", format: "plain" },
    { keys: ["warranty", "waranty"], labelKey: "warranty", format: "plain" },
  ],
  "Afaceri de vânzare": [
    { keys: ["industry", "businessDomain", "domeniu"], labelKey: "industry", format: "plain" },
    { keys: ["location", "locatie"], labelKey: "location", format: "plain" },
    { keys: ["revenue", "cifra"], labelKey: "revenue", format: "eur" },
    { keys: ["profit"], labelKey: "profit", format: "eur" },
    { keys: ["employees", "employees_count"], labelKey: "employees", format: "plain" },
  ],
};

type DetailFormatContext = {
  numberLocale: string;
  sqmUnit: string;
  kmUnit: string;
  yesLabel: string;
  noLabel: string;
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

function formatMoneyEURIfNumeric(raw: unknown, numberLocale: string): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `€${raw.toLocaleString(numberLocale)}`;
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (/[a-zA-ZîâășțÎÂĂȘȚ]/.test(t)) return t;
    if (/^[\d\s.,€-]+$/.test(t)) {
      const normalized = t.replace(/€/g, "").replace(/\u00a0/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
      const n = Number(normalized);
      if (Number.isFinite(n)) return `€${n.toLocaleString(numberLocale)}`;
    }
    return t;
  }
  return String(raw ?? "").trim();
}

function formatSqm(raw: unknown, ctx: DetailFormatContext): string {
  if (typeof raw === "number" && Number.isFinite(raw))
    return `${raw.toLocaleString(ctx.numberLocale)} ${ctx.sqmUnit}`;
  const s = String(raw).trim();
  if (/mp|m²|m2|sqm/i.test(s)) return s;
  return `${s} ${ctx.sqmUnit}`;
}

function formatKm(raw: unknown, ctx: DetailFormatContext): string {
  if (typeof raw === "number" && Number.isFinite(raw))
    return `${raw.toLocaleString(ctx.numberLocale)} ${ctx.kmUnit}`;
  const s = String(raw).trim();
  if (/km\b/i.test(s)) return s;
  const n = Number(String(s).replace(/\s|\./g, "").replace(",", "."));
  if (Number.isFinite(n)) return `${n.toLocaleString(ctx.numberLocale)} ${ctx.kmUnit}`;
  return `${s} ${ctx.kmUnit}`;
}

function formatTva(raw: unknown, yesLabel: string, noLabel: string): string {
  if (typeof raw === "boolean") return raw ? yesLabel : noLabel;
  if (typeof raw === "string") {
    const low = raw.trim().toLowerCase();
    if (low === "true" || low === "da" || low === "yes" || low === "1") return yesLabel;
    if (low === "false" || low === "nu" || low === "no" || low === "0") return noLabel;
  }
  return String(raw).trim();
}

function formatDetailField(raw: unknown, format: DetailFormat, ctx: DetailFormatContext): string {
  switch (format) {
    case "mp":
      return formatSqm(raw, ctx);
    case "km":
      return formatKm(raw, ctx);
    case "eur":
      return formatMoneyEURIfNumeric(raw, ctx.numberLocale);
    case "tva_boolean":
      return formatTva(raw, ctx.yesLabel, ctx.noLabel);
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
  const t = useTranslations("ListingDetail");
  const locale = useLocale();
  const numberLocale = getNumberLocale(locale);
  const detailFormatCtx: DetailFormatContext = {
    numberLocale,
    sqmUnit: t("details.sqmUnit"),
    kmUnit: t("details.kmUnit"),
    yesLabel: t("details.yes"),
    noLabel: t("details.no"),
  };

  const strategyBadge = (strategy?: string | null): string => {
    const n = normalizeSaleType(strategy);
    switch (n) {
      case "auction":
        return t("strategyBadge.auction");
      case "urgent":
        return t("strategyBadge.urgent");
      case "extreme":
        return t("strategyBadge.extreme");
      default:
        return t("strategyBadge.standard");
    }
  };

  const kycStatusLabel = useCallback(
    (status: string | null | undefined): string => {
      if (status === "verified") return t("kyc.verified");
      if (status === "processing") return t("kyc.processing");
      if (status === "requires_input") return t("kyc.requiresInput");
      return t("kyc.pending");
    },
    [t],
  );

  const userTypeLabel = (userType: string | null | undefined): string => {
    if (userType === "buyer") return t("userType.buyer");
    if (userType === "seller") return t("userType.seller");
    if (userType === "guest") return t("userType.guest");
    return t("userType.default");
  };

  const listingTitle = resolveListingField(
    initialListing,
    "title",
    locale,
    t("defaults.listingTitle"),
  );
  const listingDescription = resolveListingField(
    initialListing,
    "description",
    locale,
    "",
  );

  const formatPrice = (value: number | null | undefined) =>
    formatEurAmount(Number(value), locale);
  const formatListingPrice = (value: unknown) => {
    if (!isValidPrice(value)) return null;
    return formatEurAmount(Number(value), locale);
  };
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeModal, setActiveModal] = useState<ListingModalId | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [financingModalOpen, setFinancingModalOpen] = useState(false);

  const [adData] = useState<PublicListingRow>(initialListing);
  const [similarAds] = useState<PublicListingRow[]>(initialSimilar);
  const [offerPrice, setOfferPrice] = useState(Number(initialListing.exit_price) || 0);

  const fm = useMemo(
    () => getFutureMobilityDetails(adData.details),
    [adData.details],
  );
  const showPremiumSeller = useMemo(
    () => isPremiumSellerListing(adData),
    [adData],
  );
  const showFinancingCalculator = useMemo(
    () => isFinancingCalculatorEnabled(adData),
    [adData],
  );
  const financingVehiclePrice = useMemo(
    () => (showFinancingCalculator ? getFinancingVehiclePrice(adData) : null),
    [adData, showFinancingCalculator],
  );
  const pricingMode = getPricingMode(adData.details);
  const isEvaluatedPricing = pricingMode === "evaluated";
  const isPriceOnRequest = pricingMode === "price_on_request";
  const isFmOrderLike = fm ? isFutureMobilityOrderLike(fm) : false;
  const hasValidFmPrice =
    typeof adData.exit_price === "number" &&
    Number.isFinite(adData.exit_price) &&
    adData.exit_price > 0;
  const showDiscount =
    !isFmOrderLike &&
    isEvaluatedPricing &&
    Number.isFinite(Number(adData.discount)) &&
    Number(adData.discount) > 0;
  const showLiquidityScore =
    !isFmOrderLike && isEvaluatedPricing && dealScoreForCard(adData.deal_score) !== null;
  const hasValidExitPrice = isValidPrice(adData.exit_price);
  const canUseClassicOfferFlow = !isPriceOnRequest && hasValidExitPrice;

  const fmBadgeLabelsForCard = (details: unknown): string[] | undefined => {
    const parsed = getFutureMobilityDetails(details);
    if (!parsed?.badges?.length) return undefined;
    const labelMap: Record<FutureMobilityBadgeId, string> = {
      FUTURE_COLLECTION: t("futureMobility.badges.futureCollection"),
      IMPORT_PREMIUM: t("futureMobility.badges.importPremium"),
      EV_PREMIUM: t("futureMobility.badges.evPremium"),
      CONFIGURABIL: t("futureMobility.badges.configurable"),
    };
    const labels = parsed.badges
      .map((badge) => labelMap[badge])
      .filter((label): label is string => Boolean(label));
    return labels.length > 0 ? labels : undefined;
  };

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

  const router = useRouter();
  const [isOpeningRoom, setIsOpeningRoom] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Deschide (sau creează) camera de negociere între investitor și vânzător pentru acest anunț.
  const openNegotiationRoom = async () => {
    setRoomError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Neautentificat → trimitem la login (modal).
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const sellerId =
      typeof adData.user_id === "string" && adData.user_id.trim()
        ? adData.user_id.trim()
        : null;

    if (!sellerId) {
      setRoomError(t("errors.sellerUnavailable"));
      return;
    }
    if (user.id === sellerId) {
      setRoomError(t("errors.ownListing"));
      return;
    }

    setIsOpeningRoom(true);
    try {
      // Verificăm dacă există deja o cameră pentru (listing, buyer, seller).
      const { data: existing, error: lookupError } = await supabase
        .from("negotiation_rooms")
        .select("id")
        .eq("listing_id", adData.id)
        .eq("buyer_id", user.id)
        .eq("seller_id", sellerId)
        .maybeSingle();

      if (lookupError) throw lookupError;

      let roomId = existing?.id as string | undefined;

      if (!roomId) {
        const { data: created, error: insertError } = await supabase
          .from("negotiation_rooms")
          .insert({
            listing_id: adData.id,
            buyer_id: user.id,
            seller_id: sellerId,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        roomId = created?.id as string | undefined;
      }

      if (!roomId) throw new Error("room_id missing");

      trackEvent("open_negotiation_room", {
        listing_id: adData.id,
        category: adData.category || "unknown",
      });

      router.push(`/negociere/${roomId}`);
    } catch (err) {
      console.error("[negociere] Eroare deschidere cameră:", err);
      setRoomError(t("errors.roomOpenFailed"));
      setIsOpeningRoom(false);
    }
  };

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
      ...(fm
        ? {
            collection: "future_mobility",
            ...(fm.model_slug ? { model_slug: fm.model_slug } : {}),
            ...(fm.availability_type ? { availability_type: fm.availability_type } : {}),
          }
        : {}),
    });
  }, [adData, fm]);

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
        text: t("errors.offerSubmitFailed"),
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
        text: t("errors.acceptSubmitFailed"),
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
            {t("unavailable.title")}
          </h1>
          <p className="mb-10 text-sm font-medium text-neutral-600">
            {t("unavailable.description")}
          </p>
          <Link
            href="/"
            className="inline-block w-full rounded-2xl border-[3px] border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-[#FFD100] transition hover:brightness-110"
          >
            {t("unavailable.backHome")}
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
    sellerProfile?.full_name?.trim() || t("defaults.sellerName");
  const displayedActiveListingCount =
    sellerActiveCount !== null ? sellerActiveCount : sellerOtherListings.length + 1;

  const isAuctionDetail = normalizeSaleType(adData.sale_strategy) === "auction";
  const auctionOfferTotalForUi = isAuctionDetail ? parseListingOfferCount(adData.offer_count) : 0;
  const auctionOffersReceived =
    isAuctionDetail && auctionOfferTotalForUi > 0
      ? t("auction.offersReceived", { count: auctionOfferTotalForUi })
      : null;
  const auctionHighest =
    isAuctionDetail && Number(adData.highest_offer) > 0
      ? t("auction.highestOffer", {
          amount: formatEurAmount(Number(adData.highest_offer), locale),
        })
      : null;
  const auctionFereastra = (() => {
    if (!isAuctionDetail || adData.expires_at == null) return null;
    const d = new Date(String(adData.expires_at));
    if (Number.isNaN(d.getTime())) return null;
    const formatted = new Intl.DateTimeFormat(numberLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    return t("auction.biddingWindowUntil", { date: formatted });
  })();
  const sellerMemberSince = formatMemberSince(sellerProfile?.created_at, locale);

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

    const rows: { label: string; display: string }[] = [];
    if (defs?.length) {
      for (const def of defs) {
        const raw = pickFirstPresent(ad, def.keys);
        if (!detailValuePresent(raw)) continue;
        rows.push({
          label: t(`details.fields.${def.labelKey}` as "details.fields.year"),
          display: formatDetailField(raw, def.format, detailFormatCtx),
        });
      }
    }

    if (rows.length === 0) {
      return (
        <p className="mt-6 text-sm font-medium italic text-neutral-500">
          {t("details.empty")}
        </p>
      );
    }

    return (
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {rows.map(({ label, display }, idx) => (
          <div
            key={`${label}-${idx}`}
            className="rounded-xl border-[3px] border-black bg-neutral-50/80 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.08)] md:rounded-2xl"
          >
            <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-neutral-400">
              {label}
            </p>
            <p className="font-bold leading-snug text-black [overflow-wrap:anywhere]">{display}</p>
          </div>
        ))}
      </div>
    );
  };

  const trustKycChipLabel =
    sellerProfile?.kyc_status === "verified"
      ? t("trust.verifiedIdentity")
      : t("trust.trustPrefix", { status: kycStatusLabel(sellerProfile?.kyc_status ?? null) });

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
      <div
        className={`mx-auto max-w-[1400px] px-4 pt-6 md:px-8 md:py-10 ${
          showPremiumSeller ? "pb-28 md:pb-20" : "pb-20"
        }`}
      >
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-white px-4 py-2 shadow-[4px_4px_0_0_#000] transition hover:-translate-x-px hover:border-[#FFD100]"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black md:text-[11px]">
              {t("navigation.backHome")}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className={`flex items-center gap-2 rounded-xl border-[3px] border-black px-5 py-2.5 font-black uppercase text-[9px] tracking-widest transition md:text-[10px] ${
              isFavorite ? "border-red-600 bg-red-600 text-white shadow-[4px_4px_0_0_#000]" : "bg-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:border-[#FFD100]"
            }`}
          >
            {isFavorite ? t("navigation.favoriteSaved") : t("navigation.favoriteAdd")}
          </button>
        </div>

        <div className="mb-14 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-8 lg:col-span-8">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setImageLightboxOpen(true)}
                className="group relative h-[300px] w-full cursor-pointer overflow-hidden rounded-[2rem] border-[3px] border-black bg-neutral-100 text-left shadow-[10px_10px_0_0_#FFD100] transition hover:border-[#FFD100] md:h-[400px] lg:h-[450px]"
                aria-label={t("gallery.openLightbox")}
              >
                <Image
                  src={displayImages[currentImageIndex]}
                  alt={listingTitle || t("defaults.listingImageAlt")}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  priority
                  loader={supabaseImageLoader}
                />
                <div className="pointer-events-none absolute left-4 top-4 rounded-lg border-2 border-black bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#FFD100]">
                  {strategyBadge(adData.sale_strategy)}
                </div>
                <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[90%] -translate-x-1/2 rounded-lg bg-black/65 px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
                  {t("gallery.tapToEnlarge")}
                </div>
              </button>

              {displayImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3 md:gap-4">
                  {displayImages.map((img: string, index: number) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentImageIndex(index)}
                      aria-label={t("gallery.selectImage", {
                        index: index + 1,
                        total: displayImages.length,
                      })}
                      aria-current={currentImageIndex === index ? "true" : undefined}
                      className={`relative h-16 w-full overflow-hidden rounded-xl border-[3px] transition-all md:h-20 lg:h-24 ${
                        currentImageIndex === index
                          ? "scale-[1.02] border-[#FFD100] opacity-100 shadow-[4px_4px_0_0_#000]"
                          : "border-black opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image src={img} alt={t("gallery.thumbnailAlt", { index: index + 1 })} fill className="object-cover" loader={supabaseImageLoader} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {fm ? <FutureMobilityVideoSection fm={fm} /> : null}

            <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.12)] md:p-10 md:shadow-[10px_10px_0_0_#FFD100]">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border-2 border-black bg-[#F7F4EC] px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                  {adData.category}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                  ID: {typeof adData.id === "string" ? adData.id.split("-")[0] : ""}
                </span>
              </div>
              {fm ? (
                <div className="mb-4">
                  <FutureMobilityBadgePills fm={fm} />
                </div>
              ) : null}
              <h1 className="text-3xl font-black uppercase italic leading-[0.95] tracking-tighter text-black md:text-4xl lg:text-5xl">
                {renderTitle(listingTitle)}
              </h1>
              {fm ? <FutureMobilityAvailabilityLine fm={fm} /> : null}

              {isAuctionDetail && (
                <div className="mt-5 space-y-2 rounded-xl border-[3px] border-black bg-[#FFFEF6] p-4">
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-black border-b border-black/15 pb-2">
                    {t("auction.title")}
                  </h2>
                  {auctionOffersReceived ? (
                    <p className="text-xs font-semibold leading-snug text-neutral-900">{auctionOffersReceived}</p>
                  ) : (
                    <p className="text-xs font-semibold leading-snug text-neutral-900">
                      {t("auction.beFirstOffer")}
                    </p>
                  )}
                  {auctionHighest ? (
                    <p className="text-xs font-semibold leading-snug text-neutral-900">{auctionHighest}</p>
                  ) : null}
                  {auctionFereastra ? (
                    <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-800">
                      {auctionFereastra}
                    </p>
                  ) : null}
                  <p className="border-t border-black/15 pt-2 text-[11px] font-medium leading-relaxed text-neutral-700">
                    {t("auction.disclaimer")}
                  </p>
                </div>
              )}

              {fm ? <FutureMobilitySections fm={fm} /> : renderTechnicalDetails()}

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
                  {t("trust.documentFile")}
                </button>
                {showLiquidityScore ? (
                  <button
                    type="button"
                    onClick={() => setActiveModal("ai-score")}
                    className="flex items-center gap-1.5 rounded-xl border-[3px] border-black bg-[#FFD100] px-4 py-2 font-black uppercase text-[9px] tracking-wider shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:brightness-105"
                  >
                    <span className="text-sm" aria-hidden>
                      ⚡
                    </span>
                    {t("trust.liquidityScore", { score: Number(adData.deal_score) })}
                  </button>
                ) : null}
              </div>

              <div className="mt-8 border-t-[3px] border-black pt-6">
                <h2 className="mb-3 text-lg font-black uppercase italic tracking-tight md:text-xl">
                  {t("about.title")}{" "}
                  <span className="text-neutral-500">{t("about.titleHighlight")}</span>
                </h2>
                <p className="max-w-3xl text-sm font-medium italic leading-relaxed text-neutral-800 md:text-base whitespace-pre-wrap">
                  {listingDescription}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.95)] md:shadow-[12px_12px_0_0_#FFD100]">
                {!isFmOrderLike &&
                isEvaluatedPricing &&
                hasValidMarketComparison(adData.market_price, adData.exit_price) ? (
                  <div className="mb-6 flex flex-col justify-center rounded-[1.25rem] border-[3px] border-black bg-[#FFD100] p-5 shadow-[4px_4px_0_0_#000]">
                    <p className={`${labelBase} mb-1 text-black/60`}>{t("pricing.potentialProfit")}</p>
                    <p className="break-words font-black italic leading-none text-black uppercase [font-size:clamp(1.75rem,4vw,2.75rem)]">
                      {formatListingPrice(
                        Number(adData.market_price) - Number(adData.exit_price),
                      )}
                    </p>
                  </div>
                ) : null}

                <div className="mb-8 space-y-4">
                  {!isFmOrderLike && isEvaluatedPricing && isValidPrice(adData.market_price) ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-neutral-100 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500">
                        {t("pricing.marketPrice")}
                      </span>
                      <span className="font-black italic opacity-35 line-through [font-size:clamp(1rem,3vw,1.35rem)]">
                        {formatListingPrice(adData.market_price)}
                      </span>
                    </div>
                  ) : null}
                  {(hasValidFmPrice || (!isFmOrderLike && hasValidExitPrice)) ? (
                    <div className="flex w-full flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wide text-neutral-700">
                        {isFmOrderLike && hasValidFmPrice
                          ? t("futureMobility.guidancePriceFrom")
                          : t("pricing.exitPrice")}
                      </span>
                      <span className="w-full break-words font-black italic leading-none [font-size:clamp(2rem,5vw,3rem)]">
                        {formatListingPrice(adData.exit_price)}
                      </span>
                    </div>
                  ) : null}
                  {showDiscount ? (
                    <div className="inline-flex rounded-lg border-2 border-black bg-black px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#FFD100]">
                      {t("pricing.discountFromMarket", {
                        percent: Math.round(Number(adData.discount)),
                      })}
                    </div>
                  ) : null}
                  {isFmOrderLike ? (
                    <p className="text-xs font-medium leading-relaxed text-neutral-600">
                      {t("futureMobility.partnerConfirmNote")}
                    </p>
                  ) : null}
                </div>

                {showFinancingCalculator && financingVehiclePrice ? (
                  <button
                    type="button"
                    onClick={() => {
                      trackEvent("open_financing_calculator", {
                        listing_id: adData.id,
                        partner: financingConfig.partnerId,
                      });
                      setFinancingModalOpen(true);
                    }}
                    className="mb-3 w-full rounded-2xl border-[3px] border-black bg-[#FDFCF8] py-3 font-black uppercase tracking-wider text-black shadow-[4px_4px_0_0_#000] transition hover:bg-white md:mb-4 md:text-xs"
                  >
                    {t("financing.calculateCta")}
                  </button>
                ) : null}

                <div className="space-y-3">
                  {!isFmOrderLike && canUseClassicOfferFlow ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal("accept");
                        setAcceptSuccess(false);
                        setAcceptActionMessage(null);
                      }}
                      className="w-full rounded-2xl border-[3px] border-black bg-black py-4 font-black uppercase tracking-wider text-[#FFD100] shadow-[6px_6px_0_0_#000] transition hover:brightness-110 md:py-5 md:text-sm"
                    >
                      {t("actions.acceptExitPrice")}
                    </button>
                  ) : isFmOrderLike ? (
                    <button
                      type="button"
                      onClick={() => {
                        trackEvent("click_request_personalized_offer", {
                          listing_id: adData.id,
                          category: adData.category || "unknown",
                          collection: "future_mobility",
                          ...(fm?.model_slug ? { model_slug: fm.model_slug } : {}),
                          ...(fm?.availability_type
                            ? { availability_type: fm.availability_type }
                            : {}),
                        });
                        setActiveModal("offer");
                        setOfferSuccess(false);
                        setOfferActionMessage(null);
                      }}
                      className="w-full rounded-2xl border-[3px] border-black bg-black py-4 font-black uppercase tracking-wider text-[#FFD100] shadow-[6px_6px_0_0_#000] transition hover:brightness-110 md:py-5 md:text-sm"
                    >
                      {t("futureMobility.requestPersonalizedOffer")}
                    </button>
                  ) : isPriceOnRequest ? (
                    <button
                      type="button"
                      disabled
                      title={
                        process.env.NODE_ENV !== "production"
                          ? "Sprint B: contact modal fără slider pentru price_on_request."
                          : undefined
                      }
                      className="w-full rounded-2xl border-[3px] border-black bg-white py-4 font-black uppercase tracking-wider text-black shadow-[4px_4px_0_0_#000] opacity-60"
                    >
                      {t("pricing.requestDetails")}
                    </button>
                  ) : null}
                  {!isFmOrderLike && canUseClassicOfferFlow ? (
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
                      {t("actions.submitOffer")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={openNegotiationRoom}
                    disabled={isOpeningRoom}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-black bg-[#FFD100] py-4 font-black uppercase tracking-wider text-black shadow-[4px_4px_0_0_#000] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0.5 active:shadow-none disabled:opacity-50 md:text-xs"
                  >
                    {isOpeningRoom ? (
                      <>
                        <Loader2 className="animate-spin" size={16} aria-hidden />
                        {t("actions.openingRoom")}
                      </>
                    ) : (
                      <>
                        <MessagesSquare size={16} aria-hidden />
                        {t("actions.openNegotiation")}
                      </>
                    )}
                  </button>
                  {roomError ? (
                    <p className="text-center text-[11px] font-black uppercase tracking-wide text-red-600">
                      {roomError}
                    </p>
                  ) : null}
                </div>

                <p className="mt-3 max-w-none rounded-xl border border-neutral-200 bg-[#F7F4EC] px-3 py-2.5 text-left text-[11px] font-semibold leading-relaxed text-neutral-800 sm:mt-4 sm:px-4 sm:py-3 sm:text-xs">
                  {t("safety.warning")}
                </p>

                <p className="mt-6 text-center text-[10px] font-medium leading-relaxed text-neutral-500">
                  {t("safety.comingSoon")}
                </p>
              </div>

              {adData.user_id &&
                (showPremiumSeller ? (
                  <PremiumSellerCard
                    listingId={adData.id}
                    sellerProfile={sellerProfile}
                    activeListingCount={displayedActiveListingCount}
                    sellerMemberSince={sellerMemberSince}
                    category={adData.category ?? null}
                    details={adData.details}
                  />
                ) : (
                  <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.85)]">
                    <h3 className="mb-4 text-sm font-black uppercase italic tracking-tight text-black">
                      {t("seller.title")}
                    </h3>
                    <ul className="space-y-3 text-sm font-medium text-neutral-800">
                      <li>
                        <span className={labelBase}>{t("seller.displayName")}</span>
                        <span className="mt-1 block font-bold text-black">{sellerDisplayName}</span>
                      </li>
                      <li>
                        <span className={labelBase}>{t("seller.status")}</span>
                        <span className="mt-1 block font-bold text-black">
                          {kycStatusLabel(sellerProfile?.kyc_status ?? null)}
                        </span>
                      </li>
                      {sellerMemberSince && (
                        <li>
                          <span className={labelBase}>{t("seller.memberSince")}</span>
                          <span className="mt-1 block font-bold capitalize text-black">
                            {sellerMemberSince}
                          </span>
                        </li>
                      )}
                      <li>
                        <span className={labelBase}>{t("seller.activeListings")}</span>
                        <span className="mt-1 block font-bold text-black">
                          {displayedActiveListingCount}
                        </span>
                      </li>
                      <li>
                        <span className={labelBase}>{t("seller.role")}</span>
                        <span className="mt-1 block font-bold text-black">
                          {userTypeLabel(sellerProfile?.user_type ?? null)}
                        </span>
                      </li>
                    </ul>
                    <p className="mt-5 border-t border-neutral-200 pt-4 text-xs font-medium leading-relaxed text-neutral-600">
                      {t("seller.contactHint")}
                    </p>
                  </div>
                ))}

              {fm ? <FutureMobilityDealerCard fm={fm} /> : null}

              {canShowShareKit && socialKit && (
                <div className="rounded-[2rem] border-[3px] border-black bg-[#FFFEF7] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.65)]">
                  <h3 className="mb-2 text-sm font-black uppercase italic tracking-tight text-black">
                    {t("share.title")}
                  </h3>
                  <p className="mb-5 text-xs font-medium leading-relaxed text-neutral-700">
                    {t("share.description")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {canQuickShare && (
                      <button
                        type="button"
                        onClick={() => void quickShare()}
                        aria-label={t("share.quickShareAria")}
                        className="col-span-2 rounded-xl border-2 border-black bg-[#FFD100] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black hover:brightness-105"
                      >
                        {t("share.quickShare")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void copyShareText("link", socialKit.utm.hq)}
                      aria-label={t("share.copyLinkAria")}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      {t("share.copyLink")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("whatsapp", socialKit.whatsappMessage)}
                      aria-label={t("share.whatsappAria")}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      {t("share.whatsapp")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("telegram", socialKit.telegramMessage)}
                      aria-label={t("share.telegramAria")}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      {t("share.telegram")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("x", socialKit.xPost)}
                      aria-label={t("share.xAria")}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      {t("share.x")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("linkedin", socialKit.linkedinPost)}
                      aria-label={t("share.linkedinAria")}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      {t("share.linkedin")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyShareText("instagram", socialKit.instagramCaption)}
                      aria-label={t("share.instagramAria")}
                      className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]/60"
                    >
                      {t("share.instagram")}
                    </button>
                  </div>
                  {shareCopiedKey && (
                    <p className="mt-3 text-xs font-semibold text-neutral-700">{t("share.copied")}</p>
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
                  {t("seller.transactionHistory")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {adData.user_id && (
          <section className="mb-16 border-t-[3px] border-black pt-12 md:pt-16">
            <h2 className="mb-8 text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              {t("sections.otherSellerTitle")}{" "}
              <span className="text-[#FFD100]">{t("sections.otherSellerHighlight")}</span>
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
                    {...adCardPricingProps(item, getNumberLocale(locale))}
                    type={st}
                    extraBadges={fmBadgeLabelsForCard(item.details)}
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
                {t("sections.onlyListing")}
              </p>
            )}
          </section>
        )}

        <section className="border-t-[3px] border-black pt-12 md:pt-16">
          <h2 className="mb-8 text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
            {t("sections.similarTitle")}{" "}
            <span className="text-[#FFD100]">{t("sections.similarHighlight")}</span>
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
                  {...adCardPricingProps(item, getNumberLocale(locale))}
                  type={st}
                  extraBadges={fmBadgeLabelsForCard(item.details)}
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
                {t("sections.noSimilar", { category: adData.category ?? "" })}
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

      {showPremiumSeller ? <StickyContactBar listingId={adData.id} /> : null}

      {financingModalOpen && financingVehiclePrice ? (
        <FinancingCalculatorModal
          open={financingModalOpen}
          onClose={() => setFinancingModalOpen(false)}
          listingId={adData.id}
          vehiclePrice={financingVehiclePrice}
        />
      ) : null}

      {imageLightboxOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("gallery.lightboxTitle")}
          onClick={() => setImageLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute left-3 top-3 z-[210] flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-black text-xl font-black text-white transition hover:bg-[#FFD100] hover:text-black"
            onClick={(e) => {
              e.stopPropagation();
              setImageLightboxOpen(false);
            }}
            aria-label={t("gallery.close")}
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
                aria-label={t("gallery.previousImage")}
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
                aria-label={t("gallery.nextImage")}
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
              alt={listingTitle || t("defaults.listingImageAlt")}
              fill
              className="object-contain"
              sizes="100vw"
              priority
              loader={supabaseImageLoader}
            />
          </div>

          <p className="pointer-events-none absolute bottom-3 left-0 right-0 px-4 text-center text-[10px] font-semibold uppercase tracking-wide text-white/75">
            {t("gallery.lightboxHint")}
          </p>
        </div>
      ) : null}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

