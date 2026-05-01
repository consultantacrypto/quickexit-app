import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 1. Inițializăm Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia', 
});

// 2. Inițializăm Supabase (Atenție: Folosim SERVICE_ROLE_KEY pentru a avea drepturi de scriere din backend)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  // Stripe ne trimite datele "raw" (brute) pe care trebuie să le citim direct ca text
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Lipsă semnătură Stripe' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // 3. Securitate maximă: Verificăm că mesajul vine chiar de la Stripe folosind secretul tău
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_KYC_WEBHOOK_SECRET! // Variabila nouă pe care ai pus-o în Vercel
    );
  } catch (err: any) {
    console.error('Eroare validare Webhook KYC:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 4. Dacă Stripe zice că buletinul e valid...
  if (event.type === 'identity.verification_session.verified') {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    
    // Extragem ID-ul utilizatorului pe care l-am trimis noi inițial în metadata
    const userId = session.metadata?.userId;

    if (userId) {
      // 5. Mergem în Supabase și schimbăm statusul. 
      // (Dacă tabela ta se numește altfel decât 'profiles' sau 'users', modifică mai jos)
      const { error } = await supabaseAdmin
        .from('profiles') 
        .update({ kyc_status: 'verified' })
        .eq('id', userId);

      if (error) {
        console.error('Eroare la deblocarea contului în Supabase:', error);
        return NextResponse.json({ error: 'Eroare bază de date' }, { status: 500 });
      }

      console.log(`BINGO! KYC aprobat și cont deblocat pentru utilizatorul: ${userId}`);
    }
  }

  // Îi confirmăm lui Stripe că am primit mesajul
  return NextResponse.json({ received: true });
}