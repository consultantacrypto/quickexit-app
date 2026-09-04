import { categoryLabelToTrackingKey } from "@/lib/evaluationTracking";
import {
  DEFAULT_LISTING_FORM_DATA,
  type ListingDraftFormData,
  type ListingDraftV1,
} from "@/lib/listingDraft";
import {
  coerceCompatibleSaleIntent,
  parseListingSalePackageId,
  type SaleMethod,
} from "@/lib/listingSaleStrategy";
import { type PricingMode } from "@/lib/pricingMode";

export type PublishStep = 1 | 2 | 3 | 4;

export type PublishStep1Code =
  | "title"
  | "auto_make_model"
  | "imobiliare_location_surface"
  | "lux_brand_model"
  | "business_domain_revenue"
  | "gadgets_brand";

export type PublishGuardInput = {
  category: string;
  adTitle: string;
  formData: ListingDraftFormData;
  description: string;
  pricingMode: PricingMode | null;
  exitPrice: string;
  manualMarketPrice: string;
  marketPrice: number;
  evaluationConfidenceScore?: number;
  evaluationHandoffActive: boolean;
  saleMethod: SaleMethod;
  selectedPackage: string;
};

export type PublishCheckoutGuardResult =
  | { ok: true }
  | { ok: false; step: PublishStep; code: string };

function toFiniteNumber(value: unknown): number {
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function isLowConfidenceEvaluation(input: {
  evaluationConfidenceScore?: number;
  evaluationHandoffActive: boolean;
}): boolean {
  if (typeof input.evaluationConfidenceScore !== "number") return false;
  const raw = toFiniteNumber(input.evaluationConfidenceScore);
  const percent = raw > 0 && raw <= 1 ? raw * 100 : raw;
  return percent < 50 && !input.evaluationHandoffActive;
}

export function canProceedFromPricing(input: PublishGuardInput): boolean {
  if (input.pricingMode === null) return false;
  const exitPriceNum = toFiniteNumber(input.exitPrice);
  const hasValidExitPrice = Number.isFinite(exitPriceNum) && exitPriceNum > 0;
  if (input.pricingMode === "price_on_request") return true;
  if (input.pricingMode === "fixed_price") return hasValidExitPrice;
  const manualMarketPriceNum = toFiniteNumber(input.manualMarketPrice);
  if (
    isLowConfidenceEvaluation({
      evaluationConfidenceScore: input.evaluationConfidenceScore,
      evaluationHandoffActive: input.evaluationHandoffActive,
    })
  ) {
    return Boolean(input.exitPrice) && manualMarketPriceNum > 0;
  }
  return Boolean(input.exitPrice);
}

export function validatePublishStep1(
  input: Pick<PublishGuardInput, "category" | "adTitle" | "formData">,
): PublishStep1Code | null {
  if (!input.adTitle.trim()) return "title";
  if (input.category === "Auto & Moto") {
    if (!input.formData.make.trim() || !input.formData.model.trim()) {
      return "auto_make_model";
    }
  } else if (input.category === "Imobiliare") {
    if (!input.formData.location.trim() || !input.formData.surface.trim()) {
      return "imobiliare_location_surface";
    }
  } else if (input.category === "Lux & Ceasuri") {
    if (!input.formData.brand.trim() || !input.formData.refModel.trim()) {
      return "lux_brand_model";
    }
  } else if (input.category === "Afaceri de vânzare") {
    if (!input.formData.businessDomain.trim() || !input.formData.revenue.trim()) {
      return "business_domain_revenue";
    }
  } else if (input.category === "Gadgets" || input.category === "Foto & Audio") {
    if (!input.formData.brand.trim()) return "gadgets_brand";
  }
  return null;
}

/** Step 2 has no persisted required fields (photos are files, not in the draft). */
export function validatePublishStep2(
  input: Pick<PublishGuardInput, "category" | "adTitle" | "formData">,
): boolean {
  return validatePublishStep1(input) === null;
}

export function validatePublishStep3(input: PublishGuardInput): boolean {
  return canProceedFromPricing(input);
}

export function listingDraftToGuardInput(draft: ListingDraftV1): PublishGuardInput {
  const sale = coerceCompatibleSaleIntent({
    saleMethod: draft.saleMethod,
    packageId: parseListingSalePackageId(draft.selectedPackage) ?? "standard",
    pricingMode: draft.pricingMode,
  });
  return {
    category: draft.category,
    adTitle: draft.adTitle,
    formData: { ...DEFAULT_LISTING_FORM_DATA, ...draft.formData },
    description: draft.description,
    pricingMode: draft.pricingMode,
    exitPrice: draft.exitPrice,
    manualMarketPrice: draft.manualMarketPrice,
    marketPrice: draft.marketPrice,
    evaluationConfidenceScore: draft.evaluationConfidenceScore,
    evaluationHandoffActive: draft.evaluationHandoffActive,
    saleMethod: sale.saleMethod,
    selectedPackage: sale.packageId,
  };
}

export function earliestIncompletePublishStep(
  input: PublishGuardInput,
): PublishStep {
  if (validatePublishStep1(input) !== null) return 1;
  if (!validatePublishStep2(input)) return 2;
  if (!validatePublishStep3(input)) return 3;
  return 4;
}

export function guardedPublishStep(
  claimedStep: number,
  input: PublishGuardInput,
): PublishStep {
  const earliest = earliestIncompletePublishStep(input);
  const claimed = (
    claimedStep === 2 || claimedStep === 3 || claimedStep === 4 ? claimedStep : 1
  ) as PublishStep;
  return claimed > earliest ? earliest : claimed;
}

export function assertPublishCheckoutReady(
  input: PublishGuardInput,
): PublishCheckoutGuardResult {
  if (validatePublishStep1(input) !== null) {
    return { ok: false, step: 1, code: "step_1_incomplete" };
  }
  if (!validatePublishStep2(input)) {
    return { ok: false, step: 2, code: "step_2_incomplete" };
  }
  if (!validatePublishStep3(input)) {
    return { ok: false, step: 3, code: "step_3_incomplete" };
  }
  const sale = coerceCompatibleSaleIntent({
    saleMethod: input.saleMethod,
    packageId: parseListingSalePackageId(input.selectedPackage) ?? "standard",
    pricingMode: input.pricingMode,
  });
  if (
    sale.saleMethod !== input.saleMethod ||
    sale.packageId !== input.selectedPackage
  ) {
    return { ok: false, step: 3, code: "incompatible_sale_intent" };
  }
  return { ok: true };
}

export function publishGuardCategoryKey(category: string): string {
  return categoryLabelToTrackingKey(category);
}
