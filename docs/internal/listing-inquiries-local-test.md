# Listing inquiries — disposable local validation

This is not a production run. Inquiry SQL and RLS are proven against a **disposable** local Supabase project outside the Git worktree.

## Project (do not commit)

- Path: `D:\MEDIA\quickexit-lead-contact-local-supabase`
- CLI project id: `qex-leads-inquiries-20260911`
- API: `http://127.0.0.1:54321`
- DB: `127.0.0.1:54322`
- Studio: `http://127.0.0.1:54323`
- Mailpit (no real email): `http://127.0.0.1:54324`

Gate every write with:

`npx tsx scripts/assert-local-supabase-target.ts`

(requires `LOCAL_SUPABASE_URL` and `LOCAL_SUPABASE_DB_URL` on loopback).

## Listings fixture limitation

`docs/internal/sql/listing-inquiries-local-fixture.sql` creates only the columns inquiries need (`id`, `user_id`, `title`, `status`, `is_seed`, `expires_at`, `created_at`). It is **not** the production `listings` schema. `user_id` is `NOT NULL`, so a listing with a missing seller cannot be represented.

## Harness

`npx tsx scripts/assert-listing-inquiries-local.ts`

Uses real local JWTs (seller A/B, buyer A/B). Loads keys from `npx supabase@2.117.0 status` in the disposable project directory and never prints them.

Notification tests inject `fetchImpl` and do not send Resend traffic.

## Rollback

The documented DROP FUNCTION/TABLE sequence is executed only on this loopback database, then the inquiry SQL is reapplied. Fixture `listings` rows and Auth users remain.
