type SocialChannel = "x" | "linkedin" | "whatsapp" | "telegram" | "instagram" | "hq";

type ListingForShare = {
  id: string;
  title?: string | null;
  category?: string | null;
  market_price?: number | null;
  exit_price?: number | null;
  discount?: number | null;
  discount_percentage?: number | null;
  deal_score?: number | null;
  location?: string | null;
  images?: string[] | null;
  sale_strategy?: string | null;
  created_at?: string | null;
  details?: Record<string, unknown> | null;
};

type ShareKit = {
  listingUrl: string;
  utm: Record<SocialChannel, string>;
  headline: string;
  shortHook: string;
  whatsappMessage: string;
  telegramMessage: string;
  xPost: string;
  linkedinPost: string;
  instagramCaption: string;
  hashtags: string[];
};

const UTM_BY_CHANNEL: Record<SocialChannel, { source: string; medium: string }> = {
  x: { source: "x", medium: "social" },
  linkedin: { source: "linkedin", medium: "social" },
  whatsapp: { source: "whatsapp", medium: "share" },
  telegram: { source: "telegram", medium: "share" },
  instagram: { source: "instagram", medium: "social" },
  hq: { source: "hq_admin", medium: "manual_distribution" },
};

function pickLocation(listing: ListingForShare): string | null {
  if (listing.location && listing.location.trim()) return listing.location.trim();
  const details = listing.details;
  if (details && typeof details === "object") {
    const raw =
      (details.location as string | undefined) ||
      (details.locatie as string | undefined) ||
      (details.zona as string | undefined);
    if (raw && raw.trim()) return raw.trim();
  }
  return null;
}

export function formatSocialPrice(value: number | null | undefined): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `€${n.toLocaleString("ro-RO")}`;
}

export function getUrgencyLabel(saleStrategy?: string | null): string {
  const s = (saleStrategy || "").toLowerCase();
  if (s === "extreme") return "Oportunitate mare";
  if (s === "urgent") return "Urgent";
  if (s === "auction") return "Oferte rapide";
  return "Vânzare rapidă";
}

export function getCategoryHashtags(category?: string | null): string[] {
  const common = [
    "#QuickExit",
    "#VanzareRapida",
    "#CapitalDisponibil",
    "#Oportunitate",
    "#Lichiditate",
  ];
  const byCategory: Record<string, string[]> = {
    "Auto & Moto": ["#AutoRomania", "#MasiniDeVanzare", "#AutoPremium"],
    Imobiliare: ["#Imobiliare", "#InvestitiiImobiliare", "#Proprietati"],
    "Lux & Ceasuri": ["#Ceasuri", "#Lux", "#Collectibles"],
    Gadgets: ["#Gadgets", "#TechDeals", "#Electronice"],
    "Foto & Audio": ["#FotoVideo", "#Audio", "#Echipamente"],
    "Afaceri de vânzare": ["#BusinessDeVanzare", "#Antreprenoriat", "#Investitii"],
  };
  return [...common, ...(byCategory[category || ""] || [])];
}

export function buildListingUrl(listingId: string, baseOrigin?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  const fromWindow =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const origin = (baseOrigin || fromEnv || fromWindow || "").replace(/\/+$/, "");
  if (!origin) return `/anunt/${listingId}`;
  return `${origin}/anunt/${listingId}`;
}

export function buildUtmUrl(
  listingUrl: string,
  channel: SocialChannel,
  listingId: string
): string {
  const cfg = UTM_BY_CHANNEL[channel];
  const url = new URL(listingUrl, listingUrl.startsWith("http") ? undefined : "https://quickexit.local");
  url.searchParams.set("utm_source", cfg.source);
  url.searchParams.set("utm_medium", cfg.medium);
  url.searchParams.set("utm_campaign", "listing_distribution");
  url.searchParams.set("utm_content", `listing_${listingId}`);
  if (!listingUrl.startsWith("http")) {
    return `${url.pathname}${url.search}`;
  }
  return url.toString();
}

function truncateForX(text: string, maxLen = 260): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

export function buildSocialShareKit(listing: ListingForShare, baseOrigin?: string): ShareKit {
  const title = (listing.title || "Activ listat").trim();
  const category = (listing.category || "Diverse").trim();
  const location = pickLocation(listing);
  const listingUrl = buildListingUrl(listing.id, baseOrigin);
  const exitPrice = formatSocialPrice(listing.exit_price);
  const marketPrice = formatSocialPrice(listing.market_price);
  const discountVal = Number.isFinite(Number(listing.discount))
    ? Number(listing.discount)
    : Number.isFinite(Number(listing.discount_percentage))
      ? Number(listing.discount_percentage)
      : null;

  const utm: Record<SocialChannel, string> = {
    x: buildUtmUrl(listingUrl, "x", listing.id),
    linkedin: buildUtmUrl(listingUrl, "linkedin", listing.id),
    whatsapp: buildUtmUrl(listingUrl, "whatsapp", listing.id),
    telegram: buildUtmUrl(listingUrl, "telegram", listing.id),
    instagram: buildUtmUrl(listingUrl, "instagram", listing.id),
    hq: buildUtmUrl(listingUrl, "hq", listing.id),
  };

  const headline = `${title} — oportunitate de vânzare rapidă pe Quick Exit`;

  let shortHook = "Activ listat pentru vânzare rapidă pe Quick Exit.";
  if (exitPrice && marketPrice) {
    shortHook = `Preț de vânzare rapidă: ${exitPrice}. Estimare piață: ${marketPrice}.`;
  } else if (exitPrice) {
    shortHook = `Preț de vânzare rapidă: ${exitPrice}.`;
  }
  if (discountVal !== null) {
    shortHook = `${shortHook} Discount orientativ: ${discountVal}% față de piață.`;
  }

  const urgency = getUrgencyLabel(listing.sale_strategy);
  const hashtags = getCategoryHashtags(listing.category);

  const whatsappMessage = [
    "Am găsit această oportunitate pe Quick Exit:",
    title,
    "",
    exitPrice ? `Preț de vânzare rapidă: ${exitPrice}` : null,
    `Categorie: ${category}`,
    location || null,
    "",
    "Vezi detalii:",
    utm.whatsapp,
  ]
    .filter(Boolean)
    .join("\n");

  const telegramMessage = [
    `Oportunitate Quick Exit: ${title}`,
    exitPrice ? `Preț rapid: ${exitPrice}` : null,
    `${urgency} · ${category}`,
    utm.telegram,
  ]
    .filter(Boolean)
    .join("\n");

  const xPost = truncateForX(
    `${title} listat pentru vânzare rapidă pe Quick Exit. ${exitPrice ? `Preț: ${exitPrice}. ` : ""}Vezi oportunitatea: ${utm.x} #QuickExit`
  );

  const linkedinPost = [
    `Un nou activ este disponibil pe Quick Exit pentru vânzare rapidă: ${title}.`,
    exitPrice ? `Preț de vânzare rapidă: ${exitPrice}.` : null,
    marketPrice ? `Estimare piață: ${marketPrice}.` : null,
    "Platforma conectează vânzători care caută lichiditate cu cumpărători pregătiți să analizeze oportunități reale.",
    `Detalii: ${utm.linkedin}`,
  ]
    .filter(Boolean)
    .join(" ");

  const instagramCaption = [
    "Oportunitate nouă pe Quick Exit.",
    title,
    exitPrice ? `Preț de vânzare rapidă: ${exitPrice}` : null,
    "Vezi detaliile în link:",
    utm.instagram,
    "",
    hashtags.join(" "),
  ]
    .filter(Boolean)
    .join("\n");

  return {
    listingUrl,
    utm,
    headline,
    shortHook,
    whatsappMessage,
    telegramMessage,
    xPost,
    linkedinPost,
    instagramCaption,
    hashtags,
  };
}

