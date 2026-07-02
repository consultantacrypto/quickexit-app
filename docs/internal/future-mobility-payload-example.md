# Future Mobility — payload example (internal)

Sprint 1A does **not** insert production listings. Use this document when preparing the first public model (e.g. Xiaomi SU7 Ultra).

## Activation guard

```json
{ "collection": "future_mobility" }
```

Only this exact value activates Future Mobility UI.

## Required before publish

| Field | Notes |
|-------|--------|
| `title`, `description` | Confirmed marketing copy |
| `exit_price`, `market_price` | Confirmed commercial values |
| `images[]` | Uploaded to Supabase `listings` bucket |
| `availability_type` | `in_stock` \| `on_order` \| `preorder` |
| `delivery_estimate` | Only if confirmed by partner |
| `dealer_partner` | Verified partner data only |
| `ev_specs` | Confirmed specifications only |
| `videos[]` | Valid YouTube URL |

## Example `details` skeleton

See `lib/futureMobility.fixture.example.ts` for a typed skeleton with `REPLACE_WITH_CONFIRMED_*` placeholders.

## Seed script (manual ops)

```bash
# Prepare JSON file from confirmed data, then:
FUTURE_MOBILITY_SEED_FILE=./ops/su7-ultra.json npx tsx scripts/seed-future-mobility-listing.ts
```

The script requires `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `FUTURE_MOBILITY_LISTING_USER_ID`.

It will **not** run automatically in CI or on deploy.
