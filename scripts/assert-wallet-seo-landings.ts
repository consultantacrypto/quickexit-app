/**
 * Romanian wallet landing pages.
 * Prices come from the catalog. No network, no /r/ requests, no database.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildStaticSitemapEntries, staticAndCategorySitemapPaths } from "../lib/sitemapEntries";
import { PRODUCTION_SITE_URL } from "../lib/siteUrl";
import {
  STIRILE_COMPROMISED_DEVICE_URL,
  STIRILE_CRYPTO_URL,
  STIRILE_HOT_COLD_URL,
  WALLET_SEO_LANDING_SLUGS,
  buildWalletSeoJsonLd,
  getWalletSeoLanding,
  walletSeoCheckedDate,
  walletSeoLandingCanonicalPath,
  walletSeoLandingPublicText,
  walletSeoLandingSitemapPaths,
} from "../lib/walletSeoLandings";
import {
  WALLET_OUTBOUND_REL,
  WALLET_PRODUCTS,
  buildWalletOutboundUrl,
  hasRealCheckoutCode,
  isAffiliatePlaceholder,
  sortedWalletProducts,
  walletPriceView,
  type WalletProduct,
} from "../lib/walletCatalog";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const BANNED = [
  "Black Friday",
  "BF2026",
  "BFCM2026",
  "Bybit",
  "OKX",
  "RedotPay",
  "cel mai bun",
  "se cumulează",
  "se combină",
  "/r/",
  "DANIELMIHAI",
];

const SOURCE_FILES = [
  "lib/walletSeoLandings.ts",
  "app/[locale]/wallets/[slug]/page.tsx",
  "app/[locale]/wallets/[slug]/WalletSeoLandingView.tsx",
  "app/[locale]/wallets/[slug]/CopyCheckoutCode.tsx",
];

export function assertWalletSeoLandings(): void {
for (const file of SOURCE_FILES) {
  const source = readFileSync(resolve(file), "utf8");
  for (const phrase of BANNED) {
    assert(!source.includes(phrase), `${file} contains ${phrase}`);
  }
  assert(!/\bfetch\s*\(/.test(source), `${file} does not fetch`);
  assert(!source.includes("59.9") && !source.includes("59,90"), `${file} has no hardcoded Tangem price`);
  assert(!source.includes("2026-11-22") && !source.includes("22.11.2026"), `${file} has no hardcoded check date`);
}

const pageSource = readFileSync(resolve("app/[locale]/wallets/[slug]/page.tsx"), "utf8");
assert(pageSource.includes("permanentRedirect"), "English URL redirects to Romanian");
assert(pageSource.includes("dynamicParams = false"), "unknown slugs are not dynamic");
assert(!pageSource.includes("WalletCatalog"), "landing page does not edit the catalog UI");
assert(!pageSource.includes("tangemBlackFriday"), "landing page does not touch the promo banner");

const viewSource = readFileSync(resolve("app/[locale]/wallets/[slug]/WalletSeoLandingView.tsx"), "utf8");
assert(viewSource.includes("WALLET_OUTBOUND_REL"), "buy links use the catalog rel");
assert(viewSource.includes("line.outboundUrl"), "buy links use the catalog outbound URL");
assert(viewSource.includes('href="/wallets"'), "page links back to the catalog");

assert(WALLET_OUTBOUND_REL === "sponsored nofollow noopener noreferrer", "outbound rel");
assert(WALLET_SEO_LANDING_SLUGS.length >= 4 && WALLET_SEO_LANDING_SLUGS.length <= 6, "four to six pages");

const REF_KEYS = ["ref", "r", "via", "rfsn", "clickid", "irclickid"];

function assertOutbound(product: WalletProduct, href: string) {
  assert(href === buildWalletOutboundUrl(product), `${product.slug} uses the catalog helper`);
  assert(!href.includes("/r/"), `${product.slug} is not an /r/ link`);
  const url = new URL(href);
  if (product.brandSlug === "trezor" || product.brandSlug === "bitbox" || product.brandSlug === "ngrave") {
    assert(isAffiliatePlaceholder(product.affiliateUrl), `${product.brandSlug} stays without a partner URL`);
    for (const key of REF_KEYS) {
      assert(!url.searchParams.has(key), `${product.slug} has no ${key}`);
    }
  }
  if (product.brandSlug === "trezor") assert(url.hostname === "trezor.io", "Trezor host");
  if (product.brandSlug === "tangem") assert(url.hostname === "tangem.com", "Tangem host");
  if (product.brandSlug === "ledger") assert(url.hostname === "shop.ledger.com", "Ledger host");
}

type OfferNode = {
  "@type"?: string;
  price?: unknown;
  lowPrice?: unknown;
  highPrice?: unknown;
  priceCurrency?: unknown;
  url?: unknown;
  availability?: unknown;
};

function offersOf(node: Record<string, unknown>): OfferNode[] {
  const offers = node.offers;
  if (Array.isArray(offers)) return offers as OfferNode[];
  if (offers && typeof offers === "object") return [offers as OfferNode];
  return [];
}

const schemaNotes: string[] = [];

for (const slug of WALLET_SEO_LANDING_SLUGS) {
  const landing = getWalletSeoLanding(slug);
  assert(landing.faqs.length >= 4 && landing.faqs.length <= 6, `${slug} has 4–6 FAQs`);
  assert(landing.metaDescription.length >= 80 && landing.metaDescription.length <= 170, `${slug} description length ${landing.metaDescription.length}`);
  assert(landing.metaTitle.endsWith("| Quick Exit"), `${slug} title`);
  assert(landing.lines.length === landing.products.length && landing.lines.length > 0, `${slug} lists products`);
  assert(landing.related.some((link) => link.href === "/ro/wallets"), `${slug} links to /ro/wallets`);
  assert(landing.related.some((link) => link.href === STIRILE_CRYPTO_URL), `${slug} links to Știrile Crypto`);
  for (const other of WALLET_SEO_LANDING_SLUGS) {
    if (other === slug) {
      assert(!landing.related.some((link) => link.href === walletSeoLandingCanonicalPath(other)), `${slug} does not link to itself`);
    } else {
      assert(
        landing.related.some((link) => link.href === walletSeoLandingCanonicalPath(other)),
        `${slug} links to ${other}`,
      );
    }
  }

  const text = walletSeoLandingPublicText(landing);
  for (const phrase of ["Black Friday", "BF2026", "BFCM", "Bybit", "OKX", "RedotPay", "cel mai bun", "se cumulează", "se combină"]) {
    assert(!text.includes(phrase), `${slug} copy contains ${phrase}`);
  }
  assert(!text.includes("%"), `${slug} copy has no percent claim`);

  for (const product of landing.products) {
    const line = landing.lines.find((item) => item.slug === product.slug);
    assert(line, `${product.slug} line`);
    const view = walletPriceView(product, "ro");
    if (view.status === "verified") {
      assert(line?.primary === view.primary, `${product.slug} price text matches the catalog`);
      assert(line?.checkedLabel?.includes(walletSeoCheckedDate(product)), `${product.slug} check date matches the catalog`);
      assert(text.includes(view.primary), `${slug} mentions the catalog price for ${product.slug}`);
    }
    assertOutbound(product, line?.outboundUrl ?? "");
    if (hasRealCheckoutCode(product) && product.affiliateCode) {
      assert(landing.checkoutCodes.includes(product.affiliateCode), `${slug} shows the catalog checkout code`);
    }
  }

  const json = buildWalletSeoJsonLd(landing, PRODUCTION_SITE_URL);
  const serialized = JSON.stringify(json);
  assert(!serialized.includes("aggregateRating") && !serialized.includes("reviewCount"), `${slug} has no fabricated rating`);
  assert(!serialized.includes("InStock") && !serialized.includes("availability"), `${slug} does not claim stock`);
  assert(!serialized.includes("/r/"), `${slug} schema has no /r/ URL`);

  const graph = json["@graph"];
  assert(Array.isArray(graph), `${slug} graph`);
  const nodes = graph as Record<string, unknown>[];
  const faq = nodes.find((node) => node["@type"] === "FAQPage");
  assert(faq, `${slug} FAQPage`);
  const mainEntity = faq?.mainEntity as { name?: string; acceptedAnswer?: { text?: string } }[];
  assert(mainEntity.length === landing.faqs.length, `${slug} FAQ count matches visible`);
  landing.faqs.forEach((item, index) => {
    assert(mainEntity[index]?.name === item.question, `${slug} FAQ question ${index}`);
    assert(mainEntity[index]?.acceptedAnswer?.text === item.answer, `${slug} FAQ answer ${index}`);
  });

  const productNodes = nodes.filter((node) => node["@type"] === "Product");
  const verified = landing.products.filter((product) => product.priceStatus === "verified" && product.listPrice != null);
  assert(productNodes.length === verified.length, `${slug} Product nodes`);
  for (const product of verified) {
    const node = productNodes.find((item) => item["@id"] === `${PRODUCTION_SITE_URL}${walletSeoLandingCanonicalPath(slug)}#${product.slug}`);
    assert(node, `${product.slug} Product node`);
    assert(node?.name === product.modelRo, `${product.slug} schema name`);
    const offers = offersOf(node ?? {});
    assert(offers.length > 0, `${product.slug} Offer`);
    const primary = offers[0];
    assert(primary, `${product.slug} primary offer`);
    if (product.listPriceMax != null) {
      assert(primary["@type"] === "AggregateOffer", `${product.slug} range is AggregateOffer`);
      assert(primary.lowPrice === product.listPrice && primary.highPrice === product.listPriceMax, `${product.slug} range prices`);
      assert(primary.priceCurrency === product.currency, `${product.slug} range currency`);
    } else {
      assert(primary["@type"] === "Offer", `${product.slug} Offer`);
      assert(primary.price === product.listPrice, `${product.slug} schema price is the catalog list price`);
      assert(primary.priceCurrency === product.currency, `${product.slug} schema currency`);
      if (product.compareAtPrice != null) {
        assert(primary.price !== product.compareAtPrice, `${product.slug} schema price is not the compare-at price`);
      }
    }
    assert(primary.url === product.officialUrl, `${product.slug} offer URL is the official page`);
    assert(primary.availability == null, `${product.slug} offer has no stock claim`);
    if (product.secondaryKind === "same_page" && product.secondaryAmount != null) {
      const secondary = offers[1];
      assert(secondary?.["@type"] === "Offer", `${product.slug} secondary offer`);
      assert(secondary?.price === product.secondaryAmount, `${product.slug} secondary amount`);
      assert(secondary?.priceCurrency === product.secondaryCurrency, `${product.slug} secondary currency`);
    }
    const image = node?.image;
    if (typeof image === "string") {
      assert(image.startsWith(`${PRODUCTION_SITE_URL}/wallets/`), `${product.slug} image is a local brand file`);
    }
  }

  schemaNotes.push(
    `${slug}: FAQPage ${landing.faqs.length}; Product ${productNodes.length}; stock claim omitted; prices read from catalog`,
  );
}

const tangem = getWalletSeoLanding("tangem-romania");
assert(!walletSeoLandingPublicText(tangem).includes(STIRILE_COMPROMISED_DEVICE_URL), "Tangem page does not carry the compromise story");
assert(!/defect|compromis|scam|furt|risc/i.test(walletSeoLandingPublicText(tangem)), "Tangem page stays positive");
assert(tangem.products.every((product) => product.brandSlug === "tangem"), "Tangem page is only Tangem");
const tangemCode = WALLET_PRODUCTS.find((product) => product.slug === "tangem-2-cards");
assert(tangemCode && hasRealCheckoutCode(tangemCode), "catalog still has a Tangem checkout code");
assert(tangem.checkoutCodes.includes(tangemCode?.affiliateCode ?? ""), "Tangem page shows that code");

const ledger = getWalletSeoLanding("ledger-romania");
assert(
  ledger.products.map((product) => product.slug).join() ===
    sortedWalletProducts()
      .filter((product) => product.brandSlug === "ledger")
      .map((product) => product.slug)
      .join(),
  "Ledger page follows the catalog, including models added later",
);

const trezor = getWalletSeoLanding("trezor-pret");
assert(trezor.products.every((product) => product.brandSlug === "trezor"), "Trezor page is only Trezor");
assert(trezor.lines.every((line) => line.primary?.includes("lei")), "Trezor lines show the catalog lei");

const hardware = getWalletSeoLanding("hardware-wallet");
const official = getWalletSeoLanding("de-ce-de-pe-site-ul-oficial");
const DANI = "Dani folosește Tangem.";
assert(hardware.intro.includes(DANI), "hardware page has the exact Dani sentence");
assert(tangem.intro.includes(DANI), "Tangem page has the exact Dani sentence");
assert(!hardware.intro.some((line) => line.includes("YouTube")), "hardware Dani sentence has no YouTube");
assert(!tangem.intro.some((line) => line.includes("YouTube")), "Tangem Dani sentence has no YouTube");

function hrefsOf(landing: { sources: { href: string }[]; related: { href: string }[] }): string[] {
  return [...landing.sources, ...landing.related].map((link) => link.href);
}
assert(hrefsOf(official).includes(STIRILE_COMPROMISED_DEVICE_URL), "compromise article stays on the official-site page");
assert(!hrefsOf(hardware).includes(STIRILE_COMPROMISED_DEVICE_URL), "hardware page has no compromise article");
assert(!hrefsOf(ledger).includes(STIRILE_COMPROMISED_DEVICE_URL), "Ledger page has no compromise article");
assert(hrefsOf(hardware).includes(STIRILE_HOT_COLD_URL), "hardware page keeps the hot vs cold guide");
assert(hrefsOf(ledger).includes(STIRILE_HOT_COLD_URL), "Ledger page keeps the hot vs cold guide");
assert(!hrefsOf(ledger).some((href) => href.includes("lerato.ro")), "Lerato is not a link");
assert(!JSON.stringify(ledger).includes("Lerato, singurul nume"), "Lerato label is not a link");
for (const landing of [hardware, ledger, tangem, trezor, official]) {
  assert(!walletSeoLandingPublicText(landing).includes("eMAG"), `${landing.slug} does not name eMAG`);
}

const entries = buildStaticSitemapEntries(PRODUCTION_SITE_URL, new Date("2026-11-27T12:00:00.000Z"));
for (const path of walletSeoLandingSitemapPaths()) {
  const romanian = `${PRODUCTION_SITE_URL}/ro${path}`;
  const english = `${PRODUCTION_SITE_URL}/en${path}`;
  assert(entries.filter((entry) => entry.url === romanian).length === 1, `sitemap lists ${romanian}`);
  assert(!entries.some((entry) => entry.url === english), `sitemap skips ${english}`);
  assert(!staticAndCategorySitemapPaths().includes(path), `${path} is not duplicated into both locales`);
}

  console.log(schemaNotes.join("\n"));
  console.log("OK wallet seo landings");
}

if (process.argv[1]?.endsWith("assert-wallet-seo-landings.ts")) {
  assertWalletSeoLandings();
}
