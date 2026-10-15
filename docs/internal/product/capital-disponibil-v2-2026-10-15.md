# Capital Disponibil v2 — 49 RON / 30 days

**Date:** 2026-10-15  
**Mode:** Staging-first product implementation  
**Status:** Code complete — Staging apply / Stripe TEST wire / E2E pending environment

## Commercial decision

| Field | Value |
|-------|--------|
| Product name (RO) | Capital Disponibil |
| Product name (EN) | Buyer Capital |
| Individual object | Cerere de cumpărare / Buying Request |
| Price | **49 RON** |
| Duration | **30 days** |
| Internal package | `demand_standard_30d` |
| Primary CTA | Publică ce vrei să cumperi / Post what you want to buy |
| Seller CTA | Am un activ potrivit / I have a matching asset |

Nothing is free on QuickExit.

## Terminology model

- Marketplace: Capital Disponibil / Buyer Capital  
- Object: cerere de cumpărare / buying request  
- Nav + CTAs updated; SEO legacy routes left intact  

## Package model

| packageId | Amount | Role |
|-----------|--------|------|
| `demand_standard_30d` | 49 RON | **Canonical v2 checkout** |
| `demand` | 99 RON | Legacy / historical webhook compatibility |
| `offer` | 49 RON | Guest Offer — **not reused** |

Env (new, **server-only**):

- `STRIPE_PRICE_DEMAND_STANDARD_49_RON`

No `NEXT_PUBLIC_*` for this Price — checkout derives server-side.

Legacy kept:

- `STRIPE_PRICE_CERERE_99_RON` / `NEXT_PUBLIC_STRIPE_PRICE_CERERE_99_RON`

## Schema (additive migration)

`supabase/migrations/20261015140000_capital_disponibil_v2_lifecycle.sql`

Columns on `public.demands`:

- `paid boolean not null default false`
- `activated_at timestamptz`
- `expires_at timestamptz`
- `package_id text`
- `buyer_verified boolean not null default false`

RLS:

- Public SELECT requires `status = active` **and** (`expires_at is null` or `expires_at > now()`)
- `demand_offers` INSERT requires effectively-active demand

## Lifecycle

```
pending_payment
  → Stripe Checkout (49 RON TEST / Live later)
  → webhook checkout.session.completed
  → status=active, paid=true, activated_at=now(), expires_at=+30d,
     package_id=demand_standard_30d, buyer_verified=(kyc snapshot)
  → cron/read-time expiry
  → status=expired (not public, no new offers)
```

Expiry enforcement:

- Read-time: `isDemandEffectivelyActive` in public fetch + seller pitch page
- Scheduled: `POST /api/cron/expire-demands` (Bearer `CRON_SECRET`)
- RLS hardened for public read + offer insert

## KYC prestige

- Canonical state: `profiles.kyc_status === "verified"`
- Snapshot to `demands.buyer_verified` at activation
- Public badge only when true: „Cumpărător verificat” / „Verified buyer”
- Publication **not** hard-blocked without KYC (consistent with listing publish rules)
- Unverified demands publish without badge

## Checkout / webhook

- Client → `POST /api/stripe/checkout` `{ type: "demand", demandId }`
- Server derives `demand_standard_30d` price (rejects client mismatch)
- Metadata: `type`, `demandId`, `userId`, `packageId`, `duration_days`, `priceId`
- Webhook validates `amount_total` vs package minor units
- Idempotent activate (`status <> active`)

## Resume checkout

Dashboard owner CTA on `pending_payment`: „Finalizează plata — 49 RON” → same checkout route.

## UX surfaces touched

- DemandCard redesign (capital hierarchy + requirements chips + verified badge)
- `/capital-disponibil` hero + totals
- Homepage capital module (Σ budget + active buyers + 49 RON CTA)
- `/posteaza-cerere` review + 49 RON pay step
- `/trimite-oferta/[id]` requirements + verified + seller CTA
- Dashboard expired / resume states
- Tarife buyer card

## Analytics

Hooks: `buyer_request_started`, `buyer_request_reviewed`, `buyer_checkout_started`,
`buyer_checkout_abandoned`, `buyer_payment_success`, `buyer_request_published`,
`seller_response_started`, `seller_response_sent` (+ legacy demand event aliases).

## Stripe TEST helper

```bash
npx tsx scripts/ensure-demand-standard-49-test-price.ts
```

Creates dedicated Product `QuickExit — Capital Disponibil` + 49 RON Price with
`metadata.packageId=demand_standard_30d`. Writes temp JSON (not committed).

**Do not** create/edit Live Stripe from this workflow.

## Staging apply checklist

1. Apply migration to **Staging** only  
2. Run TEST price script; set Staging env keys  
3. Deploy Staging preview  
4. Run E2E matrix (see product audit report section V)  
5. Run `npx tsx scripts/assert-capital-disponibil-v2.ts`

## Production rollout (design only — do not execute)

1. Create Live Stripe Product/Price 49 RON (new IDs; do not edit 99)  
2. Set Production env `STRIPE_PRICE_DEMAND_STANDARD_49_RON` (+ public twin)  
3. Apply canonical migration to Production  
4. Deploy app  
5. Smoke create → checkout → webhook → public card  
6. Safe Live validation (no accidental charge on ops keys)  
7. Monitor webhook / expiry cron  
8. Keep 99 RON config for historical records  

## Security notes

- Ownership checked server-side on checkout  
- Public select excludes `buyer_id`  
- Offer media H4B.3b unchanged  
- Webhook signature + amount validation for demand  
- No Guest Offer price reuse  
