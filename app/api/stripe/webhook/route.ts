import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  activateRow,
  extractCheckoutIds,
  resolveActivationPlan,
} from "@/lib/stripeWebhookActivation";
import {
  CANONICAL_STRIPE_WEBHOOK_URL,
  assertListingSaleIntentForFulfillment,
  classifyAlreadyActiveFulfillment,
  classifyPaidSessionAmount,
  expectedMinorAmountForPriceId,
  listingFulfillmentHttpStatus,
  mergeStripeFulfillmentIntoDetails,
  storedCheckoutSessionId,
  type ListingFulfillmentFailureCode,
  type StripeFulfillmentRecord,
} from "@/lib/stripeListingFulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(
  code: ListingFulfillmentFailureCode,
  log: Record<string, unknown>,
) {
  const status = listingFulfillmentHttpStatus(code);
  console.error("[stripe/webhook] fulfillment rejected", {
    code,
    httpStatus: status,
    ...log,
  });
  if (status === 200) {
    return NextResponse.json({ received: true, skipped: code });
  }
  return NextResponse.json({ received: false, error: code }, { status });
}

export async function POST(req: Request) {
  try {
    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeApiKey) {
      return new NextResponse("Config server incompletă (STRIPE_SECRET_KEY).", { status: 500 });
    }
    if (!webhookSecret) {
      return new NextResponse("Config server incompletă (STRIPE_WEBHOOK_SECRET).", { status: 500 });
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return new NextResponse("Config server incompletă (Supabase service role).", { status: 500 });
    }

    const stripe = new Stripe(stripeApiKey, {
      apiVersion: "2023-10-16" as any,
    });

    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("[stripe/webhook] Lipsește semnătura Stripe.");
      return new NextResponse("Lipsește semnătura.", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[stripe/webhook] Semnătură invalidă:", { message });
      return new NextResponse(`Eroare semnătură: ${message}`, { status: 400 });
    }

    if (event.livemode === false) {
      return fail("test_mode", { eventId: event.id, type: event.type });
    }

    if (event.type !== "checkout.session.completed") {
      console.log("[stripe/webhook] event ignored", { eventId: event.id, type: event.type });
      return NextResponse.json({ received: true, ignored: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const paymentStatus = String(session.payment_status ?? "").toLowerCase();
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    console.log("[stripe/webhook] checkout.session.completed", {
      eventId: event.id,
      sessionId: session.id,
      listingId: session.metadata?.listingId ?? session.metadata?.listing_id ?? null,
      type: session.metadata?.type ?? null,
      canonicalEndpoint: CANONICAL_STRIPE_WEBHOOK_URL,
    });

    if (paymentStatus !== "paid") {
      return fail("not_paid", { eventId: event.id, sessionId: session.id, paymentStatus });
    }

    const { type, listingId, demandId, userId, objectId, metadata } = extractCheckoutIds(session);
    const table = type === "demand" ? "demands" : "listings";

    if (!objectId) {
      return fail("missing_listing_id", {
        eventId: event.id,
        sessionId: session.id,
        type,
        listingId,
        demandId,
      });
    }

    const activation = await resolveActivationPlan(stripe, session, type);
    if (activation.source === "none") {
      return fail("unknown_price_id", {
        eventId: event.id,
        sessionId: session.id,
        type,
        objectId,
        priceId: metadata.priceId ?? metadata.price_id ?? null,
      });
    }

    if (type === "listing") {
      const expectedAmount = expectedMinorAmountForPriceId(activation.priceId ?? "");
      if (expectedAmount == null) {
        return fail("unknown_price_id", {
          eventId: event.id,
          sessionId: session.id,
          listingId: objectId,
          priceId: activation.priceId,
        });
      }
      const amountCheck = classifyPaidSessionAmount({
        amountTotal: Number(session.amount_total ?? 0),
        currency: String(session.currency ?? ""),
        expectedAmount,
      });
      if (amountCheck !== "ok") {
        return fail(amountCheck, {
          eventId: event.id,
          sessionId: session.id,
          listingId: objectId,
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
          expectedAmount,
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    type FulfillmentRow = {
      id: string;
      status?: string;
      sale_strategy?: string | null;
      details?: unknown;
    };

    let existing: FulfillmentRow | null = null;
    let fetchError: { message?: string; code?: string } | null = null;
    if (type === "listing") {
      const result = await supabase
        .from("listings")
        .select("id, status, sale_strategy, details")
        .eq("id", objectId)
        .maybeSingle();
      fetchError = result.error;
      existing = (result.data as FulfillmentRow | null) ?? null;
    } else {
      const result = await supabase
        .from("demands")
        .select("id, status")
        .eq("id", objectId)
        .maybeSingle();
      fetchError = result.error;
      existing = (result.data as FulfillmentRow | null) ?? null;
    }

    if (fetchError) {
      console.error("[stripe/webhook] Eroare citire din Supabase:", {
        eventId: event.id,
        sessionId: session.id,
        table,
        objectId,
        message: fetchError.message,
        code: fetchError.code,
      });
      return new NextResponse(`Eroare citire ${table}.`, { status: 500 });
    }
    if (!existing) {
      return fail("object_not_found", {
        eventId: event.id,
        sessionId: session.id,
        table,
        objectId,
        listingId,
        demandId,
      });
    }

    const row = existing;

    if (type === "listing") {
      const intent = assertListingSaleIntentForFulfillment(row);
      if (!intent.ok) {
        return fail("incompatible_sale_intent", {
          eventId: event.id,
          sessionId: session.id,
          listingId: objectId,
        });
      }
    }

    if (row.status === "active") {
      if (type === "listing") {
        const already = classifyAlreadyActiveFulfillment(
          storedCheckoutSessionId(row.details),
          session.id,
        );
        if (already === "conflicting_session") {
          return fail("conflicting_session", {
            eventId: event.id,
            sessionId: session.id,
            listingId: objectId,
          });
        }
      }
      console.log("[stripe/webhook] Obiect deja activ (idempotent).", {
        eventId: event.id,
        sessionId: session.id,
        table,
        objectId,
      });
      return NextResponse.json({ received: true, idempotent: true });
    }

    const fulfillment: StripeFulfillmentRecord = {
      event_id: event.id,
      checkout_session_id: session.id,
      payment_intent_id: paymentIntentId,
      amount: Number(session.amount_total ?? 0),
      currency: String(session.currency ?? "").toLowerCase(),
      price_id: activation.priceId,
      fulfilled_at: new Date().toISOString(),
      result: "activated",
    };

    const extraPayload =
      type === "listing"
        ? { details: mergeStripeFulfillmentIntoDetails(row.details, fulfillment) }
        : {};

    const updateError = await activateRow(
      supabase,
      table,
      objectId,
      activation.expiresAt,
      "[stripe/webhook]",
      extraPayload,
    );
    if (updateError) {
      const code: ListingFulfillmentFailureCode =
        updateError.code === "zero_row_update" || updateError.code === "ambiguous_update"
          ? updateError.code
          : "activation_failed";
      return fail(code, {
        eventId: event.id,
        sessionId: session.id,
        type,
        table,
        objectId,
        listingId,
        demandId,
        userId: userId || null,
        supabase: updateError.supabase,
        error: updateError.message,
      });
    }

    console.log("[stripe/webhook] Obiect activat după plată.", {
      eventId: event.id,
      sessionId: session.id,
      type,
      table,
      objectId,
      userId: userId || null,
      result: "activated",
      expiresAt: activation.expiresAt,
    });
    return NextResponse.json({
      received: true,
      activated: objectId,
      type,
      expiresAt: activation.expiresAt,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[stripe/webhook] Eroare generală neprevăzută:", {
      message: err.message,
      name: err.name,
    });
    return new NextResponse("Eroare internă.", { status: 500 });
  }
}
