import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    // AM MUTAT AICI INIȚIALIZAREA ȘI AM PUS FALLBACK
    // Dacă Vercel nu găsește cheia la build, folosește textul de avarie și trece mai departe.
    const stripeApiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_vercel';
    
    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2023-10-16' as any, // versiune stabilă
    });

    const body = await req.json();
    const { listingId, packageId, price, title } = body;

    const packageTitlesRo: Record<string, string> = {
      economy: 'Expunere maximă',
      standard: 'Vânzare rapidă',
      urgent: 'Vânzare urgentă',
      auction: 'Licitație rapidă',
      licitatie: 'Licitație rapidă',
    };
    const pachetNume = packageTitlesRo[String(packageId)] || 'Promovare anunț';

    // Creăm sesiunea de plată către Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: `Quick Exit — ${pachetNume}`,
              description: `Activare anunț: ${title}`,
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