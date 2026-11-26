/**
 * Hardware-wallet recommendation catalog.
 *
 * The page reads this file. It does not query Supabase.
 * `published` stays false until a separate publication GO.
 * Preview still renders every row so the shelf can be reviewed without a database.
 *
 * Official URLs have no affiliate parameters. Partner links live in the affiliate
 * fields below. Tangem has no partner URL; the checkout code is DANIELMIHAI.
 * BitBox, NGRAVE, and Trezor stay on PENDING until a partner link exists.
 * Prices marked unverified are not given a number.
 */

export const TANGEM_PARTNER_LINK_PLACEHOLDER = "TANGEM_PARTNER_LINK";

export const WALLET_PRICE_CHECKED_AT = "2026-11-22" as const;

export const WALLET_OUTBOUND_REL = "sponsored nofollow noopener noreferrer";

export const WALLET_BRAND_SLUGS = [
  "tangem",
  "safepal",
  "coolwallet",
  "foundation",
  "trezor",
  "ledger",
  "bitbox",
  "keystone",
  "onekey",
  "ellipal",
  "ngrave",
  "cypherock",
] as const;

export type WalletBrandSlug = (typeof WALLET_BRAND_SLUGS)[number];
export type WalletDeviceType = "card" | "device" | "airgap";
export type WalletTier = "entry" | "mid" | "premium";
export type WalletCurrency = "EUR" | "USD" | "RON";
export type WalletPriceStatus = "verified" | "unverified";
export type WalletLocale = "ro" | "en";
export type WalletSecondaryKind = "same_page" | "geo_storefront";

export type WalletProduct = {
  id: string;
  slug: string;
  brand: string;
  brandSlug: WalletBrandSlug;
  modelRo: string;
  modelEn: string;
  deviceType: WalletDeviceType;
  tier: WalletTier;
  listPrice: number | null;
  listPriceMax: number | null;
  priceIsFrom: boolean;
  compareAtPrice: number | null;
  currency: WalletCurrency | null;
  secondaryAmount: number | null;
  secondaryCurrency: WalletCurrency | null;
  secondaryKind: WalletSecondaryKind | null;
  priceCheckedAt: typeof WALLET_PRICE_CHECKED_AT;
  priceSourceUrl: string;
  priceStatus: WalletPriceStatus;
  officialUrl: string;
  imageUrl: null;
  imageLicenseNote: string;
  affiliateUrl: string;
  affiliateCode: string | null;
  checkoutCodeRequired: boolean;
  sortOrder: number;
  published: false;
};

export type WalletPriceView =
  | { status: "hidden" }
  | {
      status: "verified";
      primary: string;
      priceIsFrom: boolean;
      compareAt: string | null;
      secondary: string | null;
      secondaryKind: WalletSecondaryKind | null;
      checkedOn: string;
    };

const IMAGE_LICENSE_NOTE =
  "Cream silhouette placeholder. Official product photography is not used until the affiliate program approves the media.";

const SLUG_RE = /^[a-z0-9-]{1,80}$/;
const BANNED_OFFICIAL_PARAMS = [
  "ref",
  "via",
  "clickid",
  "irclickid",
  "irgwc",
  "affiliate",
  "aff",
  "coupon",
  "code",
  "discount",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const LOCALE_TAG: Record<WalletLocale, string> = {
  ro: "ro-RO",
  en: "en-GB",
};

const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

let nextProductNumber = 0;

function nextId(): string {
  nextProductNumber += 1;
  return `00000000-0000-4000-8000-${nextProductNumber.toString(16).padStart(12, "0")}`;
}

export function isAffiliatePlaceholder(value: string | null | undefined): boolean {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === TANGEM_PARTNER_LINK_PLACEHOLDER) return true;
  return trimmed.startsWith("PENDING:");
}

export function hasRealCheckoutCode(product: Pick<WalletProduct, "affiliateCode">): boolean {
  return !isAffiliatePlaceholder(product.affiliateCode);
}

const COOLWALLET_PRO_AFFILIATE = "https://www.coolwallet.io/products/coolwallet-pro/?ref=yzm5nda";
const COOLWALLET_GO_AFFILIATE = "https://www.coolwallet.io/products/coolwallet-go/?ref=yzm5nda";
const SAFEPAL_S1_AFFILIATE = "https://www.safepal.com/store/s1?ref=n2rmyza";
const SAFEPAL_X1_AFFILIATE = "https://www.safepal.com/store/x1?ref=n2rmyza";
const SAFEPAL_S1_PRO_AFFILIATE = "https://www.safepal.com/store/s1pro?ref=n2rmyza";
const KEYSTONE_AFFILIATE =
  "https://keyst.one/?rfsn=9430621.40149c9&utm_source=refersion&utm_medium=affiliate&utm_campaign=9430621.40149c9";
const ELLIPAL_AFFILIATE = "https://www.ellipal.com/?rfsn=9430622.0718c6";
const LEDGER_AFFILIATE = "https://shop.ledger.com/?r=9111c54498ec";

const AFFILIATE_URL_BY_SLUG: Record<string, string> = {
  "coolwallet-pro": COOLWALLET_PRO_AFFILIATE,
  "coolwallet-go": COOLWALLET_GO_AFFILIATE,
  "safepal-s1": SAFEPAL_S1_AFFILIATE,
  "safepal-x1": SAFEPAL_X1_AFFILIATE,
  "safepal-s1-pro": SAFEPAL_S1_PRO_AFFILIATE,
};

const AFFILIATE_URL_BY_BRAND: Partial<Record<WalletBrandSlug, string>> = {
  keystone: KEYSTONE_AFFILIATE,
  ellipal: ELLIPAL_AFFILIATE,
  ledger: LEDGER_AFFILIATE,
};

function affiliateUrlFor(slug: string, brandSlug: WalletBrandSlug): string {
  return (
    AFFILIATE_URL_BY_SLUG[slug] ??
    AFFILIATE_URL_BY_BRAND[brandSlug] ??
    (brandSlug === "tangem" ? TANGEM_PARTNER_LINK_PLACEHOLDER : `PENDING:${brandSlug}`)
  );
}

function assertOfficialUrl(url: string, slug: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`wallet ${slug} official URL is not a URL`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`wallet ${slug} official URL must be https`);
  }
  if (parsed.username || parsed.password) {
    throw new Error(`wallet ${slug} official URL has credentials`);
  }
  for (const key of BANNED_OFFICIAL_PARAMS) {
    if (parsed.searchParams.has(key)) {
      throw new Error(`wallet ${slug} official URL includes ${key}`);
    }
  }
}

type WalletProductInput = {
  slug: string;
  brand: string;
  brandSlug: WalletBrandSlug;
  modelRo: string;
  modelEn: string;
  deviceType: WalletDeviceType;
  tier: WalletTier;
  listPrice: number | null;
  listPriceMax?: number | null;
  priceIsFrom?: boolean;
  compareAtPrice?: number | null;
  currency: WalletCurrency | null;
  secondaryAmount?: number | null;
  secondaryCurrency?: WalletCurrency | null;
  secondaryKind?: WalletSecondaryKind | null;
  priceSourceUrl: string;
  priceStatus: WalletPriceStatus;
  officialUrl: string;
  affiliateCode?: string | null;
  checkoutCodeRequired?: boolean;
  sortOrder: number;
};

function product(input: WalletProductInput): WalletProduct {
  if (!SLUG_RE.test(input.slug)) {
    throw new Error(`wallet slug is not a catalog slug: ${input.slug}`);
  }
  assertOfficialUrl(input.officialUrl, input.slug);
  assertOfficialUrl(input.priceSourceUrl, `${input.slug} price source`);
  if (input.priceStatus === "verified") {
    if (input.listPrice == null || input.currency == null) {
      throw new Error(`verified wallet ${input.slug} needs a price and currency`);
    }
  } else if (input.listPrice != null || input.compareAtPrice != null || input.listPriceMax != null) {
    throw new Error(`unverified wallet ${input.slug} must not carry a price`);
  }
  const affiliateCode = input.affiliateCode ?? null;
  if (affiliateCode && !isAffiliatePlaceholder(affiliateCode) && !/^[A-Za-z0-9]{4,40}$/.test(affiliateCode)) {
    throw new Error(`wallet ${input.slug} checkout code is not a plain code`);
  }
  const affiliateUrl = affiliateUrlFor(input.slug, input.brandSlug);
  if (!isAffiliatePlaceholder(affiliateUrl)) {
    let affiliate: URL;
    try {
      affiliate = new URL(affiliateUrl);
    } catch {
      throw new Error(`wallet ${input.slug} affiliate URL is not a URL`);
    }
    if (affiliate.protocol !== "https:") {
      throw new Error(`wallet ${input.slug} affiliate URL must be https`);
    }
  }
  if (input.checkoutCodeRequired && !affiliateCode) {
    throw new Error(`wallet ${input.slug} requires a checkout-code placeholder`);
  }
  return {
    id: nextId(),
    slug: input.slug,
    brand: input.brand,
    brandSlug: input.brandSlug,
    modelRo: input.modelRo,
    modelEn: input.modelEn,
    deviceType: input.deviceType,
    tier: input.tier,
    listPrice: input.listPrice,
    listPriceMax: input.listPriceMax ?? null,
    priceIsFrom: input.priceIsFrom ?? false,
    compareAtPrice: input.compareAtPrice ?? null,
    currency: input.currency,
    secondaryAmount: input.secondaryAmount ?? null,
    secondaryCurrency: input.secondaryCurrency ?? null,
    secondaryKind: input.secondaryKind ?? null,
    priceCheckedAt: WALLET_PRICE_CHECKED_AT,
    priceSourceUrl: input.priceSourceUrl,
    priceStatus: input.priceStatus,
    officialUrl: input.officialUrl,
    imageUrl: null,
    imageLicenseNote: IMAGE_LICENSE_NOTE,
    affiliateUrl,
    affiliateCode,
    checkoutCodeRequired: input.checkoutCodeRequired ?? false,
    sortOrder: input.sortOrder,
    published: false,
  };
}

export const WALLET_PRODUCTS: readonly WalletProduct[] = [
  product({
    slug: "tangem-2-cards",
    brand: "Tangem",
    brandSlug: "tangem",
    modelRo: "Portofel, 2 carduri (Classic Black)",
    modelEn: "2-card wallet (Classic Black)",
    deviceType: "card",
    tier: "entry",
    listPrice: 59.9,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://tangem.com/en/pricing/?cat=2&sku=TG128X2-B",
    officialUrl: "https://tangem.com/en/pricing/?cat=2&sku=TG128X2-B",
    affiliateCode: "DANIELMIHAI",
    checkoutCodeRequired: true,
    sortOrder: 10,
  }),
  product({
    slug: "tangem-3-cards",
    brand: "Tangem",
    brandSlug: "tangem",
    modelRo: "Portofel, 3 carduri (Classic Black și celelalte designuri din listă)",
    modelEn: "3-card wallet (Classic Black and the other listed designs)",
    deviceType: "card",
    tier: "entry",
    listPrice: 69.9,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://tangem.com/en/pricing/?cat=3&sku=TG128X3-B",
    officialUrl: "https://tangem.com/en/pricing/?cat=3&sku=TG128X3-B",
    affiliateCode: "DANIELMIHAI",
    checkoutCodeRequired: true,
    sortOrder: 11,
  }),
  product({
    slug: "tangem-ring",
    brand: "Tangem",
    brandSlug: "tangem",
    modelRo: "Tangem Ring (inel și carduri)",
    modelEn: "Tangem Ring (ring and cards)",
    deviceType: "card",
    tier: "mid",
    listPrice: 140,
    listPriceMax: 160,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://tangem.com/en/pricing/?cat=ring",
    officialUrl: "https://tangem.com/en/pricing/?cat=ring",
    affiliateCode: "DANIELMIHAI",
    checkoutCodeRequired: true,
    sortOrder: 12,
  }),
  product({
    slug: "tangem-pro-kit",
    brand: "Tangem",
    brandSlug: "tangem",
    modelRo: "Tangem Pro Kit",
    modelEn: "Tangem Pro Kit",
    deviceType: "card",
    tier: "mid",
    listPrice: 180,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://tangem.com/en/pricing/?cat=boxes",
    officialUrl: "https://tangem.com/en/pricing/?cat=boxes",
    affiliateCode: "DANIELMIHAI",
    checkoutCodeRequired: true,
    sortOrder: 13,
  }),
  product({
    slug: "safepal-s1",
    brand: "SafePal",
    brandSlug: "safepal",
    modelRo: "SafePal S1",
    modelEn: "SafePal S1",
    deviceType: "device",
    tier: "entry",
    listPrice: 49.99,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://www.safepal.com/en/store/s1",
    officialUrl: "https://www.safepal.com/en/store/s1",
    sortOrder: 100,
  }),
  product({
    slug: "safepal-x1",
    brand: "SafePal",
    brandSlug: "safepal",
    modelRo: "SafePal X1",
    modelEn: "SafePal X1",
    deviceType: "device",
    tier: "entry",
    listPrice: 69.99,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://www.safepal.com/en/store/x1",
    officialUrl: "https://www.safepal.com/en/store/x1",
    sortOrder: 101,
  }),
  product({
    slug: "safepal-s1-pro",
    brand: "SafePal",
    brandSlug: "safepal",
    modelRo: "SafePal S1 Pro",
    modelEn: "SafePal S1 Pro",
    deviceType: "device",
    tier: "entry",
    listPrice: 89.99,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://www.safepal.com/en/store/s1pro",
    officialUrl: "https://www.safepal.com/en/store/s1pro",
    sortOrder: 102,
  }),
  product({
    slug: "coolwallet-go",
    brand: "CoolWallet",
    brandSlug: "coolwallet",
    modelRo: "CoolWallet Go (set de 2 carduri)",
    modelEn: "CoolWallet Go (2-card set)",
    deviceType: "card",
    tier: "entry",
    listPrice: 69,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://www.coolwallet.io/products/coolwallet-go.json",
    officialUrl: "https://www.coolwallet.io/products/coolwallet-go",
    sortOrder: 110,
  }),
  product({
    slug: "trezor-safe-3",
    brand: "Trezor",
    brandSlug: "trezor",
    modelRo: "Trezor Safe 3",
    modelEn: "Trezor Safe 3",
    deviceType: "device",
    tier: "entry",
    listPrice: 39,
    currency: "EUR",
    secondaryAmount: 207,
    secondaryCurrency: "RON",
    secondaryKind: "same_page",
    priceStatus: "verified",
    priceSourceUrl: "https://trezor.io/trezor-safe-3",
    officialUrl: "https://trezor.io/trezor-safe-3",
    sortOrder: 120,
  }),
  product({
    slug: "ledger-nano-s-plus",
    brand: "Ledger",
    brandSlug: "ledger",
    modelRo: "Ledger Nano S Plus",
    modelEn: "Ledger Nano S Plus",
    deviceType: "device",
    tier: "entry",
    listPrice: 53,
    priceIsFrom: true,
    compareAtPrice: 59,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://store.ledger.com/products/ledger-nano-s-plus.json",
    officialUrl: "https://store.ledger.com/products/ledger-nano-s-plus",
    sortOrder: 130,
  }),
  product({
    slug: "onekey-classic-1s-pure",
    brand: "OneKey",
    brandSlug: "onekey",
    modelRo: "OneKey Classic 1S Pure (fără baterie)",
    modelEn: "OneKey Classic 1S Pure (no battery)",
    deviceType: "device",
    tier: "entry",
    listPrice: 79,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://onekey.so/compare-onekey/",
    officialUrl: "https://onekey.so/products/onekey-classic-1s/",
    affiliateCode: "PENDING:onekey",
    checkoutCodeRequired: true,
    sortOrder: 140,
  }),
  product({
    slug: "ellipal-titan-mini",
    brand: "ELLIPAL",
    brandSlug: "ellipal",
    modelRo: "ELLIPAL Titan Mini",
    modelEn: "ELLIPAL Titan Mini",
    deviceType: "airgap",
    tier: "entry",
    listPrice: 61,
    compareAtPrice: 125,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://www.ellipal.com/en-eu/products/ellipal-titan-mini.json",
    officialUrl: "https://www.ellipal.com/en-eu/products/ellipal-titan-mini",
    sortOrder: 150,
  }),
  product({
    slug: "ellipal-x-card",
    brand: "ELLIPAL",
    brandSlug: "ellipal",
    modelRo: "ELLIPAL X Card (1 card)",
    modelEn: "ELLIPAL X Card (1 card)",
    deviceType: "card",
    tier: "entry",
    listPrice: 72,
    compareAtPrice: 96,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://www.ellipal.com/en-eu/products/ellipal-x-card.json",
    officialUrl: "https://www.ellipal.com/en-eu/products/ellipal-x-card",
    sortOrder: 151,
  }),
  product({
    slug: "cypherock-x0",
    brand: "Cypherock",
    brandSlug: "cypherock",
    modelRo: "Cypherock X0",
    modelEn: "Cypherock X0",
    deviceType: "card",
    tier: "entry",
    listPrice: null,
    currency: null,
    priceStatus: "unverified",
    priceSourceUrl: "https://www.cypherock.com/cypherock-x0",
    officialUrl: "https://www.cypherock.com/cypherock-x0",
    sortOrder: 160,
  }),
  product({
    slug: "cypherock-x1-basic",
    brand: "Cypherock",
    brandSlug: "cypherock",
    modelRo: "Cypherock X1 Basic",
    modelEn: "Cypherock X1 Basic",
    deviceType: "device",
    tier: "entry",
    listPrice: 99,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://www.cypherock.com/blogs/cypherock-x1-models-comparison",
    officialUrl: "https://www.cypherock.com/store",
    sortOrder: 161,
  }),
  product({
    slug: "coolwallet-pro",
    brand: "CoolWallet",
    brandSlug: "coolwallet",
    modelRo: "CoolWallet Pro",
    modelEn: "CoolWallet Pro",
    deviceType: "card",
    tier: "mid",
    listPrice: 149,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://www.coolwallet.io/products/coolwallet-pro.json",
    officialUrl: "https://www.coolwallet.io/products/coolwallet-pro",
    sortOrder: 200,
  }),
  product({
    slug: "trezor-safe-5",
    brand: "Trezor",
    brandSlug: "trezor",
    modelRo: "Trezor Safe 5",
    modelEn: "Trezor Safe 5",
    deviceType: "device",
    tier: "mid",
    listPrice: 79,
    currency: "EUR",
    secondaryAmount: 420,
    secondaryCurrency: "RON",
    secondaryKind: "same_page",
    priceStatus: "verified",
    priceSourceUrl: "https://trezor.io/trezor-safe-5",
    officialUrl: "https://trezor.io/trezor-safe-5",
    sortOrder: 210,
  }),
  product({
    slug: "ledger-nano-x",
    brand: "Ledger",
    brandSlug: "ledger",
    modelRo: "Ledger Nano X",
    modelEn: "Ledger Nano X",
    deviceType: "device",
    tier: "mid",
    listPrice: 79,
    priceIsFrom: true,
    compareAtPrice: 99,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://store.ledger.com/products/ledger-nano-x.json",
    officialUrl: "https://store.ledger.com/products/ledger-nano-x",
    sortOrder: 220,
  }),
  product({
    slug: "ledger-nano-gen5",
    brand: "Ledger",
    brandSlug: "ledger",
    modelRo: "Ledger Nano Gen5",
    modelEn: "Ledger Nano Gen5",
    deviceType: "device",
    tier: "mid",
    listPrice: 179,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://store.ledger.com/products/ledger-nano-gen5.json",
    officialUrl: "https://store.ledger.com/products/ledger-nano-gen5",
    sortOrder: 221,
  }),
  product({
    slug: "bitbox02",
    brand: "BitBox",
    brandSlug: "bitbox",
    modelRo: "BitBox02",
    modelEn: "BitBox02",
    deviceType: "device",
    tier: "mid",
    listPrice: 149,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://shop.bitbox.swiss/en/products/bitbox02-80/",
    officialUrl: "https://shop.bitbox.swiss/en/products/bitbox02-80/",
    sortOrder: 230,
  }),
  product({
    slug: "bitbox02-nova",
    brand: "BitBox",
    brandSlug: "bitbox",
    modelRo: "BitBox02 Nova",
    modelEn: "BitBox02 Nova",
    deviceType: "device",
    tier: "mid",
    listPrice: 175,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://shop.bitbox.swiss/en/products/bitbox02-nova-79/",
    officialUrl: "https://shop.bitbox.swiss/en/products/bitbox02-nova-79/",
    sortOrder: 231,
  }),
  product({
    slug: "keystone-3-pro-1-year",
    brand: "Keystone",
    brandSlug: "keystone",
    modelRo: "Keystone 3 Pro, acoperire 1 an",
    modelEn: "Keystone 3 Pro, 1-year coverage",
    deviceType: "airgap",
    tier: "mid",
    listPrice: 149,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://shop.keyst.one/products/keystone-3-pro.json",
    officialUrl: "https://shop.keyst.one/products/keystone-3-pro",
    sortOrder: 240,
  }),
  product({
    slug: "keystone-3-pro-2-year",
    brand: "Keystone",
    brandSlug: "keystone",
    modelRo: "Keystone 3 Pro, acoperire 2 ani",
    modelEn: "Keystone 3 Pro, 2-year coverage",
    deviceType: "airgap",
    tier: "mid",
    listPrice: 199,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://shop.keyst.one/products/keystone-3-pro.json",
    officialUrl: "https://shop.keyst.one/products/keystone-3-pro",
    sortOrder: 241,
  }),
  product({
    slug: "keystone-3-pro-3-year",
    brand: "Keystone",
    brandSlug: "keystone",
    modelRo: "Keystone 3 Pro, acoperire 3 ani",
    modelEn: "Keystone 3 Pro, 3-year coverage",
    deviceType: "airgap",
    tier: "mid",
    listPrice: 249,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://shop.keyst.one/products/keystone-3-pro.json",
    officialUrl: "https://shop.keyst.one/products/keystone-3-pro",
    sortOrder: 242,
  }),
  product({
    slug: "onekey-classic-1s",
    brand: "OneKey",
    brandSlug: "onekey",
    modelRo: "OneKey Classic 1S (cu baterie)",
    modelEn: "OneKey Classic 1S (with battery)",
    deviceType: "device",
    tier: "mid",
    listPrice: 99,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://onekey.so/products/onekey-classic-1s/",
    officialUrl: "https://onekey.so/products/onekey-classic-1s/",
    affiliateCode: "PENDING:onekey",
    checkoutCodeRequired: true,
    sortOrder: 250,
  }),
  product({
    slug: "onekey-neo",
    brand: "OneKey",
    brandSlug: "onekey",
    modelRo: "OneKey Neo",
    modelEn: "OneKey Neo",
    deviceType: "device",
    tier: "mid",
    listPrice: 179,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://onekey.so/products/onekey-neo/",
    officialUrl: "https://onekey.so/products/onekey-neo/",
    affiliateCode: "PENDING:onekey",
    checkoutCodeRequired: true,
    sortOrder: 251,
  }),
  product({
    slug: "ellipal-titan-2",
    brand: "ELLIPAL",
    brandSlug: "ellipal",
    modelRo: "ELLIPAL Titan 2.0",
    modelEn: "ELLIPAL Titan 2.0",
    deviceType: "airgap",
    tier: "mid",
    listPrice: 160,
    compareAtPrice: 210,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://www.ellipal.com/en-eu/products/ellipal-titan.json",
    officialUrl: "https://www.ellipal.com/en-eu/products/ellipal-titan",
    sortOrder: 260,
  }),
  product({
    slug: "cypherock-x1-standard",
    brand: "Cypherock",
    brandSlug: "cypherock",
    modelRo: "Cypherock X1 Standard",
    modelEn: "Cypherock X1 Standard",
    deviceType: "device",
    tier: "mid",
    listPrice: 179,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://www.cypherock.com/blogs/cypherock-x1-models-comparison",
    officialUrl: "https://www.cypherock.com/store",
    sortOrder: 270,
  }),
  product({
    slug: "foundation-passport-prime",
    brand: "Foundation",
    brandSlug: "foundation",
    modelRo: "Passport Prime",
    modelEn: "Passport Prime",
    deviceType: "airgap",
    tier: "premium",
    listPrice: 328,
    currency: "USD",
    secondaryAmount: 1980,
    secondaryCurrency: "RON",
    secondaryKind: "geo_storefront",
    priceStatus: "verified",
    priceSourceUrl: "https://foundation.xyz/products/passport-prime?country=US",
    officialUrl: "https://foundation.xyz/products/passport-prime?country=US",
    affiliateCode: "PENDING:foundation",
    checkoutCodeRequired: true,
    sortOrder: 300,
  }),
  product({
    slug: "trezor-safe-7",
    brand: "Trezor",
    brandSlug: "trezor",
    modelRo: "Trezor Safe 7",
    modelEn: "Trezor Safe 7",
    deviceType: "device",
    tier: "premium",
    listPrice: 179,
    currency: "EUR",
    secondaryAmount: 942,
    secondaryCurrency: "RON",
    secondaryKind: "same_page",
    priceStatus: "verified",
    priceSourceUrl: "https://trezor.io/trezor-safe-7",
    officialUrl: "https://trezor.io/trezor-safe-7",
    sortOrder: 310,
  }),
  product({
    slug: "ledger-flex",
    brand: "Ledger",
    brandSlug: "ledger",
    modelRo: "Ledger Flex + Recovery Key",
    modelEn: "Ledger Flex + Recovery Key",
    deviceType: "device",
    tier: "premium",
    listPrice: 249,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://store.ledger.com/products/ledger-flex.json",
    officialUrl: "https://store.ledger.com/products/ledger-flex",
    sortOrder: 320,
  }),
  product({
    slug: "onekey-pro-2",
    brand: "OneKey",
    brandSlug: "onekey",
    modelRo: "OneKey Pro 2",
    modelEn: "OneKey Pro 2",
    deviceType: "device",
    tier: "premium",
    listPrice: 299,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://onekey.so/products/onekey-pro-2/",
    officialUrl: "https://onekey.so/products/onekey-pro-2/",
    affiliateCode: "PENDING:onekey",
    checkoutCodeRequired: true,
    sortOrder: 330,
  }),
  product({
    slug: "ellipal-mega-bundle",
    brand: "ELLIPAL",
    brandSlug: "ellipal",
    modelRo: "ELLIPAL Mega Bundle",
    modelEn: "ELLIPAL Mega Bundle",
    deviceType: "airgap",
    tier: "premium",
    listPrice: 255,
    compareAtPrice: 440,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://www.ellipal.com/en-eu/products/ellipal-titan.json",
    officialUrl: "https://www.ellipal.com/en-eu/products/ellipal-titan",
    sortOrder: 340,
  }),
  product({
    slug: "ngrave-zero",
    brand: "NGRAVE",
    brandSlug: "ngrave",
    modelRo: "NGRAVE ZERO",
    modelEn: "NGRAVE ZERO",
    deviceType: "airgap",
    tier: "premium",
    listPrice: 398,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://shop.ngrave.io/products/zero.json",
    officialUrl: "https://shop.ngrave.io/products/zero",
    sortOrder: 350,
  }),
  product({
    slug: "ngrave-zero-graphene",
    brand: "NGRAVE",
    brandSlug: "ngrave",
    modelRo: "NGRAVE ZERO + GRAPHENE",
    modelEn: "NGRAVE ZERO + GRAPHENE",
    deviceType: "airgap",
    tier: "premium",
    listPrice: 498,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://shop.ngrave.io/products.json",
    officialUrl: "https://shop.ngrave.io/products/combo-pack-zero-graphene",
    sortOrder: 351,
  }),
  product({
    slug: "ngrave-ultimate",
    brand: "NGRAVE",
    brandSlug: "ngrave",
    modelRo: "NGRAVE Ultimate Combo Pack",
    modelEn: "NGRAVE Ultimate Combo Pack",
    deviceType: "airgap",
    tier: "premium",
    listPrice: 568,
    compareAtPrice: 597,
    currency: "EUR",
    priceStatus: "verified",
    priceSourceUrl: "https://shop.ngrave.io/products.json",
    officialUrl: "https://shop.ngrave.io/products/ultimate-combo-pack-1",
    sortOrder: 352,
  }),
  product({
    slug: "cypherock-x1-pro",
    brand: "Cypherock",
    brandSlug: "cypherock",
    modelRo: "Cypherock X1 Pro",
    modelEn: "Cypherock X1 Pro",
    deviceType: "device",
    tier: "premium",
    listPrice: 249,
    currency: "USD",
    priceStatus: "verified",
    priceSourceUrl: "https://www.cypherock.com/blogs/cypherock-x1-models-comparison",
    officialUrl: "https://www.cypherock.com/store",
    sortOrder: 360,
  }),
];

function tierRank(tier: WalletTier): number {
  if (tier === "entry") return 0;
  if (tier === "mid") return 1;
  return 2;
}

function assertCatalogIntegrity(products: readonly WalletProduct[]): void {
  const slugs = new Set<string>();
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const item of products) {
    if (slugs.has(item.slug) || ids.has(item.id) || orders.has(item.sortOrder)) {
      throw new Error(`duplicate wallet identity: ${item.slug}`);
    }
    slugs.add(item.slug);
    ids.add(item.id);
    orders.add(item.sortOrder);
    if (item.published !== false) {
      throw new Error(`wallet ${item.slug} must stay unpublished`);
    }
    if (item.imageUrl !== null) {
      throw new Error(`wallet ${item.slug} must not hotlink a product image`);
    }
  }
  for (const brandSlug of WALLET_BRAND_SLUGS) {
    if (!products.some((item) => item.brandSlug === brandSlug)) {
      throw new Error(`missing wallet brand ${brandSlug}`);
    }
  }
  const tangemMax = Math.max(
    ...products.filter((item) => item.brandSlug === "tangem").map((item) => item.sortOrder),
  );
  const others = products
    .filter((item) => item.brandSlug !== "tangem")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (others.some((item) => item.sortOrder <= tangemMax)) {
    throw new Error("Tangem must sort ahead of every other brand");
  }
  for (let index = 1; index < others.length; index += 1) {
    const previous = others[index - 1];
    const current = others[index];
    if (!previous || !current) continue;
    if (tierRank(current.tier) < tierRank(previous.tier)) {
      throw new Error("after Tangem, catalog order is entry, then mid, then premium");
    }
  }
}

assertCatalogIntegrity(WALLET_PRODUCTS);

export function sortedWalletProducts(): WalletProduct[] {
  return WALLET_PRODUCTS.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
}

/** Static preview shelf. Publication flags stay false; the page still lists every model. */
export function walletCatalogForPage(): WalletProduct[] {
  return sortedWalletProducts();
}

export function filterWalletProducts(input: {
  tier: WalletTier | "all";
  deviceType: WalletDeviceType | "all";
}): WalletProduct[] {
  return sortedWalletProducts().filter((item) => {
    if (input.tier !== "all" && item.tier !== input.tier) return false;
    if (input.deviceType !== "all" && item.deviceType !== input.deviceType) return false;
    return true;
  });
}

export function walletModelName(product: WalletProduct, locale: WalletLocale): string {
  return locale === "en" ? product.modelEn : product.modelRo;
}

export function formatWalletMoney(
  amount: number,
  currency: WalletCurrency,
  locale: WalletLocale,
): string {
  const formatted = new Intl.NumberFormat(LOCALE_TAG[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function formatWalletRange(
  min: number,
  max: number,
  currency: WalletCurrency,
  locale: WalletLocale,
): string {
  const formatter = new Intl.NumberFormat(LOCALE_TAG[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatter.format(min)}–${formatter.format(max)} ${currency}`;
}

export function formatWalletCheckedDate(isoDate: string, locale: WalletLocale): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const year = match[1] ?? "";
  const month = match[2] ?? "";
  const day = match[3] ?? "";
  if (locale === "ro") return `${day}.${month}.${year}`;
  const monthIndex = Number(month) - 1;
  const monthName = MONTHS_EN[monthIndex] ?? month;
  return `${Number(day)} ${monthName} ${year}`;
}

export function walletPriceView(product: WalletProduct, locale: WalletLocale): WalletPriceView {
  if (product.priceStatus !== "verified" || product.listPrice == null || product.currency == null) {
    return { status: "hidden" };
  }
  const primary =
    product.listPriceMax != null
      ? formatWalletRange(product.listPrice, product.listPriceMax, product.currency, locale)
      : formatWalletMoney(product.listPrice, product.currency, locale);
  const secondary =
    product.secondaryAmount != null && product.secondaryCurrency
      ? formatWalletMoney(product.secondaryAmount, product.secondaryCurrency, locale)
      : null;
  return {
    status: "verified",
    primary,
    priceIsFrom: product.priceIsFrom && product.listPriceMax == null,
    compareAt:
      product.compareAtPrice != null
        ? formatWalletMoney(product.compareAtPrice, product.currency, locale)
        : null,
    secondary,
    secondaryKind: secondary ? product.secondaryKind : null,
    checkedOn: formatWalletCheckedDate(product.priceCheckedAt, locale),
  };
}

export function resolveWalletOutboundBase(product: Pick<WalletProduct, "affiliateUrl" | "officialUrl">): string {
  if (!isAffiliatePlaceholder(product.affiliateUrl)) {
    try {
      const affiliate = new URL(product.affiliateUrl);
      if (affiliate.protocol === "https:") return affiliate.toString();
    } catch {
      // Placeholder or unusable value: send the shopper to the official page.
    }
  }
  return product.officialUrl;
}

export function buildWalletOutboundUrl(
  product: Pick<WalletProduct, "affiliateUrl" | "officialUrl" | "brandSlug" | "slug">,
): string {
  const url = new URL(resolveWalletOutboundBase(product));
  if (!url.searchParams.has("utm_source")) {
    url.searchParams.set("utm_source", "quickexit");
    url.searchParams.set("utm_medium", "affiliate");
    url.searchParams.set("utm_campaign", "wallets");
  }
  if (!url.searchParams.has("utm_content")) {
    url.searchParams.set("utm_content", `${product.brandSlug}-${product.slug}`.slice(0, 120));
  }
  return url.toString();
}
