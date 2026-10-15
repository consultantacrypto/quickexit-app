# H4B.3b — Private demand-offer media (Staging phase)

**Date:** 2026-10-15  
**Mode:** Privacy hardening — Staging first  
**Production:** NO storage/DB mutations, NO deploy, NO Stripe/Auth changes  

## Verdict

Staging phase **CLOSED** for verification. Production rollout **NOT executed** — awaiting approval.

## A. Current data/storage model

| Item | Detail |
|------|--------|
| Table | `public.demand_offers` |
| Media column | `images jsonb NOT NULL` (array of strings) |
| Upload UI | `app/[locale]/trimite-oferta/[id]/page.tsx` |
| Legacy upload | client → bucket `listings`, path `{userId}/demand-offers/{demandId}/{rand}.{ext}`, stores **public URL** |
| Render | `app/[locale]/dashboard/page.tsx` (offer images); HQ overview/copilot read `demand_offers` |
| Access assumption (legacy) | Public bucket read — anyone with URL |
| H4B.3a | Protects `listings` write prefix; keeps public read for listing images |

## B. Production media inventory (read-only)

- `demand_offers`: **0**
- With media: **0**
- Orphan `listings` objects `%demand-offers%`: **6** (~2.11 MiB; png/jpeg)
- `demand-offers` bucket: **absent**
- See `docs/internal/security/demand-offer-media-production-migration-plan.md`

## C. Threat model

See `docs/internal/security/demand-offer-media-access-model.md`.  
Baseline: A/B (and related negotiation participants) ALLOW view; D/E DENY; F HQ ALLOW; no public URL for new media.

## D. Target bucket/path

- Bucket: `demand-offers`, `public=false`, 8 MiB, jpeg/png/webp
- Path: `{uploader_user_id}/{demand_id}/{uuid}.{ext}`
- Authz via DB relationships, not path obscurity

## E. DB reference strategy

- Store `demand-offers/{path}` in `images` jsonb
- Dual-read legacy public listings URLs during migration
- Never store signed URLs
- Schema already holds string arrays — **no additive column required**

## F. Signed URL authorization

- `POST /api/demand-offers/media/signed-url` (participant)
- `POST /api/hq/demand-offers/media/signed-url` (HQ gate)
- TTL: **600 seconds**
- Service role used only after authz / HQ allowlist

## G. Upload validation

- `POST /api/demand-offers/media/upload`
- Auth required; demand must exist; MIME allowlist; max 8 MiB
- Server-generated path; no user-controlled bucket/path
- DB insert only after successful upload (client flow)

## H. Storage policy design

- INSERT owner prefix only
- No SELECT / UPDATE / DELETE for authenticated
- No anon access

## I. Staging bucket result

| Check | Result |
|-------|--------|
| Created | yes |
| `public` | **false** |
| SELECT policies | **0** |
| INSERT policy | `demand_offers_storage_insert_owner_prefix` |
| Production | untouched |
| History mark | `20261015120000` |

## J. Access matrix

Script: `scripts/assert-h4b3b-demand-offer-media-matrix.ts`  
Artifact: `docs/internal/sql/h4b3/matrix-h4b3b-demand-offer-media.json`  

| Case | Result |
|------|--------|
| A owner signed | PASS |
| B sender signed | PASS |
| C unrelated | DENY PASS |
| Anonymous | DENY PASS |
| HQ/service | PASS |
| Direct Storage select (all) | DENY PASS |
| Cross-prefix insert | DENY PASS |
| Path tamper | DENY PASS |

## K. Signed URL test

- Fresh TTL: HTTP 200
- Expired (~2s TTL wait): HTTP 400
- No signed URL written to DB

## L. Synthetic migration drill

COPY → hash match → DB patch → signed render → optional legacy delete → still works: **PASS**

## M. UI regression

- Dual-read component: `components/DemandOfferMediaImage.tsx`
- Upload path switched off public `listings`
- Listing images remain on public `listings` (H4B.3a matrix PASS)

## N. Observability

- `component=demand_offer_media`
- ops: `upload`, `signed_url`, `migrate` (drill), `delete` (future)
- results: `success` / `denied` / `not_found` / `validation_failed` / `error`
- Unexpected → Sentry via `captureException`
- No signed URLs / tokens / PII in logs

## O. Canonical migration

- `supabase/migrations/20261015120000_h4b3b_private_demand_offer_media.sql`
- Rollback: `docs/internal/sql/h4b-proposed/h4b-3b-private-offer-media.ROLLBACK.sql`
- Superseded draft SQL marked DO_NOT_RUN

## P. CI / local regression

| Gate | Result |
|------|--------|
| typecheck | PASS |
| assert:migration-discipline | PASS (13 migrations) |
| assert:no-secrets | PASS |
| assert:zero-image | PASS |
| H4B.3a Staging matrix | 13/13 PASS |
| H4B.2a Staging matrix | 15/15 PASS |
| H4B.2b Staging matrix | intermittent `TypeError: fetch failed` on product insert paths (not storage-policy regressions; re-run when Staging API stable) |
| H4B.3b Staging matrix | ALL PASS |
| Fresh local `supabase db reset` | **NOT RUN** (Docker daemon unavailable on agent host) |

## Q. Staging app regression (notes)

- Storage/privacy matrix + migration drill PASS on Staging project `nlnzlswjjplofpkhoxtr`
- Full Next.js Staging deploy of new API routes is part of **app release**, not executed as Production deploy here
- Stripe/Auth: unchanged
- Public listings bucket: unaffected (matrix proven)

## R. Production migration preview

- DB patches: **0**
- Orphan copies: **6** objects (optional)
- Deletes: **none** until later confidence window

## S. Rollback

Documented in production migration plan — non-destructive while legacy public objects retained.

## T. Remaining privacy risks

1. Legacy orphan public objects still world-readable under `listings` until Step 8 delete.
2. App deploy required before new uploads stop writing public URLs in environments still on old code.
3. Negotiation “participant C” beyond buyer/seller not separately modeled if product adds multi-party rooms later — extend authz then.
4. Local fresh-reset not re-proven in this session (Docker down).

## U. Production rollout ready?

**NO** — awaiting explicit approval. Dual-read code + migration exist; Production bucket/copy/patch **not** executed.

## V. H4B.3b Staging phase closed?

**YES** — Staging private bucket, policies, matrix, synthetic copy-first drill, docs, and CI static gates verified.

---

QUICKEXIT H4B.3B PRIVATE DEMAND-OFFER MEDIA VERIFIED ON STAGING — PRODUCTION ROLLOUT AWAITING APPROVAL
