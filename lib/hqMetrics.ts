import {
  isPaidMedium,
  sourceLabelFromTouch,
  type AttributionTouch,
} from "@/lib/attribution";
import { isHouseAccount } from "@/lib/hqHouseAccount";

export type MetricActorRow = {
  id: string;
  actor_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  sold_at?: string | null;
  heard_from?: string | null;
  attribution_first?: unknown;
};

export type MetricPaymentRow = {
  id: string;
  user_id?: string | null;
  listing_id?: string | null;
  demand_id?: string | null;
  package_id?: string | null;
  media_package?: string | null;
  amount_minor?: number | null;
  media_amount_minor?: number | null;
  listing_amount_minor?: number | null;
  paid_at?: string | null;
  heard_from?: string | null;
  attribution_first?: unknown;
  source?: "payments" | "stripe";
};

export type PeriodBucket = {
  key: string;
  label: string;
  sellersOrganic: number;
  sellersAll: number;
  listings: number;
  inquiries: number;
  offers: number;
  paidListings: number;
  paidDemands: number;
  abandonedListings: number;
  abandonedDemands: number;
  revenueRon: number;
  sold: number;
};

export type SourceRow = {
  source: string;
  sellers: number;
  listings: number;
  inquiries: number;
  offers: number;
  payments: number;
  revenueRon: number;
};

export type ProductRow = {
  product: string;
  payments: number;
  revenueRon: number;
};

export type HqMetricsReport = {
  generatedAt: string;
  timezone: "Europe/Bucharest";
  excludeHouse: boolean;
  houseAccountCount: number;
  truncated: boolean;
  warnings: string[];
  weeks: PeriodBucket[];
  months: PeriodBucket[];
  autoSources: SourceRow[];
  reportedSources: SourceRow[];
  products: ProductRow[];
  soldUndated: number;
  definitions: {
    organicSeller: string;
    abandonedCheckout: string;
    paid: string;
    sold: string;
  };
};

const WEEK_COUNT = 8;
const MONTH_COUNT = 6;

function asTouch(value: unknown): AttributionTouch | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as AttributionTouch;
}

function bucharestDate(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function bucharestWeekStartKey(date: Date): string {
  const zoned = bucharestDate(date);
  const utc = utcDate(zoned.year, zoned.month, zoned.day);
  const day = utc.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  utc.setUTCDate(utc.getUTCDate() - diff);
  return utc.toISOString().slice(0, 10);
}

export function bucharestMonthKey(date: Date): string {
  const zoned = bucharestDate(date);
  return `${zoned.year}-${String(zoned.month).padStart(2, "0")}`;
}

function addDays(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = utcDate(year!, month!, day!);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function parseTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function emptyBucket(key: string, label: string): PeriodBucket {
  return {
    key,
    label,
    sellersOrganic: 0,
    sellersAll: 0,
    listings: 0,
    inquiries: 0,
    offers: 0,
    paidListings: 0,
    paidDemands: 0,
    abandonedListings: 0,
    abandonedDemands: 0,
    revenueRon: 0,
    sold: 0,
  };
}

function roundRon(value: number): number {
  return Number(value.toFixed(2));
}

function autoSource(row: { attribution_first?: unknown }): string {
  return sourceLabelFromTouch(asTouch(row.attribution_first));
}

function reportedSource(row: { heard_from?: string | null }): string {
  const value = String(row.heard_from || "").trim();
  return value || "unanswered";
}

function excluded(actorId: string | null | undefined, excludeHouse: boolean, houseIds: readonly string[]): boolean {
  return excludeHouse && isHouseAccount(actorId, houseIds);
}

function bumpSource(
  map: Map<string, SourceRow>,
  source: string,
  field: keyof Omit<SourceRow, "source">,
  amount = 1,
): void {
  const row = map.get(source) ?? {
    source,
    sellers: 0,
    listings: 0,
    inquiries: 0,
    offers: 0,
    payments: 0,
    revenueRon: 0,
  };
  row[field] = roundRon(row[field] + amount);
  map.set(source, row);
}

function sortSources(rows: SourceRow[]): SourceRow[] {
  return rows.sort((a, b) => b.listings + b.payments + b.sellers - (a.listings + a.payments + a.sellers));
}

export function buildHqMetrics(input: {
  now?: Date;
  excludeHouse: boolean;
  houseIds: readonly string[];
  listings: MetricActorRow[];
  inquiries: MetricActorRow[];
  offers: MetricActorRow[];
  demands: MetricActorRow[];
  payments: MetricPaymentRow[];
  truncated?: boolean;
  warnings?: string[];
}): HqMetricsReport {
  const now = input.now ?? new Date();
  const zonedNow = bucharestDate(now);
  const weekKeys: string[] = [];
  const currentWeek = bucharestWeekStartKey(now);
  for (let i = WEEK_COUNT - 1; i >= 0; i -= 1) {
    weekKeys.push(addDays(currentWeek, -7 * i));
  }
  const monthKeys: string[] = [];
  for (let i = MONTH_COUNT - 1; i >= 0; i -= 1) {
    const shifted = shiftMonth(zonedNow.year, zonedNow.month, -i);
    monthKeys.push(`${shifted.year}-${String(shifted.month).padStart(2, "0")}`);
  }
  const weeks = new Map(weekKeys.map((key) => [key, emptyBucket(key, `săpt. ${key}`)]));
  const months = new Map(
    monthKeys.map((key) => [key, emptyBucket(key, key)]),
  );
  const oldestMonth = `${monthKeys[0]!}-01`;
  const inWeeks = (date: Date) => {
    const key = bucharestWeekStartKey(date);
    return weeks.has(key) ? key : null;
  };
  const inMonths = (date: Date) => {
    const key = bucharestMonthKey(date);
    return months.has(key) ? key : null;
  };
  const inSourceWindow = (date: Date) => dateKeyFromDate(date) >= oldestMonth;

  const auto = new Map<string, SourceRow>();
  const reported = new Map<string, SourceRow>();

  const firstListingByUser = new Map<string, MetricActorRow>();
  const listingsAsc = [...input.listings].sort((a, b) =>
    String(a.created_at || "").localeCompare(String(b.created_at || "")),
  );
  for (const listing of listingsAsc) {
    const actor = String(listing.actor_id || "");
    if (!actor || firstListingByUser.has(actor)) continue;
    firstListingByUser.set(actor, listing);
  }

  for (const listing of firstListingByUser.values()) {
    if (excluded(listing.actor_id, input.excludeHouse, input.houseIds)) continue;
    const created = parseTime(listing.created_at);
    if (!created) continue;
    const touch = asTouch(listing.attribution_first);
    const organic = !isPaidMedium(touch?.utm_medium);
    const week = inWeeks(created);
    const month = inMonths(created);
    if (week) {
      const bucket = weeks.get(week)!;
      bucket.sellersAll += 1;
      if (organic) bucket.sellersOrganic += 1;
    }
    if (month) {
      const bucket = months.get(month)!;
      bucket.sellersAll += 1;
      if (organic) bucket.sellersOrganic += 1;
    }
    if (inSourceWindow(created)) {
      bumpSource(auto, autoSource(listing), "sellers");
      bumpSource(reported, reportedSource(listing), "sellers");
    }
  }

  for (const listing of input.listings) {
    if (excluded(listing.actor_id, input.excludeHouse, input.houseIds)) continue;
    const created = parseTime(listing.created_at);
    if (created) {
      const week = inWeeks(created);
      const month = inMonths(created);
      if (week) weeks.get(week)!.listings += 1;
      if (month) months.get(month)!.listings += 1;
      if (String(listing.status || "") === "pending_payment") {
        if (week) weeks.get(week)!.abandonedListings += 1;
        if (month) months.get(month)!.abandonedListings += 1;
      }
      if (inSourceWindow(created)) {
        bumpSource(auto, autoSource(listing), "listings");
        bumpSource(reported, reportedSource(listing), "listings");
      }
    }
    const soldAt = parseTime(listing.sold_at);
    if (soldAt && String(listing.status || "") === "sold") {
      const week = inWeeks(soldAt);
      const month = inMonths(soldAt);
      if (week) weeks.get(week)!.sold += 1;
      if (month) months.get(month)!.sold += 1;
    }
  }

  const countActivity = (
    rows: MetricActorRow[],
    field: "inquiries" | "offers",
    bucketField: "inquiries" | "offers",
  ) => {
    for (const row of rows) {
      if (excluded(row.actor_id, input.excludeHouse, input.houseIds)) continue;
      const created = parseTime(row.created_at);
      if (!created) continue;
      const week = inWeeks(created);
      const month = inMonths(created);
      if (week) weeks.get(week)![bucketField] += 1;
      if (month) months.get(month)![bucketField] += 1;
      if (inSourceWindow(created)) {
        bumpSource(auto, autoSource(row), field);
        bumpSource(reported, reportedSource(row), field);
      }
    }
  };
  countActivity(input.inquiries, "inquiries", "inquiries");
  countActivity(input.offers, "offers", "offers");

  for (const demand of input.demands) {
    if (excluded(demand.actor_id, input.excludeHouse, input.houseIds)) continue;
    if (String(demand.status || "") !== "pending_payment") continue;
    const created = parseTime(demand.created_at);
    if (!created) continue;
    const week = inWeeks(created);
    const month = inMonths(created);
    if (week) weeks.get(week)!.abandonedDemands += 1;
    if (month) months.get(month)!.abandonedDemands += 1;
  }

  const products = new Map<string, ProductRow>();
  const addProduct = (product: string, ron: number) => {
    if (!product || !Number.isFinite(ron) || ron === 0) return;
    const row = products.get(product) ?? { product, payments: 0, revenueRon: 0 };
    row.payments += 1;
    row.revenueRon = roundRon(row.revenueRon + ron);
    products.set(product, row);
  };

  const seenPaidListings = new Set<string>();
  const seenPaidDemands = new Set<string>();
  for (const payment of input.payments) {
    if (excluded(payment.user_id, input.excludeHouse, input.houseIds)) continue;
    const paidAt = parseTime(payment.paid_at);
    if (!paidAt) continue;
    const amountMinor = Number(payment.amount_minor ?? 0);
    const revenue = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    const week = inWeeks(paidAt);
    const month = inMonths(paidAt);
    if (week) weeks.get(week)!.revenueRon = roundRon(weeks.get(week)!.revenueRon + revenue);
    if (month) months.get(month)!.revenueRon = roundRon(months.get(month)!.revenueRon + revenue);

    if (payment.listing_id) {
      const key = `${bucharestMonthKey(paidAt)}:${payment.listing_id}`;
      if (!seenPaidListings.has(key)) {
        seenPaidListings.add(key);
        if (week) weeks.get(week)!.paidListings += 1;
        if (month) months.get(month)!.paidListings += 1;
      }
    }
    if (payment.demand_id) {
      const key = `${bucharestMonthKey(paidAt)}:${payment.demand_id}`;
      if (!seenPaidDemands.has(key)) {
        seenPaidDemands.add(key);
        if (week) weeks.get(week)!.paidDemands += 1;
        if (month) months.get(month)!.paidDemands += 1;
      }
    }

    if (inSourceWindow(paidAt)) {
      bumpSource(auto, autoSource(payment), "payments");
      bumpSource(auto, autoSource(payment), "revenueRon", revenue);
      bumpSource(reported, reportedSource(payment), "payments");
      bumpSource(reported, reportedSource(payment), "revenueRon", revenue);
    }

    const mediaMinor = Number(payment.media_amount_minor ?? 0);
    const listingMinor = Number(payment.listing_amount_minor ?? 0);
    if (payment.media_package && Number.isFinite(mediaMinor) && mediaMinor > 0) {
      addProduct(`media:${payment.media_package}`, mediaMinor / 100);
      const listingProduct = payment.package_id || "listing";
      const listingRon =
        Number.isFinite(listingMinor) && listingMinor > 0
          ? listingMinor / 100
          : Math.max(0, revenue - mediaMinor / 100);
      addProduct(listingProduct, listingRon);
    } else {
      addProduct(payment.package_id || "unknown", revenue);
    }
  }

  let soldUndated = 0;
  for (const listing of input.listings) {
    if (excluded(listing.actor_id, input.excludeHouse, input.houseIds)) continue;
    if (String(listing.status || "") === "sold" && !parseTime(listing.sold_at)) soldUndated += 1;
  }

  return {
    generatedAt: now.toISOString(),
    timezone: "Europe/Bucharest",
    excludeHouse: input.excludeHouse,
    houseAccountCount: input.houseIds.length,
    truncated: Boolean(input.truncated),
    warnings: input.warnings ?? [],
    weeks: weekKeys.map((key) => weeks.get(key)!),
    months: monthKeys.map((key) => months.get(key)!),
    autoSources: sortSources([...auto.values()]),
    reportedSources: sortSources([...reported.values()]),
    products: [...products.values()].sort((a, b) => b.revenueRon - a.revenueRon),
    soldUndated,
    definitions: {
      organicSeller:
        "Vânzător nou organic = primul anunț al utilizatorului cade în perioadă și medium-ul first-touch nu este plătit (cpc, ppc, paid, display). Fără atribuire se numără ca organic.",
      abandonedCheckout:
        "Checkout abandonat = anunț sau cerere creată în perioadă care este încă pending_payment.",
      paid: "Plăți = rânduri din payments (și, dacă lipsesc, sesiuni Stripe complete recente) cu paid_at în perioadă.",
      sold: "Vândute = anunțuri cu status sold și sold_at în perioadă. Cele sold fără sold_at sunt raportate separat.",
    },
  };
}

function dateKeyFromDate(date: Date): string {
  const zoned = bucharestDate(date);
  return dateKey(zoned.year, zoned.month, zoned.day);
}
