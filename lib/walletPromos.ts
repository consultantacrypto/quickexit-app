/**
 * Official checkout promos on the wallet shelf.
 * Each promo carries an absolute expiry. The wallets page checks it on the
 * server for the current request and passes only the ids that are still active.
 * List prices are not reduced by these percents: the shop price and the code
 * stay separate, and nothing here says two codes combine.
 */

import type { WalletBrandSlug, WalletLocale } from "./walletCatalog";

export type WalletPromoId = "tangem-bf2026" | "safepal-bfcm2026";

export type WalletPromo = {
  id: WalletPromoId;
  brandSlug: WalletBrandSlug;
  code: string;
  percentOff: number;
  /** Inclusive cutoff. Hidden on the next millisecond. */
  expiresAt: string;
  copyRo: string;
  copyEn: string;
};

/**
 * Tangem: through 29.11.2026 23:59 Europe/Bucharest (EET, UTC+2).
 * SafePal: the official post states 3 December 2026, 23:59 UTC
 * (https://www.safepal.com/en/blog/bf-cm-deals). That instant is 4.12.2026 01:59 Europe/Bucharest.
 */
export const WALLET_PROMOS: readonly WalletPromo[] = [
  {
    id: "tangem-bf2026",
    brandSlug: "tangem",
    code: "BF2026",
    percentOff: 35,
    expiresAt: "2026-11-29T23:59:59+02:00",
    copyRo: "Black Friday: cod BF2026 (−35%, până pe 29.11). Codul nostru: DANIELMIHAI.",
    copyEn: "Black Friday: code BF2026 (−35%, through 29 Nov). Our code: DANIELMIHAI.",
  },
  {
    id: "safepal-bfcm2026",
    brandSlug: "safepal",
    code: "BFCM2026",
    percentOff: 15,
    expiresAt: "2026-12-04T01:59:59+02:00",
    copyRo: "Black Friday: cod BFCM2026 (−15%, până la 3.12, ora 23:59 UTC).",
    copyEn: "Black Friday: code BFCM2026 (−15%, through 3 Dec, 23:59 UTC).",
  },
];

export function isWalletPromoActive(promo: Pick<WalletPromo, "expiresAt">, now: Date): boolean {
  const time = now.getTime();
  if (!Number.isFinite(time)) return false;
  const endsAt = Date.parse(promo.expiresAt);
  if (!Number.isFinite(endsAt)) return false;
  return time <= endsAt;
}

export function activeWalletPromoIds(now: Date): WalletPromoId[] {
  return WALLET_PROMOS.filter((promo) => isWalletPromoActive(promo, now)).map((promo) => promo.id);
}

export function walletPromosByIds(ids: readonly string[]): WalletPromo[] {
  const allowed = new Set(ids);
  return WALLET_PROMOS.filter((promo) => allowed.has(promo.id));
}

export function walletPromoForBrand(brandSlug: WalletBrandSlug, ids: readonly string[]): WalletPromo | null {
  return walletPromosByIds(ids).find((promo) => promo.brandSlug === brandSlug) ?? null;
}

export function walletPromoCopy(promo: WalletPromo, locale: WalletLocale): string {
  return locale === "en" ? promo.copyEn : promo.copyRo;
}
