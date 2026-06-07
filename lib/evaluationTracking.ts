import {
  parseEvaluationPriceType,
  type EvaluationPriceType,
  type PrefillLevel,
} from "@/lib/evaluationDraft";

export type EvaluationTrackingContext = {
  source: "evaluation" | "direct";
  selected_price_type?: EvaluationPriceType | "unknown" | "manual";
  prefill_level?: PrefillLevel;
  has_exit_price?: boolean;
  has_market_reference?: boolean;
  evaluation_handoff?: boolean;
};

const ALLOWED_PREFILL_LEVELS = new Set<PrefillLevel>([
  "price_only",
  "partial_details",
  "full_details",
]);

function parseAcquisitionPriceType(
  value: unknown,
): EvaluationPriceType | "manual" | undefined {
  if (value === "manual") return "manual";
  return parseEvaluationPriceType(value);
}

function parseAcquisitionPrefillLevel(value: unknown): PrefillLevel | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim() as PrefillLevel;
  return ALLOWED_PREFILL_LEVELS.has(raw) ? raw : undefined;
}

export function buildListingAcquisitionDetails(
  ctx: EvaluationTrackingContext | null | undefined,
): Record<string, string | boolean> {
  if (!ctx || ctx.source !== "evaluation") {
    return {};
  }

  const out: Record<string, string | boolean> = {
    acquisition_source: "evaluation",
    evaluation_handoff: true,
  };

  const selectedPriceType = parseAcquisitionPriceType(ctx.selected_price_type);
  if (selectedPriceType) {
    out.selected_price_type = selectedPriceType;
  }

  const prefillLevel = parseAcquisitionPrefillLevel(ctx.prefill_level);
  if (prefillLevel) {
    out.prefill_level = prefillLevel;
  }

  return out;
}

export function toEvaluationTrackingEventParams(
  ctx: EvaluationTrackingContext | null | undefined,
  extra?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null | undefined> {
  const base: Record<string, string | number | boolean | null | undefined> = {
    ...(extra ?? {}),
  };

  if (!ctx || ctx.source !== "evaluation") {
    base.source = base.source ?? "direct";
    return base;
  }

  base.source = "evaluation";
  if (ctx.selected_price_type) base.selected_price_type = ctx.selected_price_type;
  if (ctx.prefill_level) base.prefill_level = ctx.prefill_level;
  if (ctx.has_exit_price !== undefined) base.has_exit_price = ctx.has_exit_price;
  if (ctx.has_market_reference !== undefined) {
    base.has_market_reference = ctx.has_market_reference;
  }
  base.evaluation_handoff = true;

  return base;
}

export function categoryLabelToTrackingKey(categoryLabel: string): string {
  switch (categoryLabel) {
    case "Auto & Moto":
      return "auto";
    case "Imobiliare":
      return "imobiliare";
    case "Lux & Ceasuri":
      return "lux";
    case "Afaceri de vânzare":
      return "business";
    case "Gadgets":
      return "gadgets";
    case "Foto & Audio":
      return "foto";
    default:
      return "unknown";
  }
}

export function parseListingAcquisitionDetails(
  details: unknown,
): Pick<
  EvaluationTrackingContext,
  "source" | "selected_price_type" | "prefill_level" | "evaluation_handoff"
> | null {
  if (!details || typeof details !== "object") return null;
  const raw = details as Record<string, unknown>;
  if (raw.acquisition_source !== "evaluation") return null;

  return {
    source: "evaluation",
    evaluation_handoff: raw.evaluation_handoff === true,
    selected_price_type:
      parseAcquisitionPriceType(raw.selected_price_type) ?? "unknown",
    prefill_level: parseAcquisitionPrefillLevel(raw.prefill_level),
  };
}
