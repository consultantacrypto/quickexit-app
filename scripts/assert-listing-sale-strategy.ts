import { normalizeSaleType } from "../utils/normalizeSaleType";
import { isPublicAuctionOpen } from "../lib/auctionOpen";
import { buildListingDraft, DEFAULT_LISTING_FORM_DATA } from "../lib/listingDraft";
import {
  coerceCompatibleSaleIntent,
  DEFAULT_DIRECT_PACKAGE,
  isAuctionSaleStrategy,
  listingSaleFieldsForPackage,
  mergeSaleFieldsIntoDetails,
  parseListingSalePackageId,
  resolveListingPackageIdFromRow,
  validatePersistedSaleIntent,
  type SaleMethod,
} from "../lib/listingSaleStrategy";

const now = new Date("2026-08-28T12:00:00.000Z");
const future = "2026-09-27T07:18:59.767Z";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function classification(sale_strategy: string) {
  const listing = { status: "active", sale_strategy, expires_at: future };
  const normalizedAuction = normalizeSaleType(sale_strategy) === "auction";
  return {
    inNormal: !normalizedAuction,
    inAuction: isAuctionSaleStrategy(sale_strategy) && isPublicAuctionOpen(listing, now),
  };
}

type MatrixCase = {
  name: string;
  saleMethod: SaleMethod | undefined;
  packageId: string;
  pricingMode: "fixed_price" | "price_on_request" | "evaluated" | null;
  expectMethod: SaleMethod;
  expectPackage: string;
  expectNormal: boolean;
  expectAuction: boolean;
};

const cases: MatrixCase[] = [
  {
    name: "Standard publish Direct + Fixed price",
    saleMethod: "direct",
    packageId: "economy",
    pricingMode: "fixed_price",
    expectMethod: "direct",
    expectPackage: "economy",
    expectNormal: true,
    expectAuction: false,
  },
  {
    name: "Standard publish Direct + Price on request",
    saleMethod: "direct",
    packageId: "standard",
    pricingMode: "price_on_request",
    expectMethod: "direct",
    expectPackage: "standard",
    expectNormal: true,
    expectAuction: false,
  },
  {
    name: "Auction CTA/query",
    saleMethod: "auction",
    packageId: "auction",
    pricingMode: "fixed_price",
    expectMethod: "auction",
    expectPackage: "auction",
    expectNormal: false,
    expectAuction: true,
  },
];

let passed = 0;

for (const row of cases) {
  const state = coerceCompatibleSaleIntent({
    saleMethod: row.saleMethod,
    packageId: row.packageId,
    pricingMode: row.pricingMode,
  });
  assert(state.saleMethod === row.expectMethod, `${row.name}: saleMethod`);
  assert(state.packageId === row.expectPackage, `${row.name}: package`);
  assert(state.pricingMode === row.pricingMode, `${row.name}: pricingMode independent`);
  assert(state.detailsSaleMethod === row.expectMethod, `${row.name}: details.sale_method`);
  assert(
    state.detailsStrategy === (row.expectMethod === "auction" ? "licitatie" : "standard"),
    `${row.name}: details.strategy`,
  );
  const cls = classification(state.sale_strategy);
  assert(cls.inNormal === row.expectNormal, `${row.name}: normal inventory`);
  assert(cls.inAuction === row.expectAuction, `${row.name}: auctions`);
  passed += 1;
  console.log(`PASS ${row.name}`);
}

{
  const switched = coerceCompatibleSaleIntent({
    saleMethod: "direct",
    packageId: "auction",
    pricingMode: "fixed_price",
  });
  assert(switched.saleMethod === "direct", "switch auction→direct: method");
  assert(switched.packageId === DEFAULT_DIRECT_PACKAGE, "switch auction→direct: default direct package");
  assert(switched.detailsStrategy === "standard", "switch: no stale licitatie");
  assert(switched.detailsSaleMethod === "direct", "switch: sale_method direct");
  const merged = mergeSaleFieldsIntoDetails(
    { package: "auction", strategy: "licitatie", sale_method: "auction", pricing_mode: "fixed_price" },
    switched.packageId,
    switched.saleMethod,
  );
  assert(merged.package === DEFAULT_DIRECT_PACKAGE, "switch: details.package");
  assert(merged.strategy === "standard", "switch: details.strategy");
  assert(merged.sale_method === "direct", "switch: details.sale_method");
  assert(merged.pricing_mode === "fixed_price", "switch: pricing preserved");
  const cls = classification(switched.sale_strategy);
  assert(cls.inNormal && !cls.inAuction, "switch: homepage class");
  passed += 1;
  console.log("PASS Auction query then switch to Direct");
}

{
  const draftDirect = buildListingDraft({
    step: 4,
    category: "Lux & Ceasuri",
    adTitle: "Rolex",
    description: "",
    exitPrice: "16400",
    pricingMode: "fixed_price",
    isExitPriceManuallyEdited: true,
    manualMarketPrice: "",
    marketPrice: 0,
    analyzedItems: 0,
    saleStrategy: "standard",
    selectedPackage: "economy",
    saleMethod: "direct",
    formData: { ...DEFAULT_LISTING_FORM_DATA },
  });
  assert(draftDirect.saleMethod === "direct", "direct draft method");
  const viaAuctionCta = coerceCompatibleSaleIntent({
    packageId: "auction",
    saleMethod: undefined,
    pricingMode: draftDirect.pricingMode,
  });
  assert(viaAuctionCta.saleMethod === "auction", "auction CTA wins on this load");
  assert(viaAuctionCta.packageId === "auction", "auction CTA package");
  const laterExplicitDirect = coerceCompatibleSaleIntent({
    saleMethod: "direct",
    packageId: viaAuctionCta.packageId,
    pricingMode: "fixed_price",
  });
  assert(laterExplicitDirect.saleMethod === "direct", "later explicit direct wins");
  assert(laterExplicitDirect.packageId !== "auction", "no stale auction package");
  passed += 1;
  console.log("PASS Direct draft reopened through auction CTA");
}

{
  const auctionDraft = buildListingDraft({
    step: 4,
    category: "Lux & Ceasuri",
    adTitle: "Rolex",
    description: "",
    exitPrice: "16400",
    pricingMode: "fixed_price",
    isExitPriceManuallyEdited: true,
    manualMarketPrice: "",
    marketPrice: 0,
    analyzedItems: 0,
    saleStrategy: "licitatie",
    selectedPackage: "auction",
    saleMethod: "auction",
    formData: { ...DEFAULT_LISTING_FORM_DATA },
  });
  const switched = buildListingDraft({
    ...auctionDraft,
    saleMethod: "direct",
    selectedPackage: "auction",
    saleStrategy: "licitatie",
  });
  assert(switched.saleMethod === "direct", "draft switch method");
  assert(switched.selectedPackage === DEFAULT_DIRECT_PACKAGE, "draft switch package");
  assert(switched.saleStrategy === "standard", "draft switch strategy");
  passed += 1;
  console.log("PASS Auction draft switched to direct");
}

{
  const pendingDirect = validatePersistedSaleIntent({
    sale_strategy: "economy",
    details: {
      package: "economy",
      strategy: "standard",
      sale_method: "direct",
      pricing_mode: "fixed_price",
    },
  });
  assert(pendingDirect.ok, "pending direct ok");
  if (pendingDirect.ok) {
    assert(pendingDirect.state.packageId === "economy", "pending direct package");
    assert(pendingDirect.state.saleMethod === "direct", "pending direct method");
  }
  passed += 1;
  console.log("PASS Pending direct listing reused");
}

{
  const pendingAuction = validatePersistedSaleIntent({
    sale_strategy: "auction",
    details: {
      package: "auction",
      strategy: "licitatie",
      sale_method: "auction",
      pricing_mode: "fixed_price",
    },
  });
  assert(pendingAuction.ok, "pending auction ok");
  if (pendingAuction.ok) {
    assert(pendingAuction.state.packageId === "auction", "pending auction package");
    assert(pendingAuction.state.saleMethod === "auction", "pending auction method");
  }
  passed += 1;
  console.log("PASS Pending auction reused");
}

{
  const tampered = validatePersistedSaleIntent({
    sale_strategy: "auction",
    details: {
      package: "auction",
      strategy: "licitatie",
      sale_method: "direct",
      pricing_mode: "fixed_price",
    },
  });
  assert(!tampered.ok, "tampered rejected");
  if (!tampered.ok) {
    assert(tampered.error.code === "incompatible_sale_intent", "tampered code");
  }
  const tampered2 = validatePersistedSaleIntent({
    sale_strategy: "economy",
    details: { package: "economy", strategy: "standard", sale_method: "auction" },
  });
  assert(!tampered2.ok, "tampered reverse rejected");
  passed += 1;
  console.log("PASS Incompatible/tampered payload rejected");
}

{
  const legacyDirect = validatePersistedSaleIntent({
    sale_strategy: "urgent",
    details: { package: "urgent", strategy: "standard", pricing_mode: "evaluated" },
  });
  assert(legacyDirect.ok, "legacy direct ok");
  if (legacyDirect.ok) {
    assert(legacyDirect.state.saleMethod === "direct", "legacy derived direct");
    assert(legacyDirect.state.packageId === "urgent", "legacy package unchanged");
  }
  const cls = classification("urgent");
  assert(cls.inNormal && !cls.inAuction, "legacy direct homepage");
  passed += 1;
  console.log("PASS Legacy active direct row");
}

{
  const legacyAuction = validatePersistedSaleIntent({
    sale_strategy: "auction",
    details: { package: "auction", strategy: "licitatie" },
  });
  assert(legacyAuction.ok, "legacy auction ok");
  if (legacyAuction.ok) {
    assert(legacyAuction.state.saleMethod === "auction", "legacy derived auction");
    assert(legacyAuction.state.packageId === "auction", "legacy auction package");
  }
  const cls = classification("auction");
  assert(!cls.inNormal && cls.inAuction, "legacy auction homepage");
  passed += 1;
  console.log("PASS Legacy active auction row");
}

{
  const fields = listingSaleFieldsForPackage("economy");
  assert(String(fields.sale_strategy) !== "Lux & Ceasuri", "category never equals strategy");
  assert(parseListingSalePackageId("licitatie") === null, "licitatie is not a package id");
  assert(
    resolveListingPackageIdFromRow({
      sale_strategy: "auction",
      details: { package: "economy" },
    }) === "auction",
    "column wins over details.package",
  );
  const fixedPlusAuction = coerceCompatibleSaleIntent({
    saleMethod: "auction",
    packageId: "auction",
    pricingMode: "fixed_price",
  });
  assert(fixedPlusAuction.saleMethod === "auction", "fixed_price does not force direct");
  assert(fixedPlusAuction.pricingMode === "fixed_price", "auction may have reference price");
  passed += 1;
  console.log("PASS Mapping invariants (category independent, fixed_price ≠ method)");
}

console.log(`\n${passed} matrix groups passed`);
