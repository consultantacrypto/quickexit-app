import {
  applyListingLocationToDetails,
  formatListingLocation,
  hasStructuredListingLocation,
  listingMatchesKeyword,
  listingMatchesLocationFilter,
  locationFromFormData,
  publicationLocationFromDetails,
  resolveListingLocation,
  tryParseLegacyLocationText,
  validateListingLocationInput,
} from "../lib/listingLocation";
import {
  buildKeywordOrFilter,
  buildLocationOrFilters,
  buildPublicSearchPath,
  canonicalizePublicLocationFilter,
  filterPublicSearchListings,
  parsePublicListingSearchParams,
  quotePostgrestLiteral,
  sanitizeSearchQuery,
} from "../lib/publicListings";
import {
  decodeRomaniaLocationSearchValue,
  encodeRomaniaLocationSearchValue,
  formatTypedLocationSearch,
  resolveTypedLocationSearch,
} from "../lib/romaniaLocations";
import { isActivePublicListingRow } from "../lib/sitemapEntries";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const bucuresti = validateListingLocationInput({
  country_code: "RO",
  county: "București",
  city: "București",
  district: "Sector 1",
});
assert(bucuresti.ok, "București Sector 1 accepted");
if (bucuresti.ok) {
  assert(formatListingLocation(bucuresti.location) === "București, Sector 1", "format București sector");
}

const otopeni = locationFromFormData({
  country_code: "RO",
  county: "Ilfov",
  city: "Otopeni",
});
assert(otopeni.ok, "Ilfov Otopeni accepted");
if (otopeni.ok) {
  assert(formatListingLocation(otopeni.location) === "Ilfov, Otopeni", "format Ilfov Otopeni");
}

const mamaia = locationFromFormData({
  county: "Constanța",
  city: "Mamaia Nord",
});
assert(mamaia.ok, "Mamaia Nord accepted");
if (mamaia.ok) {
  assert(formatListingLocation(mamaia.location) === "Constanța, Mamaia Nord", "format Mamaia Nord");
}

assert(!validateListingLocationInput({ county: "", city: "Cluj" }).ok, "missing county rejected");
assert(!validateListingLocationInput({ county: "Cluj", city: "" }).ok, "missing city rejected");
assert(!validateListingLocationInput({ county: "Atlantis", city: "X" }).ok, "unknown county rejected");
assert(
  !validateListingLocationInput({ county: "Cluj", city: "Str. Memorandumului 12" }).ok,
  "street city rejected",
);

const parsedSector = tryParseLegacyLocationText("București, Sector 1, Șos. Nordului");
assert(parsedSector?.county === "București", "legacy București county");
assert(parsedSector?.district === "Sector 1", "legacy sector kept, street dropped");

const parsedOtopeni = tryParseLegacyLocationText("Ilfov, Otopeni");
assert(parsedOtopeni?.city === "Otopeni", "legacy Otopeni");

assert(tryParseLegacyLocationText("un loc oarecare") === null, "unstructured text not guessed");
assert(tryParseLegacyLocationText("Mamaia") === null, "city without county not guessed");

const details = applyListingLocationToDetails({}, {
  country_code: "RO",
  county: "Cluj",
  city: "Cluj-Napoca",
  district: null,
});
assert(hasStructuredListingLocation(details), "applied details are structured");
assert(details.country_code === "RO", "country stored");
assert(details.county === "Cluj", "county stored");
assert(details.location === "Cluj, Cluj-Napoca", "compact location stored");

const publicId = "50e8decd-635a-46f7-908e-2ac1fddf8ac6";
const rows = [
  {
    id: publicId,
    title: "Lamborghini Urus",
    description: "SUV",
    category: "Auto & Moto",
    status: "active",
    is_seed: false,
    details: details,
  },
  {
    id: publicId,
    title: "Draft hidden",
    description: "draft",
    category: "Auto & Moto",
    status: "pending_payment",
    is_seed: false,
    details,
  },
  {
    id: publicId,
    title: "Seed hidden",
    description: "seed",
    category: "Auto & Moto",
    status: "active",
    is_seed: true,
    details,
  },
  {
    id: publicId,
    title: "Rolex Datejust",
    description: "watch",
    category: "Lux & Ceasuri",
    status: "active",
    is_seed: false,
    details: applyListingLocationToDetails(
      { brand: "Rolex" },
      { country_code: "RO", county: "București", city: "București", district: "Sector 1" },
    ),
  },
];

assert(isActivePublicListingRow(rows[0]), "active public row");
assert(!isActivePublicListingRow(rows[1]), "pending excluded");
assert(!isActivePublicListingRow(rows[2]), "seed excluded");

const keywordOnly = filterPublicSearchListings(rows, { q: "Urus" });
assert(keywordOnly.length === 1 && keywordOnly[0].title === "Lamborghini Urus", "keyword only");

const locationOnly = filterPublicSearchListings(rows, { county: "București" });
assert(locationOnly.length === 1 && String(locationOnly[0].title).includes("Rolex"), "location only");

const both = filterPublicSearchListings(rows, { q: "Rolex", county: "București" });
assert(both.length === 1, "keyword + location");

const none = filterPublicSearchListings(rows, {});
assert(none.length === 2, "no filters returns all public");

const zero = filterPublicSearchListings(rows, { q: "zzz-no-match" });
assert(zero.length === 0, "zero results");

assert(listingMatchesKeyword(rows[0], "auto"), "category keyword");
assert(listingMatchesLocationFilter(details, { county: "Cluj" }), "location filter match");
assert(!listingMatchesLocationFilter(details, { county: "Timiș" }), "location filter miss");

const otopeniDetails = applyListingLocationToDetails({}, {
  country_code: "RO",
  county: "Ilfov",
  city: "Otopeni",
  district: null,
});
assert(
  listingMatchesLocationFilter(otopeniDetails, { county: "Ilfov", city: "Otopeni" }),
  "Otopeni city filter matches Otopeni",
);
assert(
  !listingMatchesLocationFilter(otopeniDetails, { county: "Ilfov", city: "Voluntari" }),
  "Otopeni is not Voluntari",
);

const sectorRows = filterPublicSearchListings(rows, {
  county: "București",
  city: "București",
  district: "Sector 1",
});
assert(sectorRows.length === 1 && String(sectorRows[0].title).includes("Rolex"), "Sector 1 city/district filter");

const otopeniToken = encodeRomaniaLocationSearchValue({
  county: "Ilfov",
  city: "Otopeni",
  district: "",
});
assert(otopeniToken.includes("Otopeni"), "Otopeni token encodes city");
assert(decodeRomaniaLocationSearchValue(otopeniToken).city === "Otopeni", "Otopeni token decodes city");
const sectorToken = encodeRomaniaLocationSearchValue({
  county: "București",
  city: "București",
  district: "Sector 1",
});
assert(decodeRomaniaLocationSearchValue(sectorToken).district === "Sector 1", "Sector 1 token");

const parsedOtopeniUrl = parsePublicListingSearchParams({
  q: "Urus",
  county: "Ilfov",
  city: "Otopeni",
});
assert(parsedOtopeniUrl.q === "Urus", "shareable q");
assert(parsedOtopeniUrl.county === "Ilfov", "shareable county");
assert(parsedOtopeniUrl.city === "Otopeni", "shareable city");

const parsedSectorUrl = parsePublicListingSearchParams({
  q: "",
  county: "București",
  city: "București",
  district: "Sector 1",
});
assert(parsedSectorUrl.district === "Sector 1", "shareable district");

const inferredCity = canonicalizePublicLocationFilter({ city: "Otopeni" });
assert(inferredCity.county === "Ilfov" && inferredCity.city === "Otopeni", "Otopeni infers Ilfov");
const inferredSector = canonicalizePublicLocationFilter({ district: "Sector 1" });
assert(
  inferredSector.county === "București" && inferredSector.district === "Sector 1",
  "Sector 1 infers București",
);

const poisoned = sanitizeSearchQuery("urus%).or(status.eq.draft,title.ilike.%");
assert(!poisoned.includes("%"), "search query strips percent");
assert(!poisoned.includes("("), "search query strips parentheses");
assert(!poisoned.includes(","), "search query strips commas");
const keywordOr = buildKeywordOrFilter("urus%).or(status.eq.draft");
if (!keywordOr) fail("keyword or built");
assert(keywordOr.includes('title.ilike."%'), "keyword or uses quoted ilike");
assert(!/(?:^|,)status\.eq/.test(keywordOr), "raw or() injection cannot add clauses");
assert(quotePostgrestLiteral('x","status.eq.draft') === null, "quotes rejected");

const locationOrs = buildLocationOrFilters({ county: "Ilfov", city: "Otopeni" });
assert(locationOrs.some((clause) => clause.includes("details->>city.eq.\"Otopeni\"")), "city pushed to PostgREST");
assert(locationOrs.every((clause) => !clause.includes("status.eq")), "location or has no status injection");

assert(!publicationLocationFromDetails({}).ok, "missing location blocked for publication");
assert(publicationLocationFromDetails(details).ok, "structured details allowed for publication");

const detailsWin = resolveListingLocation({
  details: otopeniDetails,
  county: "Cluj",
  city: "Cluj-Napoca",
});
assert(detailsWin?.city === "Otopeni", "details take precedence over top-level columns");

const columnFallback = resolveListingLocation({
  details: {},
  country_code: "RO",
  county: "Ilfov",
  city: "Otopeni",
});
assert(columnFallback?.city === "Otopeni", "top-level columns used only when details missing");

const missingLegacy = resolveListingLocation({ details: { title: "no location" } });
assert(missingLegacy === null, "missing legacy location is not fabricated");

const catalogCounty = resolveTypedLocationSearch("Ilfov");
assert(catalogCounty.county === "Ilfov" && !catalogCounty.city && !catalogCounty.invalid, "catalog county");

const catalogCity = resolveTypedLocationSearch("Otopeni");
assert(catalogCity.county === "Ilfov" && catalogCity.city === "Otopeni" && !catalogCity.invalid, "catalog city");

const sectorTyped = resolveTypedLocationSearch("Sector 1");
assert(
  sectorTyped.county === "București" &&
    sectorTyped.city === "București" &&
    sectorTyped.district === "Sector 1" &&
    !sectorTyped.invalid,
  "București sector",
);

const sabareniTyped = resolveTypedLocationSearch("Săbăreni");
assert(sabareniTyped.city === "Săbăreni" && !sabareniTyped.county && !sabareniTyped.invalid, "Săbăreni typed manually");
const sabareniWithCounty = resolveTypedLocationSearch("Săbăreni, Ilfov");
assert(
  sabareniWithCounty.county === "Ilfov" &&
    sabareniWithCounty.city === "Săbăreni" &&
    !sabareniWithCounty.invalid,
  "Săbăreni, Ilfov typed",
);

const murighiolTyped = resolveTypedLocationSearch("Murighiol");
assert(murighiolTyped.city === "Murighiol" && !murighiolTyped.county && !murighiolTyped.invalid, "Murighiol typed manually");

const arbitraryVillage = resolveTypedLocationSearch("Ciocănești");
assert(arbitraryVillage.city === "Ciocănești" && !arbitraryVillage.county && !arbitraryVillage.invalid, "arbitrary valid locality");

const emptyLocation = resolveTypedLocationSearch("   ");
assert(!emptyLocation.county && !emptyLocation.city && !emptyLocation.district && !emptyLocation.invalid, "empty location");

const streetRejected = resolveTypedLocationSearch("Str. Memorandumului 12");
assert(streetRejected.invalid, "street-style input rejected");
assert(!streetRejected.city && !streetRejected.county, "street input is not used as city");

const sabareniUrl = parsePublicListingSearchParams({ city: "Săbăreni" });
assert(sabareniUrl.city === "Săbăreni" && !sabareniUrl.county && !sabareniUrl.locationInvalid, "city-only query without county");
assert(
  buildPublicSearchPath({ q: "", county: "", city: "Săbăreni", district: "" }) ===
    `/cauta?city=${encodeURIComponent("Săbăreni")}`,
  "shareable city-only URL",
);

const sabareniListing = applyListingLocationToDetails(
  {},
  { country_code: "RO", county: "Ilfov", city: "Săbăreni", district: null },
);
assert(listingMatchesLocationFilter(sabareniListing, { city: "Săbăreni" }), "city-only filter matches Săbăreni listing");
assert(!listingMatchesLocationFilter(sabareniListing, { city: "Otopeni" }), "city-only filter does not coerce nearest catalog city");

assert(formatTypedLocationSearch({ city: "Săbăreni" }) === "Săbăreni", "format city-only");
assert(formatTypedLocationSearch({}) === "", "format empty");

console.log("OK listing-location");
