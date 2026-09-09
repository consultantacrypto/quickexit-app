import {
  BUCHAREST_DISTRICTS,
  canonicalBucharestDistrict,
  canonicalRomaniaCity,
  canonicalRomaniaCounty,
  foldRo,
  ROMANIA_COUNTRIES_DEFAULT,
  type RomaniaCounty,
} from "@/lib/romaniaLocations";

export type ListingLocation = {
  country_code: string;
  county: string;
  city: string;
  district: string | null;
};

export type ListingLocationValidation =
  | { ok: true; location: ListingLocation }
  | { ok: false; error: string; code: "missing_county" | "missing_city" | "invalid_county" | "invalid_country" | "invalid_city" | "invalid_district" };

const MAX_LOCALITY = 80;
const LOCALITY_RE = /^[\p{L}0-9][\p{L}0-9 .'\-\/]*[\p{L}0-9.]$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function looksLikeStreetAddress(value: string): boolean {
  return /\b(str\.?|strada|bd\.?|bulevard(?:ul)?|șos\.?|sos\.?|soseaua|șoseaua|aleea|alea|nr\.?)\b/i.test(
    value,
  );
}

export function formatListingLocation(location: ListingLocation): string {
  const county = location.county.trim();
  const city = location.city.trim();
  const district = location.district?.trim() || "";

  if (foldRo(county) === "bucuresti" || foldRo(city) === "bucuresti") {
    return district ? `București, ${district}` : "București";
  }

  if (district && foldRo(district) !== foldRo(city)) {
    if (foldRo(city) === foldRo(county)) return `${county}, ${district}`;
    return `${city}, ${district}`;
  }

  if (city && foldRo(city) !== foldRo(county)) {
    return `${county}, ${city}`;
  }

  return county;
}

/**
 * Canonical location source is `listings.details` JSON.
 * Production needs no location table migration: county, city, district and
 * country_code are stored on the listing details object.
 *
 * Read precedence:
 * 1. details.location_structured (county + city)
 * 2. details.county + details.city (+ district, country_code, locality aliases)
 * 3. catalog-parseable compact details.location / locatie / zona
 * 4. leftover row-level fields only if details cannot resolve
 *
 * Writes always go through applyListingLocationToDetails (details only).
 * Missing legacy location is not fabricated.
 * Future performance indexes can be designed separately after query-volume analysis.
 */
export function parseListingLocationFromDetails(details: unknown): ListingLocation | null {
  if (!isRecord(details)) return null;
  const nested = isRecord(details.location_structured)
    ? details.location_structured
    : details;
  const country_code =
    asText(nested.country_code || details.country_code).toUpperCase() ||
    ROMANIA_COUNTRIES_DEFAULT;
  const county = asText(nested.county || details.county);
  const city = asText(nested.city || details.city || nested.locality || details.locality);
  const districtRaw = asText(
    nested.district || details.district || nested.neighborhood || details.neighborhood,
  );
  if (!county || !city) return null;
  return {
    country_code,
    county,
    city,
    district: districtRaw || null,
  };
}

export type ListingLocationRowSource = {
  details?: unknown;
  country_code?: unknown;
  county?: unknown;
  city?: unknown;
  district?: unknown;
};

export function resolveListingLocation(source: ListingLocationRowSource): ListingLocation | null {
  const fromStructured = parseListingLocationFromDetails(source.details);
  if (fromStructured) {
    const validated = validateListingLocationInput(fromStructured);
    if (validated.ok) return validated.location;
  }

  const fromLegacy = tryParseLegacyListingLocation(source.details);
  if (fromLegacy) {
    const validated = validateListingLocationInput(fromLegacy);
    if (validated.ok) return validated.location;
  }

  const county = asText(source.county);
  const city = asText(source.city);
  if (!county || !city) return null;
  const validated = validateListingLocationInput({
    country_code: asText(source.country_code) || ROMANIA_COUNTRIES_DEFAULT,
    county,
    city,
    district: asText(source.district) || null,
  });
  return validated.ok ? validated.location : null;
}

export function publicationLocationFromDetails(details: unknown): ListingLocationValidation {
  const resolved = resolveListingLocation({ details });
  if (resolved) return { ok: true, location: resolved };
  return validateListingLocationInput({});
}

export function hasStructuredListingLocation(details: unknown): boolean {
  return validateListingLocationInput(parseListingLocationFromDetails(details) ?? {}).ok;
}

export function listingLocationLabelFromUnknown(
  details: unknown,
  topLevelLocation?: unknown,
  rowColumns?: Omit<ListingLocationRowSource, "details">,
): string | null {
  const resolved = resolveListingLocation({ details, ...rowColumns });
  if (resolved) return formatListingLocation(resolved);
  const compact = asText(topLevelLocation);
  if (compact) {
    const parsed = tryParseLegacyLocationText(compact);
    if (parsed) return formatListingLocation(parsed);
  }
  if (isRecord(details)) {
    const legacy = asText(details.location || details.locatie || details.zona);
    if (!legacy) return null;
    const parsed = tryParseLegacyLocationText(legacy);
    if (parsed) return formatListingLocation(parsed);
    const twoPart = legacy
      .split(",")
      .slice(0, 2)
      .map((p) => p.trim())
      .filter(Boolean);
    if (twoPart.length === 2 && canonicalRomaniaCounty(twoPart[0]) && !looksLikeStreetAddress(twoPart[1])) {
      return `${canonicalRomaniaCounty(twoPart[0])}, ${twoPart[1]}`;
    }
  }
  return null;
}

export function validateListingLocationInput(
  input: Partial<ListingLocation> | Record<string, unknown> | null | undefined,
): ListingLocationValidation {
  const countryRaw = asText(
    input && "country_code" in (input as object) ? (input as ListingLocation).country_code : "",
  ).toUpperCase();
  const country_code = countryRaw || ROMANIA_COUNTRIES_DEFAULT;
  if (!/^[A-Z]{2}$/.test(country_code)) {
    return { ok: false, error: "Codul țării este invalid.", code: "invalid_country" };
  }

  const countyRaw = asText(input && "county" in (input as object) ? (input as ListingLocation).county : "");
  const cityRaw = asText(input && "city" in (input as object) ? (input as ListingLocation).city : "");
  const districtRaw = asText(
    input && "district" in (input as object) ? ((input as ListingLocation).district ?? "") : "",
  );

  if (!countyRaw) {
    return { ok: false, error: "Selectează județul.", code: "missing_county" };
  }
  if (!cityRaw) {
    return { ok: false, error: "Completează localitatea.", code: "missing_city" };
  }
  if (countyRaw.length > MAX_LOCALITY || cityRaw.length > MAX_LOCALITY) {
    return { ok: false, error: "Localitatea este prea lungă.", code: "invalid_city" };
  }
  if (looksLikeStreetAddress(cityRaw) || looksLikeStreetAddress(countyRaw)) {
    return {
      ok: false,
      error: "Folosește județul și localitatea, fără stradă.",
      code: "invalid_city",
    };
  }
  if (!LOCALITY_RE.test(cityRaw)) {
    return { ok: false, error: "Localitatea conține caractere invalide.", code: "invalid_city" };
  }

  if (country_code === "RO") {
    const county = canonicalRomaniaCounty(countyRaw);
    if (!county) {
      return { ok: false, error: "Selectează un județ valid din România.", code: "invalid_county" };
    }
    const knownCity = canonicalRomaniaCity(county, cityRaw);
    const city = knownCity ?? cityRaw;
    let district: string | null = districtRaw || null;
    if (county === "București") {
      const cityOut = "București";
      if (district) {
        const sector = canonicalBucharestDistrict(district);
        if (!sector) {
          return { ok: false, error: "Selectează un sector valid.", code: "invalid_district" };
        }
        district = sector;
      }
      return {
        ok: true,
        location: { country_code: "RO", county: "București", city: cityOut, district },
      };
    }
    if (district && looksLikeStreetAddress(district)) {
      return {
        ok: false,
        error: "Zona opțională nu trebuie să conțină stradă.",
        code: "invalid_district",
      };
    }
    if (district && district.length > MAX_LOCALITY) {
      return { ok: false, error: "Zona este prea lungă.", code: "invalid_district" };
    }
    return {
      ok: true,
      location: {
        country_code: "RO",
        county,
        city,
        district: district || null,
      },
    };
  }

  return {
    ok: true,
    location: {
      country_code,
      county: countyRaw,
      city: cityRaw,
      district: districtRaw || null,
    },
  };
}

export function applyListingLocationToDetails(
  details: Record<string, unknown>,
  location: ListingLocation,
): Record<string, unknown> {
  const label = formatListingLocation(location);
  return {
    ...details,
    country_code: location.country_code,
    county: location.county,
    city: location.city,
    district: location.district,
    location: label,
    location_structured: {
      country_code: location.country_code,
      county: location.county,
      city: location.city,
      district: location.district,
    },
  };
}

/**
 * Deterministic legacy parse only. Returns null unless county (and city/sector)
 * match the catalog — never guesses from street text or incomplete fragments.
 */
export function tryParseLegacyLocationText(raw: string): ListingLocation | null {
  const text = asText(raw);
  if (!text) return null;
  const parts = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const firstCounty = canonicalRomaniaCounty(parts[0]);
  if (parts.length === 1) {
    if (firstCounty === "București") {
      return { country_code: "RO", county: "București", city: "București", district: null };
    }
    return null;
  }

  if (!firstCounty) return null;

  if (firstCounty === "București") {
    const sector = canonicalBucharestDistrict(parts[1]);
    if (!sector) return null;
    return {
      country_code: "RO",
      county: "București",
      city: "București",
      district: sector,
    };
  }

  const city = canonicalRomaniaCity(firstCounty, parts[1]);
  if (!city) return null;
  let district: string | null = null;
  if (parts.length >= 3) {
    const maybeDistrict = parts[2];
    if (looksLikeStreetAddress(maybeDistrict)) district = null;
    else if (maybeDistrict.length <= MAX_LOCALITY && LOCALITY_RE.test(maybeDistrict)) {
      district = maybeDistrict;
    }
  }
  return {
    country_code: "RO",
    county: firstCounty,
    city,
    district,
  };
}

export function tryParseLegacyListingLocation(details: unknown): ListingLocation | null {
  const existing = parseListingLocationFromDetails(details);
  if (existing) {
    const validated = validateListingLocationInput(existing);
    if (validated.ok) return validated.location;
  }
  if (!isRecord(details)) return null;
  const compact = asText(details.location || details.locatie || details.zona);
  return compact ? tryParseLegacyLocationText(compact) : null;
}

export function listingMatchesLocationFilter(
  details: unknown,
  filter: { county?: string; city?: string; district?: string },
): boolean {
  const county = asText(filter.county);
  const city = asText(filter.city);
  const district = asText(filter.district);
  if (!county && !city && !district) return true;

  const loc =
    parseListingLocationFromDetails(details) ?? tryParseLegacyListingLocation(details);
  if (!loc) return false;

  if (county && foldRo(loc.county) !== foldRo(county)) return false;
  if (city) {
    const cityFold = foldRo(city);
    const matchesCity = foldRo(loc.city) === cityFold;
    const matchesDistrict = loc.district ? foldRo(loc.district) === cityFold : false;
    if (!matchesCity && !matchesDistrict) return false;
  }
  if (district) {
    if (!loc.district || foldRo(loc.district) !== foldRo(district)) return false;
  }
  return true;
}

export function listingMatchesKeyword(
  listing: {
    title?: unknown;
    description?: unknown;
    category?: unknown;
    details?: unknown;
  },
  keyword: string,
): boolean {
  const q = foldRo(keyword);
  if (!q) return true;
  const haystacks: string[] = [
    asText(listing.title),
    asText(listing.description),
    asText(listing.category),
  ];
  if (isRecord(listing.details)) {
    const keys = [
      "make",
      "model",
      "brand",
      "refModel",
      "specs",
      "propType",
      "businessDomain",
      "location",
      "county",
      "city",
      "district",
      "fuel",
      "bodyType",
      "mechanism",
      "material",
    ];
    for (const key of keys) haystacks.push(asText(listing.details[key]));
  }
  return haystacks.some((value) => foldRo(value).includes(q));
}

export function locationFromFormData(form: {
  country_code?: string;
  county?: string;
  city?: string;
  district?: string;
}): ListingLocationValidation {
  return validateListingLocationInput({
    country_code: form.country_code,
    county: form.county,
    city: form.city,
    district: form.district ?? null,
  });
}

export { BUCHAREST_DISTRICTS };
export type { RomaniaCounty };
