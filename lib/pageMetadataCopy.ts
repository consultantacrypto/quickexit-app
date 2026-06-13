import type { PageLocale } from "@/lib/seo";

type LocaleCopy = Record<PageLocale, { title: string; description: string }>;

export const PAGE_METADATA_COPY = {
  evaluare: {
    ro: {
      title: "Evaluare rapidă active | Quick Exit",
      description:
        "Evaluează rapid un activ și află dacă se potrivește pentru o vânzare rapidă prin Quick Exit.",
    },
    en: {
      title: "Fast asset valuation | Quick Exit",
      description:
        "Get a quick indicative valuation and see if your asset fits a fast sale on Quick Exit.",
    },
  },
  capitalDisponibil: {
    ro: {
      title: "Capital disponibil — cereri de cumpărare active | Quick Exit",
      description:
        "Vezi cereri reale de cumpărare publicate de cumpărători cu buget disponibil: mașini, imobile, business-uri și alte active. Răspunde direct unei intenții existente.",
    },
    en: {
      title: "Available capital — active buyer requests | Quick Exit",
      description:
        "Browse real buyer requests from people with available capital: cars, real estate, businesses and other assets. Respond directly to existing purchase intent.",
    },
  },
  posteazaCerere: {
    ro: {
      title: "Publică cerere de cumpărare | Quick Exit",
      description:
        "Spune ce vrei să cumperi, setează bugetul și atrage vânzători compatibili.",
    },
    en: {
      title: "Post a buyer request | Quick Exit",
      description:
        "State what you want to buy, set your budget, and attract compatible sellers.",
    },
  },
  puneAnunt: {
    ro: {
      title: "Publică anunț de vânzare rapidă | Quick Exit",
      description:
        "Listează un activ pentru vânzare rapidă și conectează-te cu cumpărători pregătiți.",
    },
    en: {
      title: "Post a fast sale listing | Quick Exit",
      description:
        "List an asset for a fast sale and connect with ready buyers on Quick Exit.",
    },
  },
  tarife: {
    ro: {
      title: "Tarife Quick Exit | Pachete pentru vânzare rapidă",
      description:
        "Alege pachetul potrivit pentru publicarea și expunerea activului tău pe Quick Exit.",
    },
    en: {
      title: "Quick Exit pricing | Fast sale listing packages",
      description:
        "Choose the right package to publish and promote your asset on Quick Exit.",
    },
  },
  cumFunctioneaza: {
    ro: {
      title: "Cum funcționează | Quick Exit",
      description:
        "Vezi pas cu pas cum funcționează Quick Exit pentru vânzători și cumpărători, de la evaluare la tranzacție.",
    },
    en: {
      title: "How it works | Quick Exit",
      description:
        "See step by step how Quick Exit works for sellers and buyers, from valuation to transaction.",
    },
  },
  pentruInvestitori: {
    ro: {
      title: "Pentru investitori | Active sub prețul pieței pe Quick Exit",
      description:
        "Descoperă active listate cu preț de exit pe Quick Exit: mașini, business-uri, imobiliare, bunuri de lux și oportunități pentru cumpărători cu capital disponibil.",
    },
    en: {
      title: "For investors | Below-market assets on Quick Exit",
      description:
        "Discover exit-price listings on Quick Exit: cars, businesses, real estate, luxury goods, and opportunities for buyers with available capital.",
    },
  },
  pentruVanzatori: {
    ro: {
      title: "Pentru vânzători | Vinde rapid active pe Quick Exit",
      description:
        "Publică active pe Quick Exit cu preț de exit, evaluare orientativă și acces la cumpărători sau investitori interesați de oportunități rapide.",
    },
    en: {
      title: "For sellers | Sell assets fast on Quick Exit",
      description:
        "Publish assets on Quick Exit with an exit price, indicative valuation, and access to buyers or investors seeking fast opportunities.",
    },
  },
  licitatii: {
    ro: {
      title: "Licitații active | Quick Exit",
      description:
        "Descoperă licitații deschise pe Quick Exit: oferte timp de până la 30 de zile, vânzătorul alege manual oferta potrivită.",
    },
    en: {
      title: "Active auctions | Quick Exit",
      description:
        "Discover open auctions on Quick Exit: bids for up to 30 days, with the seller manually selecting the right offer.",
    },
  },
} satisfies Record<string, LocaleCopy>;

const CATEGORY_LABELS: Record<string, LocaleCopy> = {
  auto: {
    ro: { title: "Auto", description: "auto" },
    en: { title: "Cars", description: "cars" },
  },
  imobiliare: {
    ro: { title: "Imobiliare", description: "imobiliare" },
    en: { title: "Real estate", description: "real estate" },
  },
  lux: {
    ro: { title: "Lux", description: "lux" },
    en: { title: "Luxury", description: "luxury" },
  },
  gadgets: {
    ro: { title: "Gadgets", description: "gadgets" },
    en: { title: "Gadgets", description: "gadgets" },
  },
  foto: {
    ro: { title: "Foto", description: "foto" },
    en: { title: "Photo", description: "photo" },
  },
  business: {
    ro: { title: "Business", description: "business" },
    en: { title: "Business", description: "business" },
  },
};

export function getCategoryMetadataCopy(
  slug: string,
  locale: PageLocale,
): { title: string; description: string } | null {
  const labels = CATEGORY_LABELS[slug];
  if (!labels) return null;

  const label = labels[locale].title;
  const categoryWord = labels[locale].description;

  if (locale === "en") {
    return {
      title: `Below-market ${label} assets | Quick Exit`,
      description: `Discover ${categoryWord} assets listed on Quick Exit with exit prices and opportunities for buyers and investors.`,
    };
  }

  return {
    title: `Active ${label} sub prețul pieței | Quick Exit`,
    description: `Descoperă active din categoria ${label} listate pe Quick Exit cu preț de exit și oportunități pentru cumpărători/investitori.`,
  };
}

export function getUnavailableCategoryMetadata(locale: PageLocale): {
  title: string;
  description: string;
} {
  if (locale === "en") {
    return {
      title: "Category unavailable | Quick Exit",
      description: "The requested category is not publicly available.",
    };
  }
  return {
    title: "Categorie indisponibilă | Quick Exit",
    description: "Categoria solicitată nu este disponibilă public.",
  };
}
