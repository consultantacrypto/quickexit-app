import { existsSync, readFileSync } from "node:fs";
import { listingsIndexPath } from "../src/i18n/paths";
import { parseListingsCategoryParam } from "../lib/listingCategories";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const home = readFileSync("app/[locale]/page.tsx", "utf8");
const viewAllAt = home.indexOf('tHome("listings.viewAll")');
assert(viewAllAt > 0, "homepage viewAll label present");
const viewAllContext = home.slice(Math.max(0, viewAllAt - 350), viewAllAt);
assert(viewAllContext.includes("listingsIndexPath()"), "viewAll uses listings index path");
assert(!viewAllContext.includes('categoryPath("auto")'), "viewAll does not target Auto category");

assert(listingsIndexPath() === "/anunturi", "index path is /anunturi");
assert(
  listingsIndexPath("auto") === "/anunturi?category=auto",
  "auto filter stays on all-listings route",
);
assert(parseListingsCategoryParam(null) === null, "default filter is all");
assert(parseListingsCategoryParam("auto") === "auto", "auto slug parsed");
assert(parseListingsCategoryParam("AUTO") === "auto", "slug is case-insensitive");
assert(parseListingsCategoryParam("not-a-category") === null, "unknown slug is all");

const anunturiPage = readFileSync("app/[locale]/anunturi/page.tsx", "utf8");
assert(anunturiPage.includes('.eq("status", "active")'), "public status filter");
assert(anunturiPage.includes('.eq("is_seed", false)'), "seed listings excluded");
assert(anunturiPage.includes('.order("created_at", { ascending: false })'), "newest first");
assert(!anunturiPage.includes('.eq("category"'), "all-listings query is not Auto-only");

assert(!existsSync("app/[locale]/editeaza-anunt/brand-harness"), "brand-harness runtime route removed");

console.log("OK all-listings-link");
