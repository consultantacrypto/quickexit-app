import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPackageByPriceId, getExpiryIsoForPackage } from "@/lib/stripePackages";

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
    } catch (err: any) {
      console.error(`[stripe/webhook] Semnătură invalidă: ${err?.message}`);
      return new NextResponse(`Eroare semnătură: ${err?.message}`, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Procesăm doar plățile efectiv încasate.
      if (String(session.payment_status ?? "").toLowerCase() !== "paid") {
        return NextResponse.json({ received: true, skipped: "not_paid" });
      }

      // Tipul obiectului de activat: "listing" (anunț) sau "demand" (cerere de capital).
      // Implicit "listing" pentru compatibilitate cu sesiunile vechi.
      const type = session.metadata?.type === "demand" ? "demand" : "listing";
      const listingId = String(session.metadata?.listingId ?? "").trim();
      const demandId = String(session.metadata?.demandId ?? "").trim();
      const userId = String(session.metadata?.userId ?? "").trim();
      const priceId = String(session.metadata?.priceId ?? "").trim();

      const table = type === "demand" ? "demands" : "listings";
      const objectId = type === "demand" ? demandId : listingId;

      if (!objectId) {
        console.error("[stripe/webhook] id lipsește din metadata.", { sessionId: session.id, type });
        return NextResponse.json({ received: true, skipped: "missing_object_id" });
      }

      // priceId-ul trebuie să fie un pachet cunoscut pentru a calcula expirarea.
      const pkg = getPackageByPriceId(priceId);
      if (!pkg) {
        console.error("[stripe/webhook] priceId necunoscut în metadata.", {
          sessionId: session.id,
          priceId,
        });
        return NextResponse.json({ received: true, skipped: "unknown_price_id" });
      }

      const expiresAt = getExpiryIsoForPackage(pkg);

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Idempotență: dacă obiectul e deja activ, nu refacem update-ul.
      const { data: existing, error: fetchError } = await supabase
        .from(table)
        .select("id, status")
        .eq("id", objectId)
        .maybeSingle();

      if (fetchError) {
        console.error(`[stripe/webhook] Eroare citire ${table}:`, fetchError.message);
        return new NextResponse(`Eroare citire ${table}.`, { status: 500 });
      }
      if (!existing) {
        console.error("[stripe/webhook] Obiect inexistent.", { sessionId: session.id, table, objectId });
        return NextResponse.json({ received: true, skipped: "object_not_found" });
      }
      if ((existing as { status?: string }).status === "active") {
        return NextResponse.json({ received: true, idempotent: true });
      }

      const updateError = await activateRow(supabase, table, objectId, expiresAt);
      if (updateError) {
        // Plata a reușit deja; activarea a eșuat → log detaliat pentru RECUPERARE MANUALĂ.
        console.error("[stripe/webhook] Eroare activare — RECUPERARE MANUALĂ:", {
          sessionId: session.id,
          type,
          table,
          objectId,
          priceId,
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
        priceId,
        expiresAt,
      });
      return NextResponse.json({ received: true, activated: objectId, type, expiresAt });
    }

    // Alte evenimente: confirmăm recepția ca Stripe să nu mai reîncerce.
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[stripe/webhook] Eroare generală:", error?.message ?? error);
    return new NextResponse("Eroare internă.", { status: 500 });
  }
}

// Activează un rând (listing/demand) cu degradare elegantă a coloanelor opționale.
// Încearcă întâi cu `paid` + `expires_at`; dacă o coloană lipsește din schemă
// (PostgREST PGRST204), o scoate și reîncearcă, până rămâne doar `status: active`.
async function activateRow(
  supabase: SupabaseClient,
  table: string,
  id: string,
  expiresAt: string | null
): Promise<{ message: string } | null> {
  const payload: Record<string, unknown> = { status: "active", paid: true };
  if (expiresAt) payload.expires_at = expiresAt;

  // Maxim 3 reîncercări: scoatem pe rând `paid`, apoi `expires_at`.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", id)
      .neq("status", "active");

    if (!error) return null;

    // Scoatem coloana care lipsește din schemă și reîncercăm; altfel, eroare reală.
    let removed = false;
    for (const col of ["paid", "expires_at"]) {
      if (col in payload && isMissingColumnError(error, col)) {
        delete payload[col];
        removed = true;
        break;
      }
    }
    if (!removed) return error;
  }

  return { message: "Update eșuat după mai multe încercări de fallback." };
}

// Detectează eroarea PostgREST de coloană inexistentă (ex: lipsește `paid`),
// ca să putem face fallback fără acel câmp.
function isMissingColumnError(
  error: { code?: string; message?: string } | null,
  column: string
): boolean {
  if (!error) return false;
  // PGRST204 = coloană negăsită în cache-ul de schemă; mesajul conține numele coloanei.
  if (error.code === "PGRST204") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes(column.toLowerCase()) && msg.includes("column");
}
