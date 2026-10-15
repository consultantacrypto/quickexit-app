# Demand-offer media access model (H4B.3b)

**Status:** Staging-verified design  
**Date:** 2026-10-15  
**Bucket:** `demand-offers` (private)  
**Legacy:** public `listings` URLs under `{user_id}/demand-offers/{demand_id}/…`

## Actors

| Actor | Who |
|-------|-----|
| A | Demand owner (`demands.buyer_id`) |
| B | Offer sender (`demand_offers.seller_user_id`) |
| C | Negotiation participant (same offer/room relationship only) |
| D | Unrelated authenticated user |
| E | Anonymous |
| F | HQ / service role (after HQ allowlist gate) |

## Desired access

| Operation | A | B | C | D | E | F |
|-----------|---|---|---|---|---|---|
| Upload (own path prefix) | — | ALLOW* | — | DENY | DENY | ALLOW (ops) |
| View / download (signed URL) | ALLOW | ALLOW | ALLOW† | DENY | DENY | ALLOW |
| Replace | — | product: not required | — | DENY | DENY | ALLOW |
| Delete | — | DENY (no client DELETE policy) | — | DENY | DENY | ALLOW |

\* Upload only under `{auth.uid()}/{demand_id}/{uuid}.{ext}` after demand exists.  
† Only if the same offer/negotiation relationship is proven in DB — not path guessing.

## Path convention

```
{uploader_user_id}/{demand_id}/{uuid}.{ext}
```

DB stores stable refs: `demand-offers/{uploader_user_id}/{demand_id}/{uuid}.{ext}`  
**Never** persist signed URLs.

Path format is **not** authorization. Server proves:

1. authenticated requester
2. `demand_offers` row ties `seller_user_id` + `demand_id` to the object
3. media ref is present on that offer’s `images` jsonb
4. requester is seller, demand buyer, or HQ

## Storage policies (minimal)

- Bucket `public = false`
- INSERT: authenticated, folder `[1] = auth.uid()`
- No authenticated/anon SELECT
- No UPDATE / DELETE for authenticated
- Reads: service-role `createSignedUrl` after authz (TTL 5–15 min; app uses 600s)

## Compatibility

During migration window the UI dual-reads:

- Legacy: `…/storage/v1/object/public/listings/…/demand-offers/…` → use public URL
- New: `demand-offers/…` → `/api/demand-offers/media/signed-url`

## HQ

`POST /api/hq/demand-offers/media/signed-url`  
Canonical `assertHqAdminFromAccessToken` → service role only after allowlist success.
