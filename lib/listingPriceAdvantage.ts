type ListingPriceLike = {
  exit_price?: unknown;
  market_price?: unknown;
};

export type ListingPriceAdvantage = {
  exitPrice: number;
  marketPrice: number;
  savings: number;
  savingsPercent: number;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function getListingPriceAdvantage(
  listing: ListingPriceLike,
): ListingPriceAdvantage | null {
  const exitPrice = toFiniteNumber(listing.exit_price);
  const marketPrice = toFiniteNumber(listing.market_price);
  if (!exitPrice || !marketPrice) return null;
  if (exitPrice <= 0 || marketPrice <= 0 || marketPrice <= exitPrice) return null;

  const savings = marketPrice - exitPrice;
  const savingsPercent = Math.round((savings / marketPrice) * 100);
  if (savings <= 0 || savingsPercent <= 0) return null;

  return {
    exitPrice,
    marketPrice,
    savings,
    savingsPercent,
  };
}
