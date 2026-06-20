import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  activateRow,
  extractCheckoutIds,
  resolveActivationPlan,
} from "@/lib/stripeWebhookActivation";

// Webhook-ul are nevoie de runtime Node.js (crypto) pentru verificarea semnăturii
// și de body-ul brut (necacheabil) pentru constructEvent.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    // Body brut + semnătura, obligatorii pentru validare.
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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentStatus = String(session.payment_status ?? "").toLowerCase();

      if (paymentStatus !== "paid") {
        console.error("[stripe/webhook] checkout.session.completed ignorat: plata nu e finalizată.", {
          sessionId: session.id,
          paymentStatus,
          metadata: session.metadata,
        });
        return NextResponse.json({ received: true, skipped: "not_paid" });
      }

      const { type, listingId, demandId, userId, objectId, metadata } = extractCheckoutIds(session);
      const table = type === "demand" ? "demands" : "listings";

      if (!objectId) {
        console.error("[stripe/webhook] listingId/demandId lipsește din metadata.", {
          sessionId: session.id,
          type,
          listingId,
          demandId,
          metadata,
          clientReferenceId: session.client_reference_id,
        });
        return NextResponse.json({ received: true, skipped: "missing_object_id" });
      }

      const activation = await resolveActivationPlan(stripe, session, type);
      if (activation.source === "none") {
        console.error("[stripe/webhook] Nu am putut rezolva pachetul (priceId/packageId).", {
          sessionId: session.id,
          type,
          objectId,
          metadata,
          priceId: metadata.priceId ?? metadata.price_id ?? null,
          packageId: metadata.packageId ?? metadata.package_id ?? null,
        });
        return NextResponse.json({ received: true, skipped: "unknown_price_id" });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: existing, error: fetchError } = await supabase
        .from(table)
        .select("id, status")
        .eq("id", objectId)
        .maybeSingle();

      if (fetchError) {
        console.error("[stripe/webhook] Eroare citire din Supabase:", {
          sessionId: session.id,
          table,
          objectId,
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
        });
        return new NextResponse(`Eroare citire ${table}.`, { status: 500 });
      }
      if (!existing) {
        console.error("[stripe/webhook] Obiect inexistent în Supabase.", {
          sessionId: session.id,
          table,
          objectId,
          listingId,
          demandId,
        });
        return NextResponse.json({ received: true, skipped: "object_not_found" });
      }
      if ((existing as { status?: string }).status === "active") {
        console.log("[stripe/webhook] Obiect deja activ (idempotent).", {
          sessionId: session.id,
          table,
          objectId,
        });
        return NextResponse.json({ received: true, idempotent: true });
      }

      const updateError = await activateRow(
        supabase,
        table,
        objectId,
        activation.expiresAt,
        "[stripe/webhook]"
      );
      if (updateError) {
        console.error("[stripe/webhook] Eroare activare — RECUPERARE MANUALĂ:", {
          sessionId: session.id,
          type,
          table,
          objectId,
          listingId,
          demandId,
          userId: userId || null,
          activation,
          supabase: updateError.supabase,
          error: updateError.message,
        });
        return new NextResponse(`Eroare activare ${table}.`, { status: 500 });
      }

      console.log("[stripe/webhook] Obiect activat după plată.", {
        sessionId: session.id,
        type,
        table,
        objectId,
        userId: userId || null,
        activation,
      });
      return NextResponse.json({
        received: true,
        activated: objectId,
        type,
        expiresAt: activation.expiresAt,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[stripe/webhook] Eroare generală neprevăzută:", {
      message: err.message,
      name: err.name,
      stack: err.stack,
    });
    return new NextResponse("Eroare internă.", { status: 500 });
  }
}
