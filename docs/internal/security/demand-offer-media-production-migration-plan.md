# Demand-offer media — Production migration plan (NO EXECUTION)

**Date:** 2026-10-15  
**Phase:** Design only — Production rollout awaiting explicit approval  
**Constraint:** COPY-FIRST, DELETE-LAST. No Production mutations in H4B.3b Staging phase.

## Production inventory (read-only, 2026-10-15)

| Metric | Value |
|--------|------:|
| `demand_offers` rows | 0 |
| Rows with non-empty `images` | 0 |
| DB-referenced media files | 0 |
| Orphan `listings` objects matching `%demand-offers%` | 6 |
| Path shape | `{uuid}/demand-offers/{uuid}/{file}` |
| MIME | image/png ×4, image/jpeg ×2 |
| Approx total bytes | ~2.11 MiB (paired sizes suggest 3 unique payloads ×2) |
| `demand-offers` bucket | **absent** on Production |
| `listings` bucket | public = true (unchanged) |

**Classification**

| Class | Count | Action when approved |
|-------|------:|----------------------|
| DB refs to migrate | 0 | none |
| Orphan Storage (no DB row) | 6 | optional copy to private bucket for retention; do **not** invent DB rows |
| Missing source | 0 | n/a |
| Invalid URL | 0 | n/a |
| Already-private | 0 | n/a |
| Duplicate-looking objects | 3 pairs same size | copy unique payloads; retain both keys until verified |

No customer PII exported in this inventory.

## Target model

- Bucket: `demand-offers`, `public=false`
- Object path: `{uploader_user_id}/{demand_id}/{uuid}.{ext}`
- DB: `images` jsonb array of `demand-offers/…` paths (never signed URLs)
- App dual-read until legacy public objects removed

## Controlled Production rollout (awaiting approval)

1. **Deploy dual-read compatibility** (app: upload API + signed URL + UI adapter). Legacy public URLs still render.
2. **Create private bucket + policies** (canonical migration `20261015120000_…`). Do not flip `listings` private.
3. **Copy** orphan/legacy objects `listings` → `demand-offers` (path remap strip middle `demand-offers` segment).
4. **Verify** destination exists, byte size, hash where practical.
5. **Patch DB** only when rows exist with legacy URLs (currently 0).
6. **Observe** signed URL success/deny rates (`component=demand_offer_media`).
7. **Disable legacy writes** (already done in app once deployed — uploads go private).
8. **Delete** old public objects only after confidence window (not in this phase).

## Rollback (before legacy deletes)

- Revert DB `images` to prior public URLs (from migration manifest).
- Keep app dual-read so legacy URLs work.
- Retain copied private objects.
- Policy rollback SQL: `docs/internal/sql/h4b-proposed/h4b-3b-private-offer-media.ROLLBACK.sql` (drops policies; does not destroy objects).

## Edge-case handling

| Edge | Handling |
|------|----------|
| Missing source | log `not_found`; leave DB; no delete |
| Duplicate reference | single copy; shared private path |
| Invalid URL | skip; structured log `validation_failed` |
| Already-private | skip copy |
| Orphan object | copy optional; no DB invent |

## Preview: expected Production work when approved

- Records to migrate: **0**
- Objects to copy (orphans): **6** (or 3 unique if deduped by hash)
- Expected DB patches: **0**
- Expected deletes later: only after approval + confidence window
