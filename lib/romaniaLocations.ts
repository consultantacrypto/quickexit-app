/** Official Romanian counties (județe) plus București. */
export const ROMANIA_COUNTRIES_DEFAULT = "RO" as const;

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
  Giurgiu: ["Giurgiu", "Bolintin-Vale", "Mihăilești"],
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
  Tulcea: ["Tulcea", "Măcin", "Babadag", "Isaccea", "Sulina"],
  Vaslui: ["Vaslui", "Bârlad", "Huși", "Negrești"],
  Vâlcea: ["Râmnicu Vâlcea", "Drăgășani", "Băile Olănești", "Călimănești", "Horezu"],
  Vrancea: ["Focșani", "Adjud", "Mărășești", "Odobești", "Panciu"],
};

export function foldRo(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ș|ş/gi, "s")
    .replace(/ț|ţ/gi, "t")
    .replace(/ă/gi, "a")
    .replace(/â/gi, "a")
    .replace(/î/gi, "i")
    .toLowerCase()
    .trim();
}

export function isRomaniaCounty(value: string): value is RomaniaCounty {
  const folded = foldRo(value);
  return ROMANIA_COUNTIES.some((county) => foldRo(county) === folded);
}

export function canonicalRomaniaCounty(value: string): RomaniaCounty | null {
  const folded = foldRo(value);
  return ROMANIA_COUNTIES.find((county) => foldRo(county) === folded) ?? null;
}

export function canonicalRomaniaCity(county: RomaniaCounty, value: string): string | null {
  const folded = foldRo(value);
  const known = ROMANIA_CITIES_BY_COUNTY[county].find((city) => foldRo(city) === folded);
  return known ?? null;
}

export function canonicalBucharestDistrict(value: string): string | null {
  const folded = foldRo(value.replace(/sectorul/i, "sector"));
  return BUCHAREST_DISTRICTS.find((d) => foldRo(d) === folded) ?? null;
}

export type RomaniaLocationSearchToken = {
  county: string;
  city: string;
  district: string;
};

export type RomaniaLocationSearchOption = {
  value: string;
  label: string;
  group: "county" | "city" | "district";
};

/** Compact hero control: county, locality, or București district. */
export function encodeRomaniaLocationSearchValue(token: RomaniaLocationSearchToken): string {
  const county = token.county.trim();
  const city = token.city.trim();
  const district = token.district.trim();
  if (district && county) {
    return `d:${county}:${city || county}:${district}`;
  }
  if (city && county) return `l:${county}:${city}`;
  if (county) return `c:${county}`;
  return "";
}

export function decodeRomaniaLocationSearchValue(raw: string | null | undefined): RomaniaLocationSearchToken {
  const token = String(raw ?? "").trim();
  if (!token) return { county: "", city: "", district: "" };
  const parts = token.split(":");
  const kind = parts[0];
  if (kind === "c" && parts[1]) {
    return { county: parts.slice(1).join(":"), city: "", district: "" };
  }
  if (kind === "l" && parts[1] && parts[2]) {
    return { county: parts[1], city: parts.slice(2).join(":"), district: "" };
  }
  if (kind === "d" && parts[1] && parts[2] && parts[3]) {
    return { county: parts[1], city: parts[2], district: parts.slice(3).join(":") };
  }
  return { county: "", city: "", district: "" };
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
        label: `${county}, ${city}`,
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

  return options;
}
