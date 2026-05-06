import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getListingPackageById, toStripeAmountRon } from '@/lib/pricing';

export async function POST(req: Request) {
  try {
    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!stripeApiKey) {
      return NextResponse.json({ error: 'Config server incompleta: STRIPE_SECRET_KEY lipseste.' }, { status: 500 });
    }
    if (!baseUrl) {
      return NextResponse.json({ error: 'Config server incompleta: NEXT_PUBLIC_BASE_URL lipseste.' }, { status: 500 });
    }

    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2023-10-16' as any, // versiune stabilă
    });

    const body = await req.json();
    const listingId = String(body?.listingId ?? '').trim();
    const packageId = String(body?.packageId ?? '').trim();
    const title = String(body?.title ?? 'Activ').trim();
    if (!listingId || !packageId) {
      return NextResponse.json({ error: 'Date invalide: listingId si packageId sunt obligatorii.' }, { status: 400 });
    }

    const pkg = getListingPackageById(packageId);
    if (!pkg) {
      return NextResponse.json({ error: 'Pachet invalid pentru checkout listing.' }, { status: 400 });
    }
    const expectedAmount = toStripeAmountRon(pkg.priceRon);
    if (!expectedAmount) {
      return NextResponse.json({ error: 'Config pachet invalid: amount Stripe este 0.' }, { status: 500 });
    }

    // Creăm sesiunea de plată către Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: `Quick Exit — ${pkg.title}`,
              description: `Activare anunț: ${title}`,
            },
            unit_amount: expectedAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Unde îl trimitem după ce a plătit cu succes (îl trimitem direct în Dashboard)
      success_url: `${baseUrl}/dashboard?payment=success&listing=${listingId}`,
      // Unde îl trimitem dacă dă "Înapoi" sau închide plata
      cancel_url: `${baseUrl}/pune-anunt`,
      metadata: {
        type: 'listing',
        listingId,
        packageId: pkg.id,
        expectedAmount: String(expectedAmount),
        currency: 'ron',
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Eroare la generarea plății Stripe:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}