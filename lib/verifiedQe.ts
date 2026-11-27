/**
 * Public Verificat QE badge.
 * Selects tolerate a database that does not have the column yet: the page
 * retries the same query without it and renders no badge.
 */

export const VERIFIED_QE_COLUMN = "verified_qe";

export type VerifiedQeQueryError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

export type VerifiedQeQueryResult<T> = {
  data: T;
  error: VerifiedQeQueryError;
  count?: number | null;
};

let verifiedQeColumnPresent = false;

export function resetVerifiedQeColumnProbe(): void {
  verifiedQeColumnPresent = false;
}

export function withVerifiedQeField(fields: string): string {
  const parts = fields
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.includes(VERIFIED_QE_COLUMN)) return fields;
  return `${fields},${VERIFIED_QE_COLUMN}`;
}

export function isMissingVerifiedQeColumnError(error: VerifiedQeQueryError): boolean {
  if (!error) return false;
  const blob = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  if (!blob.includes(VERIFIED_QE_COLUMN)) return false;
  return (
    blob.includes("42703") ||
    blob.includes("pgrst204") ||
    blob.includes("does not exist") ||
    blob.includes("schema cache") ||
    blob.includes("could not find") ||
    blob.includes("undefined column")
  );
}

export type VerifiedQeListingRow = {
  id: string;
  title: string;
  images?: string[] | null;
  market_price?: number | string | null;
  exit_price?: number | string | null;
  discount?: number | string | null;
  deal_score?: number | null;
  sale_strategy?: string | null;
  offer_count?: number | null;
  highest_offer?: number | string | null;
  expires_at?: string | null;
  status?: string | null;
  is_seed?: boolean | null;
  category?: string | null;
  created_at?: string | null;
  details?: unknown;
  crypto_payment_mode?: string | null;
  crypto_assets?: string[] | null;
  listing_kind?: string | null;
  availability_status?: string | null;
  verified_qe?: boolean | null;
};

function asPrice(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") return value;
  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Dynamic selects are typed as errors by supabase-js. Normalize the runtime rows. */
export function listingRows(data: unknown): VerifiedQeListingRow[] {
  if (!Array.isArray(data)) return [];
  const rows: VerifiedQeListingRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !row.id) continue;
    rows.push({
      id: row.id,
      title: typeof row.title === "string" ? row.title : "",
      images: Array.isArray(row.images) ? row.images.filter((img): img is string => typeof img === "string") : null,
      market_price: asPrice(row.market_price),
      exit_price: asPrice(row.exit_price),
      discount: asPrice(row.discount),
      deal_score: asNumber(row.deal_score),
      sale_strategy: asText(row.sale_strategy),
      offer_count: asNumber(row.offer_count),
      highest_offer: asPrice(row.highest_offer),
      expires_at: asText(row.expires_at),
      status: asText(row.status),
      is_seed: typeof row.is_seed === "boolean" ? row.is_seed : null,
      category: asText(row.category),
      created_at: asText(row.created_at),
      details: row.details,
      crypto_payment_mode: asText(row.crypto_payment_mode),
      crypto_assets: Array.isArray(row.crypto_assets)
        ? row.crypto_assets.filter((asset): asset is string => typeof asset === "string")
        : null,
      listing_kind: asText(row.listing_kind),
      availability_status: asText(row.availability_status),
      verified_qe: row.verified_qe === true,
    });
  }
  return rows;
}

export function readVerifiedQe(row: unknown): boolean {
  if (!row || typeof row !== "object") return false;
  return (row as { verified_qe?: unknown }).verified_qe === true;
}

/**
 * Runs `run` with verified_qe appended. If PostgREST reports that the column
 * is absent, retries the original field list and leaves the badge off.
 * `onMissing: "empty"` is for the verified-only filter: there is nothing to
 * show until the column exists, and the unfiltered query must not run.
 */
export async function queryToleratingMissingVerifiedQe<T>(
  run: (fields: string) => PromiseLike<VerifiedQeQueryResult<T>>,
  fields: string,
  options?: { onMissing?: "retry" | "empty" },
): Promise<VerifiedQeQueryResult<T> & { columnMissing: boolean }> {
  const onMissing = options?.onMissing ?? "retry";
  if (verifiedQeColumnPresent) {
    const present = await run(withVerifiedQeField(fields));
    return { ...present, columnMissing: false };
  }

  const first = await run(withVerifiedQeField(fields));
  if (!first.error) {
    verifiedQeColumnPresent = true;
    return { ...first, columnMissing: false };
  }
  if (!isMissingVerifiedQeColumnError(first.error)) {
    return { ...first, columnMissing: false };
  }
  if (onMissing === "empty") {
    const emptyData = (Array.isArray(first.data) ? [] : null) as T;
    return { data: emptyData, error: null, count: 0, columnMissing: true };
  }
  const second = await run(fields);
  return { ...second, columnMissing: true };
}
