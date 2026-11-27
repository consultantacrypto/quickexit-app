/**
 * Free QuickExit car valuation. No network and no database.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  QE_INSUFFICIENT_MESSAGE,
  QE_VALUATION_CONSENT_VERSION,
  QE_TIER2_MIN_COMPARABLES,
  buildQePublicBody,
  buildValuationReportText,
  comparableFromListing,
  comparablesFromListings,
  kmWindow,
  normalizeBaseModel,
  normalizeMake,
  percentileInc,
  selectQeTier,
  type QeListingRow,
  type QeValuation,
} from "../lib/qeCarValuation";
import {
  QE_VALUATION_RATE_LIMIT_MAX,
  checkQeValuationRateLimit,
  resetQeValuationRateLimitForTests,
  runQeCarValuation,
  type QeValuationDeps,
} from "../lib/qeCarValuationRequest";
import { sendValuationReportEmail } from "../lib/qeValuationEmail";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const SECRET_EMAIL = "secret.person@example.com";
const SELLER_EMAIL = "seller.secret@example.com";
const SECRET_LISTING_ID = "listing-secret-42";
const SECRET_SPEC = "dotare-secreta-anunt";

function listing(input: {
  id: string;
  make: string;
  model: string;
  year: number;
  km: number;
  price: number;
  specs?: string;
}): QeListingRow {
  return {
    id: input.id,
    category: "Auto & Moto",
    status: "active",
    is_seed: false,
    exit_price: input.price,
    details: {
      make: input.make,
      model: input.model,
      year: input.year,
      km: input.km,
      specs: input.specs ?? "",
      seller_email: SELLER_EMAIL,
    },
  };
}

function fiveX6(): QeListingRow[] {
  return [40000, 45000, 50000, 55000, 60000].map((price, index) =>
    listing({
      id: index === 0 ? SECRET_LISTING_ID : `x6-${index}`,
      make: index === 2 ? "BMW" : "bmw",
      model: "X6 xDrive40i M Sport",
      year: 2020 + (index % 3),
      km: 35000 + index * 2000,
      price,
      specs: SECRET_SPEC,
    }),
  );
}

type Calls = {
  fetch: number;
  lead: number;
  request: number;
  send: number;
  purposes: Array<string | null>;
};

function harness(rows: QeListingRow[], patch?: Partial<QeValuationDeps>): { deps: QeValuationDeps; calls: Calls } {
  const calls: Calls = { fetch: 0, lead: 0, request: 0, send: 0, purposes: [] };
  const deps: QeValuationDeps = {
    now: () => Date.UTC(2026, 10, 27),
    env: {},
    checkRateLimit: () => ({ allowed: true }),
    verifyTurnstile: async () => ({ ok: true }),
    fetchListings: async () => {
      calls.fetch += 1;
      return { ok: true, rows };
    },
    probeStorage: async () => "ready",
    findRecentRequest: async () => false,
    insertLead: async () => {
      calls.lead += 1;
      return { ok: true, id: "lead-1" };
    },
    insertRequest: async (input) => {
      calls.request += 1;
      calls.purposes.push(input.purpose);
      return { ok: true };
    },
    sendReport: async () => {
      calls.send += 1;
      return "sent";
    },
    ...patch,
  };
  return { deps, calls };
}

async function post(raw: string, rows: QeListingRow[], patch?: Partial<QeValuationDeps>) {
  const { deps, calls } = harness(rows, patch);
  const outcome = await runQeCarValuation({ rawText: raw, ip: "203.0.113.8" }, deps);
  return { outcome, calls };
}

async function main() {
  assert(normalizeMake("Mercedes") === normalizeMake("Mercedes-Benz"), "mercedes alias");
  assert(normalizeMake("Mercedes-Benz") === "mercedes benz", "mercedes canonical key");
  assert(normalizeMake("VW") === normalizeMake("Volkswagen"), "vw alias");
  assert(normalizeMake("Volkswagen") === "volkswagen", "volkswagen key");
  assert(normalizeMake("Škoda") === "skoda", "skoda diacritics");
  assert(normalizeMake("BMW") === "bmw", "bmw key");

  assert(normalizeBaseModel("X6 xDrive40i M Sport") === "x6", "strip x6 trim");
  assert(normalizeBaseModel("Model Y Long Range") === "model y", "tesla model y");
  assert(normalizeBaseModel("ID.4 Pro") === "id.4", "id.4 keeps the dot");
  assert(normalizeBaseModel("Golf 8 GTI") === "golf", "golf drops generation and gti");
  assert(normalizeBaseModel("Clasa E") === normalizeBaseModel("E-Class"), "class alias");
  assert(normalizeBaseModel("Clasa E") === "clasa e", "clasa e key");
  assert(normalizeBaseModel("320d xDrive") === "320d", "first engine token is the model");

  const tight = kmWindow(40000, 1);
  assert(tight.min === 30000 && tight.max === 50000, "tier 1 km ±25%");
  const fresh = kmWindow(100, 1);
  assert(fresh.min === 0 && fresh.max === 10100, "tier 1 km floor for new cars");
  const wide = kmWindow(80000, 2);
  assert(wide.min === 32000 && wide.max === 128000, "tier 2 wider km");

  const odds = [10000, 20000, 30000, 40000, 50000];
  assert(percentileInc(odds, 25) === 20000, "p25 of 5");
  assert(percentileInc(odds, 50) === 30000, "p50 of 5");
  assert(percentileInc(odds, 75) === 40000, "p75 of 5");
  const even = [10000, 20000, 30000, 40000];
  assert(percentileInc(even, 25) === 17500, "p25 interpolated");
  assert(percentileInc(even, 50) === 25000, "p50 interpolated");
  assert(percentileInc(even, 75) === 32500, "p75 interpolated");

  const tier1 = selectQeTier({
    comparables: comparablesFromListings(fiveX6()),
    makeKey: normalizeMake("BMW"),
    modelKey: normalizeBaseModel("X6"),
    year: 2021,
    km: 40000,
    tier3Enabled: false,
  });
  assert(tier1.sufficient && tier1.tier === 1, "five close comps are tier 1");
  assert(tier1.comparableCount === 5, "tier 1 count");
  assert(tier1.p25 === 45000 && tier1.p50 === 50000 && tier1.p75 === 55000, "tier 1 percentiles");

  const four = fiveX6().slice(0, 4);
  const tierFromFour = selectQeTier({
    comparables: comparablesFromListings(four),
    makeKey: "bmw",
    modelKey: "x6",
    year: 2021,
    km: 40000,
    tier3Enabled: false,
  });
  assert(tierFromFour.tier === 2, "four comps fall through to the wide tier");
  assert(tierFromFour.tierLabel === "estimare lărgită, încredere scăzută", "tier 2 label");
  assert(tierFromFour.comparableCount === 4, "tier 2 keeps the four");
  assert(QE_TIER2_MIN_COMPARABLES === 3, "tier 2 minimum stays 3");

  const tier2Rows = [
    listing({ id: "a", make: "BMW", model: "X6", year: 2021, km: 80000, price: 70000 }),
    listing({ id: "b", make: "BMW", model: "X6 xDrive40i", year: 2022, km: 90000, price: 80000 }),
    listing({ id: "c", make: "BMW", model: "X6", year: 2018, km: 110000, price: 110000 }),
    listing({ id: "other", make: "Audi", model: "Q5", year: 2021, km: 80000, price: 99999 }),
  ];
  const tier2 = selectQeTier({
    comparables: comparablesFromListings(tier2Rows),
    makeKey: "bmw",
    modelKey: "x6",
    year: 2021,
    km: 80000,
    tier3Enabled: false,
  });
  assert(tier2.tier === 2 && tier2.comparableCount === 3, "wider year and km reach 3");
  assert(tier2.p25 === 75000 && tier2.p50 === 80000 && tier2.p75 === 95000, "tier 2 percentiles");

  const tooFew = selectQeTier({
    comparables: comparablesFromListings(tier2Rows.slice(0, 2)),
    makeKey: "bmw",
    modelKey: "x6",
    year: 2021,
    km: 80000,
    tier3Enabled: false,
  });
  assert(tooFew.sufficient === false && tooFew.tier === null, "below threshold has no tier");
  assert(tooFew.p25 === null && tooFew.p50 === null && tooFew.p75 === null, "below threshold has no prices");
  assert(tooFew.comparableCount === 2, "below threshold still reports the count");

  const otherModels = ["X1", "X3", "X5", "X7"].map((model, index) =>
    listing({
      id: `other-${index}`,
      make: "BMW",
      model,
      year: 2021,
      km: 40000,
      price: (index + 1) * 10000,
    }),
  );
  const tier3Off = selectQeTier({
    comparables: comparablesFromListings(otherModels),
    makeKey: "bmw",
    modelKey: "x6",
    year: 2021,
    km: 40000,
    tier3Enabled: false,
  });
  assert(tier3Off.sufficient === false && tier3Off.p50 === null, "tier 3 stays off");

  const tier3On = selectQeTier({
    comparables: comparablesFromListings(otherModels),
    makeKey: "bmw",
    modelKey: "x6",
    year: 2021,
    km: 40000,
    tier3Enabled: true,
  });
  assert(tier3On.tier === 3 && tier3On.comparableCount === 4, "tier 3 flag matches make and year");
  assert(tier3On.p25 === 17500 && tier3On.p50 === 25000 && tier3On.p75 === 32500, "tier 3 percentiles");

  const equipmentRows = [
    listing({ id: "eq-1", make: "BMW", model: "X6", year: 2021, km: 40000, price: 40000, specs: "full" }),
    listing({ id: "eq-2", make: "BMW", model: "X6", year: 2021, km: 42000, price: 50000, specs: "empty" }),
    listing({ id: "eq-3", make: "BMW", model: "X5", year: 2021, km: 40000, price: 90000, specs: "full" }),
  ];
  const equipmentIgnored = selectQeTier({
    comparables: comparablesFromListings(equipmentRows),
    makeKey: "bmw",
    modelKey: "x6",
    year: 2021,
    km: 40000,
    tier3Enabled: false,
  });
  assert(equipmentIgnored.comparableCount === 2, "equipment does not add or remove comps");
  const parsed = comparableFromListing(equipmentRows[0]!);
  assert(parsed !== null && !("specs" in parsed), "parser keeps price fields only");
  assert(!JSON.stringify(parsed).includes(SELLER_EMAIL), "parser drops seller email");

  const seeded = comparableFromListing({ ...listing({ id: "seed", make: "BMW", model: "X6", year: 2021, km: 1, price: 1 }), is_seed: true });
  assert(seeded === null, "seed listings are not comps");

  const publicInsufficient = buildQePublicBody({
    valuation: tooFew,
    equipment: "climatronic",
    emailStatus: "not_requested",
    emailDelivery: "not_requested",
  });
  assert(publicInsufficient.range === null, "public range is null below threshold");
  assert(publicInsufficient.message === QE_INSUFFICIENT_MESSAGE, "insufficient message");
  assert(!("p25" in publicInsufficient) || publicInsufficient.range === null, "no loose p25");
  assert(!JSON.stringify(publicInsufficient).includes('"p25"'), "serialized body has no p25");

  const low = await post(
    JSON.stringify({ make: "BMW", model: "X6", year: 2021, km: 80000 }),
    tier2Rows.slice(0, 2),
  );
  assert(low.outcome.status === 200, "insufficient request is 200");
  assert(low.outcome.body.range === null, "insufficient response has null range");
  assert(low.outcome.body.message === QE_INSUFFICIENT_MESSAGE, "insufficient copy");
  assert(low.outcome.body.p25 === undefined && low.outcome.body.p50 === undefined, "no price keys");
  assert(!JSON.stringify(low.outcome.body).match(/p25|p50|p75/), "no percentile keys at all");

  const priced = await post(JSON.stringify({ make: "BMW", model: "X6", year: 2021, km: 40000, equipment: "piele" }), fiveX6());
  const pricedBody = JSON.stringify(priced.outcome.body);
  assert(priced.outcome.status === 200 && priced.outcome.body.sufficient === true, "priced response");
  assert(!pricedBody.includes(SECRET_EMAIL), "response has no request email");
  assert(!pricedBody.includes(SELLER_EMAIL), "response has no seller email");
  assert(!pricedBody.includes(SECRET_LISTING_ID), "response has no listing id");
  assert(!pricedBody.includes(SECRET_SPEC), "response has no listing equipment");
  assert(priced.calls.lead === 0, "no lead without an email");
  assert(priced.calls.send === 0, "email flag off does not send");

  const noConsent = await post(
    JSON.stringify({ make: "BMW", model: "X6", year: 2021, km: 40000, email: SECRET_EMAIL, consent: false }),
    fiveX6(),
  );
  assert(noConsent.outcome.status === 400, "email requires consent");
  assert(noConsent.calls.lead === 0 && noConsent.calls.request === 0 && noConsent.calls.fetch === 0, "rejected email does not write");
  assert(!JSON.stringify(noConsent.outcome.body).includes(SECRET_EMAIL), "error body has no email");

  const honeypot = await post(
    JSON.stringify({ website: "https://spam.example", make: "BMW", model: "X6", year: 2021, km: 40000, email: SECRET_EMAIL }),
    fiveX6(),
  );
  assert(honeypot.outcome.status === 200, "honeypot is 200");
  assert(JSON.stringify(honeypot.outcome.body) === JSON.stringify({ success: true }), "honeypot body is empty success");
  assert(honeypot.calls.fetch === 0 && honeypot.calls.lead === 0 && honeypot.calls.request === 0, "honeypot does not write or read");

  const saved = await post(
    JSON.stringify({
      make: "BMW",
      model: "X6",
      year: 2021,
      km: 40000,
      email: SECRET_EMAIL,
      consent: true,
      consent_version: QE_VALUATION_CONSENT_VERSION,
      purpose: "report",
    }),
    fiveX6(),
    {
      sendReport: async () => {
        throw new Error("send must stay disabled");
      },
    },
  );
  assert(saved.outcome.status === 200, "consented email still returns the valuation");
  assert(saved.calls.lead === 1 && saved.calls.request === 1, "consent stores a lead and a request");
  assert(saved.calls.purposes[0] === "report", "a priced email is stored as report");
  assert(saved.outcome.body.email_status === "accepted", "stored without sending");
  assert(saved.outcome.body.email_delivery === "disabled", "delivery flag is off");
  assert(!JSON.stringify(saved.outcome.body).includes("secret.person"), "accepted response has no email");
  assert(!JSON.stringify(saved.outcome.body).includes("@"), "accepted response has no address");

  const missingTable = await post(
    JSON.stringify({
      make: "BMW",
      model: "X6",
      year: 2021,
      km: 40000,
      email: SECRET_EMAIL,
      consent: true,
      consent_version: QE_VALUATION_CONSENT_VERSION,
      purpose: "report",
    }),
    fiveX6(),
    { probeStorage: async () => "missing" },
  );
  assert(missingTable.outcome.body.sufficient === true, "missing table still prices");
  assert(missingTable.outcome.body.email_status === "unavailable", "email capture degrades");
  assert(missingTable.calls.lead === 0 && missingTable.calls.request === 0, "missing table does not write");

  const sent = await post(
    JSON.stringify({
      make: "BMW",
      model: "X6",
      year: 2021,
      km: 40000,
      email: SECRET_EMAIL,
      consent: true,
      consent_version: QE_VALUATION_CONSENT_VERSION,
      purpose: "report",
    }),
    fiveX6(),
    { env: { VALUATION_REPORT_EMAIL_ENABLED: "true" } },
  );
  assert(sent.calls.send === 1 && sent.outcome.body.email_status === "sent", "flag on sends once");

  const notify = await post(
    JSON.stringify({
      make: "BMW",
      model: "X6",
      year: 2021,
      km: 80000,
      email: SECRET_EMAIL,
      consent: true,
      consent_version: QE_VALUATION_CONSENT_VERSION,
      purpose: "notify",
    }),
    tier2Rows.slice(0, 2),
    { env: { VALUATION_REPORT_EMAIL_ENABLED: "true" } },
  );
  assert(notify.outcome.status === 200 && notify.outcome.body.sufficient === false, "notify path has no range");
  assert(notify.calls.purposes[0] === "notify", "insufficient email is stored as notify");
  assert(notify.calls.send === 0, "notify does not send a report");
  assert(!JSON.stringify(notify.outcome.body).includes(SECRET_EMAIL), "notify response has no email");

  const wrongPurpose = await post(
    JSON.stringify({
      make: "BMW",
      model: "X6",
      year: 2021,
      km: 80000,
      email: SECRET_EMAIL,
      consent: true,
      consent_version: QE_VALUATION_CONSENT_VERSION,
      purpose: "report",
    }),
    tier2Rows.slice(0, 2),
  );
  assert(wrongPurpose.outcome.status === 400, "purpose must match the result");
  assert(wrongPurpose.calls.lead === 0 && wrongPurpose.calls.request === 0, "mismatched purpose does not write");
  assert(!JSON.stringify(sent.outcome.body).includes(SECRET_EMAIL), "sent response has no email");

  const blocked = await post(JSON.stringify({ make: "BMW", model: "X6", year: 2021, km: 1 }), fiveX6(), {
    checkRateLimit: () => ({ allowed: false }),
  });
  assert(blocked.outcome.status === 429 && blocked.calls.fetch === 0, "rate limit skips the read");

  const bot = await post(JSON.stringify({ make: "BMW", model: "X6", year: 2021, km: 1 }), fiveX6(), {
    verifyTurnstile: async () => ({ ok: false, reason: "invalid_token" }),
  });
  assert(bot.outcome.status === 403 && bot.calls.fetch === 0, "turnstile skips the read");

  const unread = await post(JSON.stringify({ make: "BMW", model: "X6", year: 2021, km: 1 }), fiveX6(), {
    fetchListings: async () => ({ ok: false }),
  });
  assert(unread.outcome.status === 503, "unreadable inventory is an error");
  assert(!JSON.stringify(unread.outcome.body).match(/p25|p50|p75|\d{4,}/), "error invents no price");

  resetQeValuationRateLimitForTests();
  for (let i = 0; i < QE_VALUATION_RATE_LIMIT_MAX; i += 1) {
    assert(checkQeValuationRateLimit("198.51.100.4").allowed, `rate slot ${i + 1}`);
  }
  assert(!checkQeValuationRateLimit("198.51.100.4").allowed, "13th request is blocked");
  resetQeValuationRateLimitForTests();

  const report = buildValuationReportText({
    make: "BMW",
    model: "X6",
    year: 2021,
    km: 40000,
    equipment: "piele",
    valuation: tier1,
  });
  assert(!report.includes("@"), "report text has no address");
  assert(report.includes("nu din prețuri de tranzacție"), "report carries the disclaimer");

  let fetched = false;
  const disabledSend = await sendValuationReportEmail(
    { to: SECRET_EMAIL, subject: "Interval", text: "fara adresa" },
    {
      env: {},
      fetchImpl: async () => {
        fetched = true;
        return new Response(null, { status: 200 });
      },
    },
  );
  assert(disabledSend === "disabled" && fetched === false, "sender stays off without the flag");

  const refused = await sendValuationReportEmail(
    { to: SECRET_EMAIL, subject: "Interval", text: `catre ${SECRET_EMAIL}` },
    {
      env: { VALUATION_REPORT_EMAIL_ENABLED: "true", RESEND_API_KEY: "re_test", RESEND_FROM: "QuickExit <alerts@example.com>" },
      fetchImpl: async () => {
        fail("must not send a body that contains the recipient");
      },
    },
  );
  assert(refused === "failed", "sender refuses a body that echoes the recipient");

  const root = resolve(".");
  const evaluateRoute = readFileSync(resolve(root, "app/api/evaluate/route.ts"), "utf8");
  assert(evaluateRoute.includes("const live_comparable_count = 0"), "existing route still ignores QE comps");
  assert(evaluateRoute.includes("serpapi.com"), "existing route still calls SerpAPI");
  assert(evaluateRoute.includes("generativelanguage.googleapis.com"), "existing route still calls Gemini");
  assert(!evaluateRoute.includes("qeCarValuation"), "existing route does not import the car valuation");
  assert(!evaluateRoute.includes("/api/evaluate/qe"), "existing route does not delegate to the car route");

  const publish = readFileSync(resolve(root, "app/[locale]/pune-anunt/PuneAnuntClient.tsx"), "utf8");
  assert(publish.includes('fetch("/api/evaluate"'), "listing flow still uses /api/evaluate");
  assert(publish.includes("save_report: false"), "listing flow still skips saved reports");
  assert(!publish.includes("/api/evaluate/qe"), "listing flow does not call the free car route");

  const qeRoute = readFileSync(resolve(root, "app/api/evaluate/qe/route.ts"), "utf8");
  assert(!/serpapi|gemini|generativelanguage/i.test(qeRoute), "car route has no paid price API");
  assert(qeRoute.includes("verifyTurnstileToken"), "car route reuses Turnstile");
  assert(qeRoute.includes("fetchActiveAutoListings"), "car route reads listings");

  const evaluare = readFileSync(resolve(root, "app/[locale]/evaluare/EvaluareClient.tsx"), "utf8");
  assert(evaluare.includes('"/api/evaluate/qe"'), "car mode calls the free route");
  assert(evaluare.includes('"/api/evaluate"'), "other categories keep the existing route");
  const resultUi = readFileSync(resolve(root, "components/QeCarValuationResult.tsx"), "utf8");
  assert(resultUi.includes("Listează mașina pe QuickExit"), "primary CTA copy");
  assert(resultUi.includes("Evaluare nouă"), "restart copy");
  assert(resultUi.includes("Te anunțăm când avem destule anunțuri comparabile pentru modelul tău"), "notify email copy");
  assert(resultUi.includes("whitespace-nowrap"), "range values do not wrap apart");
  assert(!resultUi.includes("Listează la QE"), "old CTA is gone");
  assert(!resultUi.includes("Reiau evaluarea"), "old restart label is gone");
  assert(resultUi.includes("QE_INSUFFICIENT_MESSAGE"), "insufficient copy is shared");

  const migration = readFileSync(
    resolve(root, "supabase/migrations/20261127110000_valuation_lead_magnet.sql"),
    "utf8",
  );
  assert(migration.includes("ENABLE ROW LEVEL SECURITY"), "RLS on");
  assert(migration.includes("FORCE ROW LEVEL SECURITY"), "RLS forced");
  assert(migration.includes("REVOKE ALL ON TABLE public.valuation_requests FROM anon"), "no anon grant");
  assert(migration.includes("REVOKE ALL ON TABLE public.valuation_requests FROM authenticated"), "no authenticated grant");
  assert(migration.includes("TO service_role"), "service role can write");
  assert(!/GRANT [^;]+ TO anon/i.test(migration), "migration does not grant anon");
  assert(!/GRANT [^;]+ TO authenticated/i.test(migration), "migration does not grant authenticated");
  assert(migration.includes("REFERENCES public.leads"), "lead foreign key");
  assert(migration.includes("purpose IN ('report', 'notify')"), "purpose is stored with consent");

  const sources = [
    "lib/qeCarValuation.ts",
    "lib/qeCarValuationRequest.ts",
    "lib/qeCarValuationStore.ts",
    "lib/qeValuationEmail.ts",
    "app/api/evaluate/qe/route.ts",
  ];
  for (const file of sources) {
    const text = readFileSync(resolve(root, file), "utf8");
    const logs = text.match(/console\.(?:log|info|debug|warn|error)\([^;]*\);/g) ?? [];
    for (const log of logs) {
      assert(!/input\.email|recipient|SECRET_|params\.email|\$\{[^}]*email/.test(log), `${file} does not log email`);
    }
    assert(!/serpapi\.com|generativelanguage|GEMINI_API_KEY|SERPAPI_KEY/.test(text), `${file} has no paid price API`);
  }

  const store = readFileSync(resolve(root, "lib/qeCarValuationStore.ts"), "utf8");
  assert(store.includes('.from("listings")'), "store reads listings");
  assert(!store.includes('.from("listings").insert') && !/\.from\("listings"\)[\s\S]{0,80}\.insert/.test(store), "store does not write listings");

  const untouched: QeValuation = tooFew;
  assert(untouched.p25 === null, "sanity");

  console.log("PASS qe car valuation");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
