export type ListingPackageId = "economy" | "standard" | "urgent" | "auction";

type ListingPackage = {
  id: ListingPackageId;
  title: string;
  priceRon: number;
  activeDuration: { kind: "hours" | "days"; value: number };
};

const LISTING_PACKAGES: Record<ListingPackageId, ListingPackage> = {
  economy: {
    id: "economy",
    title: "Expunere maxima",
    priceRon: 99,
    activeDuration: { kind: "days", value: 30 },
  },
  standard: {
    id: "standard",
    title: "Vanzare rapida",
    priceRon: 79,
    activeDuration: { kind: "days", value: 14 },
  },
  urgent: {
    id: "urgent",
    title: "Pachet Validare & Listare Standard",
    priceRon: 179,
    activeDuration: { kind: "days", value: 60 },
  },
  auction: {
    id: "auction",
    title: "Licitație deschisă 30 zile",
    priceRon: 111,
    activeDuration: { kind: "days", value: 30 },
  },
};

const DEMAND_POSTING_PRICE_RON = 99;

export function validateListingPackage(packageId: string): packageId is ListingPackageId {
  return packageId in LISTING_PACKAGES;
}

export function getListingPackageById(packageId: string): ListingPackage | null {
  if (!validateListingPackage(packageId)) return null;
  return LISTING_PACKAGES[packageId];
}

export function getDemandCheckoutPrice(): number {
  return DEMAND_POSTING_PRICE_RON;
}

export function toStripeAmountRon(priceRon: number): number {
  const n = Number(priceRon);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function getListingExpiryIso(packageId: ListingPackageId, now = new Date()): string {
  const expiry = new Date(now);
  const duration = LISTING_PACKAGES[packageId].activeDuration;
  if (duration.kind === "hours") {
    expiry.setHours(expiry.getHours() + duration.value);
  } else {
    expiry.setDate(expiry.getDate() + duration.value);
  }
  return expiry.toISOString();
}
