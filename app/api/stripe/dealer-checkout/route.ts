import { NextResponse } from "next/server";
import {
  DEALER_AMOUNT_MINOR,
  DEALER_AMOUNT_RON,
  DEALER_CAPACITY_CARS,
  DEALER_CHECKOUT_TYPE,
  DEALER_CURRENCY,
  DEALER_PACKAGE_ID,
  DealerPriceConfigError,
  createQuickExitStripe,
  ensureDealerPrice,
  resolveDealerReturnOrigin,
} from "@/lib/dealerSubscription";
import { captureException, ensureCorrelationId, logError, logInfo } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const correlationId = ensureCorrelationId(req.headers);
  const stripeApiKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeApiKey) {
    logError({
      component: "dealer_checkout",
      operation: "config_check",
      result: "error",
      error_code: "missing_stripe_secret",
      correlation_id: correlationId,
    });
    return NextResponse.json(
      { error: "Plata nu este disponibilă momentan. Încearcă din nou peste puțin timp." },
      { status: 500 },
    );
  }

  const stripe = createQuickExitStripe(stripeApiKey);

  try {
    const priceId = await ensureDealerPrice(stripe);
    const origin = resolveDealerReturnOrigin(req.headers);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dealeri?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dealeri?payment=cancel`,
      customer_creation: "always",
      locale: "ro",
      metadata: {
        type: DEALER_CHECKOUT_TYPE,
        packageId: DEALER_PACKAGE_ID,
        capacityCars: String(DEALER_CAPACITY_CARS),
        amountRon: String(DEALER_AMOUNT_RON),
        priceId,
      },
    });

    if (
      !session.url ||
      session.amount_total !== DEALER_AMOUNT_MINOR ||
      session.currency !== DEALER_CURRENCY
    ) {
      if (session.id) {
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch {
          // The mismatched session is unused if expire fails.
        }
      }
      logError({
        component: "dealer_checkout",
        operation: "session_amount",
        result: "error",
        error_code: "dealer_amount_mismatch",
        correlation_id: correlationId,
        sessionId: session.id,
        amount_total: session.amount_total,
        currency: session.currency,
      });
      return NextResponse.json(
        { error: "Nu am putut deschide plata de 600 RON. Încearcă din nou." },
        { status: 500 },
      );
    }

    logInfo({
      component: "dealer_checkout",
      operation: "session_create",
      result: "ok",
      correlation_id: correlationId,
      sessionId: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      packageId: DEALER_PACKAGE_ID,
    });

    return NextResponse.json({
      url: session.url,
      amount_total: session.amount_total,
      currency: session.currency,
    });
  } catch (error: unknown) {
    const code = error instanceof DealerPriceConfigError ? error.message : "stripe_session_failed";
    logError({
      component: "dealer_checkout",
      operation: "session_create",
      result: "error",
      error_code: code,
      correlation_id: correlationId,
      message: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    });
    captureException(error, {
      component: "dealer_checkout",
      operation: "session_create",
      correlation_id: correlationId,
      error_code: code,
      level: "error",
    });
    return NextResponse.json(
      { error: "Nu am putut inițializa plata. Te rugăm să încerci din nou." },
      { status: 500 },
    );
  }
}
