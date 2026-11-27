/**
 * Free car valuation from QuickExit asking prices.
 *
 * Comparables are active Auto & Moto listings. Prices are asking prices
 * (exit_price), not sold prices. Equipment is stored and shown; it is not a
 * matching feature. Tier 3 (make + year only) is off unless
 * QE_VALUATION_TIER3_ENABLED=true.
 */
import { CAR_BRANDS, foldBrandText } from "@/lib/carBrands";
import { sanitizeEvaluateText } from "@/lib/evaluateSafety";

export const QE_CAR_VALUATION_SOURCE = "quickexit_listings" as const;
export const QE_VALUATION_CAMPAIGN_KEY = "free_car_valuation";
export const QE_VALUATION_CONSENT_VERSION = "2026-11-qe-car-valuation";

export const QE_TIER1_MIN_COMPARABLES = 5;
export const QE_TIER2_MIN_COMPARABLES = 3;
export const QE_TIER3_MIN_COMPARABLES = 3;
export const QE_TIER1_YEAR_DELTA = 2;
export const QE_TIER2_YEAR_DELTA = 3;
export const QE_TIER3_YEAR_DELTA = 2;
/** ±25%, but at least ±10.000 km so nearly-new cars can still match. */
export const QE_TIER1_KM_PCT = 0.25;
export const QE_TIER1_KM_FLOOR = 10_000;
/** Wider band for the low-confidence tier. */
export const QE_TIER2_KM_PCT = 0.6;
export const QE_TIER2_KM_FLOOR = 40_000;

export const QE_INSUFFICIENT_MESSAGE =
  "Date insuficiente pe QuickExit pentru un interval de încredere.";

export const QE_VALUATION_DISCLAIMER =
  "Intervalul provine din prețurile cerute ale anunțurilor active de pe QuickExit, nu din prețuri de tranzacție. Nu este o evaluare autorizată și nu garantează o vânzare. Eșantionul este mic.";

export const QE_EQUIPMENT_NOTE =
  "Dotarea este notată în raport. Nu ajustează intervalul: anunțurile nu descriu echiparea suficient de uniform ca să o folosim la potrivire.";

export const QE_TIER_LABELS = {
  1: "Interval din anunțuri apropiate",
  2: "estimare lărgită, încredere scăzută",
  3: "Estimare foarte largă, după marcă și an",
} as const;

export type QePriceTier = 1 | 2 | 3;

export type QeValuationEmailStatus = "not_requested" | "accepted" | "sent" | "unavailable";
export type QeValuationEmailDelivery =
  | "not_requested"
  | "disabled"
  | "stored"
  | "sent"
  | "failed"
  | "unavailable";

export type QeValuationRange = {
  p25: number;
  p50: number;
  p75: number;
};

export type QeValuationPublicBody = {
  success: true;
  source: typeof QE_CAR_VALUATION_SOURCE;
  sufficient: boolean;
  tier: QePriceTier | null;
  tier_label: string | null;
  comparable_count: number;
  range: QeValuationRange | null;
  equipment: string;
  equipment_note: string;
  disclaimer: string;
  message: string | null;
  email_status: QeValuationEmailStatus;
  email_delivery: QeValuationEmailDelivery;
};

export type QeValuation = {
  sufficient: boolean;
  tier: QePriceTier | null;
  tierLabel: string | null;
  comparableCount: number;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  normalizedMake: string;
  normalizedModel: string;
};

export type QeComparable = {
  id: string;
  makeKey: string;
  modelKey: string;
  year: number;
  km: number;
  price: number;
};

export type QeListingRow = {
  id?: unknown;
  category?: unknown;
  status?: unknown;
  exit_price?: unknown;
  is_seed?: unknown;
  vehicle_make?: unknown;
  vehicle_model?: unknown;
  vehicle_year?: unknown;
  vehicle_km?: unknown;
  details?: unknown;
};

const MAKE_ALIASES: Record<string, string> = {
  mercedes: "mercedes benz",
  "mercedes benz": "mercedes benz",
  mb: "mercedes benz",
  vw: "volkswagen",
  landrover: "land rover",
  "rolls royce": "rolls royce",
  ds: "ds automobiles",
};

const MODEL_PREFIXES = new Set([
  "model",
  "seria",
  "series",
  "clasa",
  "class",
  "range",
  "land",
  "grand",
]);

const SECOND_TOKEN_KEEP = new Set([
  "class",
  "klasse",
  "classe",
  "rover",
  "cruiser",
  "cherokee",
]);

const MODEL_ALIASES: Record<string, string> = {
  "e class": "clasa e",
  "c class": "clasa c",
  "s class": "clasa s",
  "a class": "clasa a",
  "b class": "clasa b",
};

const TRIM_TOKENS = new Set([
  "xdrive",
  "sdrive",
  "quattro",
  "4matic",
  "4motion",
  "awd",
  "fwd",
  "rwd",
  "4x4",
  "4wd",
  "hybrid",
  "phev",
  "plugin",
  "plug",
  "electric",
  "ev",
  "mild",
  "long",
  "range",
  "performance",
  "sport",
  "sports",
  "luxury",
  "premium",
  "executive",
  "base",
  "amg",
  "msport",
  "competition",
  "paket",
  "package",
  "line",
  "design",
  "dsg",
  "tiptronic",
  "automatic",
  "automata",
  "manual",
  "manuala",
  "pro",
  "plus",
  "max",
  "gt",
  "gti",
  "gtd",
  "gte",
  "gts",
  "sline",
  "m",
  "sportline",
  "elegance",
  "ambition",
  "style",
  "intense",
  "launch",
  "edition",
  "pack",
  "pachet",
]);

export function foldVehicleText(value: string): string {
  return foldBrandText(value)
    .replace(/&/g, " ")
    .replace(/[^a-z0-9.+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMake(raw: string): string {
  const folded = foldVehicleText(raw);
  if (!folded) return "";
  const aliased = MAKE_ALIASES[folded] ?? folded;
  const target = foldVehicleText(aliased);
  for (const brand of CAR_BRANDS) {
    if (foldVehicleText(brand) === target) return target;
  }
  return target;
}

function isTrimToken(token: string): boolean {
  return TRIM_TOKENS.has(token);
}

function isEngineCode(token: string): boolean {
  return (
    /^(xdrive|sdrive)\d{2,3}[a-z]{0,3}$/.test(token) ||
    /^\d{2,3}[a-z]{1,4}$/.test(token) ||
    /^\d\.\d[a-z]{0,4}$/.test(token)
  );
}

/**
 * Base model keeps the model line and drops drivetrain, engine and trim
 * tokens that follow it. "X6 xDrive40i M Sport" → "x6". A second token is
 * kept only when it is part of the name ("Model Y", "Range Rover", "Clasa E").
 */
export function normalizeBaseModel(raw: string): string {
  const tokens = foldVehicleText(raw).split(" ").filter(Boolean);
  const kept: string[] = [];
  for (const token of tokens) {
    if (kept.length > 0 && (isTrimToken(token) || isEngineCode(token))) continue;
    kept.push(token);
    if (kept.length === 2) break;
  }
  if (kept.length === 0) return "";
  const base =
    kept.length >= 2 && (MODEL_PREFIXES.has(kept[0]!) || SECOND_TOKEN_KEEP.has(kept[1]!))
      ? `${kept[0]} ${kept[1]}`
      : kept[0]!;
  return MODEL_ALIASES[base] ?? base;
}

export function kmWindow(km: number, tier: QePriceTier): { min: number; max: number } {
  if (tier === 3) {
    return { min: 0, max: Math.max(km * 4, km + 250_000, 400_000) };
  }
  const pct = tier === 1 ? QE_TIER1_KM_PCT : QE_TIER2_KM_PCT;
  const floor = tier === 1 ? QE_TIER1_KM_FLOOR : QE_TIER2_KM_FLOOR;
  const delta = Math.max(Math.abs(km) * pct, floor);
  return { min: Math.max(0, km - delta), max: km + delta };
}

/** Inclusive linear percentile (PERCENTILE.INC), rounded to whole EUR. */
export function percentileInc(sortedAsc: readonly number[], percentile: number): number {
  if (sortedAsc.length === 0) {
    throw new Error("percentile of empty sample");
  }
  if (percentile < 0 || percentile > 100) {
    throw new Error("percentile out of range");
  }
  if (sortedAsc.length === 1) return Math.round(sortedAsc[0]!);
  const rank = (percentile / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const value = sortedAsc[lo]! + (sortedAsc[hi]! - sortedAsc[lo]!) * (rank - lo);
  return Math.round(value);
}

function yearDelta(tier: QePriceTier): number {
  if (tier === 1) return QE_TIER1_YEAR_DELTA;
  if (tier === 2) return QE_TIER2_YEAR_DELTA;
  return QE_TIER3_YEAR_DELTA;
}

function within(listing: QeComparable, year: number, km: number, tier: QePriceTier): boolean {
  if (Math.abs(listing.year - year) > yearDelta(tier)) return false;
  const window = kmWindow(km, tier);
  return listing.km >= window.min && listing.km <= window.max;
}

function priceSample(rows: QeComparable[], tier: QePriceTier, makeKey: string, modelKey: string): QeValuation {
  const prices = rows.map((row) => row.price).sort((a, b) => a - b);
  return {
    sufficient: true,
    tier,
    tierLabel: QE_TIER_LABELS[tier],
    comparableCount: rows.length,
    p25: percentileInc(prices, 25),
    p50: percentileInc(prices, 50),
    p75: percentileInc(prices, 75),
    normalizedMake: makeKey,
    normalizedModel: modelKey,
  };
}

export function selectQeTier(input: {
  comparables: readonly QeComparable[];
  makeKey: string;
  modelKey: string;
  year: number;
  km: number;
  tier3Enabled: boolean;
}): QeValuation {
  const sameModel = input.comparables.filter(
    (row) => row.makeKey === input.makeKey && row.modelKey === input.modelKey,
  );
  const tier1 = sameModel.filter((row) => within(row, input.year, input.km, 1));
  if (tier1.length >= QE_TIER1_MIN_COMPARABLES) {
    return priceSample(tier1, 1, input.makeKey, input.modelKey);
  }

  const tier2 = sameModel.filter((row) => within(row, input.year, input.km, 2));
  if (tier2.length >= QE_TIER2_MIN_COMPARABLES) {
    return priceSample(tier2, 2, input.makeKey, input.modelKey);
  }

  let tier3Count = 0;
  if (input.tier3Enabled) {
    const tier3 = input.comparables.filter(
      (row) => row.makeKey === input.makeKey && within(row, input.year, input.km, 3),
    );
    tier3Count = tier3.length;
    if (tier3.length >= QE_TIER3_MIN_COMPARABLES) {
      return priceSample(tier3, 3, input.makeKey, input.modelKey);
    }
  }

  return {
    sufficient: false,
    tier: null,
    tierLabel: null,
    comparableCount: Math.max(tier1.length, tier2.length, tier3Count),
    p25: null,
    p50: null,
    p75: null,
    normalizedMake: input.makeKey,
    normalizedModel: input.modelKey,
  };
}

function readDetail(details: unknown, keys: readonly string[]): unknown {
  if (!details || typeof details !== "object") return undefined;
  const record = details as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function parseYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value >= 1950 && value <= 2100 ? value : null;
  }
  if (typeof value === "string" && /^\d{4}$/.test(value.trim())) {
    const year = Number(value.trim());
    return year >= 1950 && year <= 2100 ? year : null;
  }
  return null;
}

function parseKm(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const km = Math.round(value);
    return km >= 0 && km <= 2_000_000 ? km : null;
  }
  if (typeof value === "string") {
    const digits = value.replace(/[^\d]/g, "");
    if (!digits) return null;
    const km = Number(digits);
    return km >= 0 && km <= 2_000_000 ? km : null;
  }
  return null;
}

function parseAskingPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const price = Number(normalized);
    if (Number.isFinite(price) && price > 0) return price;
  }
  return null;
}

function isAutoMotoCategory(category: unknown): boolean {
  const folded = foldVehicleText(typeof category === "string" ? category : "");
  if (!folded.includes("auto")) return false;
  return folded === "auto" || folded.includes("moto");
}

export function comparableFromListing(row: QeListingRow): QeComparable | null {
  if (row.is_seed === true) return null;
  if (typeof row.status === "string" && row.status !== "active") return null;
  if (!isAutoMotoCategory(row.category)) return null;
  const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : "";
  if (!id) return null;

  const makeRaw = readDetail(row.details, ["make", "marca"]) ?? row.vehicle_make;
  const modelRaw = readDetail(row.details, ["model"]) ?? row.vehicle_model;
  const yearRaw = readDetail(row.details, ["year", "an"]) ?? row.vehicle_year;
  const kmRaw = readDetail(row.details, ["km", "mileage", "kilometraj"]) ?? row.vehicle_km;
  const makeKey = normalizeMake(typeof makeRaw === "string" ? makeRaw : "");
  const modelKey = normalizeBaseModel(typeof modelRaw === "string" ? modelRaw : "");
  const year = parseYear(yearRaw);
  const km = parseKm(kmRaw);
  const price = parseAskingPrice(row.exit_price);
  if (!makeKey || !modelKey || year === null || km === null || price === null) return null;
  return { id, makeKey, modelKey, year, km, price };
}

export function comparablesFromListings(rows: readonly QeListingRow[]): QeComparable[] {
  const seen = new Set<string>();
  const out: QeComparable[] = [];
  for (const row of rows) {
    const comparable = comparableFromListing(row);
    if (!comparable || seen.has(comparable.id)) continue;
    seen.add(comparable.id);
    out.push(comparable);
  }
  return out;
}

export function isQeValuationTier3Enabled(env: Record<string, string | undefined>): boolean {
  return (env.QE_VALUATION_TIER3_ENABLED ?? "").trim() === "true";
}

export function isValuationReportEmailEnabled(env: Record<string, string | undefined>): boolean {
  return (env.VALUATION_REPORT_EMAIL_ENABLED ?? "").trim() === "true";
}

export function isQeCarValuation(value: unknown): value is QeValuationPublicBody {
  if (!value || typeof value !== "object") return false;
  return (value as { source?: unknown }).source === QE_CAR_VALUATION_SOURCE;
}

export function buildQePublicBody(input: {
  valuation: QeValuation;
  equipment: string;
  emailStatus: QeValuationEmailStatus;
  emailDelivery: QeValuationEmailDelivery;
}): QeValuationPublicBody {
  const priced =
    input.valuation.sufficient &&
    input.valuation.tier !== null &&
    input.valuation.p25 !== null &&
    input.valuation.p50 !== null &&
    input.valuation.p75 !== null;

  return {
    success: true,
    source: QE_CAR_VALUATION_SOURCE,
    sufficient: priced,
    tier: priced ? input.valuation.tier : null,
    tier_label: priced ? input.valuation.tierLabel : null,
    comparable_count: input.valuation.comparableCount,
    range: priced
      ? { p25: input.valuation.p25!, p50: input.valuation.p50!, p75: input.valuation.p75! }
      : null,
    equipment: input.equipment,
    equipment_note: QE_EQUIPMENT_NOTE,
    disclaimer: QE_VALUATION_DISCLAIMER,
    message: priced ? null : QE_INSUFFICIENT_MESSAGE,
    email_status: input.emailStatus,
    email_delivery: input.emailDelivery,
  };
}

export function buildValuationReportSubject(make: string, model: string): string {
  const label = sanitizeEvaluateText(`${make} ${model}`, 60);
  return label ? `Interval orientativ QuickExit: ${label}` : "Interval orientativ QuickExit";
}

export function buildValuationReportText(input: {
  make: string;
  model: string;
  year: number;
  km: number;
  equipment: string;
  valuation: QeValuation;
}): string {
  const vehicle = `${input.make} ${input.model} ${input.year}, ${input.km.toLocaleString("ro-RO")} km`;
  const lines = [
    "Raport orientativ QuickExit",
    vehicle,
    "",
  ];
  if (
    input.valuation.sufficient &&
    input.valuation.p25 !== null &&
    input.valuation.p50 !== null &&
    input.valuation.p75 !== null
  ) {
    const format = (value: number) => `${value.toLocaleString("ro-RO")} EUR`;
    lines.push(
      `Interval P25–P75: ${format(input.valuation.p25)} – ${format(input.valuation.p75)}`,
      `Mediană: ${format(input.valuation.p50)}`,
      `Anunțuri comparabile: ${input.valuation.comparableCount}`,
      input.valuation.tierLabel ?? "",
    );
  } else {
    lines.push(QE_INSUFFICIENT_MESSAGE, `Anunțuri găsite sub prag: ${input.valuation.comparableCount}`);
  }
  if (input.equipment) {
    lines.push("", `Dotare notată: ${input.equipment}`, QE_EQUIPMENT_NOTE);
  }
  lines.push("", QE_VALUATION_DISCLAIMER);
  return lines.filter((line) => line !== undefined).join("\n");
}
