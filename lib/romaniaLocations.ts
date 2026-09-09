import { COUNTRY_OPTIONS, findCountry } from "@/lib/countries";
import { foldLocationSearch } from "@/lib/locationFold";

/** Official Romanian counties (județe) plus București. */
export const ROMANIA_COUNTRIES_DEFAULT = "RO" as const;

export { foldLocationSearch as foldRo } from "@/lib/locationFold";

export const BUCHAREST_DISTRICTS = [
  "Sector 1",
  "Sector 2",
  "Sector 3",
  "Sector 4",
  "Sector 5",
  "Sector 6",
] as const;

export const ROMANIA_COUNTIES = [
  "Alba",
  "Arad",
  "Argeș",
  "Bacău",
  "Bihor",
  "Bistrița-Năsăud",
  "Botoșani",
  "Brașov",
  "Brăila",
  "București",
  "Buzău",
  "Caraș-Severin",
  "Călărași",
  "Cluj",
  "Constanța",
  "Covasna",
  "Dâmbovița",
  "Dolj",
  "Galați",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomița",
  "Iași",
  "Ilfov",
  "Maramureș",
  "Mehedinți",
  "Mureș",
  "Neamț",
  "Olt",
  "Prahova",
  "Satu Mare",
  "Sălaj",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timiș",
  "Tulcea",
  "Vaslui",
  "Vâlcea",
  "Vrancea",
] as const;

export type RomaniaCounty = (typeof ROMANIA_COUNTIES)[number];

/** Known localities used for UX datalists and deterministic legacy matching. */
export const ROMANIA_CITIES_BY_COUNTY: Record<RomaniaCounty, readonly string[]> = {
  Alba: ["Alba Iulia", "Aiud", "Blaj", "Sebeș", "Cugir", "Ocna Mureș"],
  Arad: ["Arad", "Lipova", "Ineu", "Pecica", "Sântana"],
  Argeș: ["Pitești", "Câmpulung", "Curtea de Argeș", "Mioveni", "Ștefănești"],
  Bacău: ["Bacău", "Onești", "Moinești", "Comănești", "Buhuși"],
  Bihor: ["Oradea", "Salonta", "Beiuș", "Marghita", "Aleșd"],
  "Bistrița-Năsăud": ["Bistrița", "Năsăud", "Beclean", "Sângeorz-Băi"],
  Botoșani: ["Botoșani", "Dorohoi", "Săveni", "Darabani"],
  Brașov: ["Brașov", "Făgăraș", "Săcele", "Codlea", "Râșnov", "Zărnești", "Predeal"],
  Brăila: ["Brăila", "Ianca", "Însurăței", "Făurei"],
  București: ["București"],
  Buzău: ["Buzău", "Râmnicu Sărat", "Nehoiu", "Pogoanele"],
  "Caraș-Severin": ["Reșița", "Caransebeș", "Bocșa", "Oravița", "Anina", "Băile Herculane"],
  Călărași: ["Călărași", "Oltenița", "Budești", "Fundulea"],
  Cluj: ["Cluj-Napoca", "Turda", "Dej", "Câmpia Turzii", "Gherla", "Huedin"],
  Constanța: [
    "Constanța",
    "Mangalia",
    "Medgidia",
    "Năvodari",
    "Cernavodă",
    "Eforie",
    "Techirghiol",
    "Mamaia",
    "Mamaia Nord",
  ],
  Covasna: ["Sfântu Gheorghe", "Târgu Secuiesc", "Covasna", "Baraolt"],
  Dâmbovița: ["Târgoviște", "Moreni", "Pucioasa", "Găești", "Titu"],
  Dolj: ["Craiova", "Băilești", "Calafat", "Filiași", "Segarcea"],
  Galați: ["Galați", "Tecuci", "Târgu Bujor", "Berești"],
  Giurgiu: ["Giurgiu", "Bolintin-Vale", "Mihăilești", "Săbăreni"],
  Gorj: ["Târgu Jiu", "Motru", "Rovinari", "Bumbești-Jiu", "Târgu Cărbunești"],
  Harghita: ["Miercurea Ciuc", "Odorheiu Secuiesc", "Gheorgheni", "Toplița", "Cristuru Secuiesc"],
  Hunedoara: ["Deva", "Hunedoara", "Petroșani", "Lupeni", "Vulcan", "Orăștie", "Brad", "Hațeg"],
  Ialomița: ["Slobozia", "Fetești", "Urziceni", "Țăndărei", "Amara"],
  Iași: ["Iași", "Pașcani", "Târgu Frumos", "Hârlău"],
  Ilfov: [
    "Buftea",
    "Otopeni",
    "Voluntari",
    "Pantelimon",
    "Popești-Leordeni",
    "Bragadiru",
    "Chitila",
    "Măgurele",
    "Corbeanca",
    "Snagov",
  ],
  Maramureș: ["Baia Mare", "Sighetu Marmației", "Borșa", "Vișeu de Sus", "Târgu Lăpuș"],
  Mehedinți: ["Drobeta-Turnu Severin", "Orșova", "Strehaia", "Vânju Mare", "Baia de Aramă"],
  Mureș: ["Târgu Mureș", "Reghin", "Sighișoara", "Târnăveni", "Luduş"],
  Neamț: ["Piatra Neamț", "Roman", "Târgu Neamț", "Roznov", "Bicaz"],
  Olt: ["Slatina", "Caracal", "Balș", "Corabia", "Scornicești"],
  Prahova: ["Ploiești", "Câmpina", "Băicoi", "Breaza", "Sinaia", "Bușteni", "Azuga", "Vălenii de Munte"],
  "Satu Mare": ["Satu Mare", "Carei", "Negrești-Oaș", "Tășnad", "Livada"],
  Sălaj: ["Zalău", "Șimleu Silvaniei", "Jibou", "Cehu Silvaniei"],
  Sibiu: ["Sibiu", "Mediaș", "Cisnădie", "Avrig", "Agnita", "Dumbrăveni"],
  Suceava: ["Suceava", "Fălticeni", "Rădăuți", "Câmpulung Moldovenesc", "Vatra Dornei", "Gura Humorului"],
  Teleorman: ["Alexandria", "Roșiorii de Vede", "Turnu Măgurele", "Zimnicea", "Videle"],
  Timiș: ["Timișoara", "Lugoj", "Sânnicolau Mare", "Jimbolia", "Făget", "Buziaș"],
  Tulcea: ["Tulcea", "Măcin", "Babadag", "Isaccea", "Sulina", "Murighiol"],
  Vaslui: ["Vaslui", "Bârlad", "Huși", "Negrești"],
  Vâlcea: ["Râmnicu Vâlcea", "Drăgășani", "Băile Olănești", "Călimănești", "Horezu"],
  Vrancea: ["Focșani", "Adjud", "Mărășești", "Odobești", "Panciu"],
};

export function isRomaniaCounty(value: string): value is RomaniaCounty {
  const folded = foldLocationSearch(value);
  return ROMANIA_COUNTIES.some((county) => foldLocationSearch(county) === folded);
}

export function canonicalRomaniaCounty(value: string): RomaniaCounty | null {
  const folded = foldLocationSearch(value);
  return ROMANIA_COUNTIES.find((county) => foldLocationSearch(county) === folded) ?? null;
}

export function canonicalRomaniaCity(county: RomaniaCounty, value: string): string | null {
  const folded = foldLocationSearch(value);
  const known = ROMANIA_CITIES_BY_COUNTY[county].find((city) => foldLocationSearch(city) === folded);
  return known ?? null;
}

export function canonicalBucharestDistrict(value: string): string | null {
  const folded = foldLocationSearch(value.replace(/sectorul/i, "sector"));
  return BUCHAREST_DISTRICTS.find((d) => foldLocationSearch(d) === folded) ?? null;
}

const MAX_TYPED_LOCALITY = 80;
const TYPED_LOCALITY_RE = /^[\p{L}0-9][\p{L}0-9 .'\-\/]*[\p{L}0-9.]$/u;

export function looksLikeStreetLocation(value: string): boolean {
  return /\b(str\.?|strada|bd\.?|bulevard(?:ul)?|șos\.?|sos\.?|soseaua|șoseaua|aleea|alea|nr\.?)\b/i.test(
    value,
  );
}

export function isValidRomaniaLocalityName(value: string): boolean {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > MAX_TYPED_LOCALITY) return false;
  if (looksLikeStreetLocation(text)) return false;
  return TYPED_LOCALITY_RE.test(text);
}

export function uniqueCatalogLocality(value: string): { county: RomaniaCounty; city: string } | null {
  const matches: { county: RomaniaCounty; city: string }[] = [];
  for (const county of ROMANIA_COUNTIES) {
    const city = canonicalRomaniaCity(county, value);
    if (city) matches.push({ county, city });
  }
  return matches.length === 1 ? matches[0] : null;
}

export type ResolvedTypedLocationSearch = {
  country: string;
  county: string;
  city: string;
  district: string;
  invalid: boolean;
};

function emptyTypedLocation(invalid = false): ResolvedTypedLocationSearch {
  return { country: "", county: "", city: "", district: "", invalid };
}

function romaniaTypedLocation(token: {
  county?: string;
  city?: string;
  district?: string;
}): ResolvedTypedLocationSearch {
  return {
    country: "RO",
    county: token.county ?? "",
    city: token.city ?? "",
    district: token.district ?? "",
    invalid: false,
  };
}

function locationParts(text: string): string[] {
  const commaParts = text.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 2) return commaParts;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text];

  const last = words[words.length - 1];
  const head = words.slice(0, -1).join(" ");
  if (canonicalRomaniaCounty(last) || findCountry(last)) return [head, last];

  const first = words[0];
  const rest = words.slice(1).join(" ");
  if (canonicalRomaniaCounty(first) || findCountry(first)) return [first, rest];

  return [text];
}

/**
 * Resolve free-typed hero location text.
 * Unique catalog names canonicalize (Săbăreni → Giurgiu). Unknown valid
 * localities stay city-only. Street-style input is rejected, never reused as q.
 */
export function resolveTypedLocationSearch(raw: string | null | undefined): ResolvedTypedLocationSearch {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return emptyTypedLocation();
  if (text.length > MAX_TYPED_LOCALITY || looksLikeStreetLocation(text)) {
    return emptyTypedLocation(true);
  }

  const asCountry = findCountry(text);
  if (asCountry) {
    return { country: asCountry.code, county: "", city: "", district: "", invalid: false };
  }

  const asCounty = canonicalRomaniaCounty(text);
  if (asCounty) return romaniaTypedLocation({ county: asCounty });

  const asSector = canonicalBucharestDistrict(text);
  if (asSector) {
    return romaniaTypedLocation({ county: "București", city: "București", district: asSector });
  }

  const catalog = uniqueCatalogLocality(text);
  if (catalog) {
    return romaniaTypedLocation({ county: catalog.county, city: catalog.city });
  }

  const parts = locationParts(text);
  if (parts.length >= 2) {
    const first = parts[0];
    const second = parts[1];
    const third = parts[2] ?? "";
    const countyFirst = canonicalRomaniaCounty(first);
    const countySecond = canonicalRomaniaCounty(second);
    const sectorFirst = canonicalBucharestDistrict(first);
    const sectorSecond = canonicalBucharestDistrict(second);
    const countryFirst = findCountry(first);
    const countryLast = findCountry(parts[parts.length - 1]);

    if (countyFirst === "București" && sectorSecond) {
      return romaniaTypedLocation({ county: "București", city: "București", district: sectorSecond });
    }
    if (countySecond === "București" && sectorFirst) {
      return romaniaTypedLocation({ county: "București", city: "București", district: sectorFirst });
    }

    if (countyFirst && isValidRomaniaLocalityName(second)) {
      if (countyFirst === "București") {
        return romaniaTypedLocation({
          county: "București",
          city: "București",
          district: canonicalBucharestDistrict(second) ?? "",
        });
      }
      return romaniaTypedLocation({
        county: countyFirst,
        city: canonicalRomaniaCity(countyFirst, second) ?? second,
      });
    }

    if (countySecond && isValidRomaniaLocalityName(first)) {
      if (countySecond === "București") {
        return romaniaTypedLocation({
          county: "București",
          city: "București",
          district: canonicalBucharestDistrict(first) ?? "",
        });
      }
      return romaniaTypedLocation({
        county: countySecond,
        city: canonicalRomaniaCity(countySecond, first) ?? first,
      });
    }

    if (countryLast && isValidRomaniaLocalityName(first)) {
      const region = parts.length >= 3 && second !== parts[parts.length - 1] ? second : "";
      if (third && looksLikeStreetLocation(third)) return emptyTypedLocation(true);
      return {
        country: countryLast.code,
        county: region && isValidRomaniaLocalityName(region) ? region : "",
        city: first,
        district: "",
        invalid: false,
      };
    }

    if (countryFirst && isValidRomaniaLocalityName(second)) {
      return {
        country: countryFirst.code,
        county: "",
        city: second,
        district: "",
        invalid: false,
      };
    }

    return emptyTypedLocation(true);
  }

  if (isValidRomaniaLocalityName(text)) {
    return { country: "", county: "", city: text, district: "", invalid: false };
  }

  return emptyTypedLocation(true);
}

export function formatTypedLocationSearch(token: {
  country?: string;
  county?: string;
  city?: string;
  district?: string;
}): string {
  const country = (token.country ?? "").trim().toUpperCase();
  const county = (token.county ?? "").trim();
  const city = (token.city ?? "").trim();
  const district = (token.district ?? "").trim();
  if (district) return `București, ${district}`;
  if (city && county) return `${city}, ${county}`;
  if (city && country && country !== "RO") {
    const named = findCountry(country);
    return named ? `${city}, ${named.nameRo}` : `${city}, ${country}`;
  }
  if (city) return city;
  if (country && country !== "RO") {
    return findCountry(country)?.nameRo || country;
  }
  return county;
}

export type RomaniaLocationSearchToken = {
  country?: string;
  county: string;
  city: string;
  district: string;
};

export type RomaniaLocationSearchOption = {
  value: string;
  label: string;
  group: "country" | "county" | "city" | "district";
};

/** Compact hero control: county, locality, or București district. */
export function encodeRomaniaLocationSearchValue(token: RomaniaLocationSearchToken): string {
  const county = token.county.trim();
  const city = token.city.trim();
  const district = token.district.trim();
  const country = (token.country ?? "").trim().toUpperCase();
  if (country && country !== "RO" && !county && !city && !district) {
    return `k:${country}`;
  }
  if (district && county) {
    return `d:${county}:${city || county}:${district}`;
  }
  if (city && county) return `l:${county}:${city}`;
  if (county) return `c:${county}`;
  if (country) return `k:${country}`;
  return "";
}

export function decodeRomaniaLocationSearchValue(raw: string | null | undefined): RomaniaLocationSearchToken {
  const token = String(raw ?? "").trim();
  if (!token) return { country: "", county: "", city: "", district: "" };
  const parts = token.split(":");
  const kind = parts[0];
  if (kind === "k" && parts[1]) {
    return { country: parts[1], county: "", city: "", district: "" };
  }
  if (kind === "c" && parts[1]) {
    return { country: "RO", county: parts.slice(1).join(":"), city: "", district: "" };
  }
  if (kind === "l" && parts[1] && parts[2]) {
    return { country: "RO", county: parts[1], city: parts.slice(2).join(":"), district: "" };
  }
  if (kind === "d" && parts[1] && parts[2] && parts[3]) {
    return { country: "RO", county: parts[1], city: parts[2], district: parts.slice(3).join(":") };
  }
  return { country: "", county: "", city: "", district: "" };
}

export function romaniaLocationSearchOptions(): RomaniaLocationSearchOption[] {
  const options: RomaniaLocationSearchOption[] = ROMANIA_COUNTIES.map((county) => ({
    value: encodeRomaniaLocationSearchValue({ county, city: "", district: "" }),
    label: county,
    group: "county" as const,
  }));

  for (const county of ROMANIA_COUNTIES) {
    if (county === "București") continue;
    for (const city of ROMANIA_CITIES_BY_COUNTY[county]) {
      options.push({
        value: encodeRomaniaLocationSearchValue({ county, city, district: "" }),
        label: `${city}, ${county}`,
        group: "city",
      });
    }
  }

  for (const district of BUCHAREST_DISTRICTS) {
    options.push({
      value: encodeRomaniaLocationSearchValue({
        county: "București",
        city: "București",
        district,
      }),
      label: `București, ${district}`,
      group: "district",
    });
  }

  for (const country of COUNTRY_OPTIONS) {
    if (country.code === "RO") continue;
    options.push({
      value: encodeRomaniaLocationSearchValue({
        country: country.code,
        county: "",
        city: "",
        district: "",
      }),
      label: country.nameRo,
      group: "country",
    });
  }

  return options;
}
