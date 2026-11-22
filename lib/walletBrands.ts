/**
 * Brand-level shelf for /wallets. One card per manufacturer.
 * Photos are official files saved under public/wallets/. Source URLs are the
 * pages or CDNs they were downloaded from. Nothing is hotlinked at runtime.
 */

import {
  filterWalletProducts,
  hasRealCheckoutCode,
  type WalletBrandSlug,
  type WalletDeviceType,
  type WalletProduct,
  type WalletTier,
} from "./walletCatalog";

export type WalletImageTone = "dark" | "light";

export type WalletBrandImage = {
  src: string;
  width: number;
  height: number;
  sourceUrl: string;
  altRo: string;
  altEn: string;
  /** Present when the committed file is not a byte-for-byte copy of the source. */
  editNote: string | null;
};

export type WalletBrandProfile = {
  slug: WalletBrandSlug;
  name: string;
  positioningRo: string;
  positioningEn: string;
  highlights: { ro: string; en: string }[];
  image: WalletBrandImage;
  tone: WalletImageTone;
};

export const WALLET_BRANDS: readonly WalletBrandProfile[] = [
  {
    slug: "tangem",
    name: "Tangem",
    positioningRo: "Portofel-card. Seturi de două și trei carduri, Ring și Pro Kit.",
    positioningEn: "A card wallet. Two- and three-card sets, Ring, and the Pro Kit.",
    highlights: [{ ro: "Card", en: "Card" }],
    tone: "dark",
    image: {
      src: "/wallets/tangem.webp",
      width: 1165,
      height: 1000,
      sourceUrl: "https://tangem.com/_astro/1775044529322-1760979542662-Clas.D_a535fa47.webp",
      altRo: "Trei carduri Tangem negre",
      altEn: "Three black Tangem cards",
      editNote: null,
    },
  },
  {
    slug: "safepal",
    name: "SafePal",
    positioningRo: "Trei dispozitive de intrare: S1, X1 și S1 Pro.",
    positioningEn: "Three entry devices: S1, X1, and S1 Pro.",
    highlights: [{ ro: "Dispozitiv", en: "Device" }],
    tone: "dark",
    image: {
      src: "/wallets/safepal.webp",
      width: 566,
      height: 568,
      sourceUrl: "https://www.safepal.com/assets/img/product_landing/safepal_s1.png",
      altRo: "SafePal S1, vedere față și spate",
      altEn: "SafePal S1, front and back",
      editNote: null,
    },
  },
  {
    slug: "coolwallet",
    name: "CoolWallet",
    positioningRo: "Carduri: Go, set de două, și Pro.",
    positioningEn: "Cards: the two-card Go set, and Pro.",
    highlights: [{ ro: "Card", en: "Card" }],
    tone: "light",
    image: {
      src: "/wallets/coolwallet.webp",
      width: 1000,
      height: 1000,
      sourceUrl: "https://cdn.shopify.com/s/files/1/0641/3995/2301/files/Coolwallet-Pro-04.webp?v=1736397307",
      altRo: "CoolWallet Pro lângă telefon",
      altEn: "CoolWallet Pro next to a phone",
      editNote: null,
    },
  },
  {
    slug: "trezor",
    name: "Trezor",
    positioningRo: "Safe 3, Safe 5 și Safe 7. Prețul canonic este în euro, cu lei pe aceeași pagină.",
    positioningEn: "Safe 3, Safe 5, and Safe 7. The canonical price is in euro, with lei on the same page.",
    highlights: [
      { ro: "Dispozitiv", en: "Device" },
      { ro: "Cehia", en: "Czechia" },
    ],
    tone: "light",
    image: {
      src: "/wallets/trezor.webp",
      width: 768,
      height: 768,
      sourceUrl: "https://imagedelivery.net/dvYzklbs_b5YaLRtI16Mnw/65b748be-3f57-4f4a-1fa4-8f7a1ab40500/public",
      altRo: "Trezor Safe 5, față și spate",
      altEn: "Trezor Safe 5, front and back",
      editNote: null,
    },
  },
  {
    slug: "ledger",
    name: "Ledger",
    positioningRo: "Nano S Plus, Nano X, Nano Gen5 și Flex. La unele modele prețul este „de la”, după culoare.",
    positioningEn: "Nano S Plus, Nano X, Nano Gen5, and Flex. Some prices are a starting price, by color.",
    highlights: [
      { ro: "Dispozitiv", en: "Device" },
      { ro: "Franța", en: "France" },
    ],
    tone: "dark",
    image: {
      src: "/wallets/ledger.webp",
      width: 960,
      height: 1120,
      sourceUrl: "https://cdn.shopify.com/s/files/1/2974/4858/files/carrousel_lng5_1.png?v=1774363239",
      altRo: "Ledger Nano Gen5",
      altEn: "Ledger Nano Gen5",
      editNote: null,
    },
  },
  {
    slug: "onekey",
    name: "OneKey",
    positioningRo: "Classic 1S, Neo și Pro 2. Codul de checkout apare aici când există.",
    positioningEn: "Classic 1S, Neo, and Pro 2. The checkout code appears here when it exists.",
    highlights: [{ ro: "Dispozitiv", en: "Device" }],
    tone: "dark",
    image: {
      src: "/wallets/onekey.webp",
      width: 1200,
      height: 630,
      sourceUrl: "https://asset.onekey.so/portal/a4f897730afd2fd91daa1f7b6251749b90ca3ddf/og/og-onekey-pro-2.jpg",
      altRo: "OneKey Pro 2",
      altEn: "OneKey Pro 2",
      editNote: null,
    },
  },
  {
    slug: "ellipal",
    name: "ELLIPAL",
    positioningRo: "Titan Mini, X Card, Titan 2.0 și Mega Bundle. Air-gap și un card.",
    positioningEn: "Titan Mini, X Card, Titan 2.0, and the Mega Bundle. Air-gapped devices and a card.",
    highlights: [
      { ro: "Air-gap", en: "Air-gap" },
      { ro: "Card", en: "Card" },
    ],
    tone: "light",
    image: {
      src: "/wallets/ellipal.webp",
      width: 1200,
      height: 1200,
      sourceUrl:
        "https://cdn.shopify.com/s/files/1/0031/5765/5641/files/ellipal-titan-2-0-gold-front-back-black-friday.png?v=1793949779",
      altRo: "ELLIPAL Titan 2.0, față și spate",
      altEn: "ELLIPAL Titan 2.0, front and back",
      editNote:
        "Official storefront photo. A promotional corner mark on the source file was covered so it is not shown.",
    },
  },
  {
    slug: "cypherock",
    name: "Cypherock",
    positioningRo: "X1 în trei variante, plus X0. La X0 prețul nu era vizibil, așa că nu afișăm o cifră.",
    positioningEn: "X1 in three versions, plus X0. X0 had no visible price, so no figure is shown.",
    highlights: [
      { ro: "Card", en: "Card" },
      { ro: "Dispozitiv", en: "Device" },
    ],
    tone: "dark",
    image: {
      src: "/wallets/cypherock.webp",
      width: 1200,
      height: 631,
      sourceUrl: "https://www.cypherock.com/assets/images/home/cypherock-x1-hero.webp",
      altRo: "Cypherock X1, dispozitiv și patru carduri",
      altEn: "Cypherock X1, device and four cards",
      editNote: null,
    },
  },
  {
    slug: "bitbox",
    name: "BitBox",
    positioningRo: "BitBox02 și BitBox02 Nova. Prețul afișat este în euro.",
    positioningEn: "BitBox02 and BitBox02 Nova. The price shown is in euro.",
    highlights: [
      { ro: "Dispozitiv", en: "Device" },
      { ro: "Elveția", en: "Switzerland" },
    ],
    tone: "light",
    image: {
      src: "/wallets/bitbox.webp",
      width: 1200,
      height: 1200,
      sourceUrl: "https://shop.bitbox.swiss/media/products/triple3sqaure.jpg",
      altRo: "Trei dispozitive BitBox02 Nova",
      altEn: "Three BitBox02 Nova devices",
      editNote: null,
    },
  },
  {
    slug: "keystone",
    name: "Keystone",
    positioningRo: "Keystone 3 Pro, air-gap, cu acoperire de 1, 2 sau 3 ani.",
    positioningEn: "Keystone 3 Pro, air-gapped, with 1-, 2-, or 3-year coverage.",
    highlights: [{ ro: "Air-gap", en: "Air-gap" }],
    tone: "dark",
    image: {
      src: "/wallets/keystone.webp",
      width: 1120,
      height: 1120,
      sourceUrl: "https://cdn.shopify.com/s/files/1/0029/3175/3060/files/3_pro.jpg?v=1779695258",
      altRo: "Keystone 3 Pro, față și spate",
      altEn: "Keystone 3 Pro, front and back",
      editNote: null,
    },
  },
  {
    slug: "foundation",
    name: "Foundation",
    positioningRo: "Passport Prime. Prețul de pe card este cel al vitrinei SUA; în România magazinul arată lei.",
    positioningEn: "Passport Prime. The card price is the US storefront; in Romania the shop shows lei.",
    highlights: [
      { ro: "Air-gap", en: "Air-gap" },
      { ro: "SUA", en: "USA" },
    ],
    tone: "dark",
    image: {
      src: "/wallets/foundation.webp",
      width: 1000,
      height: 1000,
      sourceUrl: "https://cdn.shopify.com/s/files/1/0753/6738/3092/files/prime_dark.webp",
      altRo: "Foundation Passport Prime, față și spate",
      altEn: "Foundation Passport Prime, front and back",
      editNote: null,
    },
  },
  {
    slug: "ngrave",
    name: "NGRAVE",
    positioningRo: "ZERO, pachetul cu GRAPHENE și Ultimate Combo. Air-gap, preț în euro.",
    positioningEn: "ZERO, the GRAPHENE pack, and the Ultimate Combo. Air-gapped, priced in euro.",
    highlights: [
      { ro: "Air-gap", en: "Air-gap" },
      { ro: "Belgia", en: "Belgium" },
    ],
    tone: "light",
    image: {
      src: "/wallets/ngrave.webp",
      width: 1200,
      height: 1200,
      sourceUrl: "https://cdn.shopify.com/s/files/1/0285/1563/1188/files/ZERO-2.jpg?v=1732272573",
      altRo: "NGRAVE ZERO și cablul din fotografiile oficiale",
      altEn: "NGRAVE ZERO and the cable from the official photos",
      editNote: null,
    },
  },
];

export const WALLET_QUICK_PICKS = [
  { id: "start", brandSlug: "tangem" },
  { id: "premium", brandSlug: "ngrave" },
  { id: "airgap", brandSlug: "foundation" },
  { id: "euro", brandSlug: "trezor" },
] as const;

export type WalletQuickPickId = (typeof WALLET_QUICK_PICKS)[number]["id"];

export type WalletBrandShelf = {
  brand: WalletBrandProfile;
  models: WalletProduct[];
};

export function walletBrandShelves(input: {
  tier: WalletTier | "all";
  deviceType: WalletDeviceType | "all";
}): WalletBrandShelf[] {
  const grouped = new Map<WalletBrandSlug, WalletProduct[]>();
  for (const model of filterWalletProducts(input)) {
    const list = grouped.get(model.brandSlug) ?? [];
    list.push(model);
    grouped.set(model.brandSlug, list);
  }
  return WALLET_BRANDS.flatMap((brand) => {
    const models = grouped.get(brand.slug);
    if (!models || models.length === 0) return [];
    return [{ brand, models }];
  });
}

export function brandNeedsCheckoutNote(models: readonly WalletProduct[]): boolean {
  return models.some((model) => model.checkoutCodeRequired && !hasRealCheckoutCode(model));
}
