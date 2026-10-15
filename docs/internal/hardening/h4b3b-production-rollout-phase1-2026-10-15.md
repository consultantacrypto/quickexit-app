# H4B.3b Production Rollout — Phase 1

**Date:** 2026-10-15  
**Mode:** Controlled Production security rollout — Phase 1 ONLY  
**Approval:** YES — Phase 1 only  

## Safety invariants (honored)

- NO legacy object deletes
- NO orphan cleanup (6 orphans preserved)
- NO customer data migration (0 DB media refs)
- NO Stripe / Auth / `listings` public-policy changes

## A. Pre-rollout Production state

Snapshot: `docs/internal/hardening/h4b3b-production-pre-rollout-2026-10-15/`

| Metric | Value |
|--------|------:|
| Migration versions | 12 (through `20261010121000`) |
| `demand-offers` bucket | absent |
| `listings` public | true |
| Storage policies | Public Read Listings + listings insert/update owner-prefix |
| `demand_offers` rows | 0 |
| Media refs | 0 |
| `listings` objects | 533 |
| Orphan `%demand-offers%` | 6 (~2.11 MiB) |
| `/api/health` | 200 production |
| App media APIs | 404 (not yet deployed) |

## B. Migration result

Applied **only**: `supabase/migrations/20261015120000_h4b3b_private_demand_offer_media.sql`  
Script: `scripts/apply-h4b3b-production.ts`  
Evidence: `h4b3b-production-pre-rollout-2026-10-15/apply-evidence.json`

- apply=ok
- history mark `20261015120000` recorded

## C. Bucket / policy state (post-migration)

| Bucket | public | notes |
|--------|--------|-------|
| `demand-offers` | **false** | file_size_limit=8388608 |
| `listings` | **true** | unchanged |

Policies:

- `demand_offers_storage_insert_owner_prefix` (INSERT authenticated)
- No client SELECT / DELETE / UPDATE on `demand-offers`
- Listings policies unchanged (Public Read + owner insert/update)

## D. Production deploy

| Field | Value |
|-------|-------|
| Deployment ID | `dpl_3L6e3P17NYv7o6ewSFUEWwWj3WZS` |
| Ready state | READY |
| Alias | https://www.quickexit.ro |
| Deployment URL | https://quickexit-o6geeml9c-daniel-mihais-projects-31598ec8.vercel.app |
| Inspect | https://vercel.com/daniel-mihais-projects-31598ec8/quickexit-app/3L6e3P17NYv7o6ewSFUEWwWj3WZS |
| Workspace HEAD (pre-deploy) | `ca34ca9d366aba74906621786249d3136085768c` |
| Note | Deploy included uncommitted H4B.3b working-tree app changes |

Routes confirmed in build output:

- `/api/demand-offers/media/upload`
- `/api/demand-offers/media/signed-url`
- `/api/hq/demand-offers/media/signed-url`

## E. Public listing regression

- `/ro/anunturi` → 200
- `listings` still public=true
- Public listing image fetch → PASS (matrix)
- Orphan count unchanged at 6
- Listings object count unchanged at 533 after synthetic cleanup

## F–L. Synthetic fixtures / matrix / cleanup

Script: `scripts/h4b3b-production-phase1-matrix.ts`  
Artifact: `production-access-matrix.json`

| Proof | Result |
|-------|--------|
| A demand owner signed URL | ALLOW |
| B offer sender signed URL | ALLOW |
| C unrelated | DENY (403) |
| Anonymous | DENY (401) |
| HQ/service signed URL | ALLOW |
| Direct Storage select (all) | DENY |
| Cross-prefix upload | DENY |
| Path tamper | DENY (404) |
| TTL fresh / expired | 200 / 400 |
| New-write DB path | `demand-offers/…` (not public/signed URL) |
| App upload API | private ref |
| Dual-read legacy public URL | PASS |
| Synthetic cleanup | users/offers/objects removed |
| Orphans targeted | never |

## M. Legacy orphan status

**DEFERRED_CLEANUP**

- Still exist: **6**
- Unchanged bytes inventory
- Still unreferenced in `demand_offers` (0 rows)
- Not deleted in Phase 1

## N. Post-rollout parity

| Metric | Pre | Post |
|--------|----:|-----:|
| `listings` objects | 533 | 533 |
| Orphans | 6 | 6 |
| `demand_offers` | 0 | 0 |
| Synthetic users | — | 0 |
| Private bucket objects | — | 0 |
| Migration versions | 12 | **13** (+`20261015120000`) |
| Buckets | listings | listings + **demand-offers** |

No unrelated schema drift observed.

## O. CI / migration regression

| Gate | Result |
|------|--------|
| typecheck | PASS |
| migration-discipline | PASS |
| no-secrets | PASS |
| zero-image | PASS |
| redaction | PASS |
| H4B.3a Staging | 13/13 PASS |
| H4B.3b Staging | PASS |
| H4B.2a Staging | 15/15 PASS |
| H4B.3b Production Phase 1 matrix | **ALL PASS** |

## P. Log review

| Signal | Finding |
|--------|---------|
| Media APIs without auth | 401 (expected) |
| Negative matrix denials | 401/403/404 (expected, non-blocking) |
| Authorized signed URL | 200 |
| Smoke `/`, `/ro`, `/api/health`, listings | 200 |
| Stripe webhook GET | 405 (endpoint present; POST-only) |
| Cross-user media ALLOW | **none observed** |
| Listing image regression | **none** |

## Q. Rollback readiness

- Legacy public orphans **not deleted** → dual-read still viable
- Private bucket can remain unused if app rolls back
- DB refs for new media are additive path strings
- Rollback SQL: `docs/internal/sql/h4b-proposed/h4b-3b-private-offer-media.ROLLBACK.sql` (drops policies; retains objects)
- No irreversible Production change in Phase 1

## R. Remaining privacy risk

1. 6 legacy public orphans under `listings` remain world-readable until a later cleanup phase.
2. Working-tree H4B.3b app code should be committed to git for durable source control parity with the Production deploy.
3. HQ signed-url route requires `HQ_ADMIN_EMAILS` allowlist (service-role path covered in matrix).

## S. Phase 1 CLOSED?

**YES**

## T. Orphan cleanup timing recommendation

Defer until:

1. Confidence window after Phase 1 (observe new private uploads in production usage)
2. Optional copy of orphans into `demand-offers` **if** retention desired (still no DB invent)
3. Explicit Phase 2 approval for DELETE-LAST of the 6 public orphans

Suggested: ≥7 days observation, then separate approved cleanup ticket.

---

QUICKEXIT H4B.3B PRODUCTION PRIVATE MEDIA LIVE — PHASE 1 VERIFIED — LEGACY ORPHANS PRESERVED
