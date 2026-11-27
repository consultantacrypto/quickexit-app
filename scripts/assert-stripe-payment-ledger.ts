/**
 * Handler test: locally signed Checkout fixture, in-memory Supabase, no live Stripe or Resend.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

const WEBHOOK_SECRET = "local_fixture_webhook_secret";
const LISTING_A = "11111111-1111-4111-8111-111111111111";
const LISTING_B = "22222222-2222-4222-8222-222222222222";
const PAID_AT_UNIX = Math.floor(Date.parse("2026-11-26T16:38:20.000Z") / 1000);

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

type Row = Record<string, unknown>;

function createFakeDb(listings: Row[]) {
  const tables: Record<string, Row[]> = {
    listings: listings.map((row) => ({ ...row })),
    payments: [],
    promo_queue: [],
  };
  const emails: Array<Record<string, unknown>> = [];

  function from(table: string) {
    const state = {
      op: "select" as "select" | "insert" | "update",
      filters: [] as Array<{ col: string; op: "eq" | "neq"; val: unknown }>,
      payload: null as Row | Row[] | null,
      single: false,
    };
    const builder = {
      select() {
        return builder;
      },
      insert(row: Row) {
        state.op = "insert";
        state.payload = row;
        return builder;
      },
      update(row: Row) {
        state.op = "update";
        state.payload = row;
        return builder;
      },
      eq(col: string, val: unknown) {
        state.filters.push({ col, op: "eq", val });
        return builder;
      },
      neq(col: string, val: unknown) {
        state.filters.push({ col, op: "neq", val });
        return builder;
      },
      maybeSingle() {
        state.single = true;
        return builder;
      },
      then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve()
          .then(() => exec())
          .then(onFulfilled, onRejected);
      },
    };

    function matches(row: Row) {
      return state.filters.every((filter) =>
        filter.op === "eq" ? row[filter.col] === filter.val : row[filter.col] !== filter.val,
      );
    }

    function exec() {
      const rows = tables[table] ?? (tables[table] = []);
      if (state.op === "insert") {
        const payload = state.payload as Row;
        const key = "stripe_checkout_session_id";
        if (payload && rows.some((row) => row[key] === payload[key])) {
          return {
            data: null,
            error: { code: "23505", message: "duplicate key value violates unique constraint" },
          };
        }
        const stored = { id: `${table}-${rows.length + 1}`, ...payload };
        rows.push(stored);
        return { data: state.single ? stored : [stored], error: null };
      }
      if (state.op === "update") {
        const hit = rows.filter(matches);
        for (const row of hit) Object.assign(row, state.payload);
        return { data: hit.map((row) => ({ id: row.id })), error: null };
      }
      const hit = rows.filter(matches);
      if (state.single) return { data: hit[0] ?? null, error: null };
      return { data: hit, error: null };
    }

    return builder;
  }

  const fetchImpl: typeof fetch = async (_url, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    emails.push(body);
    if (String(body?.text ?? "").includes(LISTING_B)) {
      throw new Error("resend down");
    }
    return new Response("{}", { status: 200 });
  };

  return { from, tables, emails, fetchImpl };
}

function listingRow(id: string, title: string): Row {
  return {
    id,
    status: "pending_payment",
    sale_strategy: "standard",
    title,
    listing_kind: "specific_asset",
    images: ["https://www.quickexit.ro/logo.png"],
    details: {
      package: "standard",
      strategy: "standard",
      sale_method: "direct",
      pricing_mode: "fixed_price",
    },
  };
}

function loadEvent(priceId: string, amount: number, listingId: string, sessionId: string) {
  const event = JSON.parse(
    readFileSync(resolve("scripts/fixtures/stripe-checkout-session-paid.json"), "utf8"),
  );
  event.created = PAID_AT_UNIX;
  event.data.object.id = sessionId;
  event.data.object.amount_total = amount;
  event.data.object.created = PAID_AT_UNIX;
  event.data.object.metadata.listingId = listingId;
  event.data.object.metadata.priceId = priceId;
  event.data.object.line_items.data[0].amount_total = amount;
  event.data.object.line_items.data[0].price.id = priceId;
  event.data.object.line_items.data[0].price.unit_amount = amount;
  return event;
}

async function main() {
  process.env.STRIPE_SECRET_KEY = "sk_test_local_fixture_key";
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "local_fixture_service_role";
  process.env.PROMO_NOTIFY_EMAIL = "ops@example.com";
  process.env.RESEND_API_KEY = "re_test_local";
  process.env.RESEND_FROM = "QuickExit <alerts@example.com>";
  process.env.NEXT_PUBLIC_SITE_URL = "https://www.quickexit.ro";
  delete process.env.STRIPE_WEBHOOK_ALLOW_TEST_EVENTS;

  const [{ handleStripeWebhookRequest }, { getPriceIdForPackageId, getPackageByPriceId }, promo, social] =
    await Promise.all([
      import("../app/api/stripe/webhook/route"),
      import("../lib/stripePackages"),
      import("../lib/notifyPromoPayment"),
      import("../lib/socialPromoPromise"),
    ]);
  const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8"));
  const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"));

  assert(
    (ro as { ListingDetail: { socialPromoPromise: string } }).ListingDetail.socialPromoPromise ===
      social.SOCIAL_PROMO_PROMISE_RO,
    "RO copy matches the approved sentence",
  );
  assert(
    (en as { ListingDetail: { socialPromoPromise: string } }).ListingDetail.socialPromoPromise ===
      social.SOCIAL_PROMO_PROMISE_EN,
    "EN copy matches the translation",
  );
  assert(
    social.listingShowsSocialPromo({
      status: "active",
      is_seed: false,
      sale_strategy: "economy",
      listing_kind: "specific_asset",
    }),
    "paid package listing shows the promise",
  );
  assert(
    !social.listingShowsSocialPromo({
      status: "active",
      is_seed: false,
      sale_strategy: "standard",
      listing_kind: "catalog_offer",
    }),
    "catalog offers do not show the promise",
  );
  assert(
    !social.listingShowsSocialPromo({
      status: "pending_payment",
      is_seed: false,
      sale_strategy: "standard",
      listing_kind: "specific_asset",
    }),
    "unpaid draft does not show the promise",
  );

  const due = promo.promoDueAtIso("2026-11-26T16:38:20.000Z");
  assert(due === "2026-11-26T17:38:20.000Z", "deadline is paid_at + 1h");
  assert(promo.classifyPromoQueueStatus(due, new Date("2026-11-26T18:00:00.000Z")) === "late", "past due is late");
  assert(
    promo.classifyPromoQueueStatus(due, new Date("2026-11-26T17:00:00.000Z")) === "pending",
    "before due is pending",
  );
  assert(promo.formatEuropeBucharest("2026-11-26T16:38:20.000Z").includes("18:38"), "Bucharest hour");

  function expectDue(paidIso: string, expectedIso: string, label: string) {
    const actual = promo.promoDueAtIso(paidIso);
    assert(actual === expectedIso, `${label}: ${actual}`);
  }

  expectDue("2026-01-15T12:00:00.000Z", "2026-01-15T13:00:00.000Z", "winter 14:00 +1h");
  expectDue("2026-01-15T06:00:00.000Z", "2026-01-15T07:00:00.000Z", "08:00 inclusive +1h");
  expectDue("2026-01-15T05:59:59.000Z", "2026-01-15T07:00:00.000Z", "07:59:59 same morning");
  expectDue("2026-01-15T05:30:00.000Z", "2026-01-15T07:00:00.000Z", "07:30 same morning");
  expectDue("2026-01-15T19:00:00.000Z", "2026-01-15T20:00:00.000Z", "21:00 +1h");
  expectDue("2026-01-15T19:00:01.000Z", "2026-01-15T20:00:01.000Z", "21:00:01 +1h");
  expectDue("2026-01-15T19:30:00.000Z", "2026-01-15T20:30:00.000Z", "21:30 +1h");
  expectDue("2026-01-15T20:00:00.000Z", "2026-01-15T21:00:00.000Z", "22:00 inclusive due 23:00");
  expectDue("2026-01-15T20:00:01.000Z", "2026-01-16T07:00:00.000Z", "22:00:01 next morning");
  expectDue("2026-01-15T20:30:00.000Z", "2026-01-16T07:00:00.000Z", "22:30 next morning");
  expectDue("2026-01-15T21:00:00.000Z", "2026-01-16T07:00:00.000Z", "23:00 next morning");

  const springMorning = promo.bucharestParts(new Date("2026-03-29T04:30:00.000Z"));
  assert(springMorning.hour === 7 && springMorning.minute === 30, "spring-forward morning is 07:30 EEST");
  expectDue("2026-03-29T04:30:00.000Z", "2026-03-29T06:00:00.000Z", "DST spring 07:30 due 09:00 EEST");
  const springNight = promo.bucharestParts(new Date("2026-03-29T19:30:00.000Z"));
  assert(springNight.hour === 22 && springNight.minute === 30, "spring-forward night is 22:30 EEST");
  expectDue("2026-03-29T19:30:00.000Z", "2026-03-30T06:00:00.000Z", "DST spring 22:30 due next 09:00 EEST");

  const fallMorning = promo.bucharestParts(new Date("2026-10-25T05:30:00.000Z"));
  assert(fallMorning.hour === 7 && fallMorning.minute === 30, "fall-back morning is 07:30 EET");
  expectDue("2026-10-25T05:30:00.000Z", "2026-10-25T07:00:00.000Z", "DST fall 07:30 due 09:00 EET");
  const fallNight = promo.bucharestParts(new Date("2026-10-25T20:30:00.000Z"));
  assert(fallNight.hour === 22 && fallNight.minute === 30, "fall-back night is 22:30 EET");
  expectDue("2026-10-25T20:30:00.000Z", "2026-10-26T07:00:00.000Z", "DST fall 22:30 due next 09:00 EET");

  expectDue("2026-07-15T11:00:00.000Z", "2026-07-15T12:00:00.000Z", "summer 14:00 +1h");

  const nightDue = promo.promoDueAtIso("2026-01-15T20:30:00.000Z");
  assert(
    promo.classifyPromoQueueStatus(nightDue, new Date("2026-01-16T06:59:00.000Z")) === "pending",
    "22:30 payment is pending before 09:00",
  );
  assert(
    promo.classifyPromoQueueStatus(nightDue, new Date("2026-01-16T07:01:00.000Z")) === "late",
    "22:30 payment is late after 09:00",
  );

  const proposed = "consultantacrypto-ro-zvkmya+qe-paid@mail.grokbot.com";
  assert(promo.parsePromoNotifyEmail(proposed) === proposed, "plus address is accepted");
  assert(promo.parsePromoNotifyEmail("not-an-email") === null, "invalid address is rejected");
  assert(social.SOCIAL_PROMO_PROMISE_RO.includes("22:00") && social.SOCIAL_PROMO_PROMISE_RO.includes("09:00"), "RO names the cutoff");
  assert(social.SOCIAL_PROMO_PROMISE_EN.includes("22:00") && social.SOCIAL_PROMO_PROMISE_EN.includes("09:00"), "EN names the cutoff");
  const roMessages = ro as {
    ListingDetail: { socialPromoPromise: string };
    Pricing: { socialPromoPromise: string };
    PostListing: { packages: { socialPromoPromise: string } };
  };
  const enMessages = en as {
    ListingDetail: { socialPromoPromise: string };
    Pricing: { socialPromoPromise: string };
    PostListing: { packages: { socialPromoPromise: string } };
  };
  assert(roMessages.Pricing.socialPromoPromise === social.SOCIAL_PROMO_PROMISE_RO, "tarife RO");
  assert(roMessages.PostListing.packages.socialPromoPromise === social.SOCIAL_PROMO_PROMISE_RO, "publish RO");
  assert(enMessages.Pricing.socialPromoPromise === social.SOCIAL_PROMO_PROMISE_EN, "tarife EN");
  assert(enMessages.PostListing.packages.socialPromoPromise === social.SOCIAL_PROMO_PROMISE_EN, "publish EN");
  const doc = readFileSync(resolve("docs/internal/promo-payment-notify.md"), "utf8");
  assert(doc.includes(proposed), "proposed address is documented");
  assert(doc.includes("nu este setată în Vercel") || doc.includes("nesetată în Vercel"), "docs say the address is not set");

  const priceId = getPriceIdForPackageId("standard");
  const pkg = priceId ? getPackageByPriceId(priceId) : null;
  assert(priceId && pkg, "standard package resolves");
  const amount = Math.round((pkg?.amountRon ?? 0) * 100);
  assert(amount === 7900, "standard amount is 7900 minor");

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pinned legacy Stripe API version
    apiVersion: "2023-10-16" as any,
  });
  const db = createFakeDb([
    listingRow(LISTING_A, "BMW X6 de test"),
    listingRow(LISTING_B, "Anunț notificare eșuată"),
  ]);

  async function post(event: Record<string, unknown>, signature?: string) {
    const payload = JSON.stringify(event);
    const header =
      signature ??
      stripe.webhooks.generateTestHeaderString({
        payload,
        secret: WEBHOOK_SECRET,
      });
    const req = new Request("https://preview.local/api/stripe/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature === "" ? {} : { "stripe-signature": header }),
      },
      body: payload,
    });
    return handleStripeWebhookRequest(req, {
      supabase: db as unknown as SupabaseClient,
      fetchImpl: db.fetchImpl,
    });
  }

  const unsigned = await post(loadEvent(priceId!, amount, LISTING_A, "cs_test_local_ledger_a"), "");
  assert(unsigned.status === 400, "missing signature is 400");
  assert(db.tables.payments.length === 0, "unsigned request writes nothing");

  const bad = await post(loadEvent(priceId!, amount, LISTING_A, "cs_test_local_ledger_a"), "t=1,v1=deadbeef");
  assert(bad.status === 400, "bad signature is 400");
  assert(db.tables.payments.length === 0, "bad signature writes nothing");

  const eventA = loadEvent(priceId!, amount, LISTING_A, "cs_test_local_ledger_a");
  const first = await post(eventA);
  const firstBody = await first.json();
  if (first.status !== 200) {
    fail(`signed fixture status ${first.status} ${JSON.stringify(firstBody)}`);
  }
  assert(firstBody.received === true, "signed fixture accepted");
  assert(db.tables.payments.length === 1, "one payment row");
  assert(db.tables.payments[0]?.stripe_checkout_session_id === "cs_test_local_ledger_a", "idempotency key is the session id");
  assert(db.tables.payments[0]?.amount_minor === amount, "amount stored");
  assert(db.tables.payments[0]?.package_id === "standard", "package stored");
  assert(db.tables.payments[0]?.listing_id === LISTING_A, "listing stored");
  assert(db.tables.promo_queue[0]?.due_at === "2026-11-26T17:38:20.000Z", "daytime queue due_at is +1h");
  assert(db.tables.promo_queue[0]?.status === "pending" || db.tables.promo_queue[0]?.status === "late", "queue status");
  assert(db.emails.length === 1, "one email");
  const text = String(db.emails[0]?.text ?? "");
  assert(text.includes(LISTING_A), "email has listing id");
  assert(text.includes("BMW X6 de test"), "email has title");
  assert(text.includes("standard"), "email has package");
  assert(text.includes("79.00 RON"), "email has amount");
  assert(text.includes("18:38"), "email has Bucharest time");
  assert(text.includes("19:38"), "email has the one-hour daytime deadline");
  assert(text.includes(`https://www.quickexit.ro/ro/anunt/${LISTING_A}`), "email has public link");
  assert(db.tables.listings.find((row) => row.id === LISTING_A)?.status === "active", "listing activated");

  const second = await post(eventA);
  const secondBody = await second.json();
  assert(second.status === 200, "replay is 200");
  assert(secondBody.idempotent === true, "replay is idempotent");
  assert(db.tables.payments.length === 1, "replay does not insert a second payment");
  assert(db.tables.promo_queue.length === 1, "replay does not insert a second queue row");
  assert(db.emails.length === 1, "replay does not send a second email");

  const eventB = loadEvent(priceId!, amount, LISTING_B, "cs_test_local_ledger_b");
  const thrown = await post(eventB);
  const thrownBody = await thrown.json();
  assert(thrown.status === 200, "email failure does not fail the webhook");
  assert(thrownBody.received === true, "email failure still acknowledges payment");
  assert(db.tables.payments.length === 2, "payment recorded when email throws");
  assert(db.tables.promo_queue.length === 2, "queue row remains when email throws");
  assert(
    db.tables.listings.find((row) => row.id === LISTING_B)?.status === "active",
    "listing still activates when email throws",
  );

  const route = readFileSync(resolve("app/api/stripe/webhook/route.ts"), "utf8");
  assert(route.includes("recordStripeCheckoutPayment"), "handler records the ledger");
  assert(route.includes("notifyListingPromoPayment"), "handler notifies after payment");
  assert(doc.includes("PROMO_NOTIFY_EMAIL"), "env name documented");
  assert(!doc.includes("ops@quickexit"), "doc does not set an address");

  console.log("OK stripe payment ledger");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
