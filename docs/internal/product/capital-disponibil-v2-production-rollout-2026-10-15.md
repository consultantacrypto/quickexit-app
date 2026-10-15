# Capital Disponibil v2 — Production Rollout (2026-10-15)

## Verdict

**Capital Disponibil v2 is LIVE on Production** at 49 RON / 30 days (`demand_standard_30d`).

Live payment charge was **not** completed in this session (optional). Webhook activation lifecycle remains Staging-proven. Live Checkout session facts were proven on Production (`livemode=true`, `amount_total=4900`).

## Price verification

| Check | Result |
|-------|--------|
| Production env `STRIPE_PRICE_DEMAND_STANDARD_49_RON` | Present (Production-scoped) |
| Live Checkout `livemode` | `true` (`cs_live_…`) |
| `amount_total` | `4900` |
| `currency` | `ron` |
| `packageId` | `demand_standard_30d` |
| `type` | `demand` |
| Not Guest Offer / not legacy 99 checkout path | Confirmed via dedicated package + env |

Evidence: `docs/internal/product/capital-disponibil-v2-production-pre-rollout-2026-10-15/live-checkout-session.json`

## Migration

| Item | Result |
|------|--------|
| Version | `20261015140000` |
| Target | Production `geywuzwbzecknokvnins` |
| Columns | `paid`, `activated_at`, `expires_at`, `package_id`, `buyer_verified` |
| Row counts | Preserved (total=1, active=1 before/after) |
| Staging | Untouched |

Script: `scripts/apply-capital-disponibil-v2-production.ts`

## Deployment

| Field | Value |
|-------|-------|
| Final deployment ID | `dpl_CBu31SAYD3bv9aCDDZywzgQSkGv7` |
| Prior rollout deploys | `dpl_4noPH8d…`, `dpl_BZLgtve…`, `dpl_9ntDKM…` (iterative proof/cron fixes) |
| Alias | `https://www.quickexit.ro` |
| Staging alias | Unchanged (`dpl_HKVKJvop…` Preview) |
| Workspace tip | Working tree included Capital Disponibil v2 sources (not all committed to git tip `f0e54bb`) |

## Live checkout proof

- Synthetic operator-test buyer + `pending_payment` demand
- Checkout API returned Live session with **4900 RON**
- **Payment not charged** — webhook activate path Staging-proven

## Expiry + cron

| Check | Result |
|-------|--------|
| Unauthorized | **401** |
| Authorized + armed | **200** `{"ok":true,"expired_count":0}` |
| Production env | `CRON_SECRET`, `CRON_ALLOW_PRODUCTION_EXPIRE` |
| Schedule | `vercel.json` hourly `0 * * * *` → `/api/cron/expire-demands` |
| Preview CRON_SECRET | Independent (not shared value with Production) |

Gate fix: Production Supabase ref allowed only when `CRON_ALLOW_PRODUCTION_EXPIRE` is armed.

## Regressions

| Area | Result |
|------|--------|
| Media pricing assert | PASS |
| Capital Disponibil v2 assert | PASS |
| Listing 99 RON economy copy | Still present in listing catalog (intentional; not demand v2 CTA) |
| H4B.3b | Staging matrix PASS earlier same day; Production media policies unchanged by this rollout |

## Observability

| Check | Result |
|-------|--------|
| `/api/health` | 200 `environment=production` |
| Staging health | 200 `environment=staging` |
| Better Stack / Sentry deep dive | Not fully exercised in this session — health green |

## Cleanup

Operator-test demands/users with `@quickexit.operator-test` removed after proofs. Stripe Live session history retained (no charge completed).

## Rollback

1. Redeploy previous Production deployment (`dpl_8HNWEk9NaZ8tcsPzTVFBjfowsx6z` pre-rollout baseline).
2. Keep migration columns (additive; safe to leave).
3. Disable Production expire by removing `CRON_ALLOW_PRODUCTION_EXPIRE` and/or pausing cron.
4. Remove or unset `STRIPE_PRICE_DEMAND_STANDARD_49_RON` only if forcing hard disable of v2 checkout.

## Remaining follow-ups

1. Optional: complete one real 49 RON Live payment for end-to-end webhook proof on Production.
2. Commit Capital Disponibil v2 sources to git so Production tip matches repo HEAD.
3. Confirm Better Stack monitors remain green after soak.
4. H4B.3b Production matrix re-run with fresh Production fixtures (optional soak).
