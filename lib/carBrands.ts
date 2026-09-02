/** Canonical vehicle makes for publish + editor autocomplete. No DB table. */

export const CAR_BRANDS = [
  "Abarth",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "BYD",
  "Cadillac",
  "Chevrolet",
  "Citroën",
  "Cupra",
  "Dacia",
  "Dodge",
  "DS Automobiles",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hongqi",
  "Hyundai",
  "Infiniti",
  "Isuzu",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lamborghini",
  "Lancia",
  "Land Rover",
  "Lexus",
  "Li Auto",
  "Lotus",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "MG",
  "MINI",
  "Mitsubishi",
  "NIO",
  "Nissan",
  "Opel",
  "Peugeot",
  "Polestar",
  "Porsche",
  "Renault",
  "Rolls-Royce",
  "Saab",
  "SEAT",
  "Škoda",
  "Smart",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
  "Xiaomi",
  "XPeng",
  "Zeekr",
] as const;

export type CarBrand = (typeof CAR_BRANDS)[number];

export function foldBrandText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const OTHER_BRAND_LABELS = new Set(
  ["altă marcă", "alta marca", "other brand", "other", "alta"].map((s) =>
    foldBrandText(s),
  ),
);

export function isKnownCarBrand(value: string): boolean {
  const folded = foldBrandText(value);
  if (!folded) return false;
  return CAR_BRANDS.some((brand) => foldBrandText(brand) === folded);
}

export function filterCarBrands(query: string): string[] {
  const foldedQuery = foldBrandText(query);
  if (!foldedQuery) return [...CAR_BRANDS];
  return CAR_BRANDS.filter((brand) => foldBrandText(brand).includes(foldedQuery));
}

/** Keep typed/legacy values visible without turning them into a saved “other brand” token. */
export function carBrandSuggestions(query: string, currentValue: string): string[] {
  const filtered = filterCarBrands(query);
  const trimmed = currentValue.trim();
  if (!trimmed || isForbiddenOtherBrandToken(trimmed)) return filtered;
  if (isKnownCarBrand(trimmed)) return filtered;

  const foldedValue = foldBrandText(trimmed);
  const foldedQuery = foldBrandText(query);
  const matchesQuery =
    !foldedQuery ||
    foldedValue.includes(foldedQuery) ||
    foldedQuery.includes(foldedValue);
  if (!matchesQuery) return filtered;

  return [trimmed, ...filtered.filter((brand) => foldBrandText(brand) !== foldedValue)];
}

export function isForbiddenOtherBrandToken(value: string): boolean {
  return OTHER_BRAND_LABELS.has(foldBrandText(value));
}

export function sanitizeCarBrandInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || isForbiddenOtherBrandToken(trimmed)) return "";
  const known = CAR_BRANDS.find((brand) => foldBrandText(brand) === foldBrandText(trimmed));
  return known ?? trimmed;
}
