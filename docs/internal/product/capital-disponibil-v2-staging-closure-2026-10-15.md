# Capital Disponibil v2 — Staging CLOSED (2026-10-15)

## Verdict

**Staging CLOSED** for Capital Disponibil v2 (49 RON / 30 days).  
**Production rollout: READY** (manual Production steps still required; not executed here).

## Safety

| Check | Result |
|-------|--------|
| Staging Supabase | `nlnzlswjjplofpkhoxtr` |
| Production Supabase | `geywuzwbzecknokvnins` — **untouched** |
| Production deploy | **not executed** |
| Production Stripe Live | **untouched** |
| `www.quickexit.ro` alias | remains Production `dpl_8HNWEk9…` (not Staging) |
| Staging alias | `https://quickexit-staging.vercel.app` → Preview Ready |

## Deployment

| Field | Value |
|-------|-------|
| Deployment ID | `dpl_HKVKJvopz8qHzWzSRqL1B5Y8hkFS` |
| Commit SHA | `f0e54bbc5bb46b774a5aaae0868971949ff4a590` (`f0e54bb`) |
| Status | READY |
| Alias | `quickexit-staging.vercel.app` confirmed |
| Env class | Preview overrides + Staging Supabase + Stripe TEST |

Earlier same-day deploy `dpl_CyGkxq9…` was superseded after `CRON_SECRET` was bound into deployment env.

## Evidence files

- `docs/internal/product/capital-disponibil-v2-staging-checkout-session-2026-10-15.json`
- `docs/internal/product/capital-disponibil-v2-staging-payment-2026-10-15.json`
- `docs/internal/product/capital-disponibil-v2-staging-remaining-e2e-2026-10-15.json`
- `docs/internal/product/capital-disponibil-v2-staging-db-e2e-2026-10-15.json`
- `docs/internal/staging-bootstrap/staging-deployment.json`

## Production rollout checklist (not done)

1. Apply migration `20261015140000` to Production (after explicit approval).
2. Add Production `STRIPE_PRICE_DEMAND_STANDARD_49_RON` (Live Price, dedicated product — never Guest Offer).
3. Confirm Live Stripe webhook includes demand activation path.
4. Schedule Production cron for `/api/cron/expire-demands` **only** with Production-safe gating (`CRON_ALLOW_PRODUCTION_EXPIRE=1` + Production `CRON_SECRET`). Do **not** share Preview cron config.
5. Deploy Production frontend after Staging soak.
