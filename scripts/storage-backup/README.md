# Storage backup (Phase 3C)

Off-site backup for Production Supabase Storage bucket `listings`.

## Safety

- Production Storage is **READ ONLY** (list + download only).
- Tool **never** deletes or overwrites Production objects.
- Tool **never** mirrors deletes to the destination (`copy` semantics, not `sync --delete`).
- Restore sample writes to `.tmp/storage-backup/` only — **never** Production.

## Setup

1. Copy `docs/internal/env.storage-backup.local.example` → `.env.storage-backup.local`
2. Fill Production source key (service role or Storage S3 keys)
3. Create Cloudflare R2 bucket (private, versioning on) and API token
4. Fill `QE_STORAGE_BACKUP_*` destination fields

## Commands

```bash
npm run storage:wire-env
npm run storage:inventory
npm run storage:r2-check
npm run storage:dry-run
npm run storage:backup
npm run storage:parity
npm run storage:verify
npm run storage:restore-sample
npm run storage:synthetic-drill
npm run storage:private-proof
```

R2 bucket name: `quickexit-storage-backup`  
Fill Account ID + Access Key ID + Secret in `.env.storage-backup.local` (never commit).

Artifacts land in `docs/internal/disaster-recovery/storage-backup/`.
Local restore bytes land in `.tmp/storage-backup/` (gitignored).

## Schedule

GitHub Actions workflow `.github/workflows/storage-backup-daily.yml` runs daily (requires repo secrets).
