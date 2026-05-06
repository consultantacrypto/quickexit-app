import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getDemandCheckoutPrice, toStripeAmountRon } from '@/lib/pricing';

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
      apiVersion: '2023-10-16' as any,
    });

    const body = await req.json();
    const demandId = String(body?.demandId ?? '').trim();
    const title = String(body?.title ?? 'Cerere capital').trim();
    if (!demandId) {
      return NextResponse.json({ error: 'Date invalide: demandId este obligatoriu.' }, { status: 400 });
    }

    const expectedAmount = toStripeAmountRon(getDemandCheckoutPrice());
    if (!expectedAmount) {
      return NextResponse.json({ error: 'Config demand invalid: amount Stripe este 0.' }, { status: 500 });
    }

    // Creăm sesiunea de plată către Stripe pentru CERERE
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: `QuickExit: Postare Cerere Cumpărare`,
              description: `Taxă activare pentru: ${title}`,
            },
            unit_amount: expectedAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // După plată, îl întoarcem în Dashboard cu un flag special pentru "demand"
      success_url: `${baseUrl}/dashboard?payment=success_demand&demand=${demandId}`,
      cancel_url: `${baseUrl}/posteaza-cerere`,
      metadata: {
        type: 'demand',
        demandId,
        expectedAmount: String(expectedAmount),
        currency: 'ron',
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Eroare la generarea plății Stripe pentru Demand:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}