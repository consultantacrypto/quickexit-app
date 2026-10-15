import type { PageLocale } from "@/lib/seo";
import type { PublicDemandRow } from "@/lib/publicDemands";
import { truncateForSchema } from "@/lib/publicDemands";
import { formatDemandBudgetCompact } from "@/lib/demandBudget";

export type CapitalDisponibilUiCopy = {
  backHome: string;
  eyebrow: string;
  h1: string;
  intro: string;
  postDemandCta: string;
  searchPlaceholder: string;
  allCategories: string;
  filterResults: string;
  filterCountLabel: string;
  safetyNote: string;
  budgetDeclared: string;
  budgetCommunicated: string;
  budgetDisclaimer: string;
  statusActive: string;
  availableBudgetLabel: string;
  sendOfferCta: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  totalCapitalLabel: string;
  activeBuyersLabel: string;
  buyingLabel: string;
  verifiedBuyer: string;
  timeHorizonValue: string;
  sections: {
    whatIs: { title: string; body: string };
    forBuyers: { title: string; body: string };
    forSellers: { title: string; body: string };
    different: { title: string; body: string };
    kyc: { title: string; body: string };
    notQuickExit: { title: string; body: string };
  };
  relatedLinksTitle: string;
  relatedLinks: { href: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
};

const RELATED_PATHS = [
  { href: "/posteaza-cerere", ro: "Publică ce vrei să cumperi", en: "Post what you want to buy" },
  { href: "/pune-anunt", ro: "Publică anunț de vânzare", en: "Post a sale listing" },
  { href: "/cum-functioneaza", ro: "Cum funcționează", en: "How it works" },
  { href: "/tarife", ro: "Tarife", en: "Pricing" },
  { href: "/pentru-investitori", ro: "Pentru investitori", en: "For investors" },
  { href: "/pentru-vanzatori", ro: "Pentru vânzători", en: "For sellers" },
] as const;

export function getCapitalDisponibilUiCopy(locale: PageLocale): CapitalDisponibilUiCopy {
  const relatedLinks = RELATED_PATHS.map((link) => ({
    href: link.href,
    label: locale === "en" ? link.en : link.ro,
  }));

  if (locale === "en") {
    return {
      backHome: "← Back home",
      eyebrow: "Buyer Capital",
      h1: "Buyer capital for real assets",
      intro:
        "See what buyers want and which budgets are available. Sellers with matching assets can respond directly.",
      postDemandCta: "Post what you want to buy — 49 RON",
      searchPlaceholder: "SEARCH (E.G. MERCEDES, LAND, ROLEX)...",
      allCategories: "All categories",
      filterResults: "Filter results",
      filterCountLabel: "Buying requests",
      safetyNote:
        "Published requests indicate buying interest. Verify details directly with the other party and do not follow payment links received outside the platform.",
      budgetDeclared: "Declared budget",
      budgetCommunicated: "Stated budget",
      budgetDisclaimer:
        "The budget is declared by the buyer and must be verified directly between parties.",
      statusActive: "Active request",
      availableBudgetLabel: "Available budget",
      sendOfferCta: "I have a matching asset",
      loading: "Loading requests…",
      emptyTitle: "No active buying requests at the moment.",
      emptyBody: "Check back soon or publish the first buying request.",
      emptyCta: "Post what you want to buy — 49 RON",
      totalCapitalLabel: "looking for assets",
      activeBuyersLabel: "active buyers",
      buyingLabel: "Buying",
      verifiedBuyer: "Verified buyer",
      timeHorizonValue: "Buying within the next 30 days",
      sections: {
        whatIs: {
          title: "What is Buyer Capital?",
          body: "Buyer Capital is the buyer-side directory on Quick Exit where people with budget publish what they want to acquire — asset type, category, conditions and a declared budget range. It makes purchase intent visible to sellers before a listing exists.",
        },
        forBuyers: {
          title: "How it works for buyers",
          body: "Buyers describe the asset they want, choose a category, set a budget range and publish a 30-day buying request for 49 RON. After payment, the request appears here so compatible sellers can respond.",
        },
        forSellers: {
          title: "How it helps sellers",
          body: "Sellers can browse real buying requests, compare budgets and criteria, and pitch a matching asset when demand already exists — reducing time-to-contact for high-value exits.",
        },
        different: {
          title: "Why it is different from OLX, Autovit or Imobiliare",
          body: "Classic classified platforms focus on seller listings. Quick Exit adds visible buyer-side demand: capital on the table, purchase criteria and exit-oriented workflows.",
        },
        kyc: {
          title: "What role does KYC play?",
          body: "Verified buyers earn a public “Verified buyer” badge when identity verification is complete. KYC does not replace your own due diligence on the asset and counterparty.",
        },
        notQuickExit: {
          title: "What Quick Exit does not do",
          body: "Quick Exit does not guarantee the sale or purchase of an asset, does not hold funds in escrow, and does not act as a legal, financial or real-estate broker.",
        },
      },
      relatedLinksTitle: "Related pages",
      relatedLinks,
      categoryOptions: [
        { value: "Toate", label: "All categories" },
        { value: "Auto & Moto", label: "Auto & Moto" },
        { value: "Imobiliare", label: "Real estate" },
        { value: "Lux & Ceasuri", label: "Luxury & watches" },
        { value: "Afaceri de vânzare", label: "Business for sale" },
        { value: "Gadgets", label: "Gadgets" },
        { value: "Foto & Audio", label: "Photo & audio" },
      ],
    };
  }

  return {
    backHome: "← Înapoi Acasă",
    eyebrow: "Capital disponibil",
    h1: "Capital disponibil pentru active reale",
    intro:
      "Vezi ce caută cumpărătorii și ce bugete au disponibile. Vânzătorii cu active potrivite pot răspunde direct.",
    postDemandCta: "Publică ce vrei să cumperi — 49 RON",
    searchPlaceholder: "CAUTĂ (EX: MERCEDES, TEREN, ROLEX)...",
    allCategories: "Toate Categoriile",
    filterResults: "Rezultate Filtrare",
    filterCountLabel: "Cereri de cumpărare",
    safetyNote:
      "Cererile publicate indică interes de cumpărare. Verifică detaliile direct cu cealaltă parte și nu accesa linkuri de plată primite în afara platformei.",
    budgetDeclared: "Buget declarat",
    budgetCommunicated: "Buget comunicat",
    budgetDisclaimer:
      "Bugetul este declarat de cumpărător și trebuie verificat direct între părți.",
    statusActive: "Cerere activă",
    availableBudgetLabel: "Buget disponibil",
    sendOfferCta: "Am un activ potrivit",
    loading: "Se încarcă cererile…",
    emptyTitle: "Nu există cereri active momentan.",
    emptyBody: "Revino în curând sau publică prima cerere de cumpărare.",
    emptyCta: "Publică ce vrei să cumperi — 49 RON",
    totalCapitalLabel: "caută active",
    activeBuyersLabel: "cumpărători activi",
    buyingLabel: "Cumpăr",
    verifiedBuyer: "Cumpărător verificat",
    timeHorizonValue: "Cumpăr în următoarele 30 zile",
    sections: {
      whatIs: {
        title: "Ce este Capital Disponibil?",
        body: "Capital Disponibil este directorul de cereri de cumpărare de pe Quick Exit: cumpărătorii cu buget publică ce vor să achiziționeze — tip activ, categorie, condiții și un interval de buget.",
      },
      forBuyers: {
        title: "Cum funcționează pentru cumpărători?",
        body: "Descrie activul dorit, setează bugetul și publică o cerere de cumpărare pe 30 de zile pentru 49 RON. După plată, cererea apare aici iar vânzătorii pot răspunde.",
      },
      forSellers: {
        title: "Cum ajută vânzătorii?",
        body: "Poți explora cereri reale, compara bugete și criterii și propune un activ potrivit când cererea există deja.",
      },
      different: {
        title: "De ce este diferit față de OLX, Autovit sau Imobiliare?",
        body: "Platformele clasificate se concentrează pe anunțurile vânzătorilor. Quick Exit adaugă cerere vizibilă din partea cumpărătorilor: capital disponibil, criterii și fluxuri orientate spre lichiditate.",
      },
      kyc: {
        title: "Ce rol are KYC?",
        body: "Cumpărătorii verificați primesc badge-ul public „Cumpărător verificat”. KYC nu înlocuiește due diligence-ul asupra activului și contrapartidei.",
      },
      notQuickExit: {
        title: "Ce nu face Quick Exit?",
        body: "Quick Exit nu garantează vânzarea sau cumpărarea, nu ține banii în escrow și nu acționează ca broker.",
      },
    },
    relatedLinksTitle: "Pagini utile",
    relatedLinks,
    categoryOptions: [
      { value: "Toate", label: "Toate Categoriile" },
      { value: "Auto & Moto", label: "Auto & Moto" },
      { value: "Imobiliare", label: "Imobiliare" },
      { value: "Lux & Ceasuri", label: "Lux & Ceasuri" },
      { value: "Afaceri de vânzare", label: "Afaceri de vânzare" },
      { value: "Gadgets", label: "Gadgets" },
      { value: "Foto & Audio", label: "Foto & Audio" },
    ],
  };
}

type FaqEntry = { question: string; answer: string };

function getCapitalFaqEntries(locale: PageLocale): FaqEntry[] {
  if (locale === "en") {
    return [
      {
        question: "What is Buyer Capital on Quick Exit?",
        answer:
          "Buyer Capital is the public directory where buyers with budget publish what they want to buy — asset type, category, conditions and a declared budget range — so sellers can see real purchase intent.",
      },
      {
        question: "How much does it cost to publish a buying request?",
        answer:
          "Publishing a buying request costs 49 RON for 30 days of visibility and the ability to receive seller offers.",
      },
      {
        question: "Can sellers respond to buying requests?",
        answer:
          "Yes. Sellers can open a request and submit an offer with price, description, contact details and optional private images.",
      },
    ];
  }
  return [
    {
      question: "Ce este Capital Disponibil pe Quick Exit?",
      answer:
        "Capital Disponibil este directorul public unde cumpărătorii cu buget publică ce vor să cumpere — tip activ, categorie, condiții și interval de buget — ca vânzătorii să vadă intenția reală de achiziție.",
    },
    {
      question: "Cât costă publicarea unei cereri de cumpărare?",
      answer:
        "Publicarea unei cereri de cumpărare costă 49 RON pentru 30 de zile de vizibilitate și posibilitatea de a primi oferte de la vânzători.",
    },
    {
      question: "Pot vânzătorii răspunde la cereri?",
      answer:
        "Da. Vânzătorii pot deschide o cerere și trimite o ofertă cu preț, descriere, date de contact și imagini private opționale.",
    },
  ];
}

export function buildCapitalFaqJsonLd(locale: PageLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: getCapitalFaqEntries(locale).map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

export function buildCapitalItemListJsonLd(
  demands: PublicDemandRow[],
  locale: PageLocale,
  siteUrl: string,
) {
  const pageUrl = `${siteUrl}/${locale}/capital-disponibil`;

  const itemListElement = demands.slice(0, 20).map((demand, index) => {
    const parts = [demand.target_asset];
    if (demand.category) parts.push(demand.category);
    parts.push(formatDemandBudgetCompact(demand.budget_min, demand.budget, locale));
    if (demand.description) {
      parts.push(truncateForSchema(demand.description, 120));
    }

    return {
      "@type": "ListItem",
      position: index + 1,
      name: demand.target_asset,
      description: parts.join(" · "),
      url: pageUrl,
    };
  });

  if (itemListElement.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name:
      locale === "en"
        ? "Active buying requests on Quick Exit"
        : "Cereri active de cumpărare pe Quick Exit",
    url: pageUrl,
    numberOfItems: itemListElement.length,
    itemListElement,
  };
}
