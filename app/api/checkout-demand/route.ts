import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    const stripeApiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_vercel';
    
    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2023-10-16' as any,
    });

    const body = await req.json();
    const { demandId, title, price } = body;

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
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // După plată, îl întoarcem în Dashboard cu un flag special pentru "demand"
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=success_demand&demand=${demandId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/posteaza-cerere`,
      metadata: {
        demandId: demandId,
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Eroare la generarea plății Stripe pentru Demand:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}