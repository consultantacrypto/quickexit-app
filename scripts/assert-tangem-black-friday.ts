/**
 * Tangem Black Friday banner: visibility clock and link href.
 * Do not request the /r/ URL. A fetch increments production counters.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TangemBlackFridayBanner from "../app/[locale]/wallets/TangemBlackFridayBanner";
import { isAffiliatePlaceholder, WALLET_PRODUCTS } from "../lib/walletCatalog";
import {
  TANGEM_BLACK_FRIDAY_CODE,
  TANGEM_BLACK_FRIDAY_COPY,
  TANGEM_BLACK_FRIDAY_ENDS_AT,
  TANGEM_BLACK_FRIDAY_HREF,
  TANGEM_BLACK_FRIDAY_REL,
  isTangemBlackFridayVisible,
  tangemBlackFridayBannerVisible,
} from "../lib/tangemBlackFriday";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

const EXACT_COPY = "Black Friday Tangem: până la 45% reducere cu codul BF2026, până pe 29.11";

assert(TANGEM_BLACK_FRIDAY_COPY === EXACT_COPY, "banner copy is the 29.11 sentence");
assert(TANGEM_BLACK_FRIDAY_COPY.includes(TANGEM_BLACK_FRIDAY_CODE), "copy includes the code");
assert(!TANGEM_BLACK_FRIDAY_COPY.includes("30.11"), "copy does not say 30.11");
assert(TANGEM_BLACK_FRIDAY_ENDS_AT === "2026-11-30T23:59:59Z", "cutoff constant");
assert(Date.parse(TANGEM_BLACK_FRIDAY_ENDS_AT) === Date.UTC(2026, 10, 30, 23, 59, 59), "cutoff parses as UTC");

const cutoff = new Date(TANGEM_BLACK_FRIDAY_ENDS_AT);
assert(isTangemBlackFridayVisible(new Date("2026-11-27T10:00:00Z")), "visible before the cutoff");
assert(isTangemBlackFridayVisible(new Date(cutoff.getTime() - 1)), "visible 1ms before the cutoff");
assert(isTangemBlackFridayVisible(cutoff), "visible at the cutoff");
assert(!isTangemBlackFridayVisible(new Date(cutoff.getTime() + 1)), "hidden 1ms after the cutoff");
assert(!isTangemBlackFridayVisible(new Date("2026-12-01T00:00:00.000Z")), "hidden on 1 December");
assert(!isTangemBlackFridayVisible(new Date(Number.NaN)), "invalid clock stays hidden");

assert(tangemBlackFridayBannerVisible(true, new Date("2026-11-27T10:00:00Z")), "server show, before");
assert(tangemBlackFridayBannerVisible(true, cutoff), "server show, at cutoff");
assert(!tangemBlackFridayBannerVisible(true, new Date(cutoff.getTime() + 1)), "server show, client hides after cutoff");
assert(!tangemBlackFridayBannerVisible(false, new Date("2026-11-27T10:00:00Z")), "server hide stays hidden before cutoff");
assert(!tangemBlackFridayBannerVisible(false, cutoff), "server hide stays hidden at cutoff");
assert(!tangemBlackFridayBannerVisible(false, new Date(cutoff.getTime() + 1)), "server hide stays hidden after cutoff");

assert(TANGEM_BLACK_FRIDAY_HREF === "https://www.mihaidaniel.ro/r/tangem?s=qe", "href constant");
const href = new URL(TANGEM_BLACK_FRIDAY_HREF);
assert(href.origin === "https://www.mihaidaniel.ro", "href origin");
assert(href.pathname === "/r/tangem", "href path");
assert(href.search === "?s=qe", "href query");
assert(TANGEM_BLACK_FRIDAY_REL === "sponsored noopener noreferrer", "rel");

const shown = renderToStaticMarkup(createElement(TangemBlackFridayBanner, { serverVisible: true }));
const shownHref = shown.match(/href="([^"]+)"/)?.[1];
assert(shownHref === TANGEM_BLACK_FRIDAY_HREF, "rendered href");
assert(shown.includes('target="_blank"'), "opens in a new tab");
assert(shown.includes(`rel="${TANGEM_BLACK_FRIDAY_REL}"`), "rendered rel");
assert(shown.includes(EXACT_COPY), "rendered copy");
assert(shown.includes(`>${TANGEM_BLACK_FRIDAY_CODE}<`), "rendered code chip");
assert(shown.includes('data-tangem-black-friday=""'), "banner marker");

const hidden = renderToStaticMarkup(createElement(TangemBlackFridayBanner, { serverVisible: false }));
assert(hidden === "", "hidden banner takes no markup");
assert(!hidden.includes(TANGEM_BLACK_FRIDAY_HREF), "hidden banner has no href");

const bannerSrc = readFileSync(resolve("app/[locale]/wallets/TangemBlackFridayBanner.tsx"), "utf8");
const pageSrc = readFileSync(resolve("app/[locale]/wallets/page.tsx"), "utf8");
const catalogSrc = readFileSync(resolve("app/[locale]/wallets/WalletCatalog.tsx"), "utf8");
const shelfSrc = readFileSync(resolve("app/components/HomeWalletShelf.tsx"), "utf8");
const libSrc = readFileSync(resolve("lib/tangemBlackFriday.ts"), "utf8");

assert(bannerSrc.includes("href={TANGEM_BLACK_FRIDAY_HREF}"), "banner uses the href constant");
assert(bannerSrc.includes("rel={TANGEM_BLACK_FRIDAY_REL}"), "banner uses the rel constant");
assert(bannerSrc.includes('target="_blank"'), "banner sets target");
assert(!bannerSrc.includes("https://www.mihaidaniel.ro"), "banner does not hardcode the partner URL");
assert(!/\bfetch\s*\(/.test(bannerSrc), "banner does not fetch");
assert(!/\bfetch\s*\(/.test(libSrc), "cutoff module does not fetch");
assert(!/\bfetch\s*\(/.test(pageSrc), "wallet page does not fetch the partner URL");

assert(pageSrc.includes('export const dynamic = "force-dynamic"'), "wallet page is dynamic");
assert(pageSrc.includes("await connection()"), "wallet page waits for the request");
assert(pageSrc.includes("isTangemBlackFridayVisible(new Date())"), "server clock gates the banner");
assert(pageSrc.includes("serverVisible={tangemPromoVisible}"), "server decision is passed through");

assert(catalogSrc.includes("{promo}"), "catalog renders the promo slot");
assert(!/Black Friday/i.test(catalogSrc), "catalog file keeps sale copy out of the shelf scan");
assert(!shelfSrc.includes("TangemBlackFridayBanner"), "homepage wallet shelf is unchanged");
assert(!shelfSrc.includes("mihaidaniel.ro/r/tangem"), "homepage shelf has no Tangem promo link");

for (const brandSlug of ["bitbox", "ngrave", "trezor"] as const) {
  const rows = WALLET_PRODUCTS.filter((item) => item.brandSlug === brandSlug);
  assert(rows.length > 0, `${brandSlug} still has products`);
  assert(
    rows.every((item) => isAffiliatePlaceholder(item.affiliateUrl)),
    `${brandSlug} stays without a referral link`,
  );
}

const tangemRows = WALLET_PRODUCTS.filter((item) => item.brandSlug === "tangem");
assert(
  tangemRows.every((item) => item.affiliateUrl === "TANGEM_PARTNER_LINK"),
  "product cards keep the Tangem placeholder",
);

console.log("OK tangem black friday banner");
