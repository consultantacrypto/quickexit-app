import {
  applyListingLocationToDetails,
  formatListingLocation,
  hasStructuredListingLocation,
  listingMatchesKeyword,
  listingMatchesLocationFilter,
  locationFromFormData,
  tryParseLegacyLocationText,
  validateListingLocationInput,
} from "../lib/listingLocation";
import { filterPublicSearchListings } from "../lib/publicListings";
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

console.log("OK listing-location");
