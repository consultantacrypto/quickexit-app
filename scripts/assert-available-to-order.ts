import { readFileSync } from "node:fs";
import { isCatalogOffer, looksAvailableToOrder } from "../lib/listingInventory";
import {
  buildAvailableToOrderOrFilter,
  filterPublicSearchListings,
} from "../lib/publicListings";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const specific = "specific_asset";

assert(
  looksAvailableToOrder({ listing_kind: "catalog_offer", title: "Model fără text" }),
  "catalog_offer matches even without on-order copy",
);
assert(
  looksAvailableToOrder({
    listing_kind: "catalog_offer",
    title: "Stoc",
    details: { delivery_status: "disponibil imediat" },
  }),
  "catalog_offer still matches when delivery says in stock",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "BMW X5",
    details: { delivery_status: "la comandă" },
  }),
  "delivery_status la comandă",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Audi A6",
    details: { delivery_status: "Pe comanda" },
  }),
  "delivery_status Pe comanda without diacritics",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Configurație locală",
    details: { delivery_status: "import la comandă" },
  }),
  "delivery_status import la comandă",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Mercedes GLE import la comandă",
    details: { delivery_status: "în stoc" },
  }),
  "title-only match",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "VW Golf",
    details: { delivery_status: "disponibil imediat" },
  }) === false,
  "disponibil imediat is not on order",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "BMW X5",
    details: { delivery_status: "în țară" },
    description: "Configurație la comandă. Disponibil imediat pentru test drive.",
  }) === false,
  "description-only mention does not match",
);

assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Range Rover",
    details: { delivery_status: "LA COMANDĂ" },
  }),
  "case folding",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Porsche",
    details: { delivery_status: "import   la   comandă" },
  }),
  "collapsed whitespace",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Volvo",
    details: { delivery_status: "la comandâ" },
  }),
  "â folds to a",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Skoda",
    details: { delivery_status: `la comanda\u0306` },
  }),
  "combining breve folds to a",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Livrare: la comandă în țară",
  }),
  "diacritics around the phrase still match",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "SUV on order",
  }),
  "English on order",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Available to order",
    details: { delivery_status: "confirm delivery" },
  }),
  "English available to order",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Fleet",
    details: { delivery_status: "ON ORDER" },
  }),
  "English phrase in delivery_status",
);

assert(
  looksAvailableToOrder({ listing_kind: specific, title: "comand" }) === false,
  "bare comand does not match",
);
assert(
  looksAvailableToOrder({ listing_kind: specific, title: "Comandă specială" }) === false,
  "bare comanda does not match",
);
assert(
  looksAvailableToOrder({ listing_kind: specific, title: "la comandant" }) === false,
  "comandant is not comanda",
);
assert(
  looksAvailableToOrder({ listing_kind: specific, title: "on ordering" }) === false,
  "on ordering is not on order",
);
assert(
  looksAvailableToOrder({
    listing_kind: specific,
    title: "Accessory kit",
    details: { availability_type: "on_order", status: "la comandă" },
  }) === false,
  "other detail fields do not match",
);
assert(looksAvailableToOrder(null) === false, "null listing");
assert(looksAvailableToOrder(undefined) === false, "missing listing");
assert(looksAvailableToOrder({ listing_kind: specific, title: "Golf" }) === false, "plain specific asset");
assert(
  !isCatalogOffer("specific_asset") && isCatalogOffer("catalog_offer"),
  "isCatalogOffer stays a kind check",
);
const titleOnly = {
  listing_kind: specific,
  title: "Mercedes GLE import la comandă",
  details: { delivery_status: "în stoc" },
};
assert(
  looksAvailableToOrder(titleOnly) && !isCatalogOffer(titleOnly.listing_kind),
  "on-order copy does not widen isCatalogOffer",
);

const active = {
  status: "active",
  is_seed: false,
  availability_status: "available",
};
const rows = [
  {
    ...active,
    id: "11111111-1111-4111-8111-111111111111",
    listing_kind: specific,
    title: "BMW X5",
    details: { delivery_status: "la comandă" },
  },
  {
    ...active,
    id: "22222222-2222-4222-8222-222222222222",
    listing_kind: specific,
    title: "Audi A6",
    details: { delivery_status: "Pe comanda" },
  },
  {
    ...active,
    id: "33333333-3333-4333-8333-333333333333",
    listing_kind: specific,
    title: "Configurație locală",
    details: { delivery_status: "import la comandă" },
  },
  {
    ...active,
    id: "44444444-4444-4444-8444-444444444444",
    listing_kind: specific,
    title: "Mercedes GLE import la comandă",
    details: { delivery_status: "în stoc" },
  },
  {
    ...active,
    id: "55555555-5555-4555-8555-555555555555",
    listing_kind: specific,
    title: "VW Golf",
    details: { delivery_status: "disponibil imediat" },
    description: "Text la comandă care nu trebuie să filtreze.",
  },
  {
    ...active,
    id: "66666666-6666-4666-8666-666666666666",
    listing_kind: "catalog_offer",
    title: "Model partener",
  },
  {
    ...active,
    id: "77777777-7777-4777-8777-777777777777",
    listing_kind: specific,
    title: "SUV on order",
  },
];

const catalogRows = filterPublicSearchListings(rows, { catalog: true });
const catalogIds = catalogRows.map((row) => row.id);
assert(catalogIds.length === 6, `catalog search keeps on-order rows, got ${catalogIds.length}`);
assert(!catalogIds.includes("55555555-5555-4555-8555-555555555555"), "in-stock description mention stays out");
assert(
  filterPublicSearchListings(rows, {}).length === rows.length,
  "unfiltered search still keeps in-stock listings",
);

const orFilter = buildAvailableToOrderOrFilter();
assert(orFilter.includes("listing_kind.eq.catalog_offer"), "kind remains one branch of the server filter");
assert(orFilter.includes('title.ilike."%la%comand%"'), "title ilike");
assert(orFilter.includes('details->>delivery_status.ilike."%pe%comand%"'), "delivery_status ilike");
assert(orFilter.includes("%on%order%"), "English on order pattern");
assert(orFilter.includes("%available%to%order%"), "English available to order pattern");
assert(!orFilter.includes("description"), "server filter does not read description");
assert(!/\.eq\.comand\b/.test(orFilter), "server filter does not match a bare comand column");

const inventory = readFileSync("lib/listingInventory.ts", "utf8");
const isCatalogOfferStart = inventory.indexOf("export function isCatalogOffer");
const isCatalogOfferSource = inventory.slice(
  isCatalogOfferStart,
  inventory.indexOf("/**", isCatalogOfferStart + 1),
);
assert(
  isCatalogOfferSource.includes('parseListingKind(kind) === "catalog_offer"'),
  "isCatalogOffer body stays the kind check",
);
assert(!isCatalogOfferSource.includes("delivery_status"), "isCatalogOffer does not read delivery_status");
assert(!isCatalogOfferSource.includes("looksAvailableToOrder"), "isCatalogOffer does not call the filter helper");

const publicListings = readFileSync("lib/publicListings.ts", "utf8");
assert(!publicListings.includes('.eq("listing_kind", "catalog_offer")'), "search query is not kind-only");
assert(publicListings.includes("buildAvailableToOrderOrFilter()"), "search query uses the superset filter");
assert(publicListings.includes("looksAvailableToOrder"), "search results use the helper");

const anunturi = readFileSync("app/[locale]/anunturi/AnunturiClient.tsx", "utf8");
assert(
  anunturi.includes("if (catalogOnly && !looksAvailableToOrder(item)) return false;"),
  "listings page filters with the helper",
);
assert(
  anunturi.includes("catalogOffer={isCatalogOffer(item.listing_kind)}"),
  "card tag stays on the kind check",
);

const cauta = readFileSync("app/[locale]/cauta/page.tsx", "utf8");
assert(cauta.includes('filters.catalog ? tAll("emptyCatalog") : t("empty")'), "search empty state uses emptyCatalog");
assert(cauta.includes("catalogOffer={isCatalogOffer(item.listing_kind)}"), "search card tag stays on the kind check");

const ro = readFileSync("messages/ro.json", "utf8");
const en = readFileSync("messages/en.json", "utf8");
assert(ro.includes('"emptyCatalog"'), "Romanian emptyCatalog copy exists");
assert(en.includes('"emptyCatalog"'), "English emptyCatalog copy exists");

console.log("available-to-order assertions passed");
