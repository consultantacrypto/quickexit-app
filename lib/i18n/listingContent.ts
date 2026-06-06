import type { PublicListingRow } from "@/lib/listingSeo";

export function resolveListingField(
  listing: PublicListingRow,
  field: "title" | "description",
  locale: string,
  fallback: string,
): string {
  const enKey = field === "title" ? "title_en" : "description_en";
  const enValue = listing[enKey];
  if (locale === "en" && typeof enValue === "string" && enValue.trim()) {
    return enValue.trim();
  }

  const value = listing[field];
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return fallback;
}
