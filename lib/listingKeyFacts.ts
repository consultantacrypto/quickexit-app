import { normalizeSaleType } from "@/utils/normalizeSaleType";

type ListingLike = {
  category?: string | null;
  sale_strategy?: string | null;
  exit_price?: unknown;
  offer_count?: unknown;
  expires_at?: string | null;
  details?: unknown;
};

export type ListingFactKey =
  | "year"
  | "mileage"
  | "fuel"
  | "power"
  | "transmission"
  | "bodyType"
  | "drivetrain"
  | "range"
  | "battery"
  | "surface"
  | "landSurface"
  | "rooms"
  | "location"
  | "pricePerSqm"
  | "brand"
  | "model"
  | "condition"
  | "fullSet"
  | "material"
  | "revenue"
  | "profit"
  | "employees"
  | "warranty"
  | "storage"
  | "offers"
  | "timeLeft";

export type ListingFact = {
  key: ListingFactKey;
  label: string;
  value: string;
  priority: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pick(details: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const val = details[key];
    if (val === null || val === undefined) continue;
    if (typeof val === "string" && !val.trim()) continue;
    return val;
  }
  return undefined;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw
    .replace(/\u00a0/g, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function formatInteger(value: number, locale: string): string {
  return Math.round(value).toLocaleString(locale);
}

function formatKm(value: unknown, locale: string): string | null {
  const n = toFiniteNumber(value);
  return n === null ? null : `${formatInteger(n, locale)} km`;
}

function formatPower(value: unknown): string | null {
  const n = toFiniteNumber(value);
  if (n !== null) return `${formatInteger(n, "en-GB")} CP`;
  const text = toText(value);
  if (!text) return null;
  // Free-text power fields that already include a unit keep their wording.
  if (/\bcp\b|hp|ps|\bk\s?w\b/i.test(text)) return text;
  return null;
}

function formatEngineOrPower(details: Record<string, unknown>): string | null {
  const powerRaw = pick(details, ["power_hp", "power", "horsepower"]);
  if (powerRaw !== undefined) {
    const formatted = formatPower(powerRaw);
    if (formatted) return formatted;
    // Numeric/unit power failed — fall through only if free text remains useful.
    const powerText = toText(powerRaw);
    if (powerText) return powerText;
  }
  // Engine is often free text (e.g. "2.0 TDI") — never append "CP".
  return toText(pick(details, ["engine"]));
}

function formatSurface(value: unknown, locale: string): string | null {
  const n = toFiniteNumber(value);
  if (n !== null) return `${formatInteger(n, locale)} mp`;
  const text = toText(value);
  if (!text) return null;
  return /mp|m²|sqm|m2/i.test(text) ? text : `${text} mp`;
}

function formatTimeLeft(expiresAt: string | null | undefined, locale: string): string | null {
  if (!expiresAt) return null;
  const end = new Date(expiresAt);
  if (Number.isNaN(end.getTime())) return null;
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return locale === "en" ? "Expired" : "Expirată";
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.ceil(diff / dayMs);
  if (days <= 1) return locale === "en" ? "Closes today" : "Se închide azi";
  return locale === "en" ? `${days} days left` : `${days} zile rămase`;
}

function addFact(
  acc: ListingFact[],
  labels: Record<string, string>,
  key: ListingFactKey,
  value: string | null,
  priority: number,
) {
  if (!value) return;
  acc.push({ key, label: labels[key], value, priority });
}

export function getListingKeyFacts(
  listing: ListingLike,
  locale: string,
  labels: Record<string, string>,
): ListingFact[] {
  const details = isRecord(listing.details) ? listing.details : {};
  const category = String(listing.category ?? "").toLowerCase();
  const saleType = normalizeSaleType(listing.sale_strategy);
  const facts: ListingFact[] = [];

  if (saleType === "auction") {
    addFact(facts, labels, "offers", toText(listing.offer_count), 0);
    addFact(facts, labels, "timeLeft", formatTimeLeft(listing.expires_at, locale), 0);
  }

  if (category.includes("auto")) {
    // Power first only when present (addFact skips empty). Then km → year → fuel…
    addFact(facts, labels, "power", formatEngineOrPower(details), 1);
    addFact(facts, labels, "mileage", formatKm(pick(details, ["vehicle_km", "km"]), locale), 2);
    addFact(facts, labels, "year", toText(pick(details, ["vehicle_year", "year"])), 3);
    addFact(facts, labels, "fuel", toText(pick(details, ["fuel"])), 4);
    addFact(facts, labels, "transmission", toText(pick(details, ["transmission"])), 5);
    addFact(facts, labels, "bodyType", toText(pick(details, ["bodyType", "body_type"])), 6);
    addFact(facts, labels, "drivetrain", toText(pick(details, ["drivetrain", "traction"])), 7);
    addFact(facts, labels, "range", toText(pick(details, ["range_km_cltc", "range_km_wltp"])), 8);
    addFact(facts, labels, "battery", toText(pick(details, ["battery_kwh"])), 9);
  } else if (category.includes("imobil")) {
    const surface = formatSurface(pick(details, ["surface", "suprafata"]), locale);
    const land = formatSurface(pick(details, ["landSurface", "land_surface"]), locale);
    addFact(facts, labels, "surface", surface, 1);
    addFact(facts, labels, "landSurface", land, 2);
    addFact(facts, labels, "rooms", toText(pick(details, ["rooms", "camere"])), 3);
    addFact(facts, labels, "location", toText(pick(details, ["location", "locatie"])), 4);
    const surfaceNum = toFiniteNumber(pick(details, ["surface", "suprafata"]));
    const exitPrice = toFiniteNumber(listing.exit_price);
    if (surfaceNum && surfaceNum > 0 && exitPrice && exitPrice > 0) {
      addFact(
        facts,
        labels,
        "pricePerSqm",
        `€${Math.round(exitPrice / surfaceNum).toLocaleString(locale === "en" ? "en-GB" : "ro-RO")}/mp`,
        5,
      );
    }
  } else if (category.includes("lux")) {
    addFact(facts, labels, "brand", toText(pick(details, ["brand"])), 1);
    addFact(facts, labels, "model", toText(pick(details, ["model", "refModel"])), 2);
    addFact(facts, labels, "year", toText(pick(details, ["year", "purchaseYear"])), 3);
    addFact(facts, labels, "condition", toText(pick(details, ["condition", "stare"])), 4);
    addFact(facts, labels, "fullSet", toText(pick(details, ["boxPapers", "documents"])), 5);
    addFact(facts, labels, "material", toText(pick(details, ["material"])), 6);
  } else if (category.includes("afaceri") || category.includes("business")) {
    addFact(facts, labels, "revenue", toText(pick(details, ["revenue", "cifra"])), 1);
    addFact(facts, labels, "profit", toText(pick(details, ["profit"])), 2);
    addFact(facts, labels, "employees", toText(pick(details, ["employees"])), 3);
    addFact(facts, labels, "location", toText(pick(details, ["location", "locatie"])), 4);
  } else if (category.includes("gadget")) {
    addFact(facts, labels, "brand", toText(pick(details, ["brand"])), 1);
    addFact(facts, labels, "model", toText(pick(details, ["model", "specs"])), 2);
    addFact(facts, labels, "condition", toText(pick(details, ["condition", "stare"])), 3);
    addFact(facts, labels, "warranty", toText(pick(details, ["warranty"])), 4);
    addFact(facts, labels, "storage", toText(pick(details, ["storage"])), 5);
  }

  return facts.sort((a, b) => a.priority - b.priority).slice(0, 6);
}
