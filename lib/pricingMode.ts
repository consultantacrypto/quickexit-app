export type PricingMode = "evaluated" | "fixed_price" | "price_on_request";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function getPricingMode(details: unknown): PricingMode {
  if (!isObjectRecord(details)) return "evaluated";
  const raw = details.pricing_mode;
  if (raw === "fixed_price" || raw === "price_on_request" || raw === "evaluated") {
    return raw;
  }
  return "evaluated";
}

export function isEvaluatedPricing(details: unknown): boolean {
  return getPricingMode(details) === "evaluated";
}

export function isFixedPrice(details: unknown): boolean {
  return getPricingMode(details) === "fixed_price";
}

export function isPriceOnRequest(details: unknown): boolean {
  return getPricingMode(details) === "price_on_request";
}
