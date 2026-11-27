/**
 * Romanian wallet landing pages for search and answer engines.
 * Prices, dates, and outbound URLs come from the wallet catalog.
 * Nothing here stores a price, a promo, or a checkout code.
 */

import roMessages from "@/messages/ro.json";
import { PRODUCTION_SITE_URL } from "@/lib/siteUrl";
import { WALLET_BRANDS, type WalletBrandProfile } from "@/lib/walletBrands";
import {
  WALLET_PRODUCTS,
  buildWalletOutboundUrl,
  formatWalletCheckedDate,
  hasRealCheckoutCode,
  sortedWalletProducts,
  walletModelName,
  walletPriceView,
  type WalletBrandSlug,
  type WalletProduct,
} from "@/lib/walletCatalog";

export const WALLET_SEO_LANDING_SLUGS = [
  "hardware-wallet",
  "ledger-romania",
  "tangem-romania",
  "trezor-pret",
  "de-ce-de-pe-site-ul-oficial",
] as const;

export type WalletSeoLandingSlug = (typeof WALLET_SEO_LANDING_SLUGS)[number];

export const STIRILE_CRYPTO_URL = "https://stirilecrypto.ro";

/** Already linked from /ro/wallets. Ledger case, not a Tangem story. */
export const STIRILE_COMPROMISED_DEVICE_URL =
  "https://www.stirilecrypto.ro/stiri/ledger-implant-virgin-megastore-dubai-604000-dolari-furati";

export const STIRILE_HOT_COLD_URL =
  "https://www.stirilecrypto.ro/academie/portofele-crypto-hot-vs-cold-ghid";

const LEDGER_RESELLERS_URL = "https://shop.ledger.com/pages/resellers";
const LERATO_LEDGER_URL = "https://www.lerato.ro/ledger";
const TANGEM_PRICING_URL = "https://tangem.com/en/pricing/";
const TANGEM_DELIVERY_URL = "https://tangem.com/en/international-delivery/page/16/";

const COPY = roMessages.Wallets;

export type WalletSeoLink = {
  href: string;
  label: string;
  external: boolean;
};

export type WalletSeoProductLine = {
  slug: string;
  brand: string;
  name: string;
  primary: string | null;
  priceIsFrom: boolean;
  secondaryLabel: string | null;
  checkedLabel: string | null;
  priceOnRequest: string | null;
  outboundUrl: string;
  imageSrc: string | null;
  imageAlt: string;
  badge: string | null;
};

export type WalletSeoFaq = {
  question: string;
  answer: string;
};

export type WalletSeoLanding = {
  slug: WalletSeoLandingSlug;
  path: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  priceHeading: string;
  lines: WalletSeoProductLine[];
  products: WalletProduct[];
  checkoutCodes: string[];
  sources: WalletSeoLink[];
  faqs: WalletSeoFaq[];
  related: WalletSeoLink[];
  disclosureShort: string;
  disclosure: string;
  labels: {
    buyOfficial: string;
    fromPrefix: string;
    newTab: string;
    applyCode: string;
    copyCode: string;
    copied: string;
    codeLabel: string;
    faqTitle: string;
    relatedTitle: string;
    disclosureLabel: string;
    catalogLabel: string;
    sourcesLabel: string;
  };
};

const PAGE_LABEL: Record<WalletSeoLandingSlug, string> = {
  "hardware-wallet": "Portofel crypto hardware",
  "ledger-romania": "Ledger în România",
  "tangem-romania": "Tangem în România",
  "trezor-pret": "Preț Trezor",
  "de-ce-de-pe-site-ul-oficial": "De ce doar de pe site-ul oficial",
};

export function isWalletSeoLandingSlug(value: string): value is WalletSeoLandingSlug {
  return (WALLET_SEO_LANDING_SLUGS as readonly string[]).includes(value);
}

export function walletSeoLandingPath(slug: WalletSeoLandingSlug): string {
  return `/wallets/${slug}`;
}

/** Locale-free paths. The sitemap publishes only the Romanian URL. */
export function walletSeoLandingSitemapPaths(): string[] {
  return WALLET_SEO_LANDING_SLUGS.map((slug) => walletSeoLandingPath(slug));
}

export function walletSeoLandingCanonicalPath(slug: WalletSeoLandingSlug): string {
  return `/ro${walletSeoLandingPath(slug)}`;
}

function brandProfile(slug: WalletBrandSlug): WalletBrandProfile | undefined {
  return WALLET_BRANDS.find((brand) => brand.slug === slug);
}

function productsByBrand(slug: WalletBrandSlug): WalletProduct[] {
  return sortedWalletProducts().filter((item) => item.brandSlug === slug);
}

function productsBySlugs(slugs: readonly string[]): WalletProduct[] {
  return slugs.flatMap((slug) => {
    const found = WALLET_PRODUCTS.find((item) => item.slug === slug);
    return found ? [found] : [];
  });
}

function checkedLabel(date: string): string {
  return COPY.checkedOn.replace("{date}", date);
}

function pricePhrase(product: WalletProduct): string {
  const name = walletModelName(product, "ro");
  const view = walletPriceView(product, "ro");
  if (view.status !== "verified") {
    return `${name}: ${COPY.priceOnRequest}.`;
  }
  const prefix = view.priceIsFrom ? `${COPY.fromPrefix} ` : "";
  const secondary =
    view.secondary && view.secondaryKind === "same_page"
      ? ` (${view.secondary} ${COPY.samePage})`
      : "";
  return `${name}: ${prefix}${view.primary}${secondary}, ${checkedLabel(view.checkedOn)}.`;
}

function priceSentences(products: readonly WalletProduct[]): string {
  return products.map((product) => pricePhrase(product)).join(" ");
}

function lineFor(product: WalletProduct): WalletSeoProductLine {
  const view = walletPriceView(product, "ro");
  const brand = brandProfile(product.brandSlug);
  const verified = view.status === "verified";
  return {
    slug: product.slug,
    brand: product.brand,
    name: walletModelName(product, "ro"),
    primary: verified ? view.primary : null,
    priceIsFrom: verified ? view.priceIsFrom : false,
    secondaryLabel:
      verified && view.secondary && view.secondaryKind === "same_page"
        ? `${view.secondary} ${COPY.samePage}`
        : null,
    checkedLabel: verified ? checkedLabel(view.checkedOn) : null,
    priceOnRequest: verified ? null : COPY.priceOnRequest,
    outboundUrl: buildWalletOutboundUrl(product),
    imageSrc: brand?.image.src ?? null,
    imageAlt: brand?.image.altRo ?? product.brand,
    badge: brand?.usedByDani ? COPY.usedByDani : null,
  };
}

function checkoutCodes(products: readonly WalletProduct[]): string[] {
  const codes: string[] = [];
  for (const product of products) {
    if (!hasRealCheckoutCode(product) || !product.affiliateCode) continue;
    if (!codes.includes(product.affiliateCode)) codes.push(product.affiliateCode);
  }
  return codes;
}

function internalLink(slug: WalletSeoLandingSlug): WalletSeoLink {
  return {
    href: walletSeoLandingCanonicalPath(slug),
    label: PAGE_LABEL[slug],
    external: false,
  };
}

function relatedLinks(self: WalletSeoLandingSlug, extra: WalletSeoLink[] = []): WalletSeoLink[] {
  const siblings = WALLET_SEO_LANDING_SLUGS.filter((slug) => slug !== self).map(internalLink);
  return [
    { href: "/ro/wallets", label: "Toate portofelele crypto", external: false },
    ...siblings,
    { href: STIRILE_CRYPTO_URL, label: "Știrile Crypto", external: true },
    ...extra,
  ];
}

function labels(): WalletSeoLanding["labels"] {
  return {
    buyOfficial: COPY.buyOfficial,
    fromPrefix: COPY.fromPrefix,
    newTab: COPY.newTab,
    applyCode: COPY.applyCode,
    copyCode: COPY.copyCode,
    copied: COPY.copied,
    codeLabel: "Cod la checkout",
    faqTitle: "Întrebări frecvente",
    relatedTitle: "Pagini legate",
    disclosureLabel: COPY.disclosureLabel,
    catalogLabel: "Portofele crypto",
    sourcesLabel: "Surse citite",
  };
}

function base(
  slug: WalletSeoLandingSlug,
  input: {
    metaDescription: string;
    intro: string[];
    priceHeading: string;
    products: WalletProduct[];
    sources?: WalletSeoLink[];
    faqs: WalletSeoFaq[];
    extraRelated?: WalletSeoLink[];
  },
): WalletSeoLanding {
  return {
    slug,
    path: walletSeoLandingPath(slug),
    metaTitle: `${PAGE_LABEL[slug]} | Quick Exit`,
    metaDescription: input.metaDescription,
    h1: PAGE_LABEL[slug],
    intro: input.intro,
    priceHeading: input.priceHeading,
    lines: input.products.map(lineFor),
    products: input.products,
    checkoutCodes: checkoutCodes(input.products),
    sources: input.sources ?? [],
    faqs: input.faqs,
    related: relatedLinks(slug, input.extraRelated),
    disclosureShort: COPY.disclosureShort,
    disclosure: COPY.disclosure,
    labels: labels(),
  };
}

function hardwareLanding(): WalletSeoLanding {
  const products = productsBySlugs([
    "tangem-2-cards",
    "trezor-safe-3",
    "ledger-nano-s-plus",
    "safepal-s1",
  ]);
  return base("hardware-wallet", {
    metaDescription:
      "Ce este un portofel crypto hardware și cât costă câteva modele, la prețul oficial din catalogul Quick Exit. Nu ținem stoc. Cumperi pe site-ul producătorului.",
    intro: [
      "Un portofel hardware ține cheile offline, pe un card sau într-un dispozitiv. Telefonul arată soldul și propune tranzacția. Semnarea se face pe portofel.",
      "Quick Exit nu vinde aceste produse și nu ține stoc. Prețurile de mai jos vin din același catalog ca pagina de portofele: prețul oficial, cu data la care a fost verificat.",
    ],
    priceHeading: "Câteva prețuri oficiale",
    products,
    sources: [
      {
        href: STIRILE_HOT_COLD_URL,
        label: "Ghid Știrile Crypto: portofele hot și cold",
        external: true,
      },
    ],
    extraRelated: [
      {
        href: STIRILE_COMPROMISED_DEVICE_URL,
        label: "Cazul unui dispozitiv compromis, pe Știrile Crypto",
        external: true,
      },
    ],
    faqs: [
      {
        question: "Ce este un portofel crypto hardware?",
        answer: COPY.faqWhyA,
      },
      {
        question: "Quick Exit vinde portofele hardware?",
        answer:
          "Nu. Nu ținem stoc și nu încasăm prețul. Butonul deschide site-ul producătorului. Dacă cumperi prin el, putem primi un comision, fără cost în plus pentru tine.",
      },
      {
        question: "Cât costă un model de intrare?",
        answer: `Exemple din catalog, nu o listă completă. ${priceSentences(products)} La checkout pot apărea taxe sau transport.`,
      },
      {
        question: "Prețul de pe pagină este prețul final?",
        answer:
          "Este prețul oficial din catalog, la data scrisă lângă model. Taxele și transportul se văd la checkout, pe site-ul producătorului.",
      },
      {
        question: "De ce nu de pe un anunț?",
        answer: `${COPY.faqOfficialA} Pagina „De ce doar de pe site-ul oficial” spune ce am văzut pe alte canale.`,
      },
      {
        question: "Unde sunt toate mărcile?",
        answer:
          "Pe pagina Portofele crypto, la /ro/wallets. Acolo sunt cele douăsprezece mărci din catalog, cu aceleași prețuri.",
      },
    ],
  });
}

function ledgerLanding(): WalletSeoLanding {
  const products = productsByBrand("ledger");
  const ledger = brandProfile("ledger");
  const fromModels = products.filter((item) => item.priceIsFrom).map((item) => walletModelName(item, "ro"));
  const fromSentence =
    fromModels.length > 0
      ? ` La ${fromModels.join(" și ")} prețul din catalog este un prag de jos, după variantă. Pe pagină scriem „de la”.`
      : "";
  return base("ledger-romania", {
    metaDescription:
      "Ledger în România: modelele din catalogul Quick Exit, cu preț oficial și data verificării. Butonul deschide magazinul Ledger. Nu livrăm noi.",
    intro: [
      ledger?.positioningRo ?? "Modele Ledger din catalog.",
      "Cumpărarea se face pe magazinul Ledger. Quick Exit nu livrează și nu calculează TVA-ul: timpul și taxele se văd la checkout. Nu am confirmat un termen de livrare pentru România.",
      "La 27.11.2026, lista publică de reselleri Ledger pentru România arăta un magazin, Lerato. Butonul de pe această pagină deschide magazinul Ledger, nu resellerul.",
    ],
    priceHeading: "Preț oficial Ledger",
    products,
    sources: [
      { href: LEDGER_RESELLERS_URL, label: "Lista de reselleri Ledger", external: true },
      { href: LERATO_LEDGER_URL, label: "Lerato, singurul nume de pe lista din 27.11.2026", external: true },
      {
        href: STIRILE_COMPROMISED_DEVICE_URL,
        label: "Cazul unui dispozitiv compromis, pe Știrile Crypto",
        external: true,
      },
    ],
    faqs: [
      {
        question: "Pot comanda un Ledger în România?",
        answer:
          "Da, din magazinul oficial Ledger. Quick Exit nu ține stoc. Timpul de livrare și TVA-ul se calculează acolo, nu aici.",
      },
      {
        question: "Cât costă modelele Ledger din catalog?",
        answer: `${priceSentences(products)} La checkout pot apărea taxe sau transport.`,
      },
      {
        question: "De ce la unele modele scrie „de la”?",
        answer: `Prețul depinde de variantă, de exemplu de culoare. Arătăm pragul de jos din catalog.${fromSentence}`,
      },
      {
        question: "Există un reseller Ledger în România?",
        answer:
          "La 27.11.2026, pagina oficială de reselleri Ledger lista, pentru România, magazinul Lerato. Butonul de aici rămâne pe magazinul Ledger.",
      },
      {
        question: "De ce magazinul oficial, nu un anunț?",
        answer: COPY.faqOfficialA,
      },
    ],
  });
}

function tangemLanding(): WalletSeoLanding {
  const products = productsByBrand("tangem");
  const tangem = brandProfile("tangem");
  const dani = tangem?.usedByDani
    ? ` Pe Quick Exit, Tangem este marcat „${COPY.usedByDani}”.`
    : "";
  const code = checkoutCodes(products);
  const codeAnswer =
    code.length > 0
      ? "Pe modelele Tangem din catalog există un cod de checkout. Îl aplici pe site-ul Tangem, altfel achiziția nu este atribuită."
      : "Când catalogul are un cod de checkout, îl afișăm lângă model. Îl aplici pe site-ul Tangem.";
  return base("tangem-romania", {
    metaDescription:
      "Tangem în România: carduri, Ring și Pro Kit, cu prețul oficial din catalogul Quick Exit. Cumpărarea se face pe site-ul Tangem.",
    intro: [
      `${tangem?.positioningRo ?? "Tangem este un portofel-card."}${dani}`,
      "Prețul de pe această pagină este prețul oficial din catalog. Butonul deschide site-ul Tangem. La 27.11.2026, pagina lor de prețuri estima livrarea spre România la 1–4 zile lucrătoare. Taxele și transportul se confirmă la checkout.",
    ],
    priceHeading: "Preț oficial Tangem",
    products,
    sources: [
      { href: TANGEM_PRICING_URL, label: "Prețuri Tangem", external: true },
      { href: TANGEM_DELIVERY_URL, label: "Livrare Tangem, pagina pentru România", external: true },
    ],
    faqs: [
      {
        question: "Tangem livrează în România?",
        answer:
          "Pe pagina oficială de prețuri, citită la 27.11.2026, Tangem estima livrarea spre România la 1–4 zile lucrătoare. Quick Exit nu expediază coletul. Taxele și transportul se văd la checkout.",
      },
      {
        question: "Cât costă cardurile, Ring-ul și Pro Kit-ul?",
        answer: `${priceSentences(products)} La checkout pot apărea taxe sau transport.`,
      },
      {
        question: "Ce este codul de checkout?",
        answer: codeAnswer,
      },
      {
        question: "Cine folosește Tangem pe Quick Exit?",
        answer: tangem?.usedByDani
          ? `Tangem este marcat „${COPY.usedByDani}”. Cumpărarea se face tot pe site-ul Tangem.`
          : "Cumpărarea se face pe site-ul Tangem. Quick Exit arată prețul oficial din catalog.",
      },
      {
        question: "Quick Exit este magazinul Tangem?",
        answer:
          "Nu. Arătăm prețul oficial și, când catalogul îl are, codul de checkout. Tranzacția se încheie pe site-ul Tangem.",
      },
      {
        question: "Unde văd și un dispozitiv cu ecran?",
        answer:
          "Trezor și Ledger au paginile lor, cu prețul din același catalog. Toate mărcile sunt pe /ro/wallets.",
      },
    ],
  });
}

function trezorLanding(): WalletSeoLanding {
  const products = productsByBrand("trezor");
  const trezor = brandProfile("trezor");
  return base("trezor-pret", {
    metaDescription:
      "Preț Trezor Safe 3, Safe 5 și Safe 7, în euro și în lei, din catalogul Quick Exit. Data verificării este pe fiecare model.",
    intro: [
      trezor?.positioningRo ?? "Safe 3, Safe 5 și Safe 7.",
      "Euro este prețul canonic din catalog. Lei apar când pagina oficială îi arată pe aceeași pagină. Nu sunt o conversie făcută de noi. Butonul deschide trezor.io.",
    ],
    priceHeading: "Preț oficial Trezor",
    products,
    faqs: [
      {
        question: "Cât costă Trezor Safe 3, Safe 5 și Safe 7?",
        answer: `${priceSentences(products)} La checkout pot apărea taxe sau transport.`,
      },
      {
        question: "Prețul este în lei sau în euro?",
        answer:
          "Ambele, când pagina oficială le publică împreună. Lei de pe această pagină sunt suma de pe pagina Trezor, nu un curs calculat de Quick Exit.",
      },
      {
        question: "Acesta este prețul de la checkout?",
        answer:
          "Este prețul oficial din catalog, la data de lângă model. Taxele și transportul se pot adăuga pe trezor.io.",
      },
      {
        question: "Quick Exit are Trezor pe stoc?",
        answer: "Nu. Nu vindem și nu livrăm. Butonul deschide site-ul Trezor.",
      },
      {
        question: "De ce un alt site arată alt preț?",
        answer:
          "Alte magazine își stabilesc prețul lor. Aici este prețul de pe pagina oficială, la data verificării din catalog.",
      },
    ],
  });
}

function officialLanding(): WalletSeoLanding {
  const products = productsBySlugs(["tangem-2-cards", "trezor-safe-3", "ledger-nano-s-plus"]);
  return base("de-ce-de-pe-site-ul-oficial", {
    metaDescription:
      "De ce portofelul hardware se cumpără de pe site-ul producătorului: preț oficial, dispozitiv configurat de tine și un drum mai scurt.",
    intro: [
      "Quick Exit nu ține portofele pe stoc. Butonul deschide magazinul producătorului. Fraza de recuperare se generează pe dispozitivul tău, când îl configurezi. Nu vine tipărită din fabrică.",
      "Un dispozitiv din alt canal poate avea fraza deja generată sau poate fi modificat pe drum. Site-ul oficial nu elimină orice risc, dar scurtează lanțul de mâini.",
      "La 27.11.2026, pe OLX apăreau portofele hardware sub prețul oficial, inclusiv anunțuri prezentate ca noi și sigilate. Un preț mai mic nu arată dacă dispozitivul a fost deschis. În aceeași zi, un anunț Ledger Nano X de pe eMAG era marcat ca vândut de un vânzător din marketplace, nu de Ledger.",
      "Ledger spune cumpărătorilor să folosească magazinul oficial sau un reseller din lista lor. La 27.11.2026, lista pentru România arăta Lerato.",
    ],
    priceHeading: "Prețul pe care îl arătăm",
    products,
    sources: [
      { href: LEDGER_RESELLERS_URL, label: "Lista de reselleri Ledger", external: true },
      {
        href: STIRILE_COMPROMISED_DEVICE_URL,
        label: "Cazul unui dispozitiv compromis, pe Știrile Crypto",
        external: true,
      },
    ],
    faqs: [
      {
        question: COPY.faqOfficialQ,
        answer: COPY.faqOfficialA,
      },
      {
        question: COPY.faqSeedQ,
        answer: COPY.faqSeedA,
      },
      {
        question: "Un anunț sau un marketplace este magazinul oficial?",
        answer:
          "Nu neapărat. La 27.11.2026, anunțuri de pe OLX erau sub prețul oficial, iar un Nano X de pe eMAG era vândut de un vânzător din marketplace. Aici prețul este cel din catalogul oficial.",
      },
      {
        question: "Ce spune lista de reselleri Ledger?",
        answer:
          "La 27.11.2026, pentru România, lista oficială arăta magazinul Lerato. Butonul Quick Exit deschide magazinul Ledger.",
      },
      {
        question: "Quick Exit câștigă din buton?",
        answer:
          "Putem primi un comision, fără cost în plus pentru tine. Nu publicăm rata. Tranzacția se încheie la producător.",
      },
      {
        question: "Care este prețul oficial pentru câteva modele?",
        answer: `${priceSentences(products)} Lista întreagă este pe /ro/wallets.`,
      },
    ],
  });
}

const BUILDERS: Record<WalletSeoLandingSlug, () => WalletSeoLanding> = {
  "hardware-wallet": hardwareLanding,
  "ledger-romania": ledgerLanding,
  "tangem-romania": tangemLanding,
  "trezor-pret": trezorLanding,
  "de-ce-de-pe-site-ul-oficial": officialLanding,
};

export function getWalletSeoLanding(slug: WalletSeoLandingSlug): WalletSeoLanding {
  return BUILDERS[slug]();
}

export function walletSeoLandingPublicText(landing: WalletSeoLanding): string {
  return [
    landing.metaTitle,
    landing.metaDescription,
    landing.h1,
    ...landing.intro,
    landing.priceHeading,
    ...landing.faqs.flatMap((faq) => [faq.question, faq.answer]),
    ...landing.related.map((link) => link.label),
    ...landing.sources.map((link) => link.label),
    ...landing.lines.flatMap((line) => [line.name, line.primary, line.checkedLabel, line.badge]),
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n");
}

type JsonLd = Record<string, unknown>;

function productNode(product: WalletProduct, canonical: string, origin: string): JsonLd | null {
  const view = walletPriceView(product, "ro");
  if (view.status !== "verified" || product.listPrice == null || product.currency == null) {
    return null;
  }
  const brand = brandProfile(product.brandSlug);
  const name = walletModelName(product, "ro");
  const offers: JsonLd | JsonLd[] =
    product.listPriceMax != null
      ? {
          "@type": "AggregateOffer",
          lowPrice: product.listPrice,
          highPrice: product.listPriceMax,
          priceCurrency: product.currency,
          url: product.officialUrl,
        }
      : product.secondaryKind === "same_page" &&
          product.secondaryAmount != null &&
          product.secondaryCurrency
        ? [
            {
              "@type": "Offer",
              price: product.listPrice,
              priceCurrency: product.currency,
              url: product.officialUrl,
            },
            {
              "@type": "Offer",
              price: product.secondaryAmount,
              priceCurrency: product.secondaryCurrency,
              url: product.officialUrl,
            },
          ]
        : {
            "@type": "Offer",
            price: product.listPrice,
            priceCurrency: product.currency,
            url: product.officialUrl,
          };

  return {
    "@type": "Product",
    "@id": `${canonical}#${product.slug}`,
    name,
    description: view.priceIsFrom
      ? `${name}. Preț de pornire verificat la ${view.checkedOn}.`
      : `${name}. Preț oficial verificat la ${view.checkedOn}.`,
    url: canonical,
    ...(brand ? { image: `${origin}${brand.image.src}` } : {}),
    brand: { "@type": "Brand", name: product.brand },
    itemCondition: "https://schema.org/NewCondition",
    offers,
  };
}

export function buildWalletSeoJsonLd(
  landing: WalletSeoLanding,
  origin: string = PRODUCTION_SITE_URL,
): JsonLd {
  const site = origin.replace(/\/+$/, "") || PRODUCTION_SITE_URL;
  const canonical = `${site}${walletSeoLandingCanonicalPath(landing.slug)}`;
  const products = landing.products.flatMap((product) => {
    const node = productNode(product, canonical, site);
    return node ? [node] : [];
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Quick Exit", item: `${site}/ro` },
          {
            "@type": "ListItem",
            position: 2,
            name: "Portofele crypto",
            item: `${site}/ro/wallets`,
          },
          { "@type": "ListItem", position: 3, name: landing.h1, item: canonical },
        ],
      },
      {
        "@type": "FAQPage",
        inLanguage: "ro",
        url: canonical,
        mainEntity: landing.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
      ...products,
    ],
  };
}

/** Checked date shown on a landing, taken from the catalog row. */
export function walletSeoCheckedDate(product: WalletProduct): string {
  return formatWalletCheckedDate(product.priceCheckedAt, "ro");
}

