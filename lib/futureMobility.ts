export const FUTURE_MOBILITY_COLLECTION = "future_mobility" as const;

export type FutureMobilityAvailabilityType = "in_stock" | "on_order" | "preorder";

export type FutureMobilityBadgeId =
  | "FUTURE_COLLECTION"
  | "IMPORT_PREMIUM"
  | "EV_PREMIUM"
  | "CONFIGURABIL";

export type FutureMobilityEvSpecs = {
  power_hp?: number;
  power_kw?: number;
  torque_nm?: number;
  battery_kwh?: number;
  range_km_wltp?: number;
  range_km_cltc?: number;
  acceleration_0_100?: string;
  top_speed_kmh?: number;
  charging_dc_kw?: number;
  charging_10_80?: string;
};

export type FutureMobilityVariant = {
  id: string;
  name: string;
  price_from_eur?: number;
  highlights?: string[];
};

export type FutureMobilityColor = {
  id: string;
  name: string;
  hex?: string;
  image?: string;
};

export type FutureMobilityBatteryPack = {
  id: string;
  name: string;
  included?: boolean;
};

export type FutureMobilityVideo = {
  provider: "youtube";
  video_id?: string;
  url?: string;
  title?: string;
};

export type FutureMobilityDealerPartner = {
  id?: string;
  name: string;
  logo_url?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  description?: string;
  badges?: string[];
};

export type FutureMobilityCompetitor = {
  name: string;
  power_hp?: number;
  acceleration_0_100?: string;
  range_km?: number;
  price_from_eur?: number;
};

export type FutureMobilityFaqItem = {
  q: string;
  a: string;
};

export type FutureMobilityWarranty = {
  summary?: string;
  months?: number;
  km_limit?: number;
};

export type FutureMobilityImportInfo = {
  type?: string;
  origin_market?: string;
  homologation_note?: string;
};

export type FutureMobilityHeroStory = {
  headline?: string;
  body?: string;
};

export type FutureMobilityDetails = {
  collection: typeof FUTURE_MOBILITY_COLLECTION;
  model_slug?: string;
  availability_type?: FutureMobilityAvailabilityType;
  delivery_estimate?: string;
  delivery_note?: string;
  price_display?: "from" | "fixed";
  price_from_eur?: number;
  make?: string;
  model?: string;
  year?: number;
  fuel?: string;
  transmission?: string;
  bodyType?: string;
  drivetrain?: string;
  badges?: FutureMobilityBadgeId[];
  ev_specs?: FutureMobilityEvSpecs;
  variants?: FutureMobilityVariant[];
  colors?: FutureMobilityColor[];
  options?: string[];
  battery_packs?: FutureMobilityBatteryPack[];
  videos?: FutureMobilityVideo[];
  hero_story?: FutureMobilityHeroStory;
  dealer_partner?: FutureMobilityDealerPartner;
  competitors?: FutureMobilityCompetitor[];
  faq?: FutureMobilityFaqItem[];
  warranty?: FutureMobilityWarranty;
  import?: FutureMobilityImportInfo;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const n = Number(trimmed.replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => parseTrimmedString(item))
    .filter((item): item is string => Boolean(item));
  return items.length > 0 ? items : undefined;
}

const BADGE_IDS: ReadonlySet<string> = new Set([
  "FUTURE_COLLECTION",
  "IMPORT_PREMIUM",
  "EV_PREMIUM",
  "CONFIGURABIL",
]);

function parseBadges(value: unknown): FutureMobilityBadgeId[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => parseTrimmedString(item))
    .filter((item): item is FutureMobilityBadgeId => Boolean(item && BADGE_IDS.has(item)));
  return items.length > 0 ? items : undefined;
}

function parseAvailabilityType(value: unknown): FutureMobilityAvailabilityType | undefined {
  const raw = parseTrimmedString(value);
  if (raw === "in_stock" || raw === "on_order" || raw === "preorder") return raw;
  return undefined;
}

function parsePriceDisplay(value: unknown): "from" | "fixed" | undefined {
  const raw = parseTrimmedString(value);
  if (raw === "from" || raw === "fixed") return raw;
  return undefined;
}

function parseEvSpecs(raw: unknown): FutureMobilityEvSpecs | undefined {
  if (!isRecord(raw)) return undefined;
  const specs: FutureMobilityEvSpecs = {
    power_hp: parseFiniteNumber(raw.power_hp),
    power_kw: parseFiniteNumber(raw.power_kw),
    torque_nm: parseFiniteNumber(raw.torque_nm),
    battery_kwh: parseFiniteNumber(raw.battery_kwh),
    range_km_wltp: parseFiniteNumber(raw.range_km_wltp),
    range_km_cltc: parseFiniteNumber(raw.range_km_cltc),
    acceleration_0_100: parseTrimmedString(raw.acceleration_0_100),
    top_speed_kmh: parseFiniteNumber(raw.top_speed_kmh),
    charging_dc_kw: parseFiniteNumber(raw.charging_dc_kw),
    charging_10_80: parseTrimmedString(raw.charging_10_80),
  };
  const hasValue = Object.values(specs).some((v) => v !== undefined);
  return hasValue ? specs : undefined;
}

function parseVariants(raw: unknown): FutureMobilityVariant[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: FutureMobilityVariant[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = parseTrimmedString(entry.id);
    const name = parseTrimmedString(entry.name);
    if (!id || !name) continue;
    items.push({
      id,
      name,
      price_from_eur: parseFiniteNumber(entry.price_from_eur),
      highlights: parseStringArray(entry.highlights),
    });
  }
  return items.length > 0 ? items : undefined;
}

function parseColors(raw: unknown): FutureMobilityColor[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: FutureMobilityColor[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = parseTrimmedString(entry.id);
    const name = parseTrimmedString(entry.name);
    if (!id || !name) continue;
    items.push({
      id,
      name,
      hex: parseTrimmedString(entry.hex),
      image: parseTrimmedString(entry.image),
    });
  }
  return items.length > 0 ? items : undefined;
}

function parseBatteryPacks(raw: unknown): FutureMobilityBatteryPack[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: FutureMobilityBatteryPack[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = parseTrimmedString(entry.id);
    const name = parseTrimmedString(entry.name);
    if (!id || !name) continue;
    items.push({
      id,
      name,
      included: typeof entry.included === "boolean" ? entry.included : undefined,
    });
  }
  return items.length > 0 ? items : undefined;
}

export function extractYoutubeVideoId(video: FutureMobilityVideo): string | null {
  const direct = parseTrimmedString(video.video_id);
  if (direct) return direct;
  const url = parseTrimmedString(video.url);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = parts.indexOf("embed");
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1];
    }
  } catch {
    return null;
  }
  return null;
}

function parseVideos(raw: unknown): FutureMobilityVideo[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: FutureMobilityVideo[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const provider = parseTrimmedString(entry.provider);
    if (provider !== "youtube") continue;
    const video: FutureMobilityVideo = {
      provider: "youtube",
      video_id: parseTrimmedString(entry.video_id),
      url: parseTrimmedString(entry.url),
      title: parseTrimmedString(entry.title),
    };
    if (!extractYoutubeVideoId(video)) continue;
    items.push(video);
  }
  return items.length > 0 ? items : undefined;
}

function parseDealerPartner(raw: unknown): FutureMobilityDealerPartner | undefined {
  if (!isRecord(raw)) return undefined;
  const name = parseTrimmedString(raw.name);
  if (!name) return undefined;
  return {
    id: parseTrimmedString(raw.id),
    name,
    logo_url: parseTrimmedString(raw.logo_url),
    website: parseTrimmedString(raw.website),
    contact_email: parseTrimmedString(raw.contact_email),
    contact_phone: parseTrimmedString(raw.contact_phone),
    description: parseTrimmedString(raw.description),
    badges: parseStringArray(raw.badges),
  };
}

function parseCompetitors(raw: unknown): FutureMobilityCompetitor[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: FutureMobilityCompetitor[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const name = parseTrimmedString(entry.name);
    if (!name) continue;
    items.push({
      name,
      power_hp: parseFiniteNumber(entry.power_hp),
      acceleration_0_100: parseTrimmedString(entry.acceleration_0_100),
      range_km: parseFiniteNumber(entry.range_km),
      price_from_eur: parseFiniteNumber(entry.price_from_eur),
    });
  }
  return items.length > 0 ? items : undefined;
}

function parseFaq(raw: unknown): FutureMobilityFaqItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: FutureMobilityFaqItem[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const q = parseTrimmedString(entry.q);
    const a = parseTrimmedString(entry.a);
    if (!q || !a) continue;
    items.push({ q, a });
  }
  return items.length > 0 ? items : undefined;
}

function parseWarranty(raw: unknown): FutureMobilityWarranty | undefined {
  if (!isRecord(raw)) return undefined;
  const summary = parseTrimmedString(raw.summary);
  const months = parseFiniteNumber(raw.months);
  const km_limit = parseFiniteNumber(raw.km_limit);
  if (!summary && months === undefined && km_limit === undefined) return undefined;
  return { summary, months, km_limit };
}

function parseImportInfo(raw: unknown): FutureMobilityImportInfo | undefined {
  if (!isRecord(raw)) return undefined;
  const type = parseTrimmedString(raw.type);
  const origin_market = parseTrimmedString(raw.origin_market);
  const homologation_note = parseTrimmedString(raw.homologation_note);
  if (!type && !origin_market && !homologation_note) return undefined;
  return { type, origin_market, homologation_note };
}

function parseHeroStory(raw: unknown): FutureMobilityHeroStory | undefined {
  if (!isRecord(raw)) return undefined;
  const headline = parseTrimmedString(raw.headline);
  const body = parseTrimmedString(raw.body);
  if (!headline && !body) return undefined;
  return { headline, body };
}

export function parseFutureMobilityDetails(details: unknown): FutureMobilityDetails | null {
  if (!isRecord(details)) return null;
  if (details.collection !== FUTURE_MOBILITY_COLLECTION) return null;

  return {
    collection: FUTURE_MOBILITY_COLLECTION,
    model_slug: parseTrimmedString(details.model_slug),
    availability_type: parseAvailabilityType(details.availability_type),
    delivery_estimate: parseTrimmedString(details.delivery_estimate),
    delivery_note: parseTrimmedString(details.delivery_note),
    price_display: parsePriceDisplay(details.price_display),
    price_from_eur: parseFiniteNumber(details.price_from_eur),
    make: parseTrimmedString(details.make),
    model: parseTrimmedString(details.model),
    year: parseFiniteNumber(details.year),
    fuel: parseTrimmedString(details.fuel),
    transmission: parseTrimmedString(details.transmission),
    bodyType: parseTrimmedString(details.bodyType) ?? parseTrimmedString(details.body_type),
    drivetrain: parseTrimmedString(details.drivetrain) ?? parseTrimmedString(details.traction),
    badges: parseBadges(details.badges),
    ev_specs: parseEvSpecs(details.ev_specs),
    variants: parseVariants(details.variants),
    colors: parseColors(details.colors),
    options: parseStringArray(details.options),
    battery_packs: parseBatteryPacks(details.battery_packs),
    videos: parseVideos(details.videos),
    hero_story: parseHeroStory(details.hero_story),
    dealer_partner: parseDealerPartner(details.dealer_partner),
    competitors: parseCompetitors(details.competitors),
    faq: parseFaq(details.faq),
    warranty: parseWarranty(details.warranty),
    import: parseImportInfo(details.import),
  };
}

export function isFutureMobilityListing(details: unknown): details is FutureMobilityDetails {
  return parseFutureMobilityDetails(details) !== null;
}

export function getFutureMobilityDetails(details: unknown): FutureMobilityDetails | null {
  return parseFutureMobilityDetails(details);
}

export function isFutureMobilityOrderLike(
  fm: FutureMobilityDetails,
): boolean {
  return fm.availability_type === "on_order" || fm.availability_type === "preorder";
}

export function getJsonLdAvailability(
  availabilityType: FutureMobilityAvailabilityType | undefined,
): string {
  switch (availabilityType) {
    case "in_stock":
      return "https://schema.org/InStock";
    case "on_order":
      return "https://schema.org/BackOrder";
    case "preorder":
      return "https://schema.org/PreOrder";
    default:
      return "https://schema.org/InStock";
  }
}

export function mapBadgesToDisplayLabels(
  badges: FutureMobilityBadgeId[],
  labels: Record<FutureMobilityBadgeId, string>,
): string[] {
  return badges.map((badge) => labels[badge]).filter((label): label is string => Boolean(label));
}
