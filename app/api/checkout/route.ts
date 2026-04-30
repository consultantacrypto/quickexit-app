import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inițializăm Stripe cu cheia ta secretă
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any, // versiune stabilă
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { listingId, packageId, price, title } = body;

    // Creăm sesiunea de plată către Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: `Lichidare QuickExit: Pachet ${packageId.toUpperCase()}`,
              description: `Taxă activare pentru: ${title}`,
            },
            unit_amount: price * 100, // Stripe lucrează în "bani" (ex: 99 RON = 9900 bani)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Unde îl trimitem după ce a plătit cu succes (îl trimitem direct în Dashboard)
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=success&listing=${listingId}`,
      // Unde îl trimitem dacă dă "Înapoi" sau închide plata
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pune-anunt`,
      metadata: {
        listingId: listingId, // Salvăm ID-ul anunțului pe chitanță
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Eroare la generarea plății Stripe:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}