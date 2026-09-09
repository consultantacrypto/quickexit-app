import { canonicalCountryName, findCountry } from "@/lib/countries";
import { foldLocationSearch } from "@/lib/locationFold";
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
  country_name: string;
  county: string;
  city: string;
  district: string | null;
};

export type ListingLocationValidation =
  | { ok: true; location: ListingLocation }
  | {
      ok: false;
      error: string;
      code:
        | "missing_county"
        | "missing_city"
        | "invalid_county"
        | "invalid_country"
        | "invalid_city"
        | "invalid_district";
    };

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

export function buildLocationSearchValue(location: ListingLocation): string {
  return foldLocationSearch(
    [location.country_code, location.country_name, location.county, location.city, location.district ?? ""]
      .filter(Boolean)
      .join(" "),
  );
}

export function formatListingLocation(location: ListingLocation): string {
  const country = location.country_code.trim().toUpperCase() || ROMANIA_COUNTRIES_DEFAULT;
  const county = location.county.trim();
  const city = location.city.trim();
  const district = location.district?.trim() || "";
  const countryName = location.country_name.trim() || canonicalCountryName(country);

  if (country !== "RO") {
    const parts = [city, county && foldRo(county) !== foldRo(city) ? county : "", countryName].filter(Boolean);
    return parts.join(", ");
  }

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

  return county || city;
}

/**
 * Canonical location source is `listings.details` JSON.
 * Production needs no location table migration: country, county/region, city,
 * district and location_search are stored on the listing details object.
 *
 * Location means the place where the exact asset can be viewed or collected.
 * Availability ("on order", import) is a separate attribute.
 */
export function parseListingLocationFromDetails(details: unknown): ListingLocation | null {
  if (!isRecord(details)) return null;
  const nested = isRecord(details.location_structured)
    ? details.location_structured
    : details;
  const countryRaw =
    asText(nested.country_code || details.country_code).toUpperCase() ||
    ROMANIA_COUNTRIES_DEFAULT;
  const country = findCountry(countryRaw);
  const country_code = country?.code || countryRaw;
  const country_name =
    asText(nested.country_name || details.country_name) ||
    (country ? country.nameRo : canonicalCountryName(country_code));
  const county = asText(
    nested.county || details.county || nested.region || details.region,
  );
  const city = asText(nested.city || details.city || nested.locality || details.locality);
  const districtRaw = asText(
    nested.district || details.district || nested.neighborhood || details.neighborhood,
  );
  if (!city) return null;
  if (country_code === "RO" && !county) return null;
  return {
    country_code,
    country_name,
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
  if (!city) return null;
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

function readLocationField(
  input: Partial<ListingLocation> | Record<string, unknown> | null | undefined,
  key: string,
): unknown {
  if (!input || typeof input !== "object") return "";
  return (input as Record<string, unknown>)[key];
}

export function validateListingLocationInput(
  input: Partial<ListingLocation> | Record<string, unknown> | null | undefined,
): ListingLocationValidation {
  const countryRaw = asText(readLocationField(input, "country_code")).toUpperCase();
  const matchedCountry = findCountry(countryRaw || ROMANIA_COUNTRIES_DEFAULT);
  const country_code = matchedCountry?.code || countryRaw || ROMANIA_COUNTRIES_DEFAULT;
  if (!/^[A-Z]{2}$/.test(country_code)) {
    return { ok: false, error: "Codul țării este invalid.", code: "invalid_country" };
  }

  const country_name =
    asText(readLocationField(input, "country_name")) ||
    matchedCountry?.nameRo ||
    canonicalCountryName(country_code);

  const countyRaw = asText(
    readLocationField(input, "county") || readLocationField(input, "region"),
  );
  const cityRaw = asText(readLocationField(input, "city"));
  const districtRaw = asText(readLocationField(input, "district"));

  if (!cityRaw) {
    return { ok: false, error: "Completează localitatea.", code: "missing_city" };
  }
  if (country_code === "RO" && !countyRaw) {
    return { ok: false, error: "Selectează județul.", code: "missing_county" };
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
  if (countyRaw && !LOCALITY_RE.test(countyRaw) && country_code !== "RO") {
    return { ok: false, error: "Regiunea conține caractere invalide.", code: "invalid_county" };
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
        location: {
          country_code: "RO",
          country_name: canonicalCountryName("RO"),
          county: "București",
          city: cityOut,
          district,
        },
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
        country_name: canonicalCountryName("RO"),
        county,
        city,
        district: district || null,
      },
    };
  }

  if (districtRaw && looksLikeStreetAddress(districtRaw)) {
    return {
      ok: false,
      error: "Zona opțională nu trebuie să conțină stradă.",
      code: "invalid_district",
    };
  }

  return {
    ok: true,
    location: {
      country_code,
      country_name,
      county: countyRaw,
      city: cityRaw,
      district: districtRaw || null,
    },
  };
}

export function applyListingLocationToDetails(
  details: Record<string, unknown>,
  location: Omit<ListingLocation, "country_name"> & { country_name?: string },
): Record<string, unknown> {
  const normalized: ListingLocation = {
    ...location,
    country_name: location.country_name?.trim() || canonicalCountryName(location.country_code),
  };
  const label = formatListingLocation(normalized);
  const location_search = buildLocationSearchValue(normalized);
  const region = normalized.country_code === "RO" ? null : normalized.county || null;
  return {
    ...details,
    country_code: normalized.country_code,
    country_name: normalized.country_name,
    county: normalized.county,
    region,
    city: normalized.city,
    district: normalized.district,
    location: label,
    location_search,
    location_structured: {
      country_code: normalized.country_code,
      country_name: normalized.country_name,
      county: normalized.county,
      region,
      city: normalized.city,
      district: normalized.district,
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
      return {
        country_code: "RO",
        country_name: canonicalCountryName("RO"),
        county: "București",
        city: "București",
        district: null,
      };
    }
    return null;
  }

  if (!firstCounty) return null;

  if (firstCounty === "București") {
    const sector = canonicalBucharestDistrict(parts[1]);
    if (!sector) return null;
    return {
      country_code: "RO",
      country_name: canonicalCountryName("RO"),
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
    country_name: canonicalCountryName("RO"),
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

function compactLegacyLocationText(details: unknown): string {
  if (!isRecord(details)) return "";
  return asText(details.location || details.locatie || details.zona);
}

function storedLocationSearchText(details: unknown): string {
  if (!isRecord(details)) return "";
  return foldLocationSearch(asText(details.location_search));
}

function countryMatches(location: ListingLocation, countryRaw: string): boolean {
  const needle = foldLocationSearch(countryRaw);
  if (!needle) return true;
  const code = foldLocationSearch(location.country_code);
  const name = foldLocationSearch(location.country_name);
  const matched = findCountry(countryRaw);
  if (matched) return location.country_code === matched.code;
  return code === needle || name === needle;
}

export function listingMatchesLocationFilter(
  details: unknown,
  filter: { country?: string; county?: string; city?: string; district?: string },
): boolean {
  const country = asText(filter.country);
  const county = asText(filter.county);
  const city = asText(filter.city);
  const district = asText(filter.district);
  if (!country && !county && !city && !district) return true;

  const loc = parseListingLocationFromDetails(details);
  if (loc) {
    if (country && !countryMatches(loc, country)) return false;
    if (county && loc.county && foldRo(loc.county) !== foldRo(county)) return false;
    if (county && !loc.county && loc.country_code === "RO") return false;
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

  const searchHay = storedLocationSearchText(details);
  const legacyFold = foldLocationSearch(compactLegacyLocationText(details));
  const haystack = `${searchHay} ${legacyFold}`.trim();
  if (!haystack) return false;

  if (country) {
    const matched = findCountry(country);
    const countryFold = matched
      ? foldLocationSearch(`${matched.code} ${matched.nameRo} ${matched.nameEn}`)
      : foldLocationSearch(country);
    const isRomania =
      (matched?.code ?? foldLocationSearch(country)) === "ro" ||
      countryFold.includes("romania") ||
      countryFold.includes("ro ");
    if (!isRomania && !haystack.includes(foldLocationSearch(country)) && !haystack.includes(countryFold.split(" ")[0] ?? "")) {
      return false;
    }
  }

  if (city) {
    if (!haystack.includes(foldRo(city))) return false;
  } else if (county) {
    if (!haystack.includes(foldRo(county))) return false;
  }
  if (district && !haystack.includes(foldRo(district))) return false;
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
      "location_search",
      "country_name",
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
  country_name?: string;
  county?: string;
  region?: string;
  city?: string;
  district?: string;
}): ListingLocationValidation {
  return validateListingLocationInput({
    country_code: form.country_code,
    country_name: form.country_name,
    county: form.county || form.region,
    city: form.city,
    district: form.district ?? null,
  });
}

export { BUCHAREST_DISTRICTS };
export type { RomaniaCounty };
