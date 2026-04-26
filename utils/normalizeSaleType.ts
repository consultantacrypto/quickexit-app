export type SaleType = "standard" | "urgent" | "extreme" | "auction";

export function normalizeSaleType(value?: string | null): SaleType {
  const val = value?.toLowerCase() || "standard";
  if (val === "flash" || val === "licitatie" || val === "auction") return "auction";
  if (val === "fast" || val === "urgent") return "urgent";
  if (val === "extreme" || val === "azi") return "extreme";
  if (val === "economy" || val === "standard") return "standard";
  return "standard";
}