import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  activateRow,
  extractCheckoutIds,
  loadNormalizedCheckoutLineItems,
  resolveActivationPlan,
} from "@/lib/stripeWebhookActivation";
import {
  CANONICAL_STRIPE_WEBHOOK_URL,
  assertListingSaleIntentForFulfillment,
  classifyAlreadyActiveFulfillment,
  classifyCheckoutSessionContract,
  classifyLostActivationRace,
  classifyPaidSessionAmount,
  expectedMinorAmountForPriceId,
  listingFulfillmentHttpStatus,
  listingPriceMatchesPaidPrice,
  mergeStripeFulfillmentIntoDetails,
  parseCheckoutObjectType,
  storedCheckoutSessionId,
  type ListingFulfillmentFailureCode,
  type StripeFulfillmentRecord,
} from "@/lib/stripeListingFulfillment";
import { resolveListingPackageIdFromRow } from "@/lib/listingSaleStrategy";
import { getPriceIdForPackageId } from "@/lib/stripePackages";
import {
  classifyCombinedPaidSessionAmount,
  classifyListingLineItems,
  classifyMediaOrderForAsyncFailure,
  classifyMediaOrderForPaidFulfillment,
  classifyUnexpectedMediaStructure,
  extractMediaOrderIdFromMetadata,
  extractMediaPackageFromMetadata,
  isAsyncPaymentFailedEvent,
  isCombinedCheckoutFulfillmentEvent,
  loadMediaOrderForFulfillment,
  markMediaOrderFailedFromAsync,
  markMediaOrderPaid,
  normalizeStripeLineItems,
  shouldRejectTestModeEvent,
} from "@/lib/mediaWebhookFulfillment";

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pinned legacy Stripe API version
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

    if (shouldRejectTestModeEvent(event.livemode)) {
      return fail("test_mode", { eventId: event.id, type: event.type });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // --- async payment failed: never activate; maybe mark Media failed ---
    if (isAsyncPaymentFailedEvent(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
      const { listingId, metadata } = extractCheckoutIds(session);
      const mediaOrderId = extractMediaOrderIdFromMetadata(metadata);
      console.log("[stripe/webhook] checkout.session.async_payment_failed", {
        eventId: event.id,
        sessionId: session.id,
        listingId: listingId || null,
        mediaOrderId,
      });

      if (mediaOrderId && listingId) {
        const order = await loadMediaOrderForFulfillment(supabase, mediaOrderId);
        const plan = classifyMediaOrderForAsyncFailure({
          order,
          listingId,
          sessionId: session.id,
        });
        if (plan.action === "mark_failed") {
          const marked = await markMediaOrderFailedFromAsync({
            admin: supabase,
            mediaOrderId,
          });
          if (!marked.ok) {
            return fail("media_mark_failed_error", {
              eventId: event.id,
              sessionId: session.id,
              listingId,
              mediaOrderId,
              message: marked.message,
            });
          }
        }
      }

      return NextResponse.json({ received: true, async_failed: true });
    }

    if (!isCombinedCheckoutFulfillmentEvent(event.type)) {
      console.log("[stripe/webhook] event ignored", { eventId: event.id, type: event.type });
      return NextResponse.json({ received: true, ignored: event.type });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const checkoutType = parseCheckoutObjectType(session.metadata?.type);
    if (!checkoutType) {
      console.log("[stripe/webhook] checkout type ignored", {
        eventId: event.id,
        sessionId: session.id,
        checkoutType: session.metadata?.type ?? "empty",
      });
      return NextResponse.json({ received: true, ignored: "unknown_checkout_type" });
    }

    const sessionContract = classifyCheckoutSessionContract(session);
    if (sessionContract !== "ok") {
      return fail(sessionContract, {
        eventId: event.id,
        sessionId: session.id,
        eventType: event.type,
        status: session.status ?? null,
        paymentStatus: session.payment_status ?? null,
      });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const { listingId, demandId, userId, metadata } = extractCheckoutIds(session);
    const mediaOrderId = extractMediaOrderIdFromMetadata(metadata);
    const metadataMediaPackage = extractMediaPackageFromMetadata(metadata);
    const type = checkoutType;
    const objectId = type === "demand" ? demandId : listingId;
    const table = type === "demand" ? "demands" : "listings";

    console.log("[stripe/webhook] fulfillment event", {
      eventId: event.id,
      eventType: event.type,
      sessionId: session.id,
      listingId: listingId || null,
      demandId: demandId || null,
      mediaOrderId,
      type: checkoutType,
      canonicalEndpoint: CANONICAL_STRIPE_WEBHOOK_URL,
    });

    if (!objectId) {
      return fail("missing_listing_id", {
        eventId: event.id,
        sessionId: session.id,
        type,
        listingId,
        demandId,
      });
    }

    // Demand never carries Media.
    if (type === "demand" && mediaOrderId) {
      console.error("[stripe/webhook] mediaOrderId on demand session — ignored for demand path", {
        eventId: event.id,
        sessionId: session.id,
        demandId,
        mediaOrderId,
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

    // --- Amount validation ---
    if (type === "listing") {
      const listingPriceId = activation.priceId ?? "";
      const expectedListingMinor = expectedMinorAmountForPriceId(listingPriceId);
      if (expectedListingMinor == null) {
        return fail("unknown_price_id", {
          eventId: event.id,
          sessionId: session.id,
          listingId: objectId,
          priceId: activation.priceId,
        });
      }

      // Structural line-item checks (listing Price match; no first-item assumption).
      const rawLineItems = await loadNormalizedCheckoutLineItems(stripe, session);
      const normalized = normalizeStripeLineItems(rawLineItems);
      if (mediaOrderId && normalized.length === 0) {
        return fail("missing_listing_line_item", {
          eventId: event.id,
          sessionId: session.id,
          listingId: objectId,
          reason: "line_items_unavailable_for_combined",
        });
      }
      if (normalized.length > 0) {
        const lineClass = classifyListingLineItems({
          lineItems: normalized,
          expectedListingPriceId: listingPriceId,
        });
        if (!lineClass.ok) {
          return fail(lineClass.code, {
            eventId: event.id,
            sessionId: session.id,
            listingId: objectId,
            expectedListingPriceId: listingPriceId,
            lineItemCount: normalized.length,
          });
        }

        const unexpected = classifyUnexpectedMediaStructure({
          mediaOrderId,
          lineItems: normalized,
          expectedListingPriceId: listingPriceId,
        });
        if (unexpected !== "ok") {
          return fail(unexpected, {
            eventId: event.id,
            sessionId: session.id,
            listingId: objectId,
            lineItemCount: normalized.length,
          });
        }
      }

      if (mediaOrderId) {
        const mediaOrder = await loadMediaOrderForFulfillment(supabase, mediaOrderId);
        const mediaCheck = classifyMediaOrderForPaidFulfillment({
          order: mediaOrder,
          listingId: objectId,
          userId: userId || null,
          sessionId: session.id,
          metadataPackage: metadataMediaPackage,
        });
        if (!mediaCheck.ok) {
          return fail(mediaCheck.code, {
            eventId: event.id,
            sessionId: session.id,
            listingId: objectId,
            mediaOrderId,
          });
        }

        const amountCheck = classifyCombinedPaidSessionAmount({
          amountTotal: Number(session.amount_total ?? 0),
          currency: String(session.currency ?? ""),
          listingPriceId,
          mediaAmountRon: Number(mediaCheck.order.amount_ron),
          mediaCurrency: String(mediaCheck.order.currency ?? ""),
        });
        if (amountCheck !== "ok") {
          const code: ListingFulfillmentFailureCode =
            amountCheck === "media_currency_mismatch"
              ? "media_currency_mismatch"
              : amountCheck === "media_amount_invalid"
                ? "media_amount_invalid"
                : amountCheck;
          return fail(code, {
            eventId: event.id,
            sessionId: session.id,
            listingId: objectId,
            mediaOrderId,
            amountTotal: session.amount_total ?? null,
            currency: session.currency ?? null,
            mediaAmountRon: mediaCheck.order.amount_ron,
          });
        }
      } else {
        // Listing-only: preserve exact existing amount validation.
        const amountCheck = classifyPaidSessionAmount({
          amountTotal: Number(session.amount_total ?? 0),
          currency: String(session.currency ?? ""),
          expectedAmount: expectedListingMinor,
        });
        if (amountCheck !== "ok") {
          return fail(amountCheck, {
            eventId: event.id,
            sessionId: session.id,
            listingId: objectId,
            amountTotal: session.amount_total ?? null,
            currency: session.currency ?? null,
            expectedAmount: expectedListingMinor,
          });
        }
      }
    }

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
      const listingPkg = resolveListingPackageIdFromRow(row);
      const listingPriceId = listingPkg ? getPriceIdForPackageId(listingPkg) : null;
      if (
        !listingPriceMatchesPaidPrice({
          listingPriceId,
          paidPriceId: activation.priceId,
        })
      ) {
        return fail("package_mismatch", {
          eventId: event.id,
          sessionId: session.id,
          listingId: objectId,
          listingPriceId,
          paidPriceId: activation.priceId ?? null,
        });
      }
    }

    // --- Listing activation (idempotent). Order: listing first, then Media. ---
    let listingActivatedNow = false;
    let listingIdempotent = false;

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
      listingIdempotent = true;
      console.log("[stripe/webhook] Obiect deja activ (idempotent).", {
        eventId: event.id,
        sessionId: session.id,
        table,
        objectId,
        mediaOrderId,
      });

      // Listing-only: done. Combined: continue to Media fulfillment.
      if (!(type === "listing" && mediaOrderId)) {
        return NextResponse.json({ received: true, idempotent: true });
      }
    } else {
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
        if (updateError.code === "zero_row_update" && type === "listing") {
          const raced = await supabase
            .from("listings")
            .select("id, status, details")
            .eq("id", objectId)
            .maybeSingle();
          const race = classifyLostActivationRace({
            currentStatus: (raced.data as FulfillmentRow | null)?.status,
            storedSessionId: storedCheckoutSessionId((raced.data as FulfillmentRow | null)?.details),
            incomingSessionId: session.id,
          });
          if (race === "idempotent") {
            listingIdempotent = true;
            console.log("[stripe/webhook] concurrent activation lost race — idempotent", {
              eventId: event.id,
              sessionId: session.id,
              listingId: objectId,
            });
            // Combined: still attempt Media.
            if (!(type === "listing" && mediaOrderId)) {
              return NextResponse.json({ received: true, idempotent: true });
            }
          } else if (race === "conflicting_session") {
            return fail("conflicting_session", {
              eventId: event.id,
              sessionId: session.id,
              listingId: objectId,
            });
          } else {
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
        } else {
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
      } else {
        listingActivatedNow = true;
        console.log("[stripe/webhook] Obiect activat după plată.", {
          eventId: event.id,
          sessionId: session.id,
          type,
          table,
          objectId,
          userId: userId || null,
          result: "activated",
          expiresAt: activation.expiresAt,
          mediaOrderId,
        });
      }
    }

    // --- Media fulfillment (listing already active / just activated). Not gated by UI flag. ---
    if (type === "listing" && mediaOrderId) {
      const mediaOrder = await loadMediaOrderForFulfillment(supabase, mediaOrderId);
      const mediaCheck = classifyMediaOrderForPaidFulfillment({
        order: mediaOrder,
        listingId: objectId,
        userId: userId || null,
        sessionId: session.id,
        metadataPackage: metadataMediaPackage,
      });
      if (!mediaCheck.ok) {
        // Listing may already be active — return retryable/hard failure per code.
        return fail(mediaCheck.code, {
          eventId: event.id,
          sessionId: session.id,
          listingId: objectId,
          mediaOrderId,
          listingActivated: listingActivatedNow || listingIdempotent,
        });
      }

      if (!mediaCheck.alreadyPaid) {
        const paid = await markMediaOrderPaid({
          admin: supabase,
          mediaOrderId,
          paymentIntentId,
        });
        if (!paid.ok) {
          // Critical partial failure: listing active, Media still pending → 5xx for Stripe retry.
          return fail("media_fulfillment_failed", {
            eventId: event.id,
            sessionId: session.id,
            listingId: objectId,
            mediaOrderId,
            listingActivated: true,
            message: paid.message,
          });
        }
        console.log("[stripe/webhook] Media order fulfilled", {
          eventId: event.id,
          sessionId: session.id,
          listingId: objectId,
          mediaOrderId,
          outcome: paid.outcome,
        });
      } else {
        console.log("[stripe/webhook] Media order already paid (idempotent)", {
          eventId: event.id,
          sessionId: session.id,
          listingId: objectId,
          mediaOrderId,
        });
      }
    }

    return NextResponse.json({
      received: true,
      activated: listingActivatedNow ? objectId : undefined,
      idempotent: listingIdempotent || undefined,
      type,
      expiresAt: activation.expiresAt,
      mediaOrderId: mediaOrderId || undefined,
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
