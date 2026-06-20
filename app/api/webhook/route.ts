import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
  getDemandCheckoutPrice,
  getListingExpiryIso,
  getListingPackageById,
  toStripeAmountRon,
} from '@/lib/pricing';
import {
  activateRow,
  extractCheckoutIds,
  resolveActivationPlan,
} from '@/lib/stripeWebhookActivation';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!supabaseUrl || !serviceRoleKey) {
      return new NextResponse('Config server incompleta (Supabase).', { status: 500 });
    }
    if (!stripeApiKey) {
      return new NextResponse('Config server incompleta (Stripe key).', { status: 500 });
    }
    if (!webhookSecret) {
      return new NextResponse('Config server incompleta (Stripe webhook secret).', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const stripe = new Stripe(stripeApiKey, {
      apiVersion: '2023-10-16' as any,
    });

    // 2. LOGICA DE WEBHOOK
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
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

    // 3. PRINDEREA EVENIMENTULUI DE PLATĂ
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paidAmount = Number(session.amount_total ?? 0);
      const paidCurrency = String(session.currency ?? '').toLowerCase();
      const paymentStatus = String(session.payment_status ?? '').toLowerCase();

      if (paymentStatus !== 'paid') {
        console.warn('[webhook] checkout.session.completed ignorat: payment_status != paid', {
          sessionId: session.id,
          paymentStatus,
        });
        return NextResponse.json({ received: true, skipped: 'not_paid' });
      }
      if (!paidAmount || !Number.isFinite(paidAmount)) {
        console.warn('[webhook] checkout.session.completed ignorat: amount_total invalid', {
          sessionId: session.id,
          paidAmount,
        });
        return NextResponse.json({ received: true, skipped: 'invalid_amount' });
      }
      if (paidCurrency !== 'ron') {
        console.warn('[webhook] checkout.session.completed ignorat: currency invalida', {
          sessionId: session.id,
          paidCurrency,
        });
        return NextResponse.json({ received: true, skipped: 'invalid_currency' });
      }

      const type = String(session.metadata?.type ?? '').trim();
      const expectedFromMetadata = Number(session.metadata?.expectedAmount ?? 0);
      const metadataCurrency = String(session.metadata?.currency ?? '').toLowerCase();

      if (metadataCurrency && metadataCurrency !== 'ron') {
        console.warn('[webhook] metadata currency mismatch', {
          sessionId: session.id,
          metadataCurrency,
        });
        return NextResponse.json({ received: true, skipped: 'metadata_currency_mismatch' });
      }

      if (type === 'listing') {
        const listingId = String(
          session.metadata?.listingId ??
            session.metadata?.listing_id ??
            session.metadata?.listing ??
            ''
        ).trim();
        const packageId = String(
          session.metadata?.packageId ?? session.metadata?.package_id ?? ''
        ).trim();
        const priceId = String(
          session.metadata?.priceId ?? session.metadata?.price_id ?? ''
        ).trim();

        // Flux nou: /api/stripe/checkout trimite priceId (fără packageId).
        if (listingId && priceId && !packageId) {
          const activation = await resolveActivationPlan(stripe, session, 'listing');
          if (activation.source !== 'none') {
            const { data: listing, error: listingError } = await supabase
              .from('listings')
              .select('id, status')
              .eq('id', listingId)
              .single();
            if (listingError || !listing) {
              console.error('[webhook] listing not found (priceId flow)', {
                sessionId: session.id,
                listingId,
                reason: listingError?.message,
                code: listingError?.code,
              });
              return NextResponse.json({ received: true, skipped: 'listing_not_found' });
            }
            if (listing.status === 'active') {
              console.log('[webhook] listing deja activ - idempotent (priceId flow)', {
                sessionId: session.id,
                listingId,
              });
              return NextResponse.json({ received: true, idempotent: true, type: 'listing' });
            }

            const updateError = await activateRow(
              supabase,
              'listings',
              listingId,
              activation.expiresAt,
              '[webhook]'
            );
            if (updateError) {
              console.error('[webhook] Eroare activare listing (priceId flow) — RECUPERARE MANUALĂ:', {
                sessionId: session.id,
                listingId,
                activation,
                supabase: updateError.supabase,
                error: updateError.message,
              });
              return new NextResponse('Eroare activare listing', { status: 500 });
            }
            console.log('[webhook] listing activat (priceId flow)', {
              sessionId: session.id,
              listingId,
              activation,
              paidAmount,
            });
            return NextResponse.json({ received: true, type: 'listing' });
          }
        }

        const pkg = getListingPackageById(packageId);
        if (!listingId || !pkg) {
          console.error('[webhook] listing metadata invalid', {
            sessionId: session.id,
            listingId,
            packageId,
            priceId,
            metadata: session.metadata,
          });
          return NextResponse.json({ received: true, skipped: 'listing_metadata_invalid' });
        }
        const expectedServerAmount = toStripeAmountRon(pkg.priceRon);
        if (expectedServerAmount !== paidAmount || expectedFromMetadata !== paidAmount) {
          console.error('[webhook] listing amount mismatch - nu activam', {
            sessionId: session.id,
            listingId,
            packageId,
            expectedServerAmount,
            expectedFromMetadata,
            paidAmount,
          });
          return NextResponse.json({ received: true, skipped: 'listing_amount_mismatch' });
        }

        const { data: listing, error: listingError } = await supabase
          .from('listings')
          .select('id, status')
          .eq('id', listingId)
          .single();
        if (listingError || !listing) {
          console.error('[webhook] listing not found', { sessionId: session.id, listingId, reason: listingError?.message });
          return NextResponse.json({ received: true, skipped: 'listing_not_found' });
        }
        if (listing.status === 'active') {
          console.log('[webhook] listing deja activ - idempotent', { sessionId: session.id, listingId });
          return NextResponse.json({ received: true, idempotent: true, type: 'listing' });
        }

        const { error } = await supabase
          .from('listings')
          .update({
            status: 'active',
            expires_at: getListingExpiryIso(pkg.id),
          })
          .eq('id', listingId)
          .neq('status', 'active');
        if (error) {
          console.error('Eroare activare Listing:', error.message);
          return new NextResponse('Eroare activare listing', { status: 500 });
        }
        console.log('[webhook] listing activat', { sessionId: session.id, listingId, packageId, paidAmount });
        return NextResponse.json({ received: true, type: 'listing' });
      }

      if (type === 'demand') {
        const demandId = String(
          session.metadata?.demandId ??
            session.metadata?.demand_id ??
            session.metadata?.demand ??
            ''
        ).trim();
        const priceId = String(
          session.metadata?.priceId ?? session.metadata?.price_id ?? ''
        ).trim();

        // Flux nou: /api/stripe/checkout pentru cereri de capital.
        if (demandId && priceId) {
          const activation = await resolveActivationPlan(stripe, session, 'demand');
          if (activation.source !== 'none') {
            const { data: demand, error: demandError } = await supabase
              .from('demands')
              .select('id, status')
              .eq('id', demandId)
              .single();
            if (demandError || !demand) {
              console.error('[webhook] demand not found (priceId flow)', {
                sessionId: session.id,
                demandId,
                reason: demandError?.message,
              });
              return NextResponse.json({ received: true, skipped: 'demand_not_found' });
            }
            if (demand.status === 'active') {
              return NextResponse.json({ received: true, idempotent: true, type: 'demand' });
            }

            const updateError = await activateRow(
              supabase,
              'demands',
              demandId,
              activation.expiresAt,
              '[webhook]'
            );
            if (updateError) {
              console.error('[webhook] Eroare activare demand (priceId flow):', {
                sessionId: session.id,
                demandId,
                supabase: updateError.supabase,
                error: updateError.message,
              });
              return new NextResponse('Eroare activare demand', { status: 500 });
            }
            console.log('[webhook] demand activata (priceId flow)', { sessionId: session.id, demandId });
            return NextResponse.json({ received: true, type: 'demand' });
          }
        }
        const expectedServerAmount = toStripeAmountRon(getDemandCheckoutPrice());
        if (!demandId) {
          console.error('[webhook] demand metadata invalid', { sessionId: session.id });
          return NextResponse.json({ received: true, skipped: 'demand_metadata_invalid' });
        }
        if (expectedServerAmount !== paidAmount || expectedFromMetadata !== paidAmount) {
          console.error('[webhook] demand amount mismatch - nu activam', {
            sessionId: session.id,
            demandId,
            expectedServerAmount,
            expectedFromMetadata,
            paidAmount,
          });
          return NextResponse.json({ received: true, skipped: 'demand_amount_mismatch' });
        }

        const { data: demand, error: demandError } = await supabase
          .from('demands')
          .select('id, status')
          .eq('id', demandId)
          .single();
        if (demandError || !demand) {
          console.error('[webhook] demand not found', { sessionId: session.id, demandId, reason: demandError?.message });
          return NextResponse.json({ received: true, skipped: 'demand_not_found' });
        }
        if (demand.status === 'active') {
          console.log('[webhook] demand deja activa - idempotent', { sessionId: session.id, demandId });
          return NextResponse.json({ received: true, idempotent: true, type: 'demand' });
        }

        const { error } = await supabase
          .from('demands')
          .update({ status: 'active' })
          .eq('id', demandId)
          .neq('status', 'active');
        if (error) {
          console.error('Eroare activare Demand:', error.message);
          return new NextResponse('Eroare activare demand', { status: 500 });
        }
        console.log('[webhook] demand activata', { sessionId: session.id, demandId, paidAmount });
        return NextResponse.json({ received: true, type: 'demand' });
      }

      console.warn('[webhook] type necunoscut in metadata', { sessionId: session.id, type });
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[webhook] Eroare generală neprevăzută:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
    });
    return new NextResponse('Eroare internă', { status: 500 });
  }
}