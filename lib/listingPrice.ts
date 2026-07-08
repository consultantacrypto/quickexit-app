import { getNumberLocale } from "@/lib/i18n/format";

/** True when value is a finite number strictly greater than zero. */
export function isValidPrice(value: unknown): value is number {
  if (value === null || value === undefined) return false;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0;
}

/** Formats a valid price as `€{localized}`; returns null when invalid or ≤ 0. */
export function formatPriceOrNull(
  value: unknown,
  locale: string = "ro-RO",
): string | null {
  if (!isValidPrice(value)) return null;
  const n = typeof value === "number" ? value : Number(value);
  return `€${n.toLocaleString(locale)}`;
}

export function formatPriceOrNullForAppLocale(
  value: unknown,
  appLocale: string,
): string | null {
  return formatPriceOrNull(value, getNumberLocale(appLocale));
}

/** Profit / savings comparison only when both prices are valid and market > exit. */
export function hasValidMarketComparison(
  marketPrice: unknown,
  exitPrice: unknown,
): boolean {
  if (!isValidPrice(marketPrice) || !isValidPrice(exitPrice)) return false;
  return Number(marketPrice) > Number(exitPrice);
}

export function discountStringForCard(discount: unknown): string {
  const n = Number(discount);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return String(Math.round(n));
}

/** AdCard liquidity score (deal_score / 10); null when missing or non-positive. */
export function dealScoreForCard(dealScore: unknown): number | null {
  const n = Number(dealScore);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n / 10;
}

export function adCardPricingProps(
  item: {
    market_price?: unknown;
    exit_price?: unknown;
    discount?: unknown;
    deal_score?: unknown;
  },
  numberLocale: string,
) {
  return {
    marketPrice: formatPriceOrNull(item.market_price, numberLocale) ?? "",
    exitPrice: formatPriceOrNull(item.exit_price, numberLocale) ?? "",
    discount: discountStringForCard(item.discount),
    score: dealScoreForCard(item.deal_score),
  };
}

export function formatAdminPriceCell(
  value: unknown,
  locale: string = "ro-RO",
): string {
  return formatPriceOrNull(value, locale) ?? "—";
}
