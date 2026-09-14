export const DEMAND_BUDGET_MIN_EUR = 1;
export const DEMAND_BUDGET_MAX_EUR = 100_000_000;

export type DemandBudgetLocale = "ro" | "en";

export type DemandBudgetRangeOk = {
  ok: true;
  budgetMin: number;
  budget: number;
};

export type DemandBudgetRangeErrorCode =
  | "invalid_min"
  | "invalid_max"
  | "min_exceeds_max";

export type DemandBudgetRangeErr = {
  ok: false;
  code: DemandBudgetRangeErrorCode;
};

export type DemandBudgetRangeResult = DemandBudgetRangeOk | DemandBudgetRangeErr;

const STORED_INTEGER_RE = /^\d+(?:\.0+)?$/;

function groupThousands(value: number, separator: "," | "."): string {
  const digits = String(value);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

function inAllowedRange(value: number): boolean {
  return (
    Number.isInteger(value) &&
    Number.isSafeInteger(value) &&
    value >= DEMAND_BUDGET_MIN_EUR &&
    value <= DEMAND_BUDGET_MAX_EUR
  );
}

/** Strict parser for form input: digits only, no sign, decimal, or exponent. */
export function parseDemandBudgetInput(value: unknown): number | null {
  if (typeof value === "number") {
    if (!inAllowedRange(value)) return null;
    return value;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  if (trimmed.length > 1 && trimmed.startsWith("0")) return null;
  const parsed = Number(trimmed);
  if (!inAllowedRange(parsed)) return null;
  return parsed;
}

/**
 * Coerce a stored Supabase numeric (number or numeric string) to a whole EUR amount.
 * Accepts trailing `.0` from `numeric` columns; rejects exponents and other fractions.
 */
export function readDemandBudgetAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value !== Math.trunc(value)) return null;
    if (!inAllowedRange(value)) return null;
    return value;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/[eE]/.test(trimmed)) return null;
  if (!STORED_INTEGER_RE.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!inAllowedRange(parsed)) return null;
  return parsed;
}

export function parseDemandBudgetRange(
  minValue: unknown,
  maxValue: unknown,
): DemandBudgetRangeResult {
  const budgetMin = parseDemandBudgetInput(minValue);
  const budget = parseDemandBudgetInput(maxValue);
  if (budgetMin === null) return { ok: false, code: "invalid_min" };
  if (budget === null) return { ok: false, code: "invalid_max" };
  if (budgetMin > budget) return { ok: false, code: "min_exceeds_max" };
  return { ok: true, budgetMin, budget };
}

export function formatEurMajorUnits(value: number, locale: DemandBudgetLocale): string {
  const separator = locale === "en" ? "," : ".";
  return `€${groupThousands(value, separator)}`;
}

export function formatDemandBudgetCompact(
  budgetMin: number | null,
  budget: number,
  locale: DemandBudgetLocale,
): string {
  const maxLabel = formatEurMajorUnits(budget, locale);
  if (budgetMin === null || budgetMin > budget) {
    return locale === "en" ? `Up to ${maxLabel}` : `Până la ${maxLabel}`;
  }
  const minLabel = formatEurMajorUnits(budgetMin, locale);
  return `${minLabel}–${maxLabel}`;
}

export function formatStoredDemandBudgetCompact(
  minValue: unknown,
  maxValue: unknown,
  locale: DemandBudgetLocale,
): string | null {
  const budget = readDemandBudgetAmount(maxValue);
  if (budget === null) return null;
  const budgetMin = readDemandBudgetAmount(minValue);
  return formatDemandBudgetCompact(
    budgetMin !== null && budgetMin <= budget ? budgetMin : null,
    budget,
    locale,
  );
}

export function formatDemandBudgetFull(
  budgetMin: number | null,
  budget: number,
  locale: DemandBudgetLocale,
): string {
  const compact = formatDemandBudgetCompact(budgetMin, budget, locale);
  return locale === "en" ? `Available budget: ${compact}` : `Buget disponibil: ${compact}`;
}
