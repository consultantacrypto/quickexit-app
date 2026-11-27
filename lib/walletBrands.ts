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
  /** Customer line for the homepage shelf. The /wallets page keeps positioningRo/En. */
  shortDescription?: { ro: string; en: string };
  highlights: { ro: string; en: string }[];
  image: WalletBrandImage;
  tone: WalletImageTone;
  usedByDani?: boolean;
};

export const WALLET_BRANDS: readonly WalletBrandProfile[] = [
  {
    slug: "tangem",
    name: "Tangem",
    positioningRo: "Portofel-card. Seturi de două și trei carduri, Ring și Pro Kit.",
    positioningEn: "A card wallet. Two- and three-card sets, Ring, and the Pro Kit.",
    shortDescription: {
      ro: "Portofel-card, seturi de 2 sau 3 carduri",
      en: "Card wallet, sets of 2 or 3 cards",
    },
    highlights: [{ ro: "Card", en: "Card" }],
    usedByDani: true,
    tone: "dark",
    image: {
      src: "/wallets/tangem.webp",
      width: 1600,
      height: 1280,
      sourceUrl: "https://tangem.com/_astro/1775044529322-1760979542662-Clas.D_a535fa47.webp",
      altRo: "Trei carduri Tangem negre",
      altEn: "Three black Tangem cards",
      editNote: "Official Tangem render, placed on a transparent 5:4 canvas so every card shares one frame.",
    },
  },
  {
    slug: "safepal",
    name: "SafePal",
    positioningRo: "Trei dispozitive de intrare: S1, X1 și S1 Pro.",
    positioningEn: "Three entry devices: S1, X1, and S1 Pro.",
    shortDescription: {
      ro: "S1, X1 și S1 Pro",
      en: "S1, X1, and S1 Pro",
    },
    highlights: [{ ro: "Dispozitiv", en: "Device" }],
    tone: "dark",
    image: {
      src: "/wallets/safepal.webp",
      width: 1600,
      height: 1280,
      sourceUrl: "https://www.safepal.com/assets/img/product_landing/safepal_s1.png",
      altRo: "SafePal S1, vedere față și spate",
      altEn: "SafePal S1, front and back",
      editNote: "Official SafePal S1 render. The source is 566px, so it is the limiting file; it sits on the shared transparent frame.",
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
      width: 1600,
      height: 1280,
      sourceUrl: "https://cdn.shopify.com/s/files/1/0641/3995/2301/files/Coolwallet-Pro-04.webp?v=1736397307",
      altRo: "CoolWallet Pro lângă telefon",
      altEn: "CoolWallet Pro next to a phone",
      editNote: "Official CoolWallet store photo. The flat gray studio background was removed. The hands stay because that is the official product frame.",
    },
  },
  {
    slug: "trezor",
    name: "Trezor",
    positioningRo: "Safe 3, Safe 5 și Safe 7. Prețul afișat de magazinul oficial pentru România este în lei.",
    positioningEn: "Safe 3, Safe 5, and Safe 7. The official Romania storefront price is in lei.",
    shortDescription: {
      ro: "Safe 3, Safe 5 și Safe 7",
      en: "Safe 3, Safe 5, and Safe 7",
    },
    highlights: [
      { ro: "Dispozitiv", en: "Device" },
      { ro: "Cehia", en: "Czechia" },
    ],
    tone: "light",
    image: {
      src: "/wallets/trezor.webp",
      width: 1600,
      height: 1280,
      sourceUrl: "https://imagedelivery.net/dvYzklbs_b5YaLRtI16Mnw/65b748be-3f57-4f4a-1fa4-8f7a1ab40500/public",
      altRo: "Trezor Safe 5, față și spate",
      altEn: "Trezor Safe 5, front and back",
      editNote: "Official Trezor Safe 5 render. The green fringe stored in transparent pixels was cleared, then the device was placed on the shared frame.",
    },
  },
  {
    slug: "ledger",
    name: "Ledger",
    positioningRo: "Nano S Plus, Nano X, Nano Gen5, Flex și Stax. Lei estimați din prețul oficial în USD, lângă suma în USD.",
    positioningEn: "Nano S Plus, Nano X, Nano Gen5, Flex, and Stax. Lei estimates from the official USD price, shown next to the USD amount.",
    shortDescription: {
      ro: "Nano S Plus, Nano X, Nano Gen5, Flex și Stax",
      en: "Nano S Plus, Nano X, Nano Gen5, Flex, and Stax",
    },
    highlights: [
      { ro: "Dispozitiv", en: "Device" },
      { ro: "Franța", en: "France" },
    ],
    tone: "dark",
    image: {
      src: "/wallets/ledger.webp",
      width: 1600,
      height: 1280,
      sourceUrl: "https://cdn.shopify.com/s/files/1/2974/4858/files/carrousel_lng5_1.png?v=1774363239",
      altRo: "Ledger Nano Gen5",
      altEn: "Ledger Nano Gen5",
      editNote: "Official Ledger Nano Gen5 render, placed on the shared transparent frame.",
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
      width: 1600,
      height: 1280,
      sourceUrl: "https://cdn.shopify.com/s/files/1/0486/8613/7506/files/SY2_1S_01_7e1d95d7-e000-4070-87ac-ca4307e55879.png",
      altRo: "OneKey Classic 1S",
      altEn: "OneKey Classic 1S",
      editNote: "Replaced the Pro 2 marketing banner (logo, headline, and a hand) with the official Classic 1S product render from the OneKey shop.",
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
      width: 1600,
      height: 1280,
      sourceUrl:
        "https://cdn.shopify.com/s/files/1/0031/5765/5641/files/ellipal-titan-2-0-gold-front-back-black-friday.png?v=1793949779",
      altRo: "ELLIPAL Titan 2.0, față și spate",
      altEn: "ELLIPAL Titan 2.0, front and back",
      editNote:
        "Official ELLIPAL shop photo. The gray studio background and the promotional corner were removed.",
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
      width: 1600,
      height: 1280,
      sourceUrl: "https://www.cypherock.com/assets/images/home/cypherock-x1-hero.webp",
      altRo: "Cypherock X1, dispozitiv și patru carduri",
      altEn: "Cypherock X1, device and four cards",
      editNote: "Official Cypherock hero, placed on the shared transparent frame.",
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
      width: 1600,
      height: 1280,
      sourceUrl: "https://bitbox.swiss/assets/images/ogp/bitbox02-hardware-wallet.png",
      altRo: "BitBox02",
      altEn: "BitBox02",
      editNote: "Replaced the white-background Nova collage with the official BitBox02 product photo from bitbox.swiss. The light studio background was removed.",
    },
  },
  {
    slug: "keystone",
    name: "Keystone",
    positioningRo: "Keystone 3 Pro, air-gap, cu acoperire de 1, 2 sau 3 ani.",
    positioningEn: "Keystone 3 Pro, air-gapped, with 1-, 2-, or 3-year coverage.",
    shortDescription: {
      ro: "3 Pro, air-gap",
      en: "3 Pro, air-gapped",
    },
    highlights: [{ ro: "Air-gap", en: "Air-gap" }],
    tone: "light",
    image: {
      src: "/wallets/keystone.webp",
      width: 1600,
      height: 1280,
      sourceUrl: "https://cdn.shopify.com/s/files/1/0029/3175/3060/files/3_pro.jpg?v=1779695258",
      altRo: "Keystone 3 Pro, față și spate",
      altEn: "Keystone 3 Pro, front and back",
      editNote: "Official Keystone 3 Pro photo. The devices are cut along the gap under the chassis so the studio reflection is gone, and placed on the shared cream card. The black display is the original pixels.",
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
      width: 1600,
      height: 1280,
      sourceUrl: "https://cdn.shopify.com/s/files/1/0753/6738/3092/files/prime_dark.webp",
      altRo: "Foundation Passport Prime, față și spate",
      altEn: "Foundation Passport Prime, front and back",
      editNote: "Official Foundation render, placed on the shared transparent frame.",
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
      width: 1600,
      height: 1280,
      sourceUrl: "https://cdn.shopify.com/s/files/1/0285/1563/1188/files/ZERO-2.jpg?v=1732272573",
      altRo: "NGRAVE ZERO",
      altEn: "NGRAVE ZERO",
      editNote: "Official NGRAVE shop photo. The dimension callout, the cable, and the pale studio background were removed so the device stands alone.",
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
