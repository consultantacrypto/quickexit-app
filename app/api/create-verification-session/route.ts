import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inițializăm Stripe cu versiunea corectă cerută de TypeScript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia', 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body; // ID-ul utilizatorului preluat din Supabase

    if (!userId) {
      return NextResponse.json(
        { error: 'ID-ul utilizatorului este obligatoriu' }, 
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://quickexit-app.vercel.app";

    // Creăm sesiunea de verificare a identității
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId: userId, // Foarte important: așa facem legătura cu Supabase mai târziu în Webhook
      },
      options: {
        document: {
          require_matching_selfie: true, // Extra securitate pentru un marketplace de active premium
        },
      },
      // Unde se întoarce utilizatorul după ce termină procesul (chiar dacă încă se procesează în background)
      return_url: `${baseUrl}/dashboard?kyc_process=started`,
    });

    // Trimitem URL-ul către interfață pentru a face redirect
    return NextResponse.json({ url: verificationSession.url });
    
  } catch (error: any) {
    console.error('Eroare Stripe Identity:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}