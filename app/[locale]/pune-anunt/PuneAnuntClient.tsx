"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";
import { Loader2, Search, Star, X } from "lucide-react";
import CarBrandCombobox from "@/app/components/CarBrandCombobox";
import PublishDraftRecoveryDialog from "./PublishDraftRecoveryDialog";
import { trackEvent } from "@/lib/analytics";
import { trackFunnelEvent } from "@/lib/funnelAnalytics";
import EvaluateTurnstile, { type EvaluateTurnstileHandle } from "@/components/EvaluateTurnstile";
import { isEvaluateTurnstileUiEnabled } from "@/lib/turnstilePublic";
import { getPriceIdForPackageId } from "@/lib/stripePackages";
import { resolveEvaluateCategoryKey } from "@/lib/evaluateSafety";
import {
  buildEvaluationPrefillMessage,
  computePrefillLevel,
  EVALUATION_CATEGORY_LABELS,
  EVALUATION_PRICE_STRATEGIES,
  loadEvaluationDraftFromSession,
  mapEvaluationDraftToListingPatch,
  parseEvaluationPriceType,
  prefillMessageForLevel,
  type EvaluationPriceType,
  type PrefillLevel,
} from "@/lib/evaluationDraft";
import {
  buildListingAcquisitionDetails,
  categoryLabelToTrackingKey,
  parseListingAcquisitionDetails,
  toEvaluationTrackingEventParams,
  type EvaluationTrackingContext,
} from "@/lib/evaluationTracking";
import {
  buildListingDraft,
  clearListingDraft,
  clearPendingListingIdOnDraft,
  commitPublishDraftRestore,
  consumeListingAuthResumePending,
  DEFAULT_LISTING_FORM_DATA,
  flushListingDraftSave,
  listingDraftAnalyticsParams,
  markListingAuthResumePending,
  peekPublishDraft,
  persistPendingListingIdOnDraft,
  saveListingAuthHandoff,
  saveListingDraftDebounced,
  type ListingDraftFormData,
  type ListingDraftPackageId,
  type ListingDraftRestoreSource,
  type ListingDraftV1,
} from "@/lib/listingDraft";
import {
  assertPublishCheckoutReady,
  guardedPublishStep,
  listingDraftToGuardInput,
  validatePublishStep1,
  type PublishGuardInput,
} from "@/lib/publishDraftGuard";
import { type PricingMode } from "@/lib/pricingMode";
import {
  coerceCompatibleSaleIntent,
  mergeSaleFieldsIntoDetails,
  parseListingSalePackageId,
  type SaleMethod,
} from "@/lib/listingSaleStrategy";

const AuthModal = dynamic(() => import("@/app/components/AuthModal"), {
  ssr: false,
  loading: () => null,
});

type PackageIdParam = ListingDraftPackageId;

function normalizeInitialPackage(value: string | undefined): PackageIdParam {
  return parseListingSalePackageId(value) ?? "standard";
}

const MAX_EVALUATION_EXIT_PRICE_EUR = 100_000_000;

function parseEvaluationExitPrice(raw: string | null): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_EVALUATION_EXIT_PRICE_EUR) return null;
  return Math.round(n);
}

type PuneAnuntClientProps = {
  initialPackage?: string;
};

export default function PuneAnuntClient({ initialPackage }: PuneAnuntClientProps) {
  const tPost = useTranslations("PostListing");
  const locale = useLocale() === "en" ? "en" : "ro";
  const searchParams = useSearchParams();
  const initialPkg = normalizeInitialPackage(initialPackage);
  const initialIntent = coerceCompatibleSaleIntent({ packageId: initialPkg });
  const prefillTrackedRef = useRef(false);
  const priceLockedFromEvaluationRef = useRef(false);
  const evaluationHandoffRef = useRef(false);
  const evaluationTrackingRef = useRef<EvaluationTrackingContext>({ source: "direct" });
  const listingTurnstileRef = useRef<EvaluateTurnstileHandle>(null);
  const turnstileUiEnabled = isEvaluateTurnstileUiEnabled();

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Auto & Moto");
  const [images, setImages] = useState<File[]>([]);

  const [adTitle, setAdTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [marketPrice, setMarketPrice] = useState(0);
  const [analyzedItems, setAnalyzedItems] = useState(0);

  const [exitPrice, setExitPrice] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode | null>(null);
  const [isExitPriceManuallyEdited, setIsExitPriceManuallyEdited] = useState(false);
  const [evaluationPrefillActive, setEvaluationPrefillActive] = useState(false);
  const [evaluationPrefillMessage, setEvaluationPrefillMessage] = useState<string | null>(null);
  const [evaluationHandoffActive, setEvaluationHandoffActive] = useState(false);
  // Preț de piață introdus manual pentru active premium/rare (confidence < 50%).
  const [manualMarketPrice, setManualMarketPrice] = useState("");
  const [saleStrategy, setSaleStrategy] = useState<string>(initialIntent.detailsStrategy);
  const [selectedPackage, setSelectedPackage] = useState<PackageIdParam>(initialIntent.packageId);
  const [saleMethod, setSaleMethod] = useState<SaleMethod>(initialIntent.saleMethod);

  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [listingTurnstileToken, setListingTurnstileToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftDecision, setDraftDecision] = useState<
    "loading" | "pending" | "fresh" | "restored"
  >("loading");
  const [recoveryDraft, setRecoveryDraft] = useState<ListingDraftV1 | null>(null);
  const [recoverySource, setRecoverySource] =
    useState<ListingDraftRestoreSource>("session");
  const [pendingListingId, setPendingListingId] = useState<string | undefined>();
  const [pendingListingCreatedAt, setPendingListingCreatedAt] = useState<
    number | undefined
  >();
  const listingDraftRestoredRef = useRef(false);
  const lastAutosaveTrackedStepRef = useRef<number | null>(null);

  // STATE NOU: Capturăm datele scrise de utilizator pentru API
  const [formData, setFormData] = useState<ListingDraftFormData>({
    ...DEFAULT_LISTING_FORM_DATA,
  });

  const funnelParams = () => ({
    locale,
    category: categoryLabelToTrackingKey(category),
    source: "publish_form" as const,
    sale_strategy: saleMethod,
  });

  const livePublishGuardInput = (): PublishGuardInput => ({
    category,
    adTitle,
    formData,
    description,
    pricingMode,
    exitPrice,
    manualMarketPrice,
    marketPrice,
    evaluationConfidenceScore:
      typeof evaluationResult?.confidence_score === "number"
        ? evaluationResult.confidence_score
        : undefined,
    evaluationHandoffActive,
    saleMethod,
    selectedPackage,
  });

  const snapshotListingDraft = (): ListingDraftV1 =>
    buildListingDraft({
      step,
      category,
      adTitle,
      description,
      exitPrice,
      pricingMode,
      isExitPriceManuallyEdited,
      manualMarketPrice,
      marketPrice,
      analyzedItems,
      saleStrategy,
      selectedPackage,
      saleMethod,
      formData,
      evaluationConfidenceScore:
        typeof evaluationResult?.confidence_score === "number"
          ? evaluationResult.confidence_score
          : undefined,
      evaluationPrefillActive,
      evaluationHandoffActive,
      pendingListingId,
      pendingListingCreatedAt,
    });

  const trackDraftEvent = (
    eventName:
      | "listing_draft_saved"
      | "listing_draft_restored"
      | "listing_auth_opened"
      | "listing_auth_resumed"
      | "listing_draft_cleared",
    draft: Pick<ListingDraftV1, "step" | "category" | "selectedPackage" | "version">,
    reason: string,
    source?: string,
  ) => {
    trackEvent(eventName, listingDraftAnalyticsParams(draft, reason, source));
  };

  const applyListingDraftToState = (draft: ListingDraftV1) => {
    listingDraftRestoredRef.current = true;
    const guardedStep = guardedPublishStep(
      draft.step,
      listingDraftToGuardInput(draft),
    );
    setStep(guardedStep);
    setCategory(draft.category);
    setAdTitle(draft.adTitle);
    setDescription(draft.description);
    setExitPrice(draft.exitPrice);
    setPricingMode(draft.pricingMode);
    setIsExitPriceManuallyEdited(draft.isExitPriceManuallyEdited);
    setManualMarketPrice(draft.manualMarketPrice);
    setMarketPrice(draft.marketPrice);
    setAnalyzedItems(draft.analyzedItems);
    const restoredSale = coerceCompatibleSaleIntent({
      saleMethod: draft.saleMethod,
      packageId: parseListingSalePackageId(draft.selectedPackage) ?? "standard",
      pricingMode: draft.pricingMode,
    });
    setSaleStrategy(restoredSale.detailsStrategy);
    setSelectedPackage(restoredSale.packageId);
    setSaleMethod(restoredSale.saleMethod);
    setFormData(draft.formData);
    if (typeof draft.evaluationConfidenceScore === "number") {
      setEvaluationResult({ confidence_score: draft.evaluationConfidenceScore });
    }
    setEvaluationPrefillActive(draft.evaluationPrefillActive);
    setEvaluationHandoffActive(draft.evaluationHandoffActive);
    evaluationHandoffRef.current = draft.evaluationHandoffActive;
    setPendingListingId(draft.pendingListingId);
    setPendingListingCreatedAt(draft.pendingListingCreatedAt);
    setDraftRestored(true);
  };

  // Peek draft after mount. Never silently restore step/data.
  useEffect(() => {
    const peeked = peekPublishDraft();
    if (peeked.status === "available") {
      setRecoveryDraft(peeked.draft);
      setRecoverySource(peeked.source);
      setDraftDecision("pending");
    } else {
      setDraftDecision("fresh");
      setDraftReady(true);
      const urlPkg = parseListingSalePackageId(searchParams.get("package"));
      if (urlPkg) {
        const fields = coerceCompatibleSaleIntent({ packageId: urlPkg });
        setSelectedPackage(fields.packageId);
        setSaleStrategy(fields.detailsStrategy);
        setSaleMethod(fields.saleMethod);
      }
    }
    trackFunnelEvent("publish_page_view", {
      locale,
      source: "publish_form",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only draft gate; funnel once-gate + consent gate prevent Strict Mode duplicates
  }, []);

  // Autosave textual draft (never Files / previews).
  useEffect(() => {
    if (!draftReady || isSuccess || draftDecision === "pending" || draftDecision === "loading") {
      return;
    }
    const draft = snapshotListingDraft();
    saveListingDraftDebounced(draft, undefined, (ok) => {
      if (!ok) return;
      if (lastAutosaveTrackedStepRef.current === draft.step) return;
      lastAutosaveTrackedStepRef.current = draft.step;
      trackDraftEvent("listing_draft_saved", draft, "autosave");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional field deps
  }, [
    draftReady,
    isSuccess,
    step,
    category,
    adTitle,
    description,
    exitPrice,
    pricingMode,
    isExitPriceManuallyEdited,
    manualMarketPrice,
    marketPrice,
    analyzedItems,
    saleStrategy,
    selectedPackage,
    saleMethod,
    formData,
    evaluationResult,
    evaluationPrefillActive,
    evaluationHandoffActive,
    pendingListingId,
    pendingListingCreatedAt,
  ]);

  const resetPublishFormToInitial = () => {
    setStep(1);
    setCategory("Auto & Moto");
    setImages([]);
    setAdTitle("");
    setDescription("");
    setEvaluationResult(null);
    setMarketPrice(0);
    setAnalyzedItems(0);
    setExitPrice("");
    setPricingMode(null);
    setIsExitPriceManuallyEdited(false);
    setEvaluationPrefillActive(false);
    setEvaluationPrefillMessage(null);
    setEvaluationHandoffActive(false);
    evaluationHandoffRef.current = false;
    setManualMarketPrice("");
    const resetSale = coerceCompatibleSaleIntent({ packageId: initialPkg });
    setSaleStrategy(resetSale.detailsStrategy);
    setSelectedPackage(resetSale.packageId);
    setSaleMethod(resetSale.saleMethod);
    setFormData({ ...DEFAULT_LISTING_FORM_DATA });
    setPendingListingId(undefined);
    setPendingListingCreatedAt(undefined);
    setFlowError(null);
    setDraftRestored(false);
    listingDraftRestoredRef.current = false;
    lastAutosaveTrackedStepRef.current = null;
  };

  const discardListingDraft = () => {
    if (typeof window !== "undefined") {
      const confirmMsg = pendingListingId
        ? tPost("draft.discardConfirmWithPending")
        : tPost("draft.discardConfirm");
      const ok = window.confirm(confirmMsg);
      if (!ok) return;
    }
    const draft = snapshotListingDraft();
    clearListingDraft();
    trackDraftEvent("listing_draft_cleared", draft, "user_discard");
    resetPublishFormToInitial();
    setDraftDecision("fresh");
    setDraftReady(true);
    setRecoveryDraft(null);
  };

  const continueRecoveredDraft = () => {
    if (!recoveryDraft) return;
    commitPublishDraftRestore(recoverySource);
    applyListingDraftToState(recoveryDraft);
    trackDraftEvent(
      "listing_draft_restored",
      recoveryDraft,
      recoverySource === "auth_handoff" ? "auth_handoff" : "session_restore",
      recoverySource,
    );
    const sameTabResume = consumeListingAuthResumePending();
    if (sameTabResume || recoverySource === "auth_handoff") {
      trackDraftEvent(
        "listing_auth_resumed",
        recoveryDraft,
        recoverySource === "auth_handoff" ? "auth_handoff" : "auth_callback",
        recoverySource,
      );
    }
    trackFunnelEvent("listing_started", {
      ...funnelParams(),
      source: "draft_recovery",
      category: categoryLabelToTrackingKey(recoveryDraft.category),
      sale_strategy: recoveryDraft.saleMethod,
    });
    setDraftDecision("restored");
    setDraftReady(true);
    setRecoveryDraft(null);
  };

  const startNewListingFromRecovery = () => {
    clearListingDraft();
    resetPublishFormToInitial();
    setDraftDecision("fresh");
    setDraftReady(true);
    setRecoveryDraft(null);
    const urlPkg = parseListingSalePackageId(searchParams.get("package"));
    if (urlPkg) {
      const fields = coerceCompatibleSaleIntent({ packageId: urlPkg });
      setSelectedPackage(fields.packageId);
      setSaleStrategy(fields.detailsStrategy);
      setSaleMethod(fields.saleMethod);
    }
  };

  useEffect(() => {
    if (!draftReady) return;
    if (draftDecision === "pending" || draftDecision === "loading") return;
    if (listingDraftRestoredRef.current) return;

    const source = searchParams.get("source")?.trim().toLowerCase();
    if (source !== "evaluation") return;
    setPricingMode("evaluated");

    let didPrefill = false;
    let hasExitPrice = false;
    let resolvedCategoryKey: string | null = null;
    let prefillLevel: PrefillLevel = "price_only";
    let selectedPriceType: EvaluationPriceType | undefined;
    let selectedPriceLabel: string | undefined;

    const draft = loadEvaluationDraftFromSession();

    const applyReferenceMarketPrice = (referenceMarketPrice: number) => {
      setMarketPrice(referenceMarketPrice);
      setManualMarketPrice(String(referenceMarketPrice));
      evaluationHandoffRef.current = true;
      setEvaluationHandoffActive(true);
      didPrefill = true;
    };

    if (draft) {
      const { formDataPatch, adTitle } = mapEvaluationDraftToListingPatch(draft);

      if (EVALUATION_CATEGORY_LABELS[draft.category]) {
        setCategory(EVALUATION_CATEGORY_LABELS[draft.category]);
        resolvedCategoryKey = draft.category;
        didPrefill = true;
      }

      if (draft.selectedExitPrice) {
        setExitPrice(String(draft.selectedExitPrice));
        setIsExitPriceManuallyEdited(true);
        hasExitPrice = true;
        priceLockedFromEvaluationRef.current = true;
        didPrefill = true;
      }

      if (draft.referenceMarketPrice) {
        applyReferenceMarketPrice(draft.referenceMarketPrice);
      }

      if (draft.confidenceScore !== undefined) {
        setEvaluationResult({ confidence_score: draft.confidenceScore });
      } else if (draft.referenceMarketPrice) {
        setEvaluationResult({ confidence_score: 75 });
      }

      if (draft.selectedPriceType) {
        selectedPriceType = draft.selectedPriceType;
      }

      if (draft.selectedPriceLabel) {
        selectedPriceLabel = draft.selectedPriceLabel;
      }

      if (Object.keys(formDataPatch).length > 0) {
        setFormData((prev) => ({ ...prev, ...formDataPatch }));
        didPrefill = true;
      }

      if (adTitle) {
        setAdTitle(adTitle);
        didPrefill = true;
      }

      prefillLevel = computePrefillLevel(draft.category, draft.assetDetails, hasExitPrice);
    }

    if (!resolvedCategoryKey) {
      const categoryKey = resolveEvaluateCategoryKey(searchParams.get("category"));
      if (categoryKey && EVALUATION_CATEGORY_LABELS[categoryKey]) {
        setCategory(EVALUATION_CATEGORY_LABELS[categoryKey]);
        resolvedCategoryKey = categoryKey;
        didPrefill = true;
      }
    }

    if (!hasExitPrice) {
      const parsedExitPrice = parseEvaluationExitPrice(searchParams.get("exit_price"));
      if (parsedExitPrice !== null) {
        setExitPrice(String(parsedExitPrice));
          setIsExitPriceManuallyEdited(true);
        hasExitPrice = true;
        priceLockedFromEvaluationRef.current = true;
        didPrefill = true;
      }
    }

    if (!selectedPriceType) {
      const queryPriceType = parseEvaluationPriceType(searchParams.get("price_type"));
      if (queryPriceType) {
        selectedPriceType = queryPriceType;
        if (!selectedPriceLabel) {
          selectedPriceLabel = EVALUATION_PRICE_STRATEGIES.find(
            (s) => s.type === queryPriceType,
          )?.label;
        }
      }
    }

    if (!evaluationHandoffRef.current) {
      const parsedReferenceMarketPrice = parseEvaluationExitPrice(
        searchParams.get("reference_market_price"),
      );
      if (parsedReferenceMarketPrice !== null) {
        applyReferenceMarketPrice(parsedReferenceMarketPrice);
        setEvaluationResult({ confidence_score: 75 });
      }
    }

    if (didPrefill) {
      evaluationTrackingRef.current = {
        source: "evaluation",
        selected_price_type: selectedPriceType ?? "unknown",
        prefill_level: prefillLevel,
        has_exit_price: hasExitPrice,
        has_market_reference: evaluationHandoffRef.current,
        evaluation_handoff: true,
      };

      setEvaluationPrefillActive(true);
      setEvaluationPrefillMessage(
        selectedPriceLabel
          ? buildEvaluationPrefillMessage(prefillLevel, selectedPriceLabel)
          : prefillMessageForLevel(prefillLevel),
      );
    }

    if (didPrefill && !prefillTrackedRef.current) {
      prefillTrackedRef.current = true;
      trackEvent("listing_prefilled_from_evaluation", {
        category: resolvedCategoryKey ?? "unknown",
        has_exit_price: hasExitPrice,
        selected_price_type: selectedPriceType ?? "unknown",
        prefill_level: prefillLevel,
      });
    }
  }, [searchParams, draftReady]);

  const trackListingStepCompleted = (completedStep: number) => {
    trackEvent(
      "listing_step_completed",
      toEvaluationTrackingEventParams(evaluationTrackingRef.current, {
        step: completedStep,
        category: categoryLabelToTrackingKey(category),
      }),
    );
    if (completedStep === 1) {
      trackFunnelEvent("listing_step_1_complete", { ...funnelParams(), step: 1 });
    } else if (completedStep === 2) {
      trackFunnelEvent("listing_step_2_complete", { ...funnelParams(), step: 2 });
    } else if (completedStep === 3) {
      trackFunnelEvent("listing_step_3_complete", { ...funnelParams(), step: 3 });
    }
  };

  const categoriesList = [
    "Auto & Moto",
    "Imobiliare",
    "Lux & Ceasuri",
    "Afaceri de vânzare",
    "Gadgets",
    "Foto & Audio",
  ];

  const packagePrices: Record<"economy" | "standard" | "urgent" | "auction", number> = {
    economy: 99,
    standard: 79,
    urgent: 179,
    auction: 111,
  };

  type PackageId = keyof typeof packagePrices;

  const PACKAGE_DEFS: {
    id: PackageId;
    title: string;
    durationLabel: string;
    description: string;
    benefits?: string[];
    badge?: string;
  }[] = [
    {
      id: "economy",
      title: "Expunere Maximă",
      durationLabel: "30 zile",
      description: "Pentru anunțuri care au nevoie de mai mult timp la vedere.",
    },
    {
      id: "standard",
      title: "Vânzare Rapidă",
      durationLabel: "14 zile",
      description: "Pentru listări echilibrate între timp, cost și vizibilitate.",
      badge: "Recomandat",
    },
    {
      id: "urgent",
      title: "Pachet Validare & Listare Standard",
      durationLabel: "60 zile",
      description:
        "Listare curată, verificată manual, cu acces complet la investitori pregătiți să negocieze.",
      benefits: [
        "Verificare manuală a activului (Filtru anti-zgomot)",
        "Listare garantată timp de 60 de zile în platformă",
        "Acces complet în Camera de Negociere cu investitorii",
      ],
      badge: "Premium",
    },
    {
      id: "auction",
      title: "Licitație deschisă 30 zile",
      durationLabel: "30 zile",
      description:
        "Pentru active unde vrei să strângi mai multe oferte și să alegi manual varianta potrivită. Include afișare ca licitație, fereastră de ofertare 30 zile și semnale publice de interes: număr oferte, cea mai mare ofertă și timp rămas. Nu garantează vânzarea.",
    },
  ];

  function applyCanonicalSaleState(state: ReturnType<typeof coerceCompatibleSaleIntent>) {
    setSaleMethod(state.saleMethod);
    setSelectedPackage(state.packageId);
    setSaleStrategy(state.detailsStrategy);
  }

  function selectSaleMethod(next: SaleMethod) {
    applyCanonicalSaleState(
      coerceCompatibleSaleIntent({
        saleMethod: next,
        packageId: selectedPackage,
        pricingMode,
      }),
    );
  }

  function selectPackage(pkg: PackageId) {
    applyCanonicalSaleState(
      coerceCompatibleSaleIntent({
        saleMethod: pkg === "auction" ? "auction" : "direct",
        packageId: pkg,
        pricingMode,
      }),
    );
  }

  function switchPricingMode(nextMode: PricingMode) {
    if (nextMode === pricingMode) return;
    const prevMode = pricingMode;
    setPricingMode(nextMode);
    if (nextMode === "evaluated") {
      // Resetăm starea evaluatorului înainte să ruleze (doar utilizatorul alege explicit).
      setEvaluationResult(null);
      setMarketPrice(0);
      setAnalyzedItems(0);
      setManualMarketPrice("");
      setEvaluationPrefillActive(false);
      setEvaluationPrefillMessage(null);
      if (prevMode === "fixed_price") {
        priceLockedFromEvaluationRef.current = true;
        setIsExitPriceManuallyEdited(true);
      } else {
        priceLockedFromEvaluationRef.current = false;
        setIsExitPriceManuallyEdited(false);
      }

      void generateAiPricing();
      return;
    }
    setEvaluationResult(null);
    setMarketPrice(0);
    setAnalyzedItems(0);
    setManualMarketPrice("");
    priceLockedFromEvaluationRef.current = false;
    if (nextMode === "price_on_request") {
      setExitPrice("");
      setIsExitPriceManuallyEdited(false);
    }
    if (nextMode === "fixed_price") {
      // Păstrăm exit_price doar dacă a fost introdus explicit de utilizator.
      if (!isExitPriceManuallyEdited) {
        setExitPrice("");
      }
    }
  }

  function validatePrimaryAssetFields(): string | null {
    const code = validatePublishStep1({ category, adTitle, formData });
    if (code === "title") return "Completează titlul anunțului.";
    if (code === "auto_make_model") return "Completează marca și modelul vehiculului.";
    if (code === "imobiliare_location_surface") return "Completează localizarea și suprafața.";
    if (code === "lux_brand_model") return "Completează brandul și modelul.";
    if (code === "business_domain_revenue") return "Completează domeniul și cifra de afaceri.";
    if (code === "gadgets_brand") return "Completează brandul și modelul produsului.";
    return null;
  }

  const selectedPackageMeta = PACKAGE_DEFS.find((p) => p.id === selectedPackage)!;

  const StepPill = ({ index, title }: { index: number; title: string }) => (
    <div
      className={`rounded-full border-2 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors md:px-4 md:text-[10px] ${
        step >= index
          ? "border-black bg-black text-[#FFD100]"
          : "border-black/15 bg-white text-neutral-600"
      }`}
    >
      {index}. {title}
    </div>
  );

  const inputBase =
    "mt-2 w-full rounded-[0.875rem] border-2 border-black bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-500 focus:border-[#FFD100] focus:outline-none focus:ring-[3px] focus:ring-[#FFD100]/35";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Adăugăm la selecția existentă (nu o suprascriem), evitând duplicatele.
      const incoming = Array.from(e.target.files);
      setImages((prev) => {
        const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
        const merged = [...prev];
        for (const file of incoming) {
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          if (!existingKeys.has(key)) merged.push(file);
        }
        return merged;
      });
      // Permite reselectarea aceluiași fișier ulterior.
      e.target.value = "";
    }
  };

  // Generăm preview-uri (object URLs) pentru fișierele selectate și le eliberăm
  // la cleanup ca să nu acumulăm memorie. Se regenerează la orice schimbare de listă.
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  // Mută imaginea de la `index` pe poziția 0 (devine coperta anunțului).
  const setAsCover = (index: number) => {
    if (index <= 0) return;
    setImages((prev) => {
      if (index >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return next;
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const generateAiPricing = async () => {
    const missing = validatePrimaryAssetFields();
    if (missing) {
      setFlowError(missing);
      return;
    }

    if (turnstileUiEnabled && !listingTurnstileToken) {
      setFlowError(
        "Completează verificarea de securitate de mai jos, apoi continuă către estimarea pe piață.",
      );
      return;
    }

    setFlowError(null);
    setIsAnalyzing(true);
    setStep(3);
    trackListingStepCompleted(2);

    // Fail-safe: dacă AI-ul/API-ul pică (502, timeout, JSON invalid), NU blocăm
    // utilizatorul pe Pasul 2. Activăm modul manual (confidence 0 => isLowConfidence)
    // și rămânem pe Pasul 3 ca să poată introduce manual prețurile.
    const activateManualFallback = () => {
      if (!evaluationHandoffRef.current) {
        setEvaluationResult({ confidence_score: 0 });
        setMarketPrice(0);
        setAnalyzedItems(0);
      }
      if (!priceLockedFromEvaluationRef.current) {
        setIsExitPriceManuallyEdited(false);
        setExitPrice("");
      }
      setFlowError(null);
    };

    try {
      const apiCategory =
        category === "Auto & Moto"
          ? "auto"
          : category === "Imobiliare"
            ? "imobiliare"
            : category === "Lux & Ceasuri"
              ? "lux"
              : category === "Afaceri de vânzare"
                ? "business"
                : category === "Gadgets"
                  ? "gadgets"
                  : "foto";

      const payload = {
        category: apiCategory,
        make: formData.make,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : undefined,
        km: formData.km ? parseInt(formData.km) : undefined,
        surface: formData.surface ? parseInt(formData.surface) : undefined,
        location: formData.location,
        brand: formData.brand,
        revenue: formData.revenue ? parseInt(formData.revenue) : undefined,
        extraDetails: formData,
        save_report: false,
        ...(listingTurnstileToken ? { turnstileToken: listingTurnstileToken } : {}),
      };

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 403) {
        let message =
          "Verificarea de securitate nu a reușit. Te rugăm să reîncerci.";
        try {
          const data = (await response.json()) as { message?: string };
          if (typeof data.message === "string" && data.message.trim()) {
            message = data.message.trim();
          }
        } catch {
          // ignore parse errors
        }
        setFlowError(message);
        setIsAnalyzing(false);
        setStep(2);
        listingTurnstileRef.current?.reset();
        setListingTurnstileToken(null);
        return;
      }

      // 502/500/etc. — răspunsul poate fi HTML, nu JSON. Nu blocăm userul.
      if (!response.ok) {
        console.error(
          `[generateAiPricing] /api/evaluate a răspuns cu status ${response.status}. Trec pe fallback manual.`,
        );
        activateManualFallback();
        return;
      }

      // Parsare defensivă: dacă body-ul nu e JSON valid, nu aruncăm — fallback manual.
      const data = await response.json().catch(() => null);

      if (data && data.success) {
        if (evaluationHandoffRef.current) {
          setAnalyzedItems(data.comparable_count || 0);
        } else {
          setEvaluationResult(data);
          setMarketPrice(data.estimated_market_price || 0);
          setAnalyzedItems(data.comparable_count || 0);

          if (!priceLockedFromEvaluationRef.current) {
            setIsExitPriceManuallyEdited(false);
            if (data.strong_exit_price) {
              setExitPrice(data.strong_exit_price.toString());
            } else {
              setExitPrice("");
            }
          }
        }
      } else {
        // Răspuns fără success sau JSON invalid -> mod manual, rămânem pe Pasul 3.
        console.error(
          "[generateAiPricing] Răspuns fără succes de la /api/evaluate. Trec pe fallback manual:",
          data,
        );
        activateManualFallback();
      }
    } catch (error) {
      // Eroare de rețea / excepție neașteptată -> mod manual, rămânem pe Pasul 3.
      console.error("[generateAiPricing] Eroare rețea/excepție la /api/evaluate:", error);
      activateManualFallback();
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper: convertește orice valoare la un număr finit, altfel 0.
  // Tratează string-uri ("26%", ""), null, undefined, NaN, Infinity.
  const toFiniteNumber = (value: unknown): number => {
    const n = typeof value === "string" ? parseFloat(value) : Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  // Normalizăm scorul de încredere: API-ul poate întoarce fie 0-100 (procent),
  // fie 0-1 (fracție). Sub 50% => date insuficiente => mod manual premium/rar.
  // toFiniteNumber previne NaN/Infinity dacă API-ul trimite un format neașteptat.
  const rawConfidence = toFiniteNumber(evaluationResult?.confidence_score);
  const confidencePercent =
    rawConfidence > 0 && rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;
  const isLowConfidence =
    !!evaluationResult && confidencePercent < 50 && !evaluationHandoffActive;

  // LOGICA NOUĂ: Calcul matematic pentru discount în funcție de strategie
  const baseRequestedPrice = toFiniteNumber(exitPrice);
  const manualMarketPriceNum = toFiniteNumber(manualMarketPrice);
  let finalCalculatedExitPrice = baseRequestedPrice;
  let currentDiscountPercent = 0;

  if (isLowConfidence) {
    // Active premium/rare: discountul se calculează din cele două câmpuri manuale.
    // Gard dublu: manualMarketPriceNum > 0 garantează că nu împărțim niciodată la 0.
    if (manualMarketPriceNum > 0 && baseRequestedPrice > 0) {
      const ratio = baseRequestedPrice / manualMarketPriceNum;
      const computed = Math.round((1 - ratio) * 100);
      currentDiscountPercent = Number.isFinite(computed) ? Math.max(0, computed) : 0;
    }
    finalCalculatedExitPrice = baseRequestedPrice;
  } else if (marketPrice === 0 && baseRequestedPrice > 0) {
    if (saleStrategy === "lichidare") {
      finalCalculatedExitPrice = Math.round(baseRequestedPrice * 0.9);
      currentDiscountPercent = 10;
    } else if (saleStrategy === "panic") {
      finalCalculatedExitPrice = Math.round(baseRequestedPrice * 0.8);
      currentDiscountPercent = 20;
    } else if (saleStrategy === "licitatie") {
      finalCalculatedExitPrice = Math.round(baseRequestedPrice * 0.7);
      currentDiscountPercent = 30;
    }
  } else if (marketPrice > 0 && baseRequestedPrice > 0) {
    const computed = Math.round((1 - baseRequestedPrice / marketPrice) * 100);
    currentDiscountPercent = Number.isFinite(computed) ? computed : 0;
    finalCalculatedExitPrice = baseRequestedPrice;
  }

  // Putem avansa de la pasul de preț doar dacă prețul de vânzare e completat,
  // iar în modul premium/rar și prețul de piață introdus manual.
  const hasValidExitPriceInput =
    Number.isFinite(Number(exitPrice)) && Number(exitPrice) > 0;
  const canProceedFromPrice =
    pricingMode === null
      ? false
      : pricingMode === "price_on_request"
        ? true
        : pricingMode === "fixed_price"
          ? hasValidExitPriceInput
          : isLowConfidence
            ? Boolean(exitPrice) && manualMarketPriceNum > 0
            : Boolean(exitPrice);

  // Trimite utilizatorul către Stripe Checkout pentru un anunț deja creat.
  const handleCheckout = async (priceId: string, listingId: string) => {
    const checkoutReady = assertPublishCheckoutReady(livePublishGuardInput());
    if (!checkoutReady.ok) {
      setStep(checkoutReady.step);
      setFlowError(tPost("checkoutErrors.stepsIncomplete"));
      throw new Error("checkout_steps_incomplete");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("auth_required");
    }

    trackFunnelEvent("begin_checkout", funnelParams(), { skipOnce: true });

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        priceId,
        listingId,
        type: "listing",
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url) {
      throw new Error(data?.error || "Nu am putut inițializa plata. Te rugăm să încerci din nou.");
    }

    trackEvent(
      "checkout_created",
      toEvaluationTrackingEventParams(evaluationTrackingRef.current, {
        checkout_type: "listing",
        listing_id: listingId,
        package_id: selectedPackage,
        pricing_mode: pricingMode,
        amount: packagePrices[selectedPackage],
        status: "created",
        category: categoryLabelToTrackingKey(category),
      }),
    );

    // Keep draft until payment=success on dashboard (Stripe cancel / close must recover).
    window.location.href = data.url;
  };

  const handleFinalSubmit = async () => {
    setFlowError(null);
    const checkoutReady = assertPublishCheckoutReady(livePublishGuardInput());
    if (!checkoutReady.ok) {
      setStep(checkoutReady.step);
      setFlowError(
        checkoutReady.code === "incompatible_sale_intent"
          ? tPost("checkoutErrors.incompatibleSaleIntent")
          : tPost("checkoutErrors.stepsIncomplete"),
      );
      return;
    }
    if (pricingMode === null) {
      setFlowError(tPost("pricingMode.validation.selectOptionToContinue"));
      return;
    }
    const saleIntent = coerceCompatibleSaleIntent({
      saleMethod,
      packageId: selectedPackage,
      pricingMode,
    });
    if (
      saleIntent.saleMethod !== saleMethod ||
      saleIntent.packageId !== selectedPackage
    ) {
      applyCanonicalSaleState(saleIntent);
      setFlowError(tPost("checkoutErrors.incompatibleSaleIntent"));
      return;
    }
    trackEvent(
      "listing_submit_attempt",
      toEvaluationTrackingEventParams(evaluationTrackingRef.current, {
        category: categoryLabelToTrackingKey(category),
        package_id: selectedPackage,
        pricing_mode: pricingMode,
        status: "started",
      }),
    );
    setIsSaving(true);
    if (pricingMode === "fixed_price") {
      if (!hasValidExitPriceInput) {
        setFlowError(tPost("pricingMode.validation.fixedPriceRequired"));
        setIsSaving(false);
        return;
      }
    } else if (pricingMode === "evaluated") {
      if (!canProceedFromPrice) {
        setFlowError(tPost("pricingMode.validation.evaluatedNeedsPrice"));
        setIsSaving(false);
        return;
      }
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        trackEvent(
          "listing_submit_attempt",
          toEvaluationTrackingEventParams(evaluationTrackingRef.current, {
            category: categoryLabelToTrackingKey(category),
            package_id: selectedPackage,
            pricing_mode: pricingMode,
            status: "failed",
            reason: "auth_required",
          }),
        );
        const draft = snapshotListingDraft();
        const saved = flushListingDraftSave(draft);
        if (saved) {
          trackDraftEvent("listing_draft_saved", draft, "auth_gate");
        }
        // Cross-tab magic link: localStorage handoff (best-effort; session remains same-tab fallback).
        saveListingAuthHandoff(draft, "auth_required");
        markListingAuthResumePending();
        trackDraftEvent("listing_auth_opened", draft, "auth_required");
        setFlowError(tPost("checkoutErrors.authRequired"));
        setShowAuthModal(true);
        setIsSaving(false);
        return;
      }

      const priceId = getPriceIdForPackageId(saleIntent.packageId);
      if (!priceId) {
        setFlowError(tPost("checkoutErrors.invalidPackage"));
        setIsSaving(false);
        return;
      }

      // --- PF1.2: reuse existing pending_payment listing when draft has pendingListingId ---
      if (pendingListingId) {
        const { data: existingListing, error: existingError } = await supabase
          .from("listings")
          .select("id, user_id, status, is_seed, sale_strategy, category, details")
          .eq("id", pendingListingId)
          .maybeSingle();

        if (
          !existingError &&
          existingListing &&
          existingListing.user_id === user.id &&
          existingListing.is_seed !== true &&
          existingListing.status === "pending_payment"
        ) {
          const saleFields = saleIntent;
          const nextDetails = mergeSaleFieldsIntoDetails(
            existingListing.details,
            saleIntent.packageId,
            saleIntent.saleMethod,
          );
          if (pricingMode) nextDetails.pricing_mode = pricingMode;
          const { error: syncPackageError } = await supabase
            .from("listings")
            .update({
              sale_strategy: saleFields.sale_strategy,
              details: nextDetails,
            })
            .eq("id", existingListing.id)
            .eq("user_id", user.id)
            .eq("status", "pending_payment");

          if (syncPackageError) {
            setFlowError(tPost("checkoutErrors.saveFailed"));
            setIsSaving(false);
            return;
          }

          setFlowError(tPost("checkoutErrors.pendingReuse"));
          trackEvent("listing_pending_reused", {
            source: "publish_form",
            category: categoryLabelToTrackingKey(category),
            package: selectedPackage,
            reason: "pending_payment",
          });
          trackEvent(
            "checkout_listing_started",
            toEvaluationTrackingEventParams(evaluationTrackingRef.current, {
              category: categoryLabelToTrackingKey(category),
              package_id: selectedPackage,
              pricing_mode: pricingMode,
              sale_strategy: saleStrategy,
              amount: packagePrices[selectedPackage],
              checkout_type: "listing",
            }),
          );
          await handleCheckout(priceId, existingListing.id);
          return;
        }

        if (
          !existingError &&
          existingListing &&
          existingListing.user_id === user.id &&
          existingListing.status === "active"
        ) {
          clearListingDraft();
          setPendingListingId(undefined);
          setPendingListingCreatedAt(undefined);
          setIsSaving(false);
          window.location.href = `/dashboard`;
          return;
        }

        // Invalid / missing / foreign / incompatible — drop pointer only, ask for a fresh submit.
        const cleared = clearPendingListingIdOnDraft(snapshotListingDraft());
        setPendingListingId(undefined);
        setPendingListingCreatedAt(undefined);
        flushListingDraftSave(cleared);
        setFlowError(tPost("checkoutErrors.pendingInvalid"));
        setIsSaving(false);
        return;
      }

      const uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("listings")
            .upload(filePath, file);
          if (uploadError) {
            console.error("Supabase Upload Error:", uploadError);
            throw new Error("upload_failed");
          }

          const { data: publicUrlData } = supabase.storage
            .from("listings")
            .getPublicUrl(filePath);
          uploadedImageUrls.push(publicUrlData.publicUrl);
        }
      }

      const finalMarketPrice =
        pricingMode === "evaluated"
          ? isLowConfidence
            ? manualMarketPriceNum > 0
              ? manualMarketPriceNum
              : baseRequestedPrice
            : marketPrice > 0
              ? marketPrice
              : baseRequestedPrice
          : null;
      const finalExitPrice =
        pricingMode === "price_on_request"
          ? null
          : pricingMode === "fixed_price"
            ? Number(exitPrice)
            : finalCalculatedExitPrice;
      const finalDiscount =
        pricingMode === "evaluated" ? currentDiscountPercent : null;
      const dealScore =
        pricingMode === "evaluated"
          ? Math.min(Math.round(currentDiscountPercent * 1.5), 99)
          : null;

      // 1. Salvăm anunțul ca "PENDING_PAYMENT" și îl returnăm din baza de date
      const saleFields = saleIntent;
      const { data: insertedData, error } = await supabase
        .from("listings")
        .insert({
          user_id: user.id,
          title: adTitle,
          category: category,
          description: description || "Anunț detaliat.",
          market_price: finalMarketPrice,
          exit_price: finalExitPrice,
          sale_strategy: saleFields.sale_strategy,
          status: "pending_payment", // Anunțul este reținut până se confirmă plata
          is_seed: false,
          deal_score: dealScore,
          discount: finalDiscount,
          images: uploadedImageUrls,
          details: {
            ...formData,
            package: saleFields.detailsPackage,
            strategy: saleFields.detailsStrategy,
            sale_method: saleFields.detailsSaleMethod,
            pricing_mode: pricingMode,
            ...buildListingAcquisitionDetails(evaluationTrackingRef.current),
          },
        })
        .select()
        .single();

      if (error) {
        console.error("Eroare la salvarea anunțului:", error.message);
        trackEvent(
          "listing_submit_attempt",
          toEvaluationTrackingEventParams(evaluationTrackingRef.current, {
            category: categoryLabelToTrackingKey(category),
            package_id: selectedPackage,
            pricing_mode: pricingMode,
            status: "failed",
            reason: "save_error",
          }),
        );
        setFlowError(tPost("checkoutErrors.saveFailed"));
        setIsSaving(false);
        return;
      }

      // Persist pendingListingId BEFORE Stripe session — so cancel/retry reuses this row.
      const createdAt = Date.now();
      const withPending = persistPendingListingIdOnDraft(
        snapshotListingDraft(),
        insertedData.id,
        createdAt,
      );
      if (withPending) {
        setPendingListingId(withPending.pendingListingId);
        setPendingListingCreatedAt(withPending.pendingListingCreatedAt);
      } else {
        setPendingListingId(insertedData.id);
        setPendingListingCreatedAt(createdAt);
        flushListingDraftSave(
          buildListingDraft({
            ...snapshotListingDraft(),
            pendingListingId: insertedData.id,
            pendingListingCreatedAt: createdAt,
          }),
        );
      }

      // 2. Apelăm motorul de plăți Stripe (ruta /api/stripe/checkout)
      trackEvent(
        "checkout_listing_started",
        toEvaluationTrackingEventParams(evaluationTrackingRef.current, {
          category: categoryLabelToTrackingKey(category),
          package_id: selectedPackage,
          pricing_mode: pricingMode,
          sale_strategy: saleStrategy,
          amount: packagePrices[selectedPackage],
          checkout_type: "listing",
        }),
      );

      // handleCheckout redirecționează către Stripe; aruncă dacă răspunsul e invalid.
      // pendingListingId remains on checkout failure so retry skips INSERT.
      await handleCheckout(priceId, insertedData.id);
    } catch (error: any) {
      console.error("Eroare salvare anunț / plată:", error);
      if (typeof error?.message === "string" && error.message === "checkout_steps_incomplete") {
        setIsSaving(false);
        return;
      }
      trackEvent(
        "listing_submit_attempt",
        toEvaluationTrackingEventParams(evaluationTrackingRef.current, {
          category: categoryLabelToTrackingKey(category),
          package_id: selectedPackage,
          pricing_mode: pricingMode,
          status: "failed",
          reason:
            typeof error?.message === "string" && error.message === "upload_failed"
              ? "upload_failed"
              : typeof error?.message === "string" && error.message === "auth_required"
                ? "auth_required"
                : "checkout_error",
        }),
      );
      const msg =
        typeof error?.message === "string" && error.message === "upload_failed"
          ? tPost("checkoutErrors.uploadFailed")
          : typeof error?.message === "string" && error.message === "auth_required"
            ? tPost("checkoutErrors.authRequired")
            : tPost("checkoutErrors.genericFailed");
      setFlowError(msg);
      setIsSaving(false);
    }
  };

  // Acest ecran nu va mai fi atins în mod normal aici, pentru că redirecționăm către Stripe
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EC] p-6 antialiased">
        <div className="w-full max-w-md rounded-[2rem] border-[3px] border-black bg-white p-10 text-center shadow-[12px_12px_0_0_#FFD100]">
          <span className="mb-6 block text-5xl" aria-hidden>
            ✓
          </span>
          <h1 className="mb-4 text-2xl font-black uppercase italic leading-tight tracking-tight text-black md:text-3xl">
            Anunț activat cu succes
          </h1>
          <p className="mb-8 text-sm font-medium leading-relaxed text-neutral-600">
            Anunțul este publicat. Poți urmări ofertele din cont.
          </p>
          <Link
            href="/dashboard"
            className="block w-full rounded-2xl border-[3px] border-black bg-black py-4 text-sm font-black uppercase tracking-widest text-[#FFD100] transition hover:brightness-110"
          >
            Mergi la contul meu
          </Link>
        </div>
      </div>
    );
  }

  const handlePublishFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const recoveryOpen = draftDecision === "pending";

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      {recoveryOpen ? (
        <PublishDraftRecoveryDialog
          title={tPost("draft.recoveryTitle")}
          body={tPost("draft.recoveryBody")}
          consequence={tPost("draft.recoveryConsequence")}
          expires={tPost("draft.recoveryExpires")}
          continueLabel={tPost("draft.continue")}
          startNewLabel={tPost("draft.startNew")}
          onContinue={continueRecoveredDraft}
          onStartNew={startNewListingFromRecovery}
        />
      ) : null}
      <div
        className="mx-auto max-w-7xl space-y-10 md:space-y-14"
        {...(recoveryOpen ? { inert: true, "aria-hidden": true } : {})}
      >
        <div className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
              Quick Exit Terminal
            </p>
            <h1 className="mt-5 text-3xl font-black uppercase italic leading-[1.05] tracking-tight md:text-5xl">
              Publică <span className="text-[#FFD100]">anunțul</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-lg font-black uppercase italic text-[#FFD100] md:text-xl">
              pentru vânzare rapidă
            </p>
            <p className="mx-auto mt-6 max-w-xl text-[11px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-neutral-300 md:text-xs">
              Completează activul, stabilește prețul și alege viteza de vânzare.
            </p>
          </div>
          <div className="mx-auto mt-10 flex flex-wrap justify-center gap-2 md:gap-3">
            <StepPill index={1} title="Date activ" />
            <StepPill index={2} title="Poze și descriere" />
            <StepPill index={3} title="Preț de vânzare" />
            <StepPill index={4} title="Pachet și publicare" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.12)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          <form onSubmit={handlePublishFormSubmit}>
          {draftRestored && (
            <div
              role="status"
              className="relative z-10 mb-6 flex flex-col gap-3 rounded-xl border-2 border-black bg-[#FDFCF8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium leading-relaxed text-neutral-800">
                {pendingListingId
                  ? tPost("draft.restoredBannerWithPending")
                  : tPost("draft.restoredBanner")}
              </p>
              <button
                type="button"
                onClick={discardListingDraft}
                className="shrink-0 border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black"
              >
                {tPost("draft.discard")}
              </button>
            </div>
          )}
          {!draftRestored && pendingListingId ? (
            <div
              role="status"
              className="relative z-10 mb-6 rounded-xl border-2 border-black bg-[#FDFCF8] px-4 py-3"
            >
              <p className="text-sm font-medium leading-relaxed text-neutral-800">
                {tPost("draft.pendingPaymentHint")}
              </p>
            </div>
          ) : null}
          {evaluationPrefillActive && evaluationPrefillMessage && (
            <div
              role="status"
              className="relative z-10 mb-8 rounded-xl border-2 border-[#FFD100]/70 bg-[#FFF9E6] px-4 py-3 text-sm font-medium leading-relaxed text-neutral-800"
            >
              {evaluationPrefillMessage}
            </div>
          )}
          <div
            className="pointer-events-none absolute right-0 top-0 z-0 hidden p-8 opacity-[0.06] md:block"
            aria-hidden
          >
            <Search size={150} strokeWidth={3} className="pointer-events-none" />
          </div>

          {step === 1 && (
            <div className="relative z-10 space-y-8 md:space-y-10">
              <div>
                <h2 className="mb-6 text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
                  1. Date despre activ
                </h2>
                <p className="mb-2 text-sm font-medium text-neutral-600">
                  Alege o categorie pentru a continua. Câmpurile următoare se adaptează în funcție de tipul activului.
                </p>
                <p className="mb-6 text-xs font-medium text-neutral-500">
                  După ce selectezi categoria, completează detaliile tehnice mai jos.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-2xl border-2 border-black p-5 text-left transition-all duration-150 md:p-6 ${
                        category === cat
                          ? "bg-black text-[#FFD100] shadow-[6px_6px_0_0_#FFD100]"
                          : "bg-white text-black hover:border-[#FFD100] hover:shadow-[6px_6px_0_0_rgba(255,209,0,0.65)] active:translate-y-px"
                      }`}
                    >
                      <p className="text-xs font-black uppercase tracking-wider md:text-sm">
                        {cat}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-black/[0.08] bg-[#F7F4EC]/80 p-6 md:border-2 md:border-black/[0.06] md:p-10">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Titlu anunț
                </label>
                <input
                  type="text"
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  placeholder="Ex.: Mercedes S 500 / Apartament Herăstrău"
                  className={`${inputBase} font-bold uppercase tracking-wide`}
                />

                <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-5">
                  {/* AUTO & MOTO */}
                  {category === "Auto & Moto" && (
                    <>
                      <div>
                        <CarBrandCombobox
                          label={tPost("carBrand.label")}
                          placeholder={tPost("carBrand.placeholder")}
                          noMatches={tPost("carBrand.noMatches")}
                          listLabel={tPost("carBrand.listLabel")}
                          value={formData.make}
                          onChange={(next) => setFormData({ ...formData, make: next })}
                          inputClassName="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Model
                        </label>
                        <input
                          type="text"
                          value={formData.model}
                          onChange={(e) =>
                            setFormData({ ...formData, model: e.target.value })
                          }
                          placeholder="Ex: S-Class"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          An Fabricație
                        </label>
                        <input
                          type="number"
                          value={formData.year}
                          onChange={(e) =>
                            setFormData({ ...formData, year: e.target.value })
                          }
                          placeholder="2022"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Rulaj (KM Curenți)
                        </label>
                        <input
                          type="number"
                          value={formData.km}
                          onChange={(e) =>
                            setFormData({ ...formData, km: e.target.value })
                          }
                          placeholder="14000"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Combustibil
                        </label>
                        <select
                          value={formData.fuel}
                          onChange={(e) =>
                            setFormData({ ...formData, fuel: e.target.value })
                          }
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"
                        >
                          <option>Benzină</option>
                          <option>Diesel</option>
                          <option>Hibrid</option>
                          <option>Electric</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Motorizare / CP
                        </label>
                        <input
                          type="text"
                          value={formData.engine}
                          onChange={(e) =>
                            setFormData({ ...formData, engine: e.target.value })
                          }
                          placeholder="Ex: 3.0 / 292 CP"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Cutie de viteze
                        </label>
                        <select
                          value={formData.transmission}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              transmission: e.target.value,
                            })
                          }
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"
                        >
                          <option>Automată</option>
                          <option>Manuală</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Caroserie
                        </label>
                        <select
                          value={formData.bodyType}
                          onChange={(e) =>
                            setFormData({ ...formData, bodyType: e.target.value })
                          }
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"
                        >
                          <option>Sedan</option>
                          <option>SUV</option>
                          <option>Coupe</option>
                          <option>Cabrio</option>
                          <option>Off-Road</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Status Înmatriculare
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) =>
                            setFormData({ ...formData, status: e.target.value })
                          }
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"
                        >
                          <option>Înmatriculat RO</option>
                          <option>Neînmatriculat</option>
                          <option>Înmatriculat Extern</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          TVA DEDUCTIBIL?
                        </label>
                        <select
                          value={formData.tva}
                          onChange={(e) =>
                            setFormData({ ...formData, tva: e.target.value })
                          }
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"
                        >
                          <option>Nu (Vânzător PF)</option>
                          <option>Da (Vânzător PJ)</option>
                        </select>
                      </div>
                    </>
                  )}
                  {/* IMOBILIARE */}
                  {category === "Imobiliare" && (
                    <>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Tip Proprietate
                        </label>
                        <select
                          value={formData.propType}
                          onChange={(e) =>
                            setFormData({ ...formData, propType: e.target.value })
                          }
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"
                        >
                          <option>Apartament</option>
                          <option>Casă / Vilă</option>
                          <option>Teren</option>
                          <option>Spațiu Comercial</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Suprafață Utilă (mp)
                        </label>
                        <input
                          type="number"
                          value={formData.surface}
                          onChange={(e) =>
                            setFormData({ ...formData, surface: e.target.value })
                          }
                          placeholder="Ex: 85"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Număr Camere
                        </label>
                        <input
                          type="number"
                          value={formData.rooms}
                          onChange={(e) =>
                            setFormData({ ...formData, rooms: e.target.value })
                          }
                          placeholder="Ex: 3"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          An Construcție
                        </label>
                        <input
                          type="number"
                          value={formData.buildYear}
                          onChange={(e) =>
                            setFormData({ ...formData, buildYear: e.target.value })
                          }
                          placeholder="Ex: 2023"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Etaj / Regim
                        </label>
                        <input
                          type="text"
                          value={formData.floor}
                          onChange={(e) =>
                            setFormData({ ...formData, floor: e.target.value })
                          }
                          placeholder="Ex: 4 din 10"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Loc de Parcare
                        </label>
                        <select
                          value={formData.parking}
                          onChange={(e) =>
                            setFormData({ ...formData, parking: e.target.value })
                          }
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"
                        >
                          <option>Inclus în preț</option>
                          <option>Disponibil contra cost</option>
                          <option>Fără parcare</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Suprafață Teren (pt Case)
                        </label>
                        <input
                          type="text"
                          value={formData.landSurface}
                          onChange={(e) =>
                            setFormData({ ...formData, landSurface: e.target.value })
                          }
                          placeholder="Ex: 500 mp"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Localizare Exactă
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) =>
                            setFormData({ ...formData, location: e.target.value })
                          }
                          placeholder="Ex: București, Sector 1, Șos. Nordului"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                    </>
                  )}
                  {/* LUX & CEASURI */}
                  {category === "Lux & Ceasuri" && (
                    <>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Brand
                        </label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={(e) =>
                            setFormData({ ...formData, brand: e.target.value })
                          }
                          placeholder="Ex: Patek Philippe, Rolex"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Model & Referință
                        </label>
                        <input
                          type="text"
                          value={formData.refModel}
                          onChange={(e) =>
                            setFormData({ ...formData, refModel: e.target.value })
                          }
                          placeholder="Ex: Nautilus 5711"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          An Achiziție
                        </label>
                        <input
                          type="number"
                          value={formData.purchaseYear}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchaseYear: e.target.value,
                            })
                          }
                          placeholder="Ex: 2021"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Mecanism
                        </label>
                        <select
                          value={formData.mechanism}
                          onChange={(e) =>
                            setFormData({ ...formData, mechanism: e.target.value })
                          }
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"
                        >
                          <option>Automat</option>
                          <option>Manual</option>
                          <option>Quartz</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Material Carcasă
                        </label>
                        <input
                          type="text"
                          value={formData.material}
                          onChange={(e) =>
                            setFormData({ ...formData, material: e.target.value })
                          }
                          placeholder="Ex: Aur roz, Oțel"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Pachet & Proveniență
                        </label>
                        <select
                          value={formData.boxPapers}
                          onChange={(e) =>
                            setFormData({ ...formData, boxPapers: e.target.value })
                          }
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"
                        >
                          <option>Full Set (Cutie + Acte)</option>
                          <option>Doar Ceasul</option>
                          <option>Ceas + Cutie</option>
                        </select>
                      </div>
                    </>
                  )}
                  {/* AFACERI DE VÂNZARE */}
                  {category === "Afaceri de vânzare" && (
                    <>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Domeniu de Activitate
                        </label>
                        <input
                          type="text"
                          value={formData.businessDomain}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              businessDomain: e.target.value,
                            })
                          }
                          placeholder="Ex: E-commerce, Restaurant, Producție"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Vechime Business
                        </label>
                        <input
                          type="text"
                          value={formData.businessAge}
                          onChange={(e) =>
                            setFormData({ ...formData, businessAge: e.target.value })
                          }
                          placeholder="Ex: 5 ani"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Cifră Afaceri Anuală (€)
                        </label>
                        <input
                          type="number"
                          value={formData.revenue}
                          onChange={(e) =>
                            setFormData({ ...formData, revenue: e.target.value })
                          }
                          placeholder="Ex: 250000"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Profit Net Anual (€)
                        </label>
                        <input
                          type="number"
                          value={formData.profit}
                          onChange={(e) =>
                            setFormData({ ...formData, profit: e.target.value })
                          }
                          placeholder="Ex: 45000"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Număr Angajați
                        </label>
                        <input
                          type="number"
                          value={formData.employees}
                          onChange={(e) =>
                            setFormData({ ...formData, employees: e.target.value })
                          }
                          placeholder="Ex: 12"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Ce include prețul?
                        </label>
                        <input
                          type="text"
                          value={formData.includes}
                          onChange={(e) =>
                            setFormData({ ...formData, includes: e.target.value })
                          }
                          placeholder="Ex: Stocuri de 20k EUR, firmă curată, bază 10k clienți"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                    </>
                  )}
                  {/* GADGETS / FOTO & AUDIO */}
                  {(category === "Gadgets" || category === "Foto & Audio") && (
                    <>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Brand & Model Exact
                        </label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={(e) =>
                            setFormData({ ...formData, brand: e.target.value })
                          }
                          placeholder="Ex: Apple MacBook Pro M3 Max"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          An Achiziție
                        </label>
                        <input
                          type="number"
                          value={formData.purchaseYear}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchaseYear: e.target.value,
                            })
                          }
                          placeholder="Ex: 2024"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Specificații Principale
                        </label>
                        <input
                          type="text"
                          value={formData.specs}
                          onChange={(e) =>
                            setFormData({ ...formData, specs: e.target.value })
                          }
                          placeholder="Ex: 36GB RAM, 1TB SSD, Baterie 100%"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Garanție Rămasă
                        </label>
                        <input
                          type="text"
                          value={formData.warranty}
                          onChange={(e) =>
                            setFormData({ ...formData, warranty: e.target.value })
                          }
                          placeholder="Ex: 12 Luni Apple"
                          className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-10 border-t-2 border-neutral-200/80 pt-8">
                {flowError && step === 1 && (
                  <div
                    role="alert"
                    className="mb-6 rounded-2xl border-2 border-red-800/40 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
                  >
                    {flowError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const err = validatePrimaryAssetFields();
                    if (err) {
                      setFlowError(err);
                      return;
                    }
                    if (!adTitle.trim()) {
                      setFlowError("Completează titlul anunțului.");
                      return;
                    }
                    setFlowError(null);
                    if (!hasTrackedStart) {
                      trackEvent(
                        "start_post_listing",
                        toEvaluationTrackingEventParams(evaluationTrackingRef.current, {
                          category: categoryLabelToTrackingKey(category),
                        }),
                      );
                      trackFunnelEvent("listing_started", funnelParams());
                      setHasTrackedStart(true);
                    }
                    trackListingStepCompleted(1);
                    setStep(2);
                  }}
                  className="w-full rounded-2xl border-[3px] border-black bg-[#FFD100] py-5 text-sm font-black uppercase tracking-[0.15em] text-black shadow-[6px_6px_0_0_#000] transition hover:brightness-105 active:translate-y-0.5 active:shadow-[4px_4px_0_0_#000]"
                >
                  Continuă la poze și descriere →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="relative z-10 space-y-8">
              <div>
                <h2 className="mb-3 text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
                  2. Poze și descriere
                </h2>
                <p className="text-sm font-medium text-neutral-600">
                  Pozele reale și descrierea sinceră cresc încrederea și numărul de oferte.
                </p>
              </div>

              <div className="rounded-3xl border border-black/[0.08] bg-[#F7F4EC]/80 p-6 md:border-2 md:border-black/[0.06] md:p-10">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Descriere anunț
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Stare, dotări, motivul vânzării, eventuale defecte — transparența ajută la tranzacție."
                  className={`${inputBase} mt-2 resize-none font-medium leading-relaxed normal-case`}
                />

                <div className="mt-10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    Fotografii
                  </p>
                  <div className="relative mt-3 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-black bg-white p-8 transition hover:border-[#FFD100] hover:bg-[#FFFDF8] md:min-h-[200px]">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    />
                    <span className="text-4xl" aria-hidden>
                      📷
                    </span>
                    <p className="mt-4 text-center text-sm font-black text-neutral-900">
                      Adaugă poze reale ale activului
                    </p>
                    <p className="mt-2 max-w-md text-center text-xs font-medium text-neutral-600">
                      Pozele cresc încrederea și viteza ofertelor.
                    </p>
                    {images.length > 0 && (
                      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#FFD100]">
                        {images.length} fișiere selectate
                      </p>
                    )}
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="mt-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                        Ordine poze — prima imagine este coperta anunțului
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {imagePreviews.map((src, index) => {
                          const isCover = index === 0;
                          return (
                            <div
                              key={src}
                              className={`group relative aspect-square overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
                                isCover
                                  ? "border-[#FFD100] ring-2 ring-[#FFD100]/30"
                                  : "border-neutral-200"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt={`Fotografie ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/15" />

                              {isCover && (
                                <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[#FFD100] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-black shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
                                  <Star size={10} strokeWidth={2.5} className="fill-black" aria-hidden />
                                  Principală
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                aria-label={`Șterge fotografia ${index + 1}`}
                                className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-md transition hover:bg-red-600"
                              >
                                <X size={14} strokeWidth={2.5} aria-hidden />
                              </button>

                              {!isCover && (
                                <button
                                  type="button"
                                  onClick={() => setAsCover(index)}
                                  aria-label={`Setează fotografia ${index + 1} ca imagine principală`}
                                  className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/55 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md transition hover:bg-black/75"
                                >
                                  <Star size={10} strokeWidth={2.5} aria-hidden />
                                  Setează ca principală
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {flowError && step === 2 && (
                <div
                  role="alert"
                  className="mb-4 rounded-2xl border-2 border-red-800/40 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
                >
                  {flowError}
                </div>
              )}

              {turnstileUiEnabled && (
                <EvaluateTurnstile
                  ref={listingTurnstileRef}
                  className="mb-6 flex justify-center"
                  onTokenChange={setListingTurnstileToken}
                />
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full rounded-2xl border-[3px] border-black bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:bg-neutral-50 sm:w-1/3"
                >
                  Înapoi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pricingMode === "evaluated") {
                      void generateAiPricing();
                      return;
                    }
                    setFlowError(null);
                    trackListingStepCompleted(2);
                    setStep(3);
                  }}
                  className="w-full rounded-2xl border-[3px] border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-[#FFD100] shadow-[6px_6px_0_0_#000] transition hover:bg-neutral-900 sm:flex-1"
                >
                  {tPost("pricingMode.actions.continueToPricing")}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="relative z-10 min-h-[420px]">
              {isAnalyzing ? (
                <div className="flex justify-center py-8 md:py-12">
                  <div className="w-full max-w-lg rounded-[1.75rem] border-[3px] border-black bg-black px-8 py-12 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:px-12 md:py-14">
                    <Loader2
                      className="mx-auto mb-4 h-12 w-12 animate-spin text-[#FFD100]"
                      aria-hidden
                    />
                    <h2 className="text-lg font-black uppercase tracking-wider text-white md:text-xl">
                      Analizăm piața…
                    </h2>
                    <p className="mt-3 text-sm font-medium text-neutral-300">
                      Căutăm repere pentru: {adTitle || "anunțul tău"}
                    </p>
                    <ul className="mx-auto mt-8 max-w-sm space-y-2 border-l-4 border-[#FFD100] pl-4 text-left text-xs font-semibold text-neutral-300">
                      <li>Comparăm anunțuri similare</li>
                      <li>Verificăm tendințe de preț</li>
                      <li>Pregătim estimarea</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-8 space-y-8 duration-500">
                  {flowError && (
                    <div
                      role="alert"
                      className="rounded-2xl border-2 border-red-800/40 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
                    >
                      {flowError}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
                      {tPost("pricingMode.step3Title")}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-neutral-600">
                      {tPost("pricingMode.step3Body")}
                    </p>
                  </div>

                  <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC]/80 p-5 md:p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      {tPost("saleMethod.heading")}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-700">
                      {tPost("saleMethod.question")}
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {(["direct", "auction"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => selectSaleMethod(method)}
                          className={`rounded-xl border-[3px] p-4 text-left transition ${
                            saleMethod === method
                              ? "border-black bg-[#FFD100] shadow-[4px_4px_0_0_#000]"
                              : "border-black bg-white hover:bg-[#FFF9E8]"
                          }`}
                        >
                          <p className="text-xs font-black uppercase tracking-wide">
                            {tPost(`saleMethod.${method}.title`)}
                          </p>
                          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-neutral-700 normal-case">
                            {tPost(`saleMethod.${method}.helper`)}
                          </p>
                        </button>
                      ))}
                    </div>
                    {saleMethod === "auction" ? (
                      <p className="mt-4 text-xs font-black uppercase tracking-wide text-black">
                        {tPost("saleMethod.auction.confirmation")}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC]/80 p-5 md:p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      {tPost("pricingMode.question")}
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {(["evaluated", "fixed_price"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => switchPricingMode(mode)}
                          className={`rounded-xl border-[3px] p-4 text-left transition ${
                            pricingMode === mode
                              ? "border-black bg-[#FFD100] shadow-[4px_4px_0_0_#000]"
                              : "border-black bg-white hover:bg-[#FFF9E8]"
                          }`}
                        >
                          <p className="text-xs font-black uppercase tracking-wide">
                            {saleMethod === "auction" && mode === "fixed_price"
                              ? tPost("saleMethod.auction.fixedPriceTitle")
                              : tPost(`pricingMode.options.${mode}.title`)}
                          </p>
                          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-neutral-700 normal-case">
                            {saleMethod === "auction" && mode === "fixed_price"
                              ? tPost("saleMethod.auction.fixedPriceDescription")
                              : tPost(`pricingMode.options.${mode}.description`)}
                          </p>
                        </button>
                      ))}
                    </div>
                    {pricingMode === null ? (
                      <p className="mt-4 text-xs font-medium leading-relaxed text-neutral-600">
                        {tPost("pricingMode.selectToContinue")}
                      </p>
                    ) : null}
                  </div>

                  {pricingMode === "fixed_price" ? (
                    <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC]/80 p-6">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                        {saleMethod === "auction"
                          ? tPost("saleMethod.auction.fixedPriceInputLabel")
                          : tPost("pricingMode.fixedPriceInputLabel")}
                      </label>
                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-neutral-900">
                          €
                        </span>
                        <input
                          type="number"
                          value={exitPrice}
                          onChange={(e) => {
                            setIsExitPriceManuallyEdited(true);
                            setExitPrice(e.target.value);
                          }}
                          placeholder="ex. 45000"
                          className={`${inputBase} pl-11 text-2xl font-black italic tabular-nums focus:bg-white md:text-3xl`}
                        />
                      </div>
                      <p className="mt-3 text-xs font-medium text-neutral-500">
                        {saleMethod === "auction"
                          ? tPost("saleMethod.auction.fixedPriceNote")
                          : tPost("pricingMode.fixedPriceNote")}
                      </p>
                    </div>
                  ) : null}

                  {pricingMode === "price_on_request" ? (
                    <div className="rounded-2xl border-[3px] border-black bg-[#FFF9E8] p-6 text-sm font-semibold text-neutral-800">
                      {tPost("pricingMode.priceOnRequestNote")}
                    </div>
                  ) : null}

                  {pricingMode === "evaluated" ? (
                  <>
                    <div>
                      <p className="mt-2 text-sm font-medium text-neutral-600">
                        {tPost("pricingMode.evaluatedIntro")}
                      </p>
                    </div>
                  {isLowConfidence ? (
                    /* Active premium/rare: ascundem estimarea automată și afișăm atenționarea. */
                    <div className="rounded-[2rem] border-[3px] border-amber-500 bg-amber-50 p-6 text-left shadow-[8px_8px_0_0_rgba(217,119,6,0.25)] md:p-8">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                        Activ Premium sau Rar
                      </p>
                      <p className="mt-3 text-sm font-semibold leading-relaxed text-amber-900">
                        💡 Algoritmul nostru indică date insuficiente în piață pentru o
                        estimare automată precisă a acestui bun. Te rugăm să introduci
                        manual prețul de piață (sau de listă) pentru a calcula corect
                        discountul.
                      </p>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-[2rem] border-[3px] border-black bg-white p-6 text-left shadow-[8px_8px_0_0_rgba(0,0,0,0.1)] md:p-8">
                      <div
                        className={`absolute right-0 top-0 rounded-bl-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest ${marketPrice > 0 ? "bg-black text-[#FFD100]" : "bg-amber-600 text-white"}`}
                      >
                        {marketPrice > 0 ? "Estimare disponibilă" : "Puține repere în piață"}
                      </div>

                      {marketPrice > 0 ? (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                            Preț estimat de piață
                          </p>
                          <p className="mt-2 font-black italic tracking-tighter text-black text-4xl md:text-5xl">
                            €{marketPrice.toLocaleString("ro-RO")}
                          </p>
                          <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4">
                            <p className="text-sm font-medium text-neutral-600">
                              Comparație cu{" "}
                              <span className="font-black text-black">{analyzedItems}</span>{" "}
                              anunțuri similare.
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                              Încredere estimare:{" "}
                              {Number.isFinite(confidencePercent)
                                ? Math.round(confidencePercent)
                                : 0}
                              %
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Repere limitate
                          </p>
                          <p className="mt-2 text-2xl font-black italic tracking-tighter text-black md:text-3xl">
                            Activ mai rar pe piață
                          </p>
                          <p className="mt-4 text-sm font-medium text-neutral-600">
                            Nu avem suficiente anunțuri identice pentru o medie clară.
                            Stabilește mai jos prețul la care ești dispus să vinzi.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="space-y-6 text-left">
                    <div className="flex flex-col gap-4 md:flex-row">
                      {isLowConfidence && (
                        <div className="flex-1 rounded-2xl border-[3px] border-black bg-[#F7F4EC]/80 p-6">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                            Preț estimat de piață / Preț de listă (EUR)
                          </label>
                          <div className="relative mt-2">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-neutral-900">
                              €
                            </span>
                            <input
                              type="number"
                              value={manualMarketPrice}
                              onChange={(e) => setManualMarketPrice(e.target.value)}
                              placeholder="ex. 250000"
                              className={`${inputBase} pl-11 text-2xl font-black italic tabular-nums focus:bg-white md:text-3xl`}
                            />
                          </div>
                          <p className="mt-3 text-xs font-medium text-neutral-500">
                            Prețul de referință (listă dealer / piață) pentru a calcula
                            discountul.
                          </p>
                        </div>
                      )}

                      <div className="flex-1 rounded-2xl border-[3px] border-black bg-[#F7F4EC]/80 p-6">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          Preț de vânzare rapidă (EUR)
                        </label>
                        <div className="relative mt-2">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-neutral-900">
                            €
                          </span>
                          <input
                            type="number"
                            value={exitPrice}
                            onChange={(e) => {
                              priceLockedFromEvaluationRef.current = false;
                              setIsExitPriceManuallyEdited(true);
                              setExitPrice(e.target.value);
                            }}
                            placeholder={marketPrice > 0 ? marketPrice.toString() : "ex. 45000"}
                            className={`${inputBase} pl-11 text-2xl font-black italic tabular-nums focus:bg-white md:text-3xl`}
                          />
                        </div>
                        <p className="mt-3 text-xs font-medium text-neutral-500">
                          {isLowConfidence
                            ? "Prețul la care vrei să vinzi rapid acest activ."
                            : marketPrice > 0
                              ? "Poți sub prețul pieței pentru lichiditate mai rapidă."
                              : "Introdu prețul la care vrei să încasezi."}
                        </p>
                      </div>

                      {(isLowConfidence
                        ? manualMarketPriceNum > 0 && Boolean(exitPrice)
                        : marketPrice > 0 || (marketPrice === 0 && exitPrice)) && (
                        <div
                          className={`flex w-full flex-col items-center justify-center rounded-2xl border-[3px] border-black p-6 md:w-36 ${
                            currentDiscountPercent >= 15
                              ? "bg-[#FFD100] text-black"
                              : currentDiscountPercent > 0
                                ? "bg-black text-[#FFD100]"
                                : "bg-neutral-100 text-neutral-400"
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Discount aplicat
                          </span>
                          <span className="mt-1 text-3xl font-black italic tabular-nums leading-none">
                            -{currentDiscountPercent}%
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="border-t border-neutral-200 pt-6 text-sm font-medium text-neutral-600">
                      La pasul următor alegi cât timp rămâne promovat anunțul și cât de
                      urgent vrei oferte.
                    </p>
                  </div>
                  </>
                  ) : null}

                  <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6 sm:flex-row sm:gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setFlowError(null);
                        setStep(2);
                      }}
                      className="w-full rounded-2xl border-[3px] border-black bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:bg-neutral-50 sm:w-1/3"
                    >
                      Înapoi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!canProceedFromPrice) {
                          setFlowError(tPost("pricingMode.validation.selectOptionToContinue"));
                          return;
                        }
                        setFlowError(null);
                        trackListingStepCompleted(3);
                        setStep(4);
                      }}
                      disabled={!canProceedFromPrice}
                      className="w-full flex-1 rounded-2xl border-[3px] border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-[#FFD100] shadow-[6px_6px_0_0_#000] transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Alege viteza de vânzare →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              {flowError && (
                <div
                  role="alert"
                  className="rounded-2xl border-2 border-red-800/40 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900"
                >
                  {flowError}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-black md:text-3xl">
                  {saleMethod === "auction"
                    ? tPost("step4.titleAuction")
                    : tPost("step4.titleDirect")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-neutral-600">
                  {saleMethod === "auction"
                    ? tPost("step4.bodyAuction")
                    : tPost("step4.bodyDirect")}
                </p>
                {saleMethod === "auction" ? (
                  <p className="mt-3 text-xs font-black uppercase tracking-wide text-black">
                    {tPost("saleMethod.auction.confirmation")}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                {PACKAGE_DEFS.filter((pkg) =>
                  saleMethod === "auction" ? pkg.id === "auction" : pkg.id !== "auction",
                ).map((pkg) => {
                  const isSelected = selectedPackage === pkg.id;
                  const price = packagePrices[pkg.id];
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => selectPackage(pkg.id)}
                      className={`relative rounded-2xl border-[3px] p-6 text-left transition-all ${
                        isSelected
                          ? "border-black bg-[#FFD100] shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
                          : "border-neutral-200 bg-white hover:border-black hover:shadow-[4px_4px_0_0_rgba(0,0,0,0.12)]"
                      }`}
                    >
                      {pkg.badge && (
                        <span className="absolute -right-2 -top-2 rounded-full border-2 border-black bg-black px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#FFD100]">
                          {pkg.badge}
                        </span>
                      )}
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-lg font-black uppercase italic text-black">
                          {pkg.title}
                        </p>
                        <span className="rounded-md border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                          {pkg.durationLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] font-semibold leading-snug text-neutral-700">
                        {pkg.description}
                      </p>
                      {pkg.benefits && pkg.benefits.length > 0 && (
                        <ul className="mt-3 space-y-1.5 border-l-2 border-[#FFD100] pl-3">
                          {pkg.benefits.map((benefit) => (
                            <li
                              key={benefit}
                              className="text-[10px] font-semibold leading-snug text-neutral-700"
                            >
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      )}
                      {pkg.id === "auction" && (
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-neutral-600">
                          Nu există câștigător automat. Plata și predarea se stabilesc direct între părți.
                        </p>
                      )}
                      <p className="mt-5 font-black tabular-nums text-2xl text-black">
                        {price} RON
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border-[3px] border-black bg-[#FDFCF8] px-5 py-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  {tPost("review.heading")}
                </p>
                <dl className="mt-3 space-y-2 text-sm font-semibold text-neutral-800">
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{tPost("review.category")}</dt>
                    <dd className="text-right font-black uppercase tracking-wide">{category}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{tPost("review.saleMethod")}</dt>
                    <dd className="text-right font-black uppercase tracking-wide">
                      {tPost(`saleMethod.${saleMethod}.title`)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{tPost("review.pricePresentation")}</dt>
                    <dd className="text-right font-black uppercase tracking-wide">
                      {saleMethod === "auction" && pricingMode === "fixed_price"
                        ? tPost("saleMethod.auction.fixedPriceTitle")
                        : pricingMode
                          ? tPost(`pricingMode.options.${pricingMode}.title`)
                          : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{tPost("review.package")}</dt>
                    <dd className="text-right font-black uppercase tracking-wide">
                      {selectedPackageMeta.title}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{tPost("review.duration")}</dt>
                    <dd className="text-right font-black uppercase tracking-wide">
                      {selectedPackageMeta.durationLabel}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-neutral-500">{tPost("review.amount")}</dt>
                    <dd className="text-right font-black tabular-nums">
                      {packagePrices[selectedPackage]} RON
                    </dd>
                  </div>
                </dl>
                {saleMethod === "auction" ? (
                  <p className="mt-4 text-xs font-black uppercase tracking-wide text-black">
                    {tPost("saleMethod.auction.confirmation")}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSaving}
                className="w-full bg-black py-5 text-[#FFD100] border-[3px] border-black rounded-2xl font-black uppercase tracking-widest text-sm italic transition-transform hover:scale-[1.01] shadow-[8px_8px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              >
                {isSaving ? "Se pregătește plata..." : "Plătește și publică anunțul"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFlowError(null);
                  setStep(3);
                }}
                className="mx-auto block w-fit border-b-2 border-transparent pb-1 text-center text-[10px] font-black uppercase italic text-neutral-500 transition-colors hover:border-black hover:text-black"
              >
                ← Înapoi la preț
              </button>
            </div>
          )}
          </form>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal && !recoveryOpen}
        onClose={() => setShowAuthModal(false)}
        nextPath="/pune-anunt"
      />
    </div>
  );
}
