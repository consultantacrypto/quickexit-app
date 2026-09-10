# Listing location backfill result

Canonical store remains `listings.details`. Location means the place where the exact asset can be viewed or collected. Only the 45 approved listing IDs were in scope. No credentials are recorded here.

## First live attempt

- Command: `--apply --confirm=QUICKEXIT_LOCATION_BACKFILL_45` (once; no retry in that turn).
- Successful PATCH: **1** — `4936e198-e892-425e-9030-21610cc3c0ff` (RO / Ilfov / Voluntari).
- Stopped after that PATCH: local HTTP adapter threw `TypeError: Response constructor: Invalid response status code 204` (PostgREST 204 with a non-null empty body).
- Client read-back and `updated` journal entries were not written for that row.
- Journal in the first run directory: `backup_verified` only.

## Recovery

- Adapter fix commit: `42d52134cbace3fae0d1445416f600fddde74aa9` (`fix(location): handle empty backfill patch responses`).
- One resumed apply run (not a retry of the crashed process).
- PATCH requests: **44**.
- Read-back verified: **44**.
- Already-matching row skipped: `4936e198-e892-425e-9030-21610cc3c0ff`.

## Final state

| Metric | Count |
|---|---|
| Approved listings matching structured location | 45 |
| Ready for mutation | 0 |
| Missing structured location | 0 |
| Unresolved | 0 |
| Unexpected | 0 |
| Divergent / blocked | 0 |

## Location totals

| Location | Count |
|---|---|
| Voluntari, Ilfov | 9 |
| Brașov, Brașov | 1 |
| Constanța, Constanța | 31 |
| Săbăreni, Giurgiu | 1 |
| Tulcea, Tulcea | 1 |
| Murighiol, Tulcea | 1 |
| Ungheni, Republica Moldova | 1 |
| **Total** | **45** |

## Backups (gitignored; not deleted)

### Original recovery backup (first live attempt)

- Path: `coverage/listing-location-backfill/run-2026-09-09T154650664Z`
- Backup rows: **45**
- Journal: **1** line (`backup_verified`)
- Rollback artifact: `rollback.ts` present, **not executed**

### Resumption backup

- Path: `coverage/listing-location-backfill/run-2026-09-09T190016758Z`
- Backup rows: **45** (44 ready + 1 already matching)
- `ready_ids`: **44**
- Journal: **45** lines (1 `backup_verified` + **44** `updated`)
- Rollback artifact: `rollback.ts` present, **not executed**

## Scope and delivery

- Only approved `listings.details` objects were changed (merge via `applyListingLocationToDetails`).
- No other tables or columns were updated.
- Nothing was pushed, merged, deployed, or applied as SQL.
- Rollback confirmation `QUICKEXIT_LOCATION_ROLLBACK_45` was not used.
