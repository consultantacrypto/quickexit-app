import { readFileSync } from "node:fs";
import { getListingCtaMode } from "../lib/listingCta";
import { isPublicInquirableListing } from "../lib/listingInquiry";
import {
  CATALOG_OFFER_COPY,
  DEFAULT_AVAILABILITY_STATUS,
  DEFAULT_LISTING_KIND,
  catalogOfferJsonLdAvailability,
  countsTowardIndividualAssetValue,
  individualAssetDeclaredValue,
  isCatalogOffer,
  isInventoryInquirable,
  parseAvailabilityStatus,
  parseListingKind,
  payloadAttemptsInventoryReclassification,
  publicListingKindPayload,
} from "../lib/listingInventory";
import {
  buildPublicSearchPath,
  filterPublicSearchListings,
  parsePublicListingSearchParams,
} from "../lib/publicListings";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

assert(DEFAULT_LISTING_KIND === "specific_asset", "default kind");
assert(DEFAULT_AVAILABILITY_STATUS === "available", "default availability");
assert(parseListingKind(undefined) === "specific_asset", "missing kind defaults");
assert(parseListingKind("catalog_offer") === "catalog_offer", "catalog kind");
assert(parseListingKind("future_mobility") === null, "invalid kind rejected");
assert(parseAvailabilityStatus(undefined) === "available", "missing availability defaults");
assert(parseAvailabilityStatus("needs_confirmation") === "needs_confirmation", "needs confirmation");
assert(parseAvailabilityStatus("leased") === null, "invalid availability rejected");
assert(publicListingKindPayload().listing_kind === "specific_asset", "public payload kind");
assert(publicListingKindPayload().availability_status === "available", "public payload availability");
assert(payloadAttemptsInventoryReclassification({ listing_kind: "catalog_offer" }), "editor cannot send kind");
assert(!payloadAttemptsInventoryReclassification({ title: "A" }), "normal edit is allowed");

assert(CATALOG_OFFER_COPY.ro.tag === "Disponibil la comandă", "RO tag");
assert(CATALOG_OFFER_COPY.en.tag === "Available to order", "EN tag");
assert(CATALOG_OFFER_COPY.ro.cta === "Solicită prețul și disponibilitatea", "RO cta");
assert(CATALOG_OFFER_COPY.en.cta === "Request price and availability", "EN cta");
assert(CATALOG_OFFER_COPY.ro.explanation.includes("prin partener"), "RO explanation");
assert(CATALOG_OFFER_COPY.en.explanation.includes("through a partner"), "EN explanation");

const past = "2020-01-01T00:00:00.000Z";
const base = { status: "active", is_seed: false, user_id: "seller", expires_at: past };
assert(!isInventoryInquirable({ ...base, listing_kind: "specific_asset", availability_status: "available" }), "expired specific asset blocked");
assert(isInventoryInquirable({ ...base, listing_kind: "catalog_offer", availability_status: "available" }), "expired catalog offer allowed");
assert(isInventoryInquirable({ ...base, listing_kind: "catalog_offer", availability_status: "needs_confirmation" }), "needs confirmation allowed");
assert(isInventoryInquirable({ ...base, listing_kind: "specific_asset", availability_status: "needs_confirmation" }), "specific needs confirmation allowed");
assert(!isInventoryInquirable({ ...base, listing_kind: "catalog_offer", availability_status: "sold" }), "sold blocked");
assert(!isInventoryInquirable({ ...base, listing_kind: "catalog_offer", availability_status: "archived" }), "archived blocked");
assert(!isInventoryInquirable({ ...base, listing_kind: "catalog_offer", availability_status: "available", is_seed: true }), "seed still blocked");
assert(!isInventoryInquirable({ ...base, listing_kind: "catalog_offer", availability_status: "available", status: "pending_payment" }), "inactive still blocked");
assert(
  !isPublicInquirableListing({
    status: "active",
    is_seed: false,
    user_id: "",
    listing_kind: "catalog_offer",
    availability_status: "available",
  }),
  "missing seller still blocked",
);

assert(isCatalogOffer("catalog_offer"), "catalog helper");
assert(!isCatalogOffer("specific_asset"), "specific helper");
assert(getListingCtaMode({ listing_kind: "catalog_offer", sale_strategy: "auction" }) === "catalog_offer", "catalog cta ignores sale strategy");
assert(getListingCtaMode({ listing_kind: "specific_asset", sale_strategy: "auction" }) === "auction", "auction cta unchanged");
assert(catalogOfferJsonLdAvailability() === "https://schema.org/PreOrder", "json-ld is not in stock");

const rows = [
  { id: "11111111-1111-4111-8111-111111111111", status: "active", is_seed: false, title: "Asset", listing_kind: "specific_asset", availability_status: "available", exit_price: 100 },
  { id: "22222222-2222-4222-8222-222222222222", status: "active", is_seed: false, title: "Model", listing_kind: "catalog_offer", availability_status: "available", exit_price: 900 },
  { id: "33333333-3333-4333-8333-333333333333", status: "active", is_seed: false, title: "Sold", listing_kind: "specific_asset", availability_status: "sold", exit_price: 50 },
];
assert(countsTowardIndividualAssetValue(rows[0]), "specific asset counts");
assert(!countsTowardIndividualAssetValue(rows[1]), "catalog offer excluded");
assert(!countsTowardIndividualAssetValue(rows[2]), "sold excluded");
assert(individualAssetDeclaredValue(rows) === 100, "individual value ignores catalog and sold");

const parsed = parsePublicListingSearchParams({ catalog: "1", crypto: "1", q: "bmw" });
assert(parsed.catalog === true && parsed.crypto === true, "catalog filter is optional and combinable");
assert(parsePublicListingSearchParams({}).catalog === false, "catalog filter defaults off");
assert(buildPublicSearchPath({ catalog: true, q: "bmw" }).includes("catalog=1"), "shareable catalog url");
assert(buildPublicSearchPath({ crypto: true }).includes("crypto=1"), "crypto filter still present");

const visible = filterPublicSearchListings(rows, {});
assert(visible.length === 2, "default search keeps specific and catalog, hides sold");
assert(filterPublicSearchListings(rows, { catalog: true }).length === 1, "catalog filter");
assert(filterPublicSearchListings(rows, { catalog: true })[0]?.id === "22222222-2222-4222-8222-222222222222", "catalog row");

const sql = readFileSync("docs/internal/sql/listing-inventory-governance.sql", "utf8");
assert(sql.includes("NEEXECUTAT — NU A FOST APLICAT ÎN PRODUCTION"), "sql banner");
assert(sql.includes("listing_kind"), "sql kind");
assert(sql.includes("availability_status"), "sql availability");
assert(sql.includes("availability_confirmed_at"), "sql confirmed at");
assert(!/UPDATE\s+public\.listings/i.test(sql), "sql has no listing update");
assert(!/DROP\s+TABLE/i.test(sql), "sql does not drop tables");
for (const guard of [
  "QEX:auth_required",
  "NEW.buyer_id := auth.uid()",
  "QEX:own_listing",
  "listing_is_seed IS DISTINCT FROM false",
  "NEW.consent_version := '2026-08'",
  "QEX:duplicate_inquiry",
  "QEX:rate_limited",
  "pg_advisory_xact_lock",
  "871001",
  "871002",
]) {
  assert(sql.includes(guard), `inquiry guard kept: ${guard}`);
}
assert(sql.includes("catalog_offer"), "catalog inquiry exception");
assert(sql.includes("'sold', 'archived'") || sql.includes("('sold', 'archived')"), "sold archived rejected in sql");

const publish = readFileSync("app/[locale]/pune-anunt/PuneAnuntClient.tsx", "utf8");
assert(publish.includes("publicListingKindPayload()"), "publish sets default kind");
assert(!publish.includes("catalog_offer"), "publish form does not offer catalog kind");

const updateRoute = readFileSync("app/api/listings/[id]/update/route.ts", "utf8");
assert(updateRoute.includes("payloadAttemptsInventoryReclassification"), "editor rejects reclassification");

const anunturi = readFileSync("app/[locale]/anunturi/AnunturiClient.tsx", "utf8");
const cauta = readFileSync("app/[locale]/cauta/page.tsx", "utf8");
const card = readFileSync("app/components/AdCard.tsx", "utf8");
assert(anunturi.includes('params.set("catalog", "1")'), "anunturi catalog query");
assert(cauta.includes("catalogFilter"), "search catalog filter");
assert(card.includes('t("catalogOffer")'), "card tag");
assert(!card.includes("Future Mobility"), "card does not say Future Mobility");

const ro = readFileSync("messages/ro.json", "utf8");
const en = readFileSync("messages/en.json", "utf8");
assert(ro.includes("Disponibil la comandă"), "ro copy");
assert(ro.includes("Solicită prețul și disponibilitatea"), "ro cta");
assert(en.includes("Available to order"), "en copy");
assert(en.includes("Request price and availability"), "en cta");

console.log("listing inventory governance assertions passed");
