import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatDemandBudgetCompact } from "../lib/demandBudget";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function count(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

const home = readFileSync(resolve("app/[locale]/page.tsx"), "utf8");
const publicDemands = readFileSync(resolve("lib/publicDemands.ts"), "utf8");
const demandCard = readFileSync(resolve("app/components/DemandCard.tsx"), "utf8");
const capitalPage = readFileSync(resolve("app/[locale]/capital-disponibil/page.tsx"), "utf8");
const capitalIntro = readFileSync(
  resolve("app/[locale]/capital-disponibil/CapitalDisponibilIntro.tsx"),
  "utf8",
);
const capitalClient = readFileSync(
  resolve("app/[locale]/capital-disponibil/CapitalDisponibilClient.tsx"),
  "utf8",
);
const capitalGuide = readFileSync(
  resolve("app/[locale]/capital-disponibil/CapitalDisponibilGuide.tsx"),
  "utf8",
);
const capitalCopy = readFileSync(resolve("lib/capitalDisponibilContent.ts"), "utf8");
const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8")) as {
  Home: { capital: Record<string, string> };
  DemandCard: Record<string, string>;
};
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8")) as {
  Home: { capital: Record<string, string> };
  DemandCard: Record<string, string>;
};

assert(
  publicDemands.includes("export const HOME_PUBLIC_ACTIVE_DEMANDS_LIMIT = 3"),
  "home limit constant is 3",
);
assert(
  home.includes("fetchPublicActiveDemands(HOME_PUBLIC_ACTIVE_DEMANDS_LIMIT)"),
  "homepage fetches through shared helper with home limit",
);
assert(!home.includes('.gte("budget"'), "homepage does not filter demands by premium budget");
assert(!home.includes("showPremiumCapital"), "homepage does not gate cards on 3 premium rows");
assert(
  publicDemands.includes('.order("created_at", { ascending: false })'),
  "public fetch orders created_at DESC",
);
assert(
  publicDemands.includes('.order("id", { ascending: false })'),
  "public fetch orders id DESC after created_at",
);
assert(publicDemands.includes("b.id.localeCompare(a.id)"), "in-memory tie-break by id DESC");

assert(
  formatDemandBudgetCompact(100000, 500000, "ro") === "€100.000–€500.000",
  "shared formatter interval RO",
);
assert(
  formatDemandBudgetCompact(null, 500000, "en") === "Up to €500,000",
  "shared formatter fallback EN",
);
assert(home.includes("formatDemandBudget("), "homepage uses shared budget formatter");
assert(!home.includes("formatDemandBudgetCompact"), "homepage does not duplicate compact formatter");
assert(demandCard.includes("t(\"availableBudget\")"), "DemandCard shows budget label");
assert(demandCard.includes("{budget}"), "DemandCard renders formatted budget");
assert(demandCard.includes("{category"), "DemandCard renders category");
assert(demandCard.includes("targetAsset"), "DemandCard renders target asset");
assert(demandCard.includes("t(\"sellCta\")"), "DemandCard keeps existing CTA");
assert(capitalClient.includes("formatDemandBudget("), "directory cards use shared formatter");

assert(home.includes('href="/capital-disponibil"'), "home CTA targets capital-disponibil");
assert(ro.Home.capital.viewAll === "Vezi toate cererile", "RO view-all CTA");
assert(en.Home.capital.viewAll === "View all requests", "EN view-all CTA");
assert(ro.Home.capital.title === "Capital disponibil acum", "RO home capital title");
assert(en.Home.capital.title === "Capital available now", "EN home capital title");
assert(
  ro.Home.capital.description ===
    "Cumpărători activi caută proprietăți, automobile, afaceri și alte active.",
  "RO home capital subtitle",
);
assert(
  en.Home.capital.description ===
    "Active buyers are looking for property, automobiles, businesses, and other assets.",
  "EN home capital subtitle",
);

const categoriesAt = home.indexOf('tHome("categoriesTitle")');
const capitalAt = home.indexOf('id="active-capital"');
const emptyStripAt = home.indexOf('tHome("capital.emptyStripCta")');
const listingsAt = home.indexOf('id="active-assets"');
assert(categoriesAt > 0 && listingsAt > categoriesAt, "categories precede listings");
assert(capitalAt > categoriesAt && capitalAt < listingsAt, "demand cards precede sale listings");
assert(emptyStripAt > categoriesAt && emptyStripAt < listingsAt, "empty CTA precedes sale listings");
assert(!home.includes("carousel"), "no carousel on homepage demands");

const introAt = capitalPage.indexOf("<CapitalDisponibilIntro");
const clientAt = capitalPage.indexOf("<CapitalDisponibilClient");
const guideAt = capitalPage.indexOf("<CapitalDisponibilGuide");
assert(introAt > 0 && clientAt > introAt && guideAt > clientAt, "capital page order: hero, results, SEO");
assert(!capitalIntro.includes("copy.sections"), "hero does not render SEO sections");
assert(capitalGuide.includes("copy.sections.whatIs"), "explanations live below results");
assert(capitalGuide.includes("copy.relatedLinks"), "related pages stay below explanations");
assert(capitalClient.includes("copy.searchPlaceholder"), "filters stay on results block");
assert(capitalClient.includes("copy.safetyNote"), "safety note sits with results");
assert(capitalClient.includes("copy.filterCountLabel"), "result count sits with results");

const pageSurface = `${capitalIntro}\n${capitalClient}\n${capitalGuide}\n${capitalPage}`;
assert(count(pageSurface, "Ce nu face Quick Exit") === 0, "RO legal title is not hardcoded in JSX");
assert(count(capitalCopy, 'title: "Ce nu face Quick Exit?"') === 1, "RO legal title appears once");
assert(count(capitalCopy, 'title: "What Quick Exit does not do"') === 1, "EN legal title appears once");
assert(count(capitalGuide, "copy.sections.notQuickExit") === 1, "legal block rendered once");
assert(!capitalGuide.includes("copy.compliance"), "duplicate compliance box removed");
assert(!capitalIntro.includes("copy.compliance"), "hero has no duplicate legal box");
assert(!capitalCopy.includes("compliance:"), "duplicate compliance copy removed from source");

const publicSelect = publicDemands.match(/PUBLIC_DEMAND_SELECT =\s*"([^"]+)"/)?.[1] ?? "";
assert(publicSelect === "id,target_asset,category,budget_min,budget,description,status,created_at", "explicit public demand columns");
assert(!/\bbuyer_id\b/.test(publicSelect), "select omits buyer_id");
assert(!/\bemail\b/.test(publicSelect), "select omits email");
assert(!/\bphone\b/.test(publicSelect), "select omits phone");
assert(!home.includes(".select(\"*\")"), "homepage does not select *");
assert(!capitalClient.includes("buyer_id"), "directory client does not expose buyer_id");
assert(!capitalPage.includes("buyer_id"), "capital page does not expose buyer_id");

assert(home.includes("export const revalidate = 60"), "homepage ISR 60s");
assert(capitalPage.includes("export const revalidate = 60"), "capital page ISR 60s");
assert(
  home.includes("grid-cols-1") && home.includes("lg:grid-cols-3"),
  "home demands are 1–3 columns",
);

for (const key of Object.keys(ro.Home.capital)) {
  assert(typeof en.Home.capital[key] === "string", `en Home.capital.${key}`);
}
for (const key of Object.keys(en.Home.capital)) {
  assert(typeof ro.Home.capital[key] === "string", `ro Home.capital.${key}`);
}
for (const key of Object.keys(ro.DemandCard)) {
  assert(typeof en.DemandCard[key] === "string", `en DemandCard.${key}`);
}
for (const key of Object.keys(en.DemandCard)) {
  assert(typeof ro.DemandCard[key] === "string", `ro DemandCard.${key}`);
}

assert(capitalCopy.includes("intervalul de buget"), "RO copy describes budget range");
assert(capitalCopy.includes("budget range"), "EN copy describes budget range");

console.log("OK demand-discovery-home");
