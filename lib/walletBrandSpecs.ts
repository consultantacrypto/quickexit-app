/**
 * Comparison facts for the wallet shelf.
 * A "yes" or "partial" value is backed by a page on the brand's own site.
 * Null means this pass did not find that claim on an official page. The UI prints "—".
 */

import {
  WALLET_PRICE_CHECKED_AT,
  formatWalletCheckedDate,
  formatWalletMoney,
  sortedWalletProducts,
  type WalletBrandSlug,
  type WalletDeviceType,
  type WalletLocale,
} from "./walletCatalog";

export type WalletSpecValue = "yes" | "partial" | null;

export type WalletSpecClaim = {
  value: WalletSpecValue;
  sourceUrl: string | null;
};

export type WalletBrandSpecs = {
  slug: WalletBrandSlug;
  openSource: WalletSpecClaim;
  secureElement: WalletSpecClaim;
};

function claim(value: WalletSpecValue, sourceUrl: string | null): WalletSpecClaim {
  if (value == null && sourceUrl != null) {
    throw new Error("an unverified spec cannot cite a source as if it proved the claim");
  }
  if (value != null && !sourceUrl?.startsWith("https://")) {
    throw new Error("a stated spec needs an https source on the brand site");
  }
  return { value, sourceUrl };
}

export const WALLET_BRAND_SPECS: readonly WalletBrandSpecs[] = [
  {
    slug: "tangem",
    openSource: claim(null, null),
    secureElement: claim(
      "yes",
      "https://tangem.com/en/help-center/introduction-to-tangem-wallet/tangem-and-security/",
    ),
  },
  {
    slug: "safepal",
    openSource: claim("partial", "https://www.safepal.com/en/store/s1"),
    secureElement: claim("yes", "https://www.safepal.com/en/store/s1"),
  },
  {
    slug: "coolwallet",
    openSource: claim(null, null),
    secureElement: claim("yes", "https://www.coolwallet.io/"),
  },
  {
    slug: "trezor",
    openSource: claim("yes", "https://trezor.io/trezor-safe-5"),
    secureElement: claim("yes", "https://trezor.io/trezor-safe-5"),
  },
  {
    slug: "ledger",
    openSource: claim(null, null),
    secureElement: claim(
      "yes",
      "https://www.ledger.com/academy/security/not-all-chips-are-born-equal",
    ),
  },
  {
    slug: "onekey",
    openSource: claim("yes", "https://onekey.so/products/onekey-classic-1s/"),
    secureElement: claim("yes", "https://onekey.so/products/onekey-classic-1s/"),
  },
  {
    slug: "ellipal",
    openSource: claim(null, null),
    secureElement: claim(null, null),
  },
  {
    slug: "cypherock",
    openSource: claim("yes", "https://www.cypherock.com/cypherock-x1"),
    secureElement: claim("yes", "https://www.cypherock.com/cypherock-x1"),
  },
  {
    slug: "bitbox",
    openSource: claim("yes", "https://bitbox.swiss/bitbox02/"),
    secureElement: claim(null, null),
  },
  {
    slug: "keystone",
    openSource: claim("yes", "https://keyst.one/"),
    secureElement: claim("yes", "https://keyst.one/"),
  },
  {
    slug: "foundation",
    openSource: claim("yes", "https://foundation.xyz/security"),
    secureElement: claim(null, null),
  },
  {
    slug: "ngrave",
    openSource: claim(null, null),
    secureElement: claim(null, null),
  },
];

export function specsForBrand(slug: WalletBrandSlug): WalletBrandSpecs {
  const specs = WALLET_BRAND_SPECS.find((item) => item.slug === slug);
  if (!specs) throw new Error(`missing specs for ${slug}`);
  return specs;
}

export function brandFormFactors(slug: WalletBrandSlug): WalletDeviceType[] {
  const found = new Set<WalletDeviceType>();
  for (const product of sortedWalletProducts()) {
    if (product.brandSlug === slug) found.add(product.deviceType);
  }
  const order: WalletDeviceType[] = ["card", "device", "airgap"];
  return order.filter((type) => found.has(type));
}

export type BrandStartingPrice = {
  text: string;
  from: boolean;
  checkedOn: string;
};

/** Lowest verified list price in the brand's own currency. Null when none are verified. */
export function brandStartingPrice(slug: WalletBrandSlug, locale: WalletLocale): BrandStartingPrice | null {
  const verified = sortedWalletProducts().filter(
    (product) =>
      product.brandSlug === slug &&
      product.priceStatus === "verified" &&
      product.listPrice != null &&
      product.currency != null,
  );
  if (verified.length === 0) return null;
  const lowest = verified.reduce((best, product) =>
    (product.listPrice ?? Number.POSITIVE_INFINITY) < (best.listPrice ?? Number.POSITIVE_INFINITY) ? product : best,
  );
  if (lowest.listPrice == null || lowest.currency == null) return null;
  return {
    text: formatWalletMoney(lowest.listPrice, lowest.currency, locale),
    from: lowest.priceIsFrom || verified.length > 1,
    checkedOn: formatWalletCheckedDate(lowest.priceCheckedAt || WALLET_PRICE_CHECKED_AT, locale),
  };
}
