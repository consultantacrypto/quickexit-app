import {
  MAX_EVALUATE_TEXT_LENGTH,
  resolveEvaluateCategoryKey,
  sanitizeEvaluateText,
} from "@/lib/evaluateSafety";

export const EVALUATION_DRAFT_STORAGE_KEY = "quickExitEvaluationDraft";
export const EVALUATION_DRAFT_TTL_MS = 2 * 60 * 60 * 1000;

export const EVALUATION_PREFILL_MESSAGE_FULL =
  "Am preluat datele din evaluarea ta. Verifică-le și modifică orice detaliu înainte de publicare.";

export const EVALUATION_PREFILL_MESSAGE_PRICE_ONLY =
  "Am preluat categoria și prețul estimat din evaluarea ta. Le poți modifica înainte de publicare.";

export type EvaluationDraftCategory =
  | "auto"
  | "imobiliare"
  | "lux"
  | "business"
  | "gadgets"
  | "foto";

export type PrefillLevel = "price_only" | "partial_details" | "full_details";

export type EvaluationPriceType = "market" | "quick_exit" | "fast_sale" | "liquidation";

const ALLOWED_PRICE_TYPES = new Set<EvaluationPriceType>([
  "market",
  "quick_exit",
  "fast_sale",
  "liquidation",
]);

const MAX_PRICE_LABEL_LENGTH = 40;

export const EVALUATION_PRICE_STRATEGIES: readonly {
  type: EvaluationPriceType;
  label: string;
  ctaLabel: string;
  resultKey:
    | "estimated_market_price"
    | "quick_exit_price"
    | "strong_exit_price"
    | "liquidation_price";
}[] = [
  {
    type: "market",
    label: "Preț de piață",
    ctaLabel: "Listează la prețul de piață",
    resultKey: "estimated_market_price",
  },
  {
    type: "quick_exit",
    label: "Preț Quick Exit",
    ctaLabel: "Listează la prețul Quick Exit",
    resultKey: "quick_exit_price",
  },
  {
    type: "fast_sale",
    label: "Vânzare rapidă",
    ctaLabel: "Listează pentru vânzare rapidă",
    resultKey: "strong_exit_price",
  },
  {
    type: "liquidation",
    label: "Lichidare",
    ctaLabel: "Listează la preț de lichidare",
    resultKey: "liquidation_price",
  },
];

export type EvaluationDraftAssetDetails = {
  make?: string;
  model?: string;
  year?: string;
  km?: string;
  property_type?: string;
  location?: string;
  surface?: string;
  rooms?: string;
  brand?: string;
  condition?: string;
  optionalYear?: string;
  industry?: string;
  revenue?: string;
};

export type EvaluationDraft = {
  source: "evaluation";
  category: EvaluationDraftCategory;
  selectedExitPrice?: number;
  selectedPriceType?: EvaluationPriceType;
  selectedPriceLabel?: string;
  referenceMarketPrice?: number;
  confidenceScore?: number;
  assetDetails: EvaluationDraftAssetDetails;
  suggestedTitle?: string;
  timestamp: number;
};

export type EvaluationFormSnapshot = {
  make: string;
  model: string;
  year: string;
  km: string;
  property_type: string;
  location: string;
  surface: string;
  rooms: string;
  brand: string;
  condition: string;
  optionalYear: string;
  industry: string;
  revenue: string;
};

export const EVALUATION_CATEGORY_LABELS: Record<EvaluationDraftCategory, string> = {
  auto: "Auto & Moto",
  imobiliare: "Imobiliare",
  lux: "Lux & Ceasuri",
  business: "Afaceri de vânzare",
  gadgets: "Gadgets",
  foto: "Foto & Audio",
};

const MAX_EXIT_PRICE_EUR = 100_000_000;

function sanitizeOptionalText(value: unknown): string | undefined {
  const sanitized = sanitizeEvaluateText(value, MAX_EVALUATE_TEXT_LENGTH);
  return sanitized || undefined;
}

function sanitizeOptionalDigits(value: unknown, maxLen = 12): string | undefined {
  if (value === null || value === undefined) return undefined;
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return undefined;
  return raw.slice(0, maxLen);
}

function parseExitPrice(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0 || n > MAX_EXIT_PRICE_EUR) return undefined;
  return Math.round(n);
}

export function parseEvaluationPriceType(value: unknown): EvaluationPriceType | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim().toLowerCase();
  if (ALLOWED_PRICE_TYPES.has(raw as EvaluationPriceType)) {
    return raw as EvaluationPriceType;
  }
  return undefined;
}

function sanitizePriceLabel(value: unknown): string | undefined {
  const sanitized = sanitizeEvaluateText(value, MAX_PRICE_LABEL_LENGTH);
  return sanitized || undefined;
}

export const EVALUATION_PRICE_RESULT_KEYS = EVALUATION_PRICE_STRATEGIES.map(
  (strategy) => strategy.resultKey,
);

export function getEvaluationPriceFromResult(
  result: Record<string, unknown> | null | undefined,
  priceType: EvaluationPriceType,
): number | undefined {
  if (!result) return undefined;
  const strategy = EVALUATION_PRICE_STRATEGIES.find((s) => s.type === priceType);
  if (!strategy) return undefined;
  return parseExitPrice(result[strategy.resultKey]);
}

/** True when at least one of the four strategy prices is a valid number > 0. */
export function hasUsableEvaluationPrices(
  result: Record<string, unknown> | null | undefined,
): boolean {
  if (!result) return false;
  return EVALUATION_PRICE_RESULT_KEYS.some((key) => {
    const price = parseExitPrice(result[key]);
    return price !== undefined && price > 0;
  });
}

/** Client-side guard: stale cache may keep external_search_strong while all prices are 0/N/A. */
export function isInsufficientPriceDataResult(
  result: Record<string, unknown> | null | undefined,
): boolean {
  if (!result) return false;
  if (result.data_quality_label === "insufficient_price_data") return true;
  return !hasUsableEvaluationPrices(result);
}

export function buildListingHrefForStrategy(
  category: EvaluationDraftCategory,
  selectedExitPrice?: number,
  selectedPriceType?: EvaluationPriceType,
  referenceMarketPrice?: number,
): string {
  const params = new URLSearchParams();
  params.set("source", "evaluation");
  params.set("category", category);
  if (selectedExitPrice) {
    params.set("exit_price", String(selectedExitPrice));
  }
  if (selectedPriceType) {
    params.set("price_type", selectedPriceType);
  }
  if (referenceMarketPrice) {
    params.set("reference_market_price", String(referenceMarketPrice));
  }
  return `/pune-anunt?${params.toString()}`;
}

export function computeReferenceMarketPrice(
  estimatedMarketPrice: number | undefined,
  selectedExitPrice: number | undefined,
  selectedPriceType: EvaluationPriceType | undefined,
): number | undefined {
  if (selectedPriceType === "market" && selectedExitPrice) {
    return selectedExitPrice;
  }
  return parseExitPrice(estimatedMarketPrice);
}

function parseConfidenceScore(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(n)) return undefined;
  const percent = n > 0 && n <= 1 ? n * 100 : n;
  if (percent < 0 || percent > 99) return undefined;
  return Math.round(percent);
}

function buildAssetDetails(
  category: EvaluationDraftCategory,
  form: EvaluationFormSnapshot,
): EvaluationDraftAssetDetails {
  switch (category) {
    case "auto":
      return {
        make: sanitizeOptionalText(form.make),
        model: sanitizeOptionalText(form.model),
        year: sanitizeOptionalDigits(form.year, 4),
        km: sanitizeOptionalDigits(form.km),
      };
    case "imobiliare":
      return {
        property_type: sanitizeOptionalText(form.property_type),
        location: sanitizeOptionalText(form.location),
        surface: sanitizeOptionalDigits(form.surface),
        rooms: sanitizeOptionalDigits(form.rooms, 3),
      };
    case "lux":
    case "gadgets":
    case "foto":
      return {
        brand: sanitizeOptionalText(form.brand),
        model: sanitizeOptionalText(form.model),
        condition: sanitizeOptionalText(form.condition),
        optionalYear: sanitizeOptionalDigits(form.optionalYear, 4),
      };
    case "business":
      return {
        industry: sanitizeOptionalText(form.industry),
        revenue: sanitizeOptionalDigits(form.revenue),
        location: sanitizeOptionalText(form.location),
      };
    default:
      return {};
  }
}

function buildSuggestedTitle(
  category: EvaluationDraftCategory,
  details: EvaluationDraftAssetDetails,
): string | undefined {
  if (category === "auto") {
    const { make, model, year } = details;
    if (make && model && year) {
      return sanitizeOptionalText(`${make} ${model} ${year}`);
    }
    return undefined;
  }

  if (category === "lux") {
    const { brand, model } = details;
    if (brand && model) return sanitizeOptionalText(`${brand} ${model}`);
    return brand || model;
  }

  if (category === "gadgets" || category === "foto") {
    const { brand, model } = details;
    if (brand && model) return sanitizeOptionalText(`${brand} ${model}`);
    return brand || model;
  }

  return undefined;
}

export function buildEvaluationDraft(input: {
  category: EvaluationDraftCategory;
  formData: EvaluationFormSnapshot;
  selectedExitPrice?: number;
  selectedPriceType?: EvaluationPriceType;
  selectedPriceLabel?: string;
  estimatedMarketPrice?: number;
  confidenceScore?: number;
}): EvaluationDraft {
  const assetDetails = buildAssetDetails(input.category, input.formData);
  const selectedPriceType = input.selectedPriceType
    ? parseEvaluationPriceType(input.selectedPriceType)
    : undefined;
  const strategyLabel = selectedPriceType
    ? EVALUATION_PRICE_STRATEGIES.find((s) => s.type === selectedPriceType)?.label
    : undefined;
  const selectedPriceLabel =
    sanitizePriceLabel(input.selectedPriceLabel) ?? strategyLabel;
  const selectedExitPrice = parseExitPrice(input.selectedExitPrice);
  const referenceMarketPrice = computeReferenceMarketPrice(
    parseExitPrice(input.estimatedMarketPrice),
    selectedExitPrice,
    selectedPriceType,
  );

  return {
    source: "evaluation",
    category: input.category,
    selectedExitPrice,
    selectedPriceType,
    selectedPriceLabel,
    referenceMarketPrice,
    confidenceScore: parseConfidenceScore(input.confidenceScore),
    assetDetails,
    suggestedTitle: buildSuggestedTitle(input.category, assetDetails),
    timestamp: Date.now(),
  };
}

export function saveEvaluationDraftToSession(draft: EvaluationDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(EVALUATION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // best-effort; query params remain fallback
  }
}

function sanitizeLoadedAssetDetails(
  raw: unknown,
): EvaluationDraftAssetDetails {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const out: EvaluationDraftAssetDetails = {};

  for (const key of [
    "make",
    "model",
    "year",
    "km",
    "property_type",
    "location",
    "surface",
    "rooms",
    "brand",
    "condition",
    "optionalYear",
    "industry",
    "revenue",
  ] as const) {
    const value =
      key === "year" || key === "km" || key === "surface" || key === "rooms" || key === "optionalYear" || key === "revenue"
        ? sanitizeOptionalDigits(source[key])
        : sanitizeOptionalText(source[key]);
    if (value) out[key] = value;
  }

  return out;
}

export function loadEvaluationDraftFromSession(): EvaluationDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(EVALUATION_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.source !== "evaluation") return null;

    const timestamp = Number(parsed.timestamp);
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > EVALUATION_DRAFT_TTL_MS) {
      return null;
    }

    const category = resolveEvaluateCategoryKey(parsed.category);
    if (!category) return null;

    const assetDetails = sanitizeLoadedAssetDetails(parsed.assetDetails);
    const selectedExitPrice = parseExitPrice(parsed.selectedExitPrice);
    const selectedPriceType = parseEvaluationPriceType(parsed.selectedPriceType);
    const selectedPriceLabel =
      sanitizePriceLabel(parsed.selectedPriceLabel) ??
      (selectedPriceType
        ? EVALUATION_PRICE_STRATEGIES.find((s) => s.type === selectedPriceType)?.label
        : undefined);
    const suggestedTitle = sanitizeOptionalText(parsed.suggestedTitle);
    const referenceMarketPrice = parseExitPrice(parsed.referenceMarketPrice);
    const confidenceScore = parseConfidenceScore(parsed.confidenceScore);

    return {
      source: "evaluation",
      category,
      selectedExitPrice,
      selectedPriceType,
      selectedPriceLabel,
      referenceMarketPrice,
      confidenceScore,
      assetDetails,
      suggestedTitle,
      timestamp,
    };
  } catch {
    return null;
  }
}

function countFilledDetails(details: EvaluationDraftAssetDetails): number {
  return Object.values(details).filter(Boolean).length;
}

export function isFullEvaluationDraftDetails(
  category: EvaluationDraftCategory,
  details: EvaluationDraftAssetDetails,
): boolean {
  switch (category) {
    case "auto":
      return Boolean(details.make && details.model && details.year);
    case "imobiliare":
      return Boolean(details.location && details.surface);
    case "lux":
    case "gadgets":
    case "foto":
      return Boolean(details.brand && details.model);
    case "business":
      return Boolean(details.industry && details.revenue);
    default:
      return false;
  }
}

export function computePrefillLevel(
  category: EvaluationDraftCategory,
  details: EvaluationDraftAssetDetails,
  _hasExitPrice: boolean,
): PrefillLevel {
  const detailCount = countFilledDetails(details);
  if (detailCount === 0) {
    return "price_only";
  }
  if (isFullEvaluationDraftDetails(category, details)) {
    return "full_details";
  }
  return "partial_details";
}

export type ListingFormDataPatch = {
  make?: string;
  model?: string;
  year?: string;
  km?: string;
  propType?: string;
  location?: string;
  surface?: string;
  rooms?: string;
  brand?: string;
  refModel?: string;
  purchaseYear?: string;
  businessDomain?: string;
  revenue?: string;
};

export function mapEvaluationDraftToListingPatch(
  draft: EvaluationDraft,
): { formDataPatch: ListingFormDataPatch; adTitle?: string } {
  const d = draft.assetDetails;
  const patch: ListingFormDataPatch = {};

  switch (draft.category) {
    case "auto":
      if (d.make) patch.make = d.make;
      if (d.model) patch.model = d.model;
      if (d.year) patch.year = d.year;
      if (d.km) patch.km = d.km;
      break;
    case "imobiliare":
      if (d.property_type) patch.propType = d.property_type;
      if (d.location) patch.location = d.location;
      if (d.surface) patch.surface = d.surface;
      if (d.rooms) patch.rooms = d.rooms;
      break;
    case "lux":
      if (d.brand) patch.brand = d.brand;
      if (d.model) patch.refModel = d.model;
      if (d.optionalYear) patch.purchaseYear = d.optionalYear;
      break;
    case "gadgets":
    case "foto":
      if (d.brand && d.model) patch.brand = `${d.brand} ${d.model}`;
      else if (d.brand) patch.brand = d.brand;
      else if (d.model) patch.brand = d.model;
      if (d.optionalYear) patch.purchaseYear = d.optionalYear;
      break;
    case "business":
      if (d.industry) patch.businessDomain = d.industry;
      if (d.revenue) patch.revenue = d.revenue;
      if (d.location) patch.location = d.location;
      break;
    default:
      break;
  }

  return {
    formDataPatch: patch,
    adTitle: draft.suggestedTitle,
  };
}

export function prefillMessageForLevel(level: PrefillLevel): string {
  return level === "price_only"
    ? EVALUATION_PREFILL_MESSAGE_PRICE_ONLY
    : EVALUATION_PREFILL_MESSAGE_FULL;
}

export function buildEvaluationPrefillMessage(
  level: PrefillLevel,
  selectedPriceLabel?: string,
): string {
  if (selectedPriceLabel) {
    return `Am preluat datele din evaluarea ta și strategia aleasă: ${selectedPriceLabel}. Verifică prețurile și modifică orice detaliu înainte de publicare.`;
  }
  return prefillMessageForLevel(level);
}
