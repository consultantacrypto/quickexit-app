import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEMAND_BUDGET_MAX_EUR,
  DEMAND_BUDGET_MIN_EUR,
  formatDemandBudgetCompact,
  formatDemandBudgetFull,
  parseDemandBudgetInput,
  parseDemandBudgetRange,
  readDemandBudgetAmount,
} from "../lib/demandBudget";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

assert(DEMAND_BUDGET_MIN_EUR === 1, "min constant is 1");
assert(DEMAND_BUDGET_MAX_EUR === 100_000_000, "max constant is 100000000");

assert(parseDemandBudgetRange("1", "100000000").ok === true, "1–100000000 valid");
assert(parseDemandBudgetRange("100000", "500000").ok === true, "100000–500000 valid");
const equalRange = parseDemandBudgetRange("250000", "250000");
assert(equalRange.ok && equalRange.budgetMin === 250000 && equalRange.budget === 250000, "min = max valid");

assert(parseDemandBudgetInput("0") === null, "zero rejected");
assert(parseDemandBudgetInput("-1") === null, "negative rejected");
assert(parseDemandBudgetInput("10.5") === null, "fractional rejected");
assert(parseDemandBudgetInput("1e6") === null, "exponent rejected");
assert(parseDemandBudgetInput("1E5") === null, "uppercase exponent rejected");
assert(parseDemandBudgetInput(10.5) === null, "number fractional rejected");
assert(parseDemandBudgetInput(200000000) === null, "number over 100M rejected");
assert(parseDemandBudgetInput(1e8) === 100_000_000, "1e8 number equals 100000000 and is allowed as integer");
assert(parseDemandBudgetInput("NaN") === null, "NaN string rejected");
assert(parseDemandBudgetInput(Number.NaN) === null, "NaN rejected");
assert(parseDemandBudgetInput(Number.POSITIVE_INFINITY) === null, "Infinity rejected");

assert(parseDemandBudgetRange("500000", "100000").ok === false, "min > max rejected");
const inverted = parseDemandBudgetRange("500000", "100000");
assert(!inverted.ok && inverted.code === "min_exceeds_max", "min > max code");

assert(readDemandBudgetAmount("100000.00") === 100000, "numeric string from supabase");
assert(readDemandBudgetAmount(100000) === 100000, "number from supabase");
assert(readDemandBudgetAmount("1e5") === null, "stored exponent rejected");
assert(readDemandBudgetAmount("100000.50") === null, "stored fraction rejected");
assert(readDemandBudgetAmount(null) === null, "null stored min");

assert(
  formatDemandBudgetCompact(100000, 500000, "ro") === "€100.000–€500.000",
  "RO interval compact",
);
assert(
  formatDemandBudgetCompact(100000, 500000, "en") === "€100,000–€500,000",
  "EN interval compact",
);
assert(formatDemandBudgetCompact(null, 500000, "ro") === "Până la €500.000", "RO fallback");
assert(formatDemandBudgetCompact(null, 500000, "en") === "Up to €500,000", "EN fallback");
assert(
  formatDemandBudgetFull(100000, 500000, "ro") === "Buget disponibil: €100.000–€500.000",
  "RO full interval",
);
assert(
  formatDemandBudgetFull(null, 500000, "en") === "Available budget: Up to €500,000",
  "EN full fallback",
);

const form = readFileSync(resolve("app/[locale]/posteaza-cerere/PosteazaCerereClient.tsx"), "utf8");
assert(form.includes("budget_min: parsedRange.budgetMin"), "form insert sends budget_min");
assert(form.includes("budget: parsedRange.budget"), "form insert sends budget as max");
assert(form.includes("parseDemandBudgetRange"), "form uses shared parser before insert");
assert(form.includes("budgetMinLabel"), "form has min label");
assert(form.includes("budgetMaxLabel"), "form has max label");
assert(form.includes('id="demand-budget-min"'), "min input id");
assert(form.includes('id="demand-budget-max"'), "max input id");
assert(/id="demand-budget-min"[\s\S]*?type="text"/.test(form), "min budget is text/numeric");
assert(/id="demand-budget-max"[\s\S]*?type="text"/.test(form), "max budget is text/numeric");
assert(form.includes("/api/stripe/checkout"), "existing checkout still used");

const checkout = readFileSync(resolve("app/api/stripe/checkout/route.ts"), "utf8");
const checkoutDemand = readFileSync(resolve("app/api/checkout-demand/route.ts"), "utf8");
const stripeWebhook = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
assert(!checkout.includes("budget_min"), "stripe checkout does not touch budget_min");
assert(!checkoutDemand.includes("budget_min"), "legacy checkout-demand does not touch budget_min");
assert(!stripeWebhook.includes("budget_min"), "stripe webhook does not touch budget_min");

const offerPage = readFileSync(resolve("app/[locale]/trimite-oferta/[id]/page.tsx"), "utf8");
assert(offerPage.includes("PUBLIC_DEMAND_OFFER_SELECT"), "offer page uses explicit select");
assert(!offerPage.includes(".select('*')"), "offer page does not select *");
assert(!offerPage.includes("buyer_id"), "public offer query does not mention buyer_id");
assert(offerPage.includes("demandMaxBudget"), "offer cap uses maximum budget");
assert(offerPage.includes("max={demandMaxBudget ?? undefined}"), "offer input max is demand max");
assert(offerPage.includes("formatDemandBudgetFull"), "offer page shows full budget label");

const listingPrice = readFileSync(resolve("lib/listingPrice.ts"), "utf8");
assert(listingPrice.includes("exit_price"), "sale listing prices helper untouched");
assert(!listingPrice.includes("budget_min"), "listing price helper has no demand budget_min");

const publicDemands = readFileSync(resolve("lib/publicDemands.ts"), "utf8");
assert(publicDemands.includes("budget_min"), "public demand row includes budget_min");
assert(publicDemands.includes("readDemandBudgetAmount"), "public fetch uses shared reader");

const sqlPath = resolve("docs/internal/sql/demand-budget-ranges.sql");
const sql = readFileSync(sqlPath, "utf8");
assert(/^BEGIN;/m.test(sql), "sql is transactional BEGIN");
assert(/^COMMIT;/m.test(sql), "sql is transactional COMMIT");
assert(/ADD COLUMN IF NOT EXISTS budget_min numeric/.test(sql), "adds budget_min numeric");
assert(/demands_budget_positive/.test(sql), "positive budget constraint");
assert(/demands_budget_ceiling/.test(sql), "ceiling constraint");
assert(/demands_budget_whole_units/.test(sql), "whole units constraint");
assert(/demands_budget_min_range/.test(sql), "budget_min range constraint");
assert(/budget > 0/.test(sql), "budget > 0");
assert(/budget <= 100000000/.test(sql), "budget ceiling 100000000");
assert(/budget = trunc\(budget\)/.test(sql), "budget is whole");
assert(/budget_min IS NULL/.test(sql), "budget_min nullable path");
assert(/budget_min <= budget/.test(sql), "min <= max");
assert(/COMMENT ON COLUMN public\.demands\.budget_min/.test(sql), "column comment");
assert(/pg_constraint/.test(sql), "catalog check before constraints");

const executableSql = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");
assert(!/\blistings\b/.test(executableSql), "sql does not alter listings");
assert(!/\bdemand_offers\b/.test(executableSql), "sql does not touch demand_offers");
assert(!/\bstripe\b/i.test(executableSql), "sql does not mention stripe");
assert(!/^\s*DROP\b/im.test(executableSql), "no executable DROP");
assert(!/^\s*TRUNCATE\b/im.test(executableSql), "no TRUNCATE");
assert(!/\bGRANT\b/.test(executableSql), "no GRANT");
assert(!/\bREVOKE\b/.test(executableSql), "no REVOKE");
assert(!/\bPOLICY\b/.test(executableSql), "no RLS policy changes");

const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8")) as {
  PosteazaCerere: Record<string, string>;
  DemandCard: Record<string, string>;
};
const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8")) as {
  PosteazaCerere: Record<string, string>;
  DemandCard: Record<string, string>;
};
for (const key of Object.keys(ro.PosteazaCerere)) {
  assert(typeof en.PosteazaCerere[key] === "string", `en PosteazaCerere.${key}`);
}
assert(ro.DemandCard.availableBudget === "Buget disponibil", "RO available budget label");
assert(en.DemandCard.availableBudget === "Available budget", "EN available budget label");

console.log("OK demand-budget-ranges");
