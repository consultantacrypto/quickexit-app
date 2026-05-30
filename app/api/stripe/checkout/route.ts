import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSiteUrl } from "@/lib/siteUrl";
import { getPackageByPriceId } from "@/lib/stripePackages";

export async function POST(req: Request) {
  try {
    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeApiKey) {
      return NextResponse.json(
        { error: "Config server incompletă: STRIPE_SECRET_KEY lipsește." },
        { status: 500 }
      );
    }

    const baseUrl = getSiteUrl();

    const stripe = new Stripe(stripeApiKey, {
      apiVersion: "2023-10-16" as any,
    });

    const body = await req.json().catch(() => null);
    const priceId = String(body?.priceId ?? "").trim();
    const userId = String(body?.userId ?? "").trim();

    // Tipul obiectului care se activează după plată: anunț ("listing") sau cerere ("demand").
    // Implicit "listing" pentru compatibilitate cu fluxul de publicare anunț.
    const type = body?.type === "demand" ? "demand" : "listing";
    const listingId = String(body?.listingId ?? "").trim();
    const demandId = String(body?.demandId ?? "").trim();

    // ID-ul relevant pentru tipul ales.
    const objectId = type === "demand" ? demandId : listingId;

    if (!priceId || !objectId) {
      return NextResponse.json(
        {
          error:
            type === "demand"
              ? "Date invalide: priceId și demandId sunt obligatorii."
              : "Date invalide: priceId și listingId sunt obligatorii.",
        },
        { status: 400 }
      );
    }

    // Allowlist: acceptăm doar Price ID-uri cunoscute (pachetele noastre).
    const pkg = getPackageByPriceId(priceId);
    if (!pkg) {
      return NextResponse.json(
        { error: "Pachet invalid: priceId necunoscut." },
        { status: 400 }
      );
    }

    // URL-urile de redirect poartă tipul + id-ul, ca dashboard-ul să afișeze starea corectă.
    const successQuery =
      type === "demand"
        ? `payment=success&type=demand&demandId=${demandId}`
        : `payment=success&type=listing&listingId=${listingId}`;
    const cancelQuery =
      type === "demand"
        ? `payment=cancel&type=demand&demandId=${demandId}`
        : `payment=cancel&type=listing&listingId=${listingId}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: pkg.priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?${successQuery}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard?${cancelQuery}`,
      // type + id-ul obiectului sunt esențiale în webhook pentru a activa lucrul corect.
      metadata: {
        type,
        listingId: type === "listing" ? listingId : "",
        demandId: type === "demand" ? demandId : "",
        userId: userId || "",
        priceId: pkg.priceId,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error("[stripe/checkout] Eroare la generarea sesiunii:", error?.message ?? error);
    return NextResponse.json(
      { error: error?.message ?? "Eroare internă la inițializarea plății." },
      { status: 500 }
    );
  }
}
