/**
 * Hardware-wallet catalog and click tracking. CI-safe: no network, no database.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LISTING_TRAFFIC_PRODUCTION_SUPABASE_HOST } from "../lib/listingTraffic";
import {
  LEDGER_STAX_AFFILIATE_URL,
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
  WALLET_PROMOS,
  activeWalletPromoIds,
  isWalletPromoActive,
  walletPromoCopy,
  walletPromoForBrand,
} from "../lib/walletPromos";
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
assert(ro.Wallets.badgePopular === "Cel mai ales", "RO popular badge");
assert(en.Wallets.badgePopular === "Most chosen", "EN popular badge");
assert(
  WALLET_PRODUCTS.filter((item) => item.highlight === "popular").map((item) => item.slug).join(",") === "safepal-s1",
  "only SafePal S1 carries the official popular badge",
);
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
const LEDGER_REF = "9111c54498ec";
const KEYSTONE_RFSN = "9430621.40149c9";
const ELLIPAL_RFSN = "9430622.0718c6";

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
  } else if (item.slug === "ledger-stax") {
    assert(item.affiliateUrl === LEDGER_STAX_AFFILIATE_URL, "Stax affiliate URL is the shop link");
    assert(new URL(item.affiliateUrl).searchParams.get("r") === LEDGER_REF, "Stax keeps the Ledger ref");
  } else if (item.brandSlug === "ledger") {
    const affiliate = new URL(item.affiliateUrl);
    assert(affiliate.hostname === "shop.ledger.com", `${item.slug} ledger host`);
    assert(affiliate.pathname === new URL(item.officialUrl).pathname, `${item.slug} ledger product path`);
    assert(affiliate.searchParams.get("r") === LEDGER_REF, `${item.slug} ledger ref`);
  } else if (item.brandSlug === "keystone") {
    const affiliate = new URL(item.affiliateUrl);
    assert(affiliate.hostname === "shop.keyst.one", `${item.slug} keystone host`);
    assert(affiliate.pathname === new URL(item.officialUrl).pathname, `${item.slug} keystone product path`);
    assert(affiliate.searchParams.get("rfsn") === KEYSTONE_RFSN, `${item.slug} keystone ref`);
  } else if (item.brandSlug === "ellipal") {
    const affiliate = new URL(item.affiliateUrl);
    assert(affiliate.pathname === new URL(item.officialUrl).pathname, `${item.slug} ellipal product path`);
    assert(affiliate.searchParams.get("rfsn") === ELLIPAL_RFSN, `${item.slug} ellipal ref`);
  } else {
    assert(item.affiliateUrl === `PENDING:${item.brandSlug}`, `${item.slug} pending affiliate URL`);
    assert(!hasRealCheckoutCode(item), `${item.slug} has no checkout code`);
  }
  if (item.slug === "ledger-stax") {
    assert(buildWalletOutboundUrl(item) === LEDGER_STAX_AFFILIATE_URL, "Stax outbound link is exact");
  }
  const outbound = new URL(buildWalletOutboundUrl(item));
  const affiliateBase = isAffiliatePlaceholder(item.affiliateUrl) ? null : new URL(item.affiliateUrl);
  if (item.slug === "ledger-stax") {
    assert(outbound.search === "?r=9111c54498ec", "Stax link has no extra params");
  } else {
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
      if (item.currency === "RON") {
        assert(view.primary.includes("lei"), `${item.slug} shows lei`);
      } else {
        assert(view.primary.includes(item.currency ?? ""), `${item.slug} shows currency`);
      }
      assert(view.checkedOn === (item.priceCheckedAt === "2026-11-27" ? "27.11.2026" : "22.11.2026"), `${item.slug} shows the check date`);
      assert(view.estimate === (item.priceBasis === "estimate"), `${item.slug} estimate flag`);
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
assert(safe3.status === "verified" && safe3.primary === "207,00 lei" && safe3.estimate === false, "Trezor Safe 3 lei");
assert(safe3.status === "verified" && safe3.secondary === "39,00 EUR", "Trezor Safe 3 euro on the same page");
assert(safe3.status === "verified" && safe3.checkedOn === "27.11.2026", "Trezor Safe 3 check date");

const safe5 = WALLET_PRODUCTS.find((item) => item.slug === "trezor-safe-5");
const safe7 = WALLET_PRODUCTS.find((item) => item.slug === "trezor-safe-7");
assert(safe5?.listPrice === 420 && safe5.currency === "RON" && safe5.officialUrl === "https://trezor.io/trezor-safe-5", "Trezor Safe 5");
assert(safe7?.listPrice === 942 && safe7.currency === "RON" && safe7.officialUrl === "https://trezor.io/trezor-safe-7", "Trezor Safe 7");
assert(
  WALLET_PRODUCTS.filter((item) => item.brandSlug === "trezor").every(
    (item) => item.affiliateUrl === "PENDING:trezor" && item.officialUrl.startsWith("https://trezor.io/"),
  ),
  "Trezor links stay free of referral params",
);
assert(
  WALLET_PRODUCTS.filter((item) => item.brandSlug === "bitbox").every((item) => item.affiliateUrl === "PENDING:bitbox"),
  "BitBox links stay free of referral params",
);
assert(
  WALLET_PRODUCTS.filter((item) => item.brandSlug === "ngrave").every((item) => item.affiliateUrl === "PENDING:ngrave"),
  "NGRAVE links stay free of referral params",
);

const ring = walletPriceView(WALLET_PRODUCTS.find((item) => item.slug === "tangem-ring")!, "ro");
assert(
  ring.status === "verified" && ring.primary === "667,00 lei" && ring.estimate && ring.secondary === "124,90 EUR",
  "Tangem Ring lei estimate",
);

const RECHECKED: Record<string, { lei: number; official: number; currency: string }> = {
  "tangem-2-cards": { lei: 293, official: 54.9, currency: "EUR" },
  "tangem-3-cards": { lei: 347, official: 64.9, currency: "EUR" },
  "tangem-ring": { lei: 667, official: 124.9, currency: "EUR" },
  "safepal-s1": { lei: 244, official: 49.99, currency: "USD" },
  "safepal-x1": { lei: 341, official: 69.99, currency: "USD" },
  "safepal-s1-pro": { lei: 439, official: 89.99, currency: "USD" },
  "ledger-nano-s-plus": { lei: 302, official: 62, currency: "USD" },
  "ledger-nano-x": { lei: 385, official: 79, currency: "USD" },
  "ledger-nano-gen5": { lei: 873, official: 179, currency: "USD" },
  "ledger-flex": { lei: 1214, official: 249, currency: "USD" },
  "ledger-stax": { lei: 1946, official: 399, currency: "USD" },
};
for (const [slug, expected] of Object.entries(RECHECKED)) {
  const item = WALLET_PRODUCTS.find((row) => row.slug === slug);
  assert(item, slug);
  assert(item?.listPrice === expected.lei && item.currency === "RON", `${slug} lei`);
  assert(item?.priceBasis === "estimate" && item.secondaryAmount === expected.official, `${slug} official amount`);
  assert(item?.secondaryCurrency === expected.currency, `${slug} official currency`);
  assert(item?.priceCheckedAt === "2026-11-27", `${slug} checked 27.11.2026`);
}
const proKit = WALLET_PRODUCTS.find((item) => item.slug === "tangem-pro-kit");
assert(proKit?.listPrice === 180 && proKit.currency === "USD" && proKit.priceCheckedAt === "2026-11-22", "Pro Kit was not in the 27.11 table");

const stax = WALLET_PRODUCTS.find((item) => item.slug === "ledger-stax");
assert(stax?.officialUrl === "https://shop.ledger.com/products/ledger-stax", "Stax official page");
const staxPrice = walletPriceView(stax!, "ro");
assert(
  staxPrice.status === "verified" && staxPrice.primary === "1.946,00 lei" && staxPrice.secondary === "399,00 USD" && staxPrice.estimate,
  "Stax shows the lei estimate and the USD price",
);

const tangemPromo = WALLET_PROMOS.find((promo) => promo.id === "tangem-bf2026");
const safepalPromo = WALLET_PROMOS.find((promo) => promo.id === "safepal-bfcm2026");
assert(tangemPromo && safepalPromo, "both promos exist");
assert(tangemPromo?.expiresAt === "2026-11-29T23:59:59+02:00", "Tangem expiry is 29.11 23:59 Europe/Bucharest");
assert(Date.parse(tangemPromo!.expiresAt) === Date.parse("2026-11-29T21:59:59Z"), "Tangem expiry instant");
assert(safepalPromo?.expiresAt === "2026-12-04T01:59:59+02:00", "SafePal expiry matches 3.12 23:59 UTC");
assert(Date.parse(safepalPromo!.expiresAt) === Date.parse("2026-12-03T23:59:59Z"), "SafePal expiry instant");
assert(
  walletPromoCopy(tangemPromo!, "ro") ===
    "Black Friday: cod BF2026 (−35%, până pe 29.11). Codul nostru: DANIELMIHAI.",
  "Tangem promo wording",
);
assert(walletPromoCopy(safepalPromo!, "ro").includes("BFCM2026") && walletPromoCopy(safepalPromo!, "ro").includes("15%"), "SafePal promo wording");
const promoBlob = WALLET_PROMOS.map((promo) => `${promo.copyRo}\n${promo.copyEn}`).join("\n");
for (const phrase of ["cumul", "cumuleaz", "stack", "împreună", "se adaugă", "combin"]) {
  assert(!promoBlob.toLowerCase().includes(phrase), `promo copy does not say ${phrase}`);
}
assert(isWalletPromoActive(tangemPromo!, new Date("2026-11-29T21:59:59Z")), "Tangem visible at 23:59 Bucharest");
assert(!isWalletPromoActive(tangemPromo!, new Date("2026-11-29T22:00:00Z")), "Tangem hidden at midnight");
assert(isWalletPromoActive(safepalPromo!, new Date("2026-12-03T23:59:59Z")), "SafePal visible at the stated UTC minute");
assert(!isWalletPromoActive(safepalPromo!, new Date("2026-12-04T00:00:00Z")), "SafePal hidden after 23:59 UTC");
assert(!isWalletPromoActive(tangemPromo!, new Date(Number.NaN)), "invalid clock hides the promo");
const during = activeWalletPromoIds(new Date("2026-11-27T12:00:00+02:00"));
assert(during.includes("tangem-bf2026") && during.includes("safepal-bfcm2026"), "both promos active on 27.11");
const afterTangem = activeWalletPromoIds(new Date("2026-11-30T00:00:00+02:00"));
assert(!afterTangem.includes("tangem-bf2026") && afterTangem.includes("safepal-bfcm2026"), "Tangem drops on 30.11, SafePal stays");
assert(activeWalletPromoIds(new Date("2026-12-04T00:00:00Z")).length === 0, "no promo after SafePal ends");
assert(walletPromoForBrand("tangem", during)?.code === "BF2026", "Tangem card receives BF2026");
assert(walletPromoForBrand("safepal", afterTangem)?.code === "BFCM2026", "SafePal card receives BFCM2026");
assert(walletPromoForBrand("tangem", afterTangem) === null, "expired Tangem id is not on the card");
assert(walletPromoForBrand("ledger", during) === null, "Ledger has no promo code");

const pageSrc = readFileSync(resolve("app/[locale]/wallets/page.tsx"), "utf8");
assert(pageSrc.includes('export const dynamic = "force-dynamic"'), "wallet page is dynamic");
assert(pageSrc.includes("await connection()"), "wallet page waits for the request");
assert(pageSrc.includes("activeWalletPromoIds(new Date())"), "server clock decides the promos");
assert(pageSrc.includes("activePromoIds={activePromoIds}"), "server decision is passed to the catalog");
assert(!pageSrc.includes("/r/"), "wallet page does not reference a redirect slug");

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
assert(catalogUi.includes("walletPromoCopy"), "promo sentence is rendered from the catalog");
assert(catalogUi.includes("activePromoIds"), "catalog shows only the server promo ids");
assert(!catalogUi.includes("BF2026") && !catalogUi.includes("BFCM2026"), "promo codes stay in the promo module");
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
