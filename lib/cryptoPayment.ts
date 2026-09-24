export const CRYPTO_PAYMENT_MODES = ["none", "full", "partial", "negotiable"] as const;
export type CryptoPaymentMode = (typeof CRYPTO_PAYMENT_MODES)[number];

/** Display order. Persisted order is lexicographic so the DB check can reject duplicates. */
export const CRYPTO_ASSET_ALLOWLIST = ["usdc", "usdt", "btc", "eth", "bnb", "xrp", "sol"] as const;
export type CryptoAsset = (typeof CRYPTO_ASSET_ALLOWLIST)[number];

export const CRYPTO_LISTING_COLUMNS = "crypto_payment_mode,crypto_assets";

const MODE_SET = new Set<string>(CRYPTO_PAYMENT_MODES);
const ASSET_SET = new Set<string>(CRYPTO_ASSET_ALLOWLIST);

export type CryptoPayment = {
  mode: CryptoPaymentMode;
  assets: CryptoAsset[];
};

export const EMPTY_CRYPTO_PAYMENT: CryptoPayment = { mode: "none", assets: [] };

export type CryptoPaymentError =
  | "invalid_mode"
  | "invalid_assets"
  | "assets_required"
  | "assets_forbidden";

export function sortCryptoAssets(assets: readonly CryptoAsset[]): CryptoAsset[] {
  return [...assets].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function parseCryptoPayment(
  mode: unknown,
  assets: unknown,
): { ok: true; value: CryptoPayment } | { ok: false; error: CryptoPaymentError } {
  if (typeof mode !== "string" || !MODE_SET.has(mode)) {
    return { ok: false, error: "invalid_mode" };
  }
  if (!Array.isArray(assets)) {
    return { ok: false, error: "invalid_assets" };
  }

  const parsed: CryptoAsset[] = [];
  for (const item of assets) {
    if (typeof item !== "string") return { ok: false, error: "invalid_assets" };
    const symbol = item.trim().toLowerCase();
    if (!ASSET_SET.has(symbol)) return { ok: false, error: "invalid_assets" };
    if (parsed.includes(symbol as CryptoAsset)) return { ok: false, error: "invalid_assets" };
    parsed.push(symbol as CryptoAsset);
  }

  const paymentMode = mode as CryptoPaymentMode;
  if (paymentMode === "none") {
    if (parsed.length > 0) return { ok: false, error: "assets_forbidden" };
    return { ok: true, value: EMPTY_CRYPTO_PAYMENT };
  }
  if (parsed.length < 1 || parsed.length > 7) {
    return { ok: false, error: "assets_required" };
  }
  return { ok: true, value: { mode: paymentMode, assets: sortCryptoAssets(parsed) } };
}

export function listingAcceptsCrypto(row: { crypto_payment_mode?: unknown } | null | undefined): boolean {
  const mode = row?.crypto_payment_mode;
  return mode === "full" || mode === "partial" || mode === "negotiable";
}

export function readListingCryptoPayment(row: {
  crypto_payment_mode?: unknown;
  crypto_assets?: unknown;
} | null | undefined): CryptoPayment {
  const parsed = parseCryptoPayment(row?.crypto_payment_mode ?? "none", row?.crypto_assets ?? []);
  return parsed.ok ? parsed.value : EMPTY_CRYPTO_PAYMENT;
}
