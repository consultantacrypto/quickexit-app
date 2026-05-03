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

function getVerificationUserId(session: Stripe.Identity.VerificationSession): string | null {
  const ref = session.client_reference_id;
  if (ref && String(ref).trim()) return String(ref).trim();
  const userFromMeta = session.metadata?.userId ?? session.metadata?.user_id;
  if (userFromMeta && String(userFromMeta).trim()) return String(userFromMeta).trim();
  return null;
}

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

  const kycEventToStatus: Record<string, string> = {
    'identity.verification_session.verified': 'verified',
    'identity.verification_session.requires_input': 'requires_input',
    'identity.verification_session.processing': 'processing',
    'identity.verification_session.canceled': 'canceled',
  };

  const kyc_status = kycEventToStatus[event.type];

  if (kyc_status) {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const userId = getVerificationUserId(session);

    if (!userId) {
      console.error(
        '[KYC webhook] Lipsește userId — nu se poate actualiza profiles. Event:',
        event.type,
        'session:',
        session.id,
        'client_reference_id:',
        session.client_reference_id ?? null,
        'metadata:',
        session.metadata ?? null
      );
      return NextResponse.json({ received: true, skipped: 'no_user_id' }, { status: 200 });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ kyc_status })
      .eq('id', userId);

    if (error) {
      console.error('Eroare la actualizarea KYC în Supabase:', error);
      return NextResponse.json({ error: 'Eroare bază de date' }, { status: 500 });
    }

    console.log(`KYC webhook: profiles.kyc_status = "${kyc_status}" pentru utilizatorul ${userId} (${event.type})`);
  }

  // Îi confirmăm lui Stripe că am primit mesajul
  return NextResponse.json({ received: true });
}
