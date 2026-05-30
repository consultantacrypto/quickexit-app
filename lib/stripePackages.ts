// Sursa adevărului pentru pachetele de publicare plătite prin Stripe (rutele /api/stripe/*).
// Mapăm fiecare Stripe Price ID la prețul în RON și durata de valabilitate a anunțului.
//
// Price ID-urile NU sunt secrete (sunt vizibile oricum în Checkout), deci le putem expune
// clientului prin NEXT_PUBLIC_*. Citim întâi varianta publică, apoi cea server-side, apoi
// o constantă de test (pe care o înlocuiești cu price_... real).

export type ListingPackageId =
  | "economy"
  | "standard"
  | "urgent"
  | "auction"
  | "demand"
  | "offer";

// `none` = plată punctuală (one-time), fără dată de expirare.
type ListingDuration =
  | { kind: "hours"; value: number }
  | { kind: "days"; value: number }
  | { kind: "none" };

export type StripeListingPackage = {
  packageId: ListingPackageId;
  priceId: string;
  amountRon: number;
  label: string;
  duration: ListingDuration;
};

function resolvePriceId(
  publicValue: string | undefined,
  serverValue: string | undefined,
  fallback: string
): string {
  return (publicValue || serverValue || fallback).trim();
}

const PRICE_48_RON = resolvePriceId(
  process.env.NEXT_PUBLIC_STRIPE_PRICE_48_RON,
  process.env.STRIPE_PRICE_48_RON,
  "PRICE_48_RON"
);
const PRICE_79_RON = resolvePriceId(
  process.env.NEXT_PUBLIC_STRIPE_PRICE_79_RON,
  process.env.STRIPE_PRICE_79_RON,
  "PRICE_79_RON"
);
const PRICE_99_RON = resolvePriceId(
  process.env.NEXT_PUBLIC_STRIPE_PRICE_99_RON,
  process.env.STRIPE_PRICE_99_RON,
  "PRICE_99_RON"
);
const PRICE_111_RON = resolvePriceId(
  process.env.NEXT_PUBLIC_STRIPE_PRICE_111_RON,
  process.env.STRIPE_PRICE_111_RON,
  "PRICE_111_RON"
);

// Pachete dedicate cumpărătorilor / ofertanților.
const PRICE_CERERE_99_RON = resolvePriceId(
  process.env.NEXT_PUBLIC_STRIPE_PRICE_CERERE_99_RON,
  process.env.STRIPE_PRICE_CERERE_99_RON,
  "PRICE_CERERE_99_RON"
);
const PRICE_OFERTA_49_RON = resolvePriceId(
  process.env.NEXT_PUBLIC_STRIPE_PRICE_OFERTA_49_RON,
  process.env.STRIPE_PRICE_OFERTA_49_RON,
  "PRICE_OFERTA_49_RON"
);

const PACKAGES: readonly StripeListingPackage[] = [
  {
    packageId: "urgent",
    priceId: PRICE_48_RON,
    amountRon: 48,
    label: "Vânzare urgentă (48h)",
    duration: { kind: "hours", value: 48 },
  },
  {
    packageId: "standard",
    priceId: PRICE_79_RON,
    amountRon: 79,
    label: "Vânzare rapidă (14 zile)",
    duration: { kind: "days", value: 14 },
  },
  {
    packageId: "economy",
    priceId: PRICE_99_RON,
    amountRon: 99,
    label: "Expunere maximă (30 zile)",
    duration: { kind: "days", value: 30 },
  },
  {
    packageId: "auction",
    priceId: PRICE_111_RON,
    amountRon: 111,
    label: "Licitație deschisă (30 zile)",
    duration: { kind: "days", value: 30 },
  },
  {
    packageId: "demand",
    priceId: PRICE_CERERE_99_RON,
    amountRon: 99,
    label: "Cerere Capital (30 zile)",
    duration: { kind: "days", value: 30 },
  },
  {
    packageId: "offer",
    priceId: PRICE_OFERTA_49_RON,
    amountRon: 49,
    label: "Ofertă Guest",
    duration: { kind: "none" },
  },
];

const PACKAGE_BY_PRICE_ID = new Map<string, StripeListingPackage>(
  PACKAGES.map((pkg) => [pkg.priceId, pkg])
);

const PACKAGE_BY_PACKAGE_ID = new Map<ListingPackageId, StripeListingPackage>(
  PACKAGES.map((pkg) => [pkg.packageId, pkg])
);

export function isAllowedPriceId(priceId: string): boolean {
  return PACKAGE_BY_PRICE_ID.has(priceId);
}

export function getPackageByPriceId(priceId: string): StripeListingPackage | null {
  return PACKAGE_BY_PRICE_ID.get(priceId) ?? null;
}

export function getPriceIdForPackageId(packageId: string): string | null {
  return PACKAGE_BY_PACKAGE_ID.get(packageId as ListingPackageId)?.priceId ?? null;
}

export function getExpiryIsoForPackage(
  pkg: StripeListingPackage,
  now: Date = new Date()
): string | null {
  // Plată punctuală (one-time): nu setăm o dată de expirare.
  if (pkg.duration.kind === "none") {
    return null;
  }
  const expiry = new Date(now);
  if (pkg.duration.kind === "hours") {
    expiry.setHours(expiry.getHours() + pkg.duration.value);
  } else {
    expiry.setDate(expiry.getDate() + pkg.duration.value);
  }
  return expiry.toISOString();
}
