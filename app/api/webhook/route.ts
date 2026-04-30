import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Folosim cheile backend (SERVICE_ROLE_KEY) pentru a putea modifica baza de date
// fără ca request-ul să vină de la un utilizator logat în browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  try {
    // Stripe trimite un request raw text, pe care îl folosim ca să validăm semnătura
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.error('Lipsește Semnătura Stripe sau Webhook Secret-ul.');
      return new NextResponse('Eroare securitate', { status: 400 });
    }

    let event: Stripe.Event;

    try {
      // VALIDAREA ABSOLUTĂ: Doar serverul Stripe autentic poate trece de linia asta
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Eroare validare Webhook: ${err.message}`);
      return new NextResponse(`Eroare Semnătură: ${err.message}`, { status: 400 });
    }

    // Aici prindem evenimentul "Plată Finalizată cu Succes"
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Extragem ID-urile din chitanță (le-am pus în metadata când am creat linkul de plată)
      const listingId = session.metadata?.listingId;
      const demandId = session.metadata?.demandId;

      // 1. PLATA PENTRU UN ANUNȚ (VÂNZĂTOR)
      if (listingId) {
        // Tragem strategia de vânzare ca să știm pentru cât timp îl activăm
        const { data: listing } = await supabase
          .from('listings')
          .select('sale_strategy')
          .eq('id', listingId)
          .single();
          
        const pachet = listing?.sale_strategy || 'economy';
        const expiryDate = new Date();
        
        if (pachet === 'urgent') expiryDate.setHours(expiryDate.getHours() + 48);
        else if (pachet === 'licitatie') expiryDate.setHours(expiryDate.getHours() + 24);
        else if (pachet === 'standard') expiryDate.setDate(expiryDate.getDate() + 14);
        else expiryDate.setDate(expiryDate.getDate() + 30);

        // Actualizăm baza de date (Bypass RLS prin Service Role)
        const { error } = await supabase
          .from('listings')
          .update({ 
            status: 'active',
            expires_at: expiryDate.toISOString()
          })
          .eq('id', listingId);

        if (error) console.error("Eroare activare Listing:", error.message);
        else console.log(`✅ Anunț ${listingId} activat cu succes via Stripe!`);
      }

      // 2. PLATA PENTRU O CERERE DE CAPITAL (INVESTITOR)
      if (demandId) {
        const { error } = await supabase
          .from('demands')
          .update({ status: 'active' })
          .eq('id', demandId);

        if (error) console.error("Eroare activare Demand:", error.message);
        else console.log(`✅ Cerere Capital ${demandId} activată cu succes via Stripe!`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Eroare generală Webhook:", error);
    return new NextResponse('Eroare internă', { status: 500 });
  }
}