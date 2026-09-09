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
