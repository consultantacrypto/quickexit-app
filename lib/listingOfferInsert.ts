import { offerUtmForInsert, type OfferUtm } from "@/lib/offerAttribution";

export type ListingOfferInsertError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

/**
 * True when PostgREST/Postgres rejected the insert because `listing_offers.utm`
 * is not in the schema yet. Other failures must surface unchanged.
 */
export function isMissingOfferUtmColumnError(
  error: ListingOfferInsertError | null | undefined,
): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  if (!message.includes("utm")) return false;
  if (code === "PGRST204" || code === "42703") return true;
  return (
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist") ||
    message.includes("undefined column")
  );
}

export async function insertListingOfferRow(
  insert: (row: Record<string, unknown>) => Promise<{ error: ListingOfferInsertError | null }>,
  row: Record<string, unknown>,
  utm: OfferUtm | null | undefined,
): Promise<{ error: ListingOfferInsertError | null }> {
  const payload = offerUtmForInsert(utm);
  if (!payload) return insert(row);
  const first = await insert({ ...row, utm: payload });
  if (first.error && isMissingOfferUtmColumnError(first.error)) {
    return insert(row);
  }
  return first;
}
