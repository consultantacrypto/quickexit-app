import type { PageLocale } from "@/lib/seo";
import type { PublicDemandRow } from "@/lib/publicDemands";
import { truncateForSchema } from "@/lib/publicDemands";

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
  maxBudgetLabel: string;
  sendOfferCta: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCta: string;
  sections: {
    whatIs: { title: string; body: string };
    forBuyers: { title: string; body: string };
    forSellers: { title: string; body: string };
    different: { title: string; body: string };
    kyc: { title: string; body: string };
    notQuickExit: { title: string; body: string };
  };
  compliance: string;
  relatedLinksTitle: string;
  relatedLinks: { href: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
};

const RELATED_PATHS = [
  { href: "/posteaza-cerere", ro: "Publică cerere de cumpărare", en: "Post a buyer request" },
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
      eyebrow: "Available capital",
      h1: "Available Capital — buyers can list what they want to buy",
      intro:
        "Quick Exit allows buyers with available capital to publish what they are looking for: premium cars, real estate, land, business assets or other high-value assets. Instead of waiting passively, sellers can see real buyer demand and respond to an existing purchase intent.",
      postDemandCta: "Post a buyer request",
      searchPlaceholder: "SEARCH (E.G. MERCEDES, LAND, ROLEX)...",
      allCategories: "All categories",
      filterResults: "Filter results",
      filterCountLabel: "Requests",
      safetyNote:
        "Published requests indicate buying interest. Verify details directly with the other party and do not follow payment links received outside the platform.",
      budgetDeclared: "Declared budget",
      budgetCommunicated: "Stated budget",
      budgetDisclaimer:
        "The budget is declared by the buyer and must be verified directly between parties.",
      statusActive: "Active request",
      maxBudgetLabel: "Maximum allocated budget",
      sendOfferCta: "Send offer",
      loading: "Loading requests…",
      emptyTitle: "No active requests at the moment.",
      emptyBody: "Check back soon or publish the first buyer request.",
      emptyCta: "Post the first buyer request",
      sections: {
        whatIs: {
          title: "What is Available Capital?",
          body: "Available Capital is the buyer-side directory on Quick Exit where people with budget publish what they want to acquire — asset type, category, conditions and maximum budget. It makes purchase intent visible to sellers before a listing exists.",
        },
        forBuyers: {
          title: "How it works for buyers",
          body: "Buyers describe the asset they want, choose a category, set a maximum budget and publish a request. After activation, the request appears in this directory so compatible sellers can respond with a concrete asset offer.",
        },
        forSellers: {
          title: "How it helps sellers",
          body: "Sellers no longer rely only on passive listing views. They can browse real buyer requests, compare budgets and categories, and pitch a matching asset when demand already exists — reducing time-to-contact for high-value exits.",
        },
        different: {
          title: "Why it is different from OLX, Autovit or Imobiliare",
          body: "Classic classified platforms focus on seller listings. Quick Exit adds visible buyer-side demand: capital on the table, purchase criteria and exit-oriented workflows (valuation, exit price, auctions). It is built for liquidity and speed, not only for posting ads.",
        },
        kyc: {
          title: "What role does KYC play?",
          body: "KYC (Know Your Customer) identity verification helps build trust between parties on high-value transactions. Quick Exit may display verification status where available; it does not replace your own due diligence on the asset, documents and counterparty.",
        },
        notQuickExit: {
          title: "What Quick Exit does not do",
          body: "Quick Exit does not guarantee the sale or purchase of an asset, does not hold funds in escrow, and does not act as a legal, financial or real-estate broker. The platform provides listing infrastructure, visibility, verification tools and contact between parties.",
        },
      },
      compliance:
        "Quick Exit does not guarantee the sale or purchase of an asset, does not hold money in escrow and does not act as a legal, financial or real-estate broker. The platform offers listing infrastructure, visibility, verification and contact between parties.",
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
    h1: "Capital Disponibil — cumpărătorii pot lista ce vor să cumpere",
    intro:
      "Quick Exit permite cumpărătorilor cu buget disponibil să publice ce caută: mașini premium, imobile, terenuri, business-uri sau alte active valoroase. În loc ca vânzătorii să aștepte pasiv, aceștia pot vedea cereri reale de cumpărare și pot răspunde direct unei intenții existente.",
    postDemandCta: "Publică cerere de cumpărare",
    searchPlaceholder: "CAUTĂ (EX: MERCEDES, TEREN, ROLEX)...",
    allCategories: "Toate Categoriile",
    filterResults: "Rezultate Filtrare",
    filterCountLabel: "Cereri",
    safetyNote:
      "Cererile publicate indică interes de cumpărare. Verifică detaliile direct cu cealaltă parte și nu accesa linkuri de plată primite în afara platformei.",
    budgetDeclared: "Buget declarat",
    budgetCommunicated: "Buget comunicat",
    budgetDisclaimer:
      "Bugetul este declarat de cumpărător și trebuie verificat direct între părți.",
    statusActive: "Cerere activă",
    maxBudgetLabel: "Buget Maxim Alocat",
    sendOfferCta: "Trimite ofertă",
    loading: "Scuturăm baza de date...",
    emptyTitle: "Nu există cereri active momentan.",
    emptyBody: "Revino în curând sau publică prima ta cerere de cumpărare.",
    emptyCta: "Publică prima cerere de cumpărare",
    sections: {
      whatIs: {
        title: "Ce este Capital Disponibil?",
        body: "Capital Disponibil este directorul de cereri de cumpărare de pe Quick Exit: cumpărătorii cu buget publică ce vor să achiziționeze — tip activ, categorie, condiții și buget maxim. Intenția de cumpărare devine vizibilă pentru vânzători înainte ca un anunț să existe.",
      },
      forBuyers: {
        title: "Cum funcționează pentru cumpărători?",
        body: "Cumpărătorii descriu activul dorit, aleg categoria, setează bugetul maxim și publică cererea. După activare, cererea apare în acest director, iar vânzătorii compatibili pot răspunde cu o ofertă concretă de activ.",
      },
      forSellers: {
        title: "Cum ajută vânzătorii?",
        body: "Vânzătorii nu depind doar de vizualizări pasive ale anunțului. Pot explora cereri reale de cumpărare, compara bugete și categorii și pot propune un activ potrivit când cererea există deja — reducând timpul până la contact pentru exit-uri de valoare.",
      },
      different: {
        title: "De ce este diferit față de OLX, Autovit sau Imobiliare?",
        body: "Platformele clasificate se concentrează pe anunțurile vânzătorilor. Quick Exit adaugă cerere vizibilă din partea cumpărătorilor: capital disponibil, criterii de achiziție și fluxuri orientate spre lichiditate (evaluare, preț de exit, licitații). Este construit pentru viteză și exit, nu doar pentru postarea de anunțuri.",
      },
      kyc: {
        title: "Ce rol are KYC?",
        body: "KYC (Know Your Customer) — verificarea identității — sprijină încrederea între părți la tranzacții de valoare. Quick Exit poate afișa status de verificare acolo unde este disponibil; nu înlocuiește due diligence-ul tău asupra activului, documentelor și contrapartidei.",
      },
      notQuickExit: {
        title: "Ce nu face Quick Exit?",
        body: "Quick Exit nu garantează vânzarea sau cumpărarea unui activ, nu ține banii în escrow și nu acționează ca broker legal, financiar sau imobiliar. Platforma oferă infrastructură de listare, vizibilitate, verificare și contact între părți.",
      },
    },
    compliance:
      "Quick Exit nu garantează vânzarea sau cumpărarea unui activ, nu ține banii în escrow și nu acționează ca broker legal, financiar sau imobiliar. Platforma oferă infrastructură de listare, vizibilitate, verificare și contact între părți.",
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
        question: "What is Available Capital on Quick Exit?",
        answer:
          "Available Capital is the public directory where buyers with budget publish what they want to buy — asset type, category, conditions and maximum budget — so sellers can see real purchase intent.",
      },
      {
        question: "Can buyers list what they want to buy?",
        answer:
          "Yes. Buyers can publish a purchase request with target asset, category and maximum budget through the post buyer request flow.",
      },
      {
        question: "Can sellers respond to buyer requests?",
        answer:
          "Yes. Sellers can browse active requests and pitch a compatible asset when the buyer's criteria match their offering.",
      },
      {
        question: "Are users verified?",
        answer:
          "Quick Exit supports identity verification (KYC) via authorized third-party providers where available. Verification status may be shown in context; parties should still perform their own checks.",
      },
      {
        question: "Does Quick Exit verify funds?",
        answer:
          "No. Budgets are declared by buyers and are not verified or held by Quick Exit. Parties must confirm funds and terms directly.",
      },
      {
        question: "Does Quick Exit hold money or act as escrow?",
        answer:
          "No. Quick Exit does not hold funds in escrow or intermediate payments between buyers and sellers.",
      },
      {
        question: "How is Quick Exit different from OLX, Autovit or Imobiliare?",
        answer:
          "Unlike classic classified sites focused on seller ads, Quick Exit exposes buyer-side demand with stated budgets and adds liquidity-oriented tools such as exit pricing, valuations and auctions.",
      },
    ];
  }

  return [
    {
      question: "Ce este Capital Disponibil pe Quick Exit?",
      answer:
        "Capital Disponibil este directorul public unde cumpărătorii cu buget publică ce vor să cumpere — tip activ, categorie, condiții și buget maxim — astfel încât vânzătorii să vadă intenție reală de achiziție.",
    },
    {
      question: "Pot cumpărătorii lista ce vor să cumpere?",
      answer:
        "Da. Cumpărătorii pot publica o cerere de cumpărare cu activul țintă, categoria și bugetul maxim prin fluxul de publicare cerere.",
    },
    {
      question: "Pot vânzătorii răspunde la cererile cumpărătorilor?",
      answer:
        "Da. Vânzătorii pot explora cererile active și pot propune un activ compatibil când criteriile cumpărătorului se potrivesc.",
    },
    {
      question: "Sunt utilizatorii verificați?",
      answer:
        "Quick Exit suportă verificarea identității (KYC) prin furnizori terți autorizați, acolo unde este disponibil. Statusul poate fi afișat în context; părțile trebuie să își facă propriile verificări.",
    },
    {
      question: "Quick Exit verifică fondurile?",
      answer:
        "Nu. Bugetele sunt declarate de cumpărători și nu sunt verificate sau reținute de Quick Exit. Părțile confirmă fondurile și termenii direct.",
    },
    {
      question: "Quick Exit ține bani sau acționează ca escrow?",
      answer:
        "Nu. Quick Exit nu deține fonduri în escrow și nu intermediază plăți între cumpărători și vânzători.",
    },
    {
      question: "Cu ce se deosebește Quick Exit de OLX, Autovit sau Imobiliare?",
      answer:
        "Spre deosebire de site-urile clasificate centrate pe anunțurile vânzătorilor, Quick Exit expune cerere din partea cumpărătorilor cu buget declarat și adaugă instrumente orientate spre lichiditate: preț de exit, evaluări și licitații.",
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
    parts.push(
      locale === "en"
        ? `Budget up to EUR ${demand.budget.toLocaleString("en-GB")}`
        : `Buget până la EUR ${demand.budget.toLocaleString("ro-RO")}`,
    );
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
        ? "Active buyer requests on Quick Exit"
        : "Cereri active de cumpărare pe Quick Exit",
    url: pageUrl,
    numberOfItems: itemListElement.length,
    itemListElement,
  };
}
