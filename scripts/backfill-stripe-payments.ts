/**
 * Idempotent backfill of paid Stripe Checkout sessions into public.payments
 * and, for listing sessions, public.promo_queue.
 *
 * Default (no flags): dry-run. Prints the rows it would write. Does not insert
 * and does not send email.
 *
 *   npx tsx scripts/backfill-stripe-payments.ts
 *   npx tsx scripts/backfill-stripe-payments.ts --include-demand
 *   npx tsx scripts/backfill-stripe-payments.ts --all-paid
 *   npx tsx scripts/backfill-stripe-payments.ts --apply
 *
 * Env, never committed:
 *   STRIPE_SECRET_KEY                         required to list sessions
 *   NEXT_PUBLIC_SUPABASE_URL                  required only with --apply
 *   SUPABASE_SERVICE_ROLE_KEY                 required only with --apply
 *
 * Idempotency key: stripe_checkout_session_id. A duplicate insert is skipped.
 * Listing due_at follows Europe/Bucharest: +1h for payments from 08:00 through
 * 22:00 inclusive; 09:00 the same morning before 08:00; 09:00 the next morning
 * after 22:00. Rows already past that deadline are status "late".
 * This script does not email PROMO_NOTIFY_EMAIL.
 *
 * Do not run against production until the migration
 * supabase/migrations/20261126194000_payments_ledger_and_promo_queue.sql
 * has been applied (payments already exists in production; promo_queue does not).
 */

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  buildPaymentLedgerRow,
  isPaymentLedgerDuplicate,
  paidAtIsoFromStripeEvent,
  type PaymentLedgerRow,
} from "../lib/stripePaymentLedger";
import { buildPromoQueueRow, type PromoQueueRow } from "../lib/notifyPromoPayment";

type Planned = {
  sessionId: string;
  created: string;
  payment: PaymentLedgerRow;
  promo: PromoQueueRow | null;
};

function arg(flag: string): boolean {
  return process.argv.includes(flag);
}

function productOf(session: Stripe.Checkout.Session): string {
  const type = String(session.metadata?.type ?? "").trim();
  return type || "checkout";
}

function included(session: Stripe.Checkout.Session, allPaid: boolean, includeDemand: boolean): boolean {
  if (allPaid) return true;
  const type = String(session.metadata?.type ?? "").trim();
  if (type === "listing") return true;
  if (includeDemand && type === "demand") return true;
  return false;
}

async function listPaidSessions(stripe: Stripe): Promise<Stripe.Checkout.Session[]> {
  const out: Stripe.Checkout.Session[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.checkout.sessions.list({
      limit: 100,
      status: "complete",
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const session of page.data) {
      if (session.payment_status === "paid" && session.livemode === true) {
        out.push(session);
      }
    }
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }
  return out;
}

function plan(session: Stripe.Checkout.Session, now: Date): Planned | null {
  const product = productOf(session);
  const paidAtIso = paidAtIsoFromStripeEvent(session.created);
  const row = buildPaymentLedgerRow({
    session,
    paidAtIso,
    product,
    packageId: session.metadata?.packageId ?? session.metadata?.package_id ?? null,
    userId: session.metadata?.userId ?? null,
    listingId: session.metadata?.listingId ?? session.metadata?.listing_id ?? null,
    demandId: session.metadata?.demandId ?? session.metadata?.demand_id ?? null,
    mediaOrderId: session.metadata?.mediaOrderId ?? null,
    mediaPackage: session.metadata?.mediaPackage ?? null,
  });
  if (!row) return null;
  const promo =
    product === "listing" && row.listing_id
      ? buildPromoQueueRow({
          sessionId: row.stripe_checkout_session_id,
          paymentIntentId: row.stripe_payment_intent_id,
          listingId: row.listing_id,
          title: "Anunț QuickExit",
          packageId: row.package_id,
          amountMinor: row.amount_minor,
          currency: row.currency,
          paidAtIso,
          locale: session.metadata?.locale ?? "ro",
          now,
        })
      : null;
  return {
    sessionId: session.id,
    created: paidAtIso,
    payment: row,
    promo,
  };
}

async function main() {
  const apply = arg("--apply");
  const allPaid = arg("--all-paid");
  const includeDemand = arg("--include-demand") || allPaid;
  const stripeKey = String(process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!stripeKey) {
    console.error("Missing STRIPE_SECRET_KEY. Dry-run still needs it to list sessions. Nothing was written.");
    process.exit(1);
  }

  const stripe = new Stripe(stripeKey, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pinned legacy Stripe API version
    apiVersion: "2023-10-16" as any,
  });
  const now = new Date();
  const sessions = await listPaidSessions(stripe);
  const selected = sessions.filter((session) => included(session, allPaid, includeDemand));
  const plans = selected
    .map((session) => plan(session, now))
    .filter((item): item is Planned => item !== null);

  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      paid_checkout_sessions: sessions.length,
      selected: plans.length,
      skipped: selected.length - plans.length,
      note: "dry-run prints rows only. --apply inserts. Email is never sent.",
    }),
  );
  for (const item of plans) {
    console.log(JSON.stringify(item));
  }

  if (!apply) {
    console.log("Dry-run complete. No database writes.");
    return;
  }

  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Refusing --apply without NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let inserted = 0;
  let duplicate = 0;
  let failed = 0;
  for (const item of plans) {
    const payment = await admin.from("payments").insert(item.payment).select("id").maybeSingle();
    if (payment.error && !isPaymentLedgerDuplicate(payment.error)) {
      failed += 1;
      console.error(
        JSON.stringify({
          sessionId: item.sessionId,
          table: "payments",
          code: payment.error.code ?? null,
          message: String(payment.error.message ?? "").slice(0, 200),
        }),
      );
      continue;
    }
    if (payment.error) duplicate += 1;
    else inserted += 1;

    if (!item.promo) continue;
    const queue = await admin.from("promo_queue").insert(item.promo).select("id").maybeSingle();
    if (queue.error && !isPaymentLedgerDuplicate(queue.error)) {
      console.error(
        JSON.stringify({
          sessionId: item.sessionId,
          table: "promo_queue",
          code: queue.error.code ?? null,
          message: String(queue.error.message ?? "").slice(0, 200),
        }),
      );
    }
  }
  console.log(JSON.stringify({ apply: true, inserted, duplicate, failed }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.slice(0, 300));
  process.exit(1);
});
