import { normalizeSaleType } from "@/utils/normalizeSaleType";

type ListingCtaLike = {
  category?: string | null;
  details?: unknown;
  sale_strategy?: string | null;
  isFinancingEnabled?: boolean;
};

export type ListingCtaMode =
  | "normal"
  | "auction"
  | "auto_financing"
  | "on_order";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExplicitOnOrder(details: unknown): boolean {
  if (!isRecord(details)) return false;
  const availability = String(details.availability_type ?? "").toLowerCase();
  if (availability === "on_order" || availability === "preorder") return true;
  const status = String(details.status ?? "").toLowerCase();
  if (status.includes("comand")) return true;
  return false;
}

export function getListingCtaMode(listing: ListingCtaLike): ListingCtaMode {
  if (normalizeSaleType(listing.sale_strategy) === "auction") return "auction";
  if (hasExplicitOnOrder(listing.details)) return "on_order";
  const category = String(listing.category ?? "").toLowerCase();
  if (category.includes("auto") && listing.isFinancingEnabled) return "auto_financing";
  return "normal";
}
