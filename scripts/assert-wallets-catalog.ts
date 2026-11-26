/**
 * Hardware-wallet catalog and click tracking. CI-safe: no network, no database.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LISTING_TRAFFIC_PRODUCTION_SUPABASE_HOST } from "../lib/listingTraffic";
import {
  TANGEM_PARTNER_LINK_PLACEHOLDER,
  WALLET_BRAND_SLUGS,
  WALLET_OUTBOUND_REL,
  WALLET_PRODUCTS,
  buildWalletOutboundUrl,
  filterWalletProducts,
  hasRealCheckoutCode,
  isAffiliatePlaceholder,
  walletCatalogForPage,
  walletPriceView,
} from "../lib/walletCatalog";
import {
  parseWalletAffiliateBody,
  toWalletAffiliateInsert,
  walletAffiliateWriteAllowed,
  type WalletAffiliateInsert,
  type WalletAffiliateStore,
} from "../lib/walletAffiliateTraffic";
import { handleWalletAffiliatePost } from "../lib/walletAffiliateTrafficHandle";
import { staticAndCategorySitemapPaths } from "../lib/sitemapEntries";
import { WALLET_BRANDS, WALLET_QUICK_PICKS, walletBrandShelves } from "../lib/walletBrands";
import { WALLET_BRAND_SPECS, brandStartingPrice } from "../lib/walletBrandSpecs";
import { chooseWalletBrands } from "../lib/walletChooser";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const SESSION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRODUCTION_URL = `https://${LISTING_TRAFFIC_PRODUCTION_SUPABASE_HOST}`;
const STAGING_URL = "https://staging-example.supabase.co";

const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8")) as {
  Navigation: { wallets: string };
  Wallets: Record<string, string>;
};
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8")) as {
  Navigation: { wallets: string };
  Wallets: Record<string, string>;
};

assert(ro.Navigation.wallets === "Portofele crypto", "RO nav label");
assert(en.Navigation.wallets === "Crypto wallets", "EN nav label");
assert(ro.Wallets.title === "Portofele crypto", "RO page title");
assert(en.Wallets.title === "Crypto wallets", "EN page title");
assert(ro.Wallets.seeWallets === "Vezi portofelele crypto", "RO hero CTA");
assert(en.Wallets.seeWallets === "See crypto wallets", "EN hero CTA");
assert(ro.Wallets.buyOfficial === "Cumpără pe site-ul oficial", "RO CTA");
assert(en.Wallets.buyOfficial === "Buy on the official site", "EN CTA");
assert(ro.Wallets.copyCode === "Copiază codul", "RO copy code");
assert(
  ro.Wallets.disclosure ===
    "Quick Exit este partener afiliat al producătorilor de mai jos. Nu ținem stoc și nu vindem aceste portofele. Dacă cumperi prin butonul de pe această pagină, putem primi un comision, fără cost în plus pentru tine. Prețurile sunt cele de pe site-ul oficial, verificate la data afișată pe card; la checkout pot apărea taxe sau transport. Tranzacția se încheie pe site-ul producătorului, nu pe Quick Exit.",
  "RO disclosure",
);
assert(
  en.Wallets.disclosure ===
    "Quick Exit is an affiliate partner of the brands below. We do not hold stock and we do not sell these wallets. If you buy through a button on this page, we may earn a commission, at no extra cost to you. Prices are the official list prices, checked on the date shown on each card; taxes or shipping may be added at checkout. The purchase is completed on the manufacturer’s site, not on Quick Exit.",
  "EN disclosure",
);

const roKeys = Object.keys(ro.Wallets).sort();
const enKeys = Object.keys(en.Wallets).sort();
assert(JSON.stringify(roKeys) === JSON.stringify(enKeys), "Wallets message key parity");

const forbidden = [
  "% OFF",
  "% off",
  "Black Friday",
  "Cyber Monday",
  "cel mai bun preț",
  "best price",
  "cupon",
  "coupon",
  "cashback",
  "Ia reducerea",
];
const copyBlob = `${JSON.stringify(ro.Wallets)}\n${JSON.stringify(en.Wallets)}`;
for (const phrase of forbidden) {
  assert(!copyBlob.toLowerCase().includes(phrase.toLowerCase()), `catalog copy contains ${phrase}`);
}

const AFFILIATE_BY_SLUG: Record<string, string> = {
  "coolwallet-pro": "https://www.coolwallet.io/products/coolwallet-pro/?ref=yzm5nda",
  "coolwallet-go": "https://www.coolwallet.io/products/coolwallet-go/?ref=yzm5nda",
  "safepal-s1": "https://www.safepal.com/store/s1?ref=n2rmyza",
  "safepal-x1": "https://www.safepal.com/store/x1?ref=n2rmyza",
  "safepal-s1-pro": "https://www.safepal.com/store/s1pro?ref=n2rmyza",
};
const AFFILIATE_BY_BRAND: Record<string, string> = {
  keystone: "https://keyst.one/?rfsn=9430621.40149c9&utm_source=refersion&utm_medium=affiliate&utm_campaign=9430621.40149c9",
  ellipal: "https://www.ellipal.com/?rfsn=9430622.0718c6",
  ledger: "https://shop.ledger.com/?r=9111c54498ec",
};

assert(WALLET_BRAND_SLUGS.length === 12, "12 brands");
assert(new Set(WALLET_PRODUCTS.map((item) => item.brandSlug)).size === 12, "every brand has a card");
assert(WALLET_PRODUCTS.every((item) => item.published === false), "published stays false");
assert(walletCatalogForPage().length === WALLET_PRODUCTS.length, "preview lists every static row");

for (const item of WALLET_PRODUCTS) {
  assert(item.imageUrl === null, `${item.slug} has no hotlinked image`);
  assert(!item.officialUrl.includes("PENDING:"), `${item.slug} official URL is not a placeholder`);
  assert(!item.officialUrl.includes(TANGEM_PARTNER_LINK_PLACEHOLDER), `${item.slug} official URL is clean`);
  const official = new URL(item.officialUrl);
  for (const key of ["ref", "via", "clickid", "irclickid", "affiliate", "coupon", "utm_source"]) {
    assert(!official.searchParams.has(key), `${item.slug} official URL has no ${key}`);
  }
  if (item.brandSlug === "tangem") {
    assert(item.affiliateUrl === TANGEM_PARTNER_LINK_PLACEHOLDER, "Tangem has no partner URL");
    assert(item.affiliateCode === "DANIELMIHAI" && item.checkoutCodeRequired, "Tangem checkout code");
    assert(hasRealCheckoutCode(item), "Tangem code is copyable");
  } else if (AFFILIATE_BY_SLUG[item.slug]) {
    assert(item.affiliateUrl === AFFILIATE_BY_SLUG[item.slug], `${item.slug} affiliate URL`);
  } else if (AFFILIATE_BY_BRAND[item.brandSlug]) {
    assert(item.affiliateUrl === AFFILIATE_BY_BRAND[item.brandSlug], `${item.slug} brand affiliate URL`);
  } else {
    assert(item.affiliateUrl === `PENDING:${item.brandSlug}`, `${item.slug} pending affiliate URL`);
    assert(!hasRealCheckoutCode(item), `${item.slug} has no checkout code`);
  }
  const outbound = new URL(buildWalletOutboundUrl(item));
  const affiliateBase = isAffiliatePlaceholder(item.affiliateUrl) ? null : new URL(item.affiliateUrl);
  if (affiliateBase?.searchParams.has("utm_source")) {
    assert(outbound.searchParams.get("utm_source") === affiliateBase.searchParams.get("utm_source"), "keeps partner utm_source");
    assert(outbound.searchParams.get("utm_medium") === affiliateBase.searchParams.get("utm_medium"), "keeps partner utm_medium");
    assert(outbound.searchParams.get("utm_campaign") === affiliateBase.searchParams.get("utm_campaign"), "keeps partner utm_campaign");
  } else {
    assert(outbound.searchParams.get("utm_source") === "quickexit", "utm source");
    assert(outbound.searchParams.get("utm_medium") === "affiliate", "utm medium");
    assert(outbound.searchParams.get("utm_campaign") === "wallets", "utm campaign");
  }
  assert(
    outbound.searchParams.get("utm_content") === `${item.brandSlug}-${item.slug}`,
    "utm content",
  );
  for (const key of ["ref", "r", "rfsn"] as const) {
    if (affiliateBase?.searchParams.has(key)) {
      assert(outbound.searchParams.get(key) === affiliateBase.searchParams.get(key), `${item.slug} keeps ${key}`);
    } else {
      assert(!outbound.searchParams.has(key), `${item.slug} does not invent ${key}`);
    }
  }
  assert(!outbound.toString().includes("PENDING:"), "outbound does not leak a placeholder");
  assert(!outbound.toString().includes(TANGEM_PARTNER_LINK_PLACEHOLDER), "outbound does not leak Tangem placeholder");
  if (item.priceStatus !== "verified") {
    assert(walletPriceView(item, "ro").status === "hidden", `${item.slug} hides the price`);
    assert(item.listPrice == null, `${item.slug} stores no number`);
  } else {
    const view = walletPriceView(item, "ro");
    assert(view.status === "verified", `${item.slug} shows a verified price`);
    if (view.status === "verified") {
      assert(view.primary.includes(item.currency ?? ""), `${item.slug} shows currency`);
      assert(view.checkedOn === "22.11.2026", `${item.slug} shows the check date`);
    }
  }
}

const tangem = buildWalletOutboundUrl(WALLET_PRODUCTS.find((item) => item.slug === "tangem-2-cards")!);
const tangemUrl = new URL(tangem);
assert(tangemUrl.searchParams.get("sku") === "TG128X2-B", "Tangem SKU preserved");
assert(tangemUrl.searchParams.get("cat") === "2", "Tangem category preserved");

const foundation = WALLET_PRODUCTS.find((item) => item.slug === "foundation-passport-prime");
assert(foundation, "Foundation card");
const foundationPrice = walletPriceView(foundation!, "en");
assert(foundationPrice.status === "verified" && foundationPrice.primary.includes("328.00"), "Foundation USD price");
assert(foundationPrice.status === "verified" && foundationPrice.secondary?.includes("1,980.00"), "Foundation geo RON");
assert(foundation!.checkoutCodeRequired && !hasRealCheckoutCode(foundation!), "Foundation has no blind code");

const onekey = WALLET_PRODUCTS.filter((item) => item.brandSlug === "onekey");
assert(onekey.length === 4 && onekey.every((item) => item.checkoutCodeRequired && !hasRealCheckoutCode(item)), "OneKey codes stay placeholders");

const x0 = WALLET_PRODUCTS.find((item) => item.slug === "cypherock-x0");
assert(x0?.priceStatus === "unverified" && x0.listPrice == null, "X0 price stays hidden");

const safe3 = walletPriceView(WALLET_PRODUCTS.find((item) => item.slug === "trezor-safe-3")!, "ro");
assert(safe3.status === "verified" && safe3.primary === "39,00 EUR", "Trezor EUR");
assert(safe3.status === "verified" && safe3.secondary === "207,00 RON", "Trezor RON");

const ring = walletPriceView(WALLET_PRODUCTS.find((item) => item.slug === "tangem-ring")!, "en");
assert(ring.status === "verified" && ring.primary.includes("140.00") && ring.primary.includes("160.00"), "Tangem ring range");

const ordered = walletCatalogForPage();
const firstOther = ordered.findIndex((item) => item.brandSlug !== "tangem");
assert(firstOther > 0 && ordered.slice(0, firstOther).every((item) => item.brandSlug === "tangem"), "Tangem leads");

const cards = filterWalletProducts({ tier: "entry", deviceType: "card" });
assert(cards.every((item) => item.tier === "entry" && item.deviceType === "card"), "filters combine");
assert(cards.some((item) => item.brandSlug === "tangem"), "entry cards include Tangem");
assert(!cards.some((item) => item.deviceType === "device"), "entry cards exclude devices");

assert(WALLET_OUTBOUND_REL === "sponsored nofollow noopener noreferrer", "outbound rel");
assert(staticAndCategorySitemapPaths().includes("/wallets"), "sitemap includes /wallets");

function indexBetween(source: string, first: string, middle: string, last: string, label: string) {
  const start = source.indexOf(first);
  const mid = source.indexOf(middle, start + first.length);
  const end = source.indexOf(last, mid + middle.length);
  assert(start >= 0 && mid > start && end > mid, label);
}

const header = readFileSync(resolve("app/components/Header.tsx"), "utf8");
const desktop = header.split("lg:hidden")[0] ?? "";
const mobile = header.split('id="mobile-main-menu"')[1] ?? "";
assert(!desktop.includes('href="/wallets"'), "desktop header has no wallets link");
indexBetween(mobile, 'href="/posteaza-cerere"', 'href="/wallets"', 'href="/pune-anunt"', "mobile nav order");
assert(mobile.includes("<Wallet"), "mobile wallets item has an icon");
assert(!mobile.slice(mobile.indexOf('href="/wallets"'), mobile.indexOf('href="/pune-anunt"')).includes("#FFD100"), "wallets link is not a yellow button");

const footer = readFileSync(resolve("app/components/Footer.tsx"), "utf8");
const platform = footer.slice(footer.indexOf("platform.title"), footer.indexOf("legal.title"));
indexBetween(platform, 'href="/cum-functioneaza"', 'href="/wallets"', 'href="/tarife"', "footer order");

const migration = readFileSync(
  resolve("supabase/migrations/20261122153000_wallet_products_and_affiliate_events.sql"),
  "utf8",
);
assert(migration.includes("NOT APPLIED"), "migration is marked not applied");
assert(migration.includes("CREATE TABLE IF NOT EXISTS public.wallet_products"), "products table");
assert(migration.includes("CREATE TABLE IF NOT EXISTS public.wallet_affiliate_events"), "events table");
assert(!/^\s*INSERT\b/im.test(migration), "migration has no insert");
assert(migration.includes("REVOKE ALL ON TABLE public.wallet_affiliate_events FROM anon"), "events revoke anon");
assert(migration.includes("GRANT SELECT, INSERT ON TABLE public.wallet_affiliate_events TO service_role"), "events service role only");

const route = readFileSync(resolve("app/api/traffic/wallet-click/route.ts"), "utf8");
assert(route.includes("WALLET_AFFILIATE_EVENTS_ENABLED"), "route reads the flag");
assert(!route.includes("listing_traffic_events"), "route does not reuse listing traffic");
assert(!route.includes("affiliate_url"), "route does not store the affiliate URL");

const catalogUi = readFileSync(resolve("app/[locale]/wallets/WalletCatalog.tsx"), "utf8");
assert(catalogUi.includes("WALLET_OUTBOUND_REL"), "cards use the sponsored rel");
assert(catalogUi.includes("chooseWalletBrands"), "chooser is on the page");
assert(catalogUi.includes("Folosit de Dani") || catalogUi.includes("usedByDani"), "Dani badge key is used");
assert(catalogUi.includes('target="_blank"'), "outbound opens a new tab");
assert(catalogUi.includes("TRUST_ARTICLE_URL"), "trust article is linked");
assert(catalogUi.includes("flex min-w-0 flex-wrap gap-1.5 md:flex-nowrap"), "guide chips wrap on small screens");
assert(catalogUi.includes("copyDiscount"), "discount control has an accessible name");
assert(catalogUi.includes('t("discountCode"'), "discount code is rendered from copy");
assert(!catalogUi.includes("DANIELMIHAI"), "discount code stays in the catalog config");
assert(catalogUi.includes("disclosureShort"), "short disclosure is rendered");
assert(catalogUi.includes('{t("disclosure")}'), "full disclosure stays on the page");
assert(catalogUi.includes("trustTitle"), "seed warning stays on the page");
{
  const shortAt = catalogUi.indexOf("disclosureShort");
  const chooserAt = catalogUi.indexOf("<WalletChooser");
  const gridAt = catalogUi.indexOf('id="wallet-grid"');
  const fullAt = catalogUi.indexOf('{t("disclosure")}');
  const trustAt = catalogUi.lastIndexOf("TRUST_ARTICLE_URL");
  const faqAt = catalogUi.indexOf("<FaqList");
  assert(shortAt > 0 && shortAt < chooserAt, "short disclosure sits above the chooser");
  assert(chooserAt < gridAt, "chooser sits above the product grid");
  assert(gridAt < fullAt && fullAt < trustAt && trustAt < faqAt, "full disclosure, seed note, and article sit with the FAQ");
}
assert(ro.Wallets.disclosureShort.includes("Nu vindem și nu ținem stoc"), "RO short disclosure");
assert(en.Wallets.disclosureShort.startsWith("We don't sell or hold stock"), "EN short disclosure");
assert(!/cel mai bun|best wallet|ofertă|Black Friday/i.test(catalogUi), "chooser copy has no superlatives");
assert(catalogUi.includes("WALLET_QUICK_PICKS"), "quick picks are on the page");
assert(walletBrandShelves({ tier: "all", deviceType: "all" }).length === 12, "twelve brand cards");
assert(WALLET_BRANDS.length === 12, "twelve brand profiles");
for (const brand of WALLET_BRANDS) {
  assert(brand.image.src.startsWith("/wallets/") && brand.image.src.endsWith(".webp"), `${brand.slug} local image`);
  assert(brand.image.sourceUrl.startsWith("https://"), `${brand.slug} official image source`);
  assert(!brand.image.src.toLowerCase().includes("black-friday"), `${brand.slug} filename is not a sale name`);
  assert(existsSync(resolve(`public${brand.image.src}`)), `${brand.slug} image file exists`);
}
for (const pick of WALLET_QUICK_PICKS) {
  assert(WALLET_BRANDS.some((brand) => brand.slug === pick.brandSlug), `quick pick ${pick.id}`);
}
assert(
  walletBrandShelves({ tier: "premium", deviceType: "airgap" }).every((shelf) =>
    shelf.models.every((model) => model.tier === "premium" && model.deviceType === "airgap"),
  ),
  "brand shelves respect both filters",
);
assert(WALLET_BRANDS.filter((brand) => brand.usedByDani).map((brand) => brand.slug).join() === "tangem", "Dani badge only on Tangem");
assert(WALLET_BRAND_SPECS.length === 12, "specs for every brand");
for (const specs of WALLET_BRAND_SPECS) {
  for (const fact of [specs.openSource, specs.secureElement]) {
    if (fact.value == null) {
      assert(fact.sourceUrl == null, `${specs.slug} unverified spec has no fake source`);
    } else {
      assert(fact.sourceUrl?.startsWith("https://"), `${specs.slug} spec source is https`);
    }
  }
}
const chosen = chooseWalletBrands({ budget: "entry", experience: "beginner", style: "card" });
assert(chosen.length > 0 && chosen.length <= 2, "chooser returns one or two brands");
assert(chosen[0]?.slug === "tangem" && chosen[0].mentionsDani, "card plus entry can include Tangem");
assert(chooseWalletBrands({ budget: "premium", experience: "handsOn", style: "airgap" }).length <= 2, "chooser cap");
assert(brandStartingPrice("cypherock", "ro")?.text.includes("99,00"), "Cypherock from-price skips the unverified X0");
const walletsCopy = `${JSON.stringify(ro.Wallets)}\n${JSON.stringify(en.Wallets)}`;
for (const phrase of ["cel mai bun", "best wallet", "ofertă", "Black Friday", "% OFF"]) {
  assert(!walletsCopy.toLowerCase().includes(phrase.toLowerCase()), `wallets copy contains ${phrase}`);
}

function clickBody(slug: string | null, brand: string | null = "ledger") {
  return JSON.stringify({
    event_type: "click",
    session_id: SESSION,
    path: "/ro/wallets",
    brand,
    product_slug: slug,
    utm_source: "newsletter",
    affiliate_url: "https://example.test/secret-click-id",
  });
}

const parsed = parseWalletAffiliateBody(JSON.parse(clickBody("ledger-nano-x")));
assert(parsed.ok, "click parses");
if (parsed.ok) {
  const row = toWalletAffiliateInsert(parsed.event);
  assert(!("affiliate_url" in row), "insert row has no affiliate URL");
  assert(row.product_slug === "ledger-nano-x", "click keeps the slug");
  assert(row.utm_source === "newsletter", "utm kept");
}

assert(!parseWalletAffiliateBody(JSON.parse(clickBody(null))).ok, "click requires a product");
assert(
  !parseWalletAffiliateBody({
    event_type: "pageview",
    session_id: SESSION,
    path: "/ro/anunt/abc",
  }).ok,
  "listing paths are rejected",
);
assert(
  parseWalletAffiliateBody({
    event_type: "pageview",
    session_id: SESSION,
    path: "/en/wallets?utm_source=x",
    product_slug: null,
  }).ok,
  "catalog pageview parses",
);

assert(!walletAffiliateWriteAllowed({}), "flag defaults off");
assert(!walletAffiliateWriteAllowed({ enabledFlag: "false", supabaseUrl: STAGING_URL }), "false flag");
assert(!walletAffiliateWriteAllowed({ enabledFlag: "true", supabaseUrl: PRODUCTION_URL }), "production host blocked");
assert(walletAffiliateWriteAllowed({ enabledFlag: "true", supabaseUrl: STAGING_URL }), "non-production host with flag");
assert(walletAffiliateWriteAllowed({ enabledFlag: "true", supabaseUrl: "http://127.0.0.1:54321" }), "loopback with flag");

async function run() {
  let opened = false;
  const blocked = await handleWalletAffiliatePost({
    sameOrigin: true,
    rateAllowed: true,
    bodyText: clickBody("ledger-nano-x"),
    enabledFlag: undefined,
    supabaseUrl: PRODUCTION_URL,
    openStore: () => {
      opened = true;
      throw new Error("database must stay closed");
    },
  });
  assert(blocked.outcome === "ignored" && !opened, "disabled flag does not open a store");

  const production = await handleWalletAffiliatePost({
    sameOrigin: true,
    rateAllowed: true,
    bodyText: clickBody("ledger-nano-x"),
    enabledFlag: "true",
    supabaseUrl: PRODUCTION_URL,
    openStore: () => {
      opened = true;
      throw new Error("production must stay closed");
    },
  });
  assert(production.outcome === "ignored" && !opened, "production URL does not open a store");

  const rows: WalletAffiliateInsert[] = [];
  const store: WalletAffiliateStore = {
    async findRecent() {
      const found = rows.some((row) => row.product_slug === "ledger-nano-x");
      return { found, error: false };
    },
    async insert(row) {
      rows.push(row);
      return { error: false };
    },
  };
  const inserted = await handleWalletAffiliatePost({
    sameOrigin: true,
    rateAllowed: true,
    bodyText: clickBody("ledger-nano-x"),
    enabledFlag: "true",
    supabaseUrl: "http://127.0.0.1:54321",
    openStore: () => store,
  });
  assert(inserted.outcome === "inserted" && rows.length === 1, "loopback insert when the flag is on");
  const duplicate = await handleWalletAffiliatePost({
    sameOrigin: true,
    rateAllowed: true,
    bodyText: clickBody("ledger-nano-x"),
    enabledFlag: "true",
    supabaseUrl: "http://127.0.0.1:54321",
    openStore: () => store,
  });
  assert(duplicate.outcome === "duplicate" && rows.length === 1, "dedup");

  const crossOrigin = await handleWalletAffiliatePost({
    sameOrigin: false,
    rateAllowed: true,
    bodyText: clickBody("ledger-flex"),
    enabledFlag: "true",
    supabaseUrl: "http://127.0.0.1:54321",
    openStore: () => store,
  });
  assert(crossOrigin.outcome === "ignored" && rows.length === 1, "cross origin ignored");
  console.log("OK wallets catalog");
}

void run();
