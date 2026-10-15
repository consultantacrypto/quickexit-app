# Staging bootstrap pack — RECOVERY / HISTORICAL BOOTSTRAP

**Status (Phase 4B.1):** RECOVERY / HISTORICAL BOOTSTRAP  
**NOT the canonical migration source.**  
Canonical forward history lives in `supabase/migrations/`.

**BOOTSTRAP SNAPSHOT — NOT HISTORICAL MIGRATION**  
**DO NOT APPLY TO PRODUCTION (`geywuzwbzecknokvnins`)**  
**DO NOT CLAIM BIT-FOR-BIT PRODUCTION PARITY UNTIL validated against `production-truth/`**

## Purpose

Historical pack used to reproduce the **security-relevant** Staging data plane for Preview isolation. Retained for recovery / audit. New schema/security work must be authored as `supabase/migrations/*` first.

## Apply order (Staging only — never Production)

| Step | Artifact |
|------|----------|
| 0 | Confirm target project ref = `nlnzlswjjplofpkhoxtr` (≠ Production) |
| 1 | `01-schema-h4b0-security.sql` |
| 2 | `02-schema-h4b0-versioned.sql` |
| 2b | `02b-baseline-rls-from-production-truth.sql` |
| 3 | `03-h4b1-write-escalation.sql` |
| 4 | `04-offers-production-truth-select-update.sql` |
| 5 | `05-h4b2a-offers-insert.sql` |
| 6 | `06-negotiations-production-truth-select.sql` |
| 7 | `07-h4b2b-negotiation-insert.sql` |
| 8 | `08-storage-h4b3a.sql` |
| 9 | `npx tsx scripts/bootstrap-staging-fixtures.ts` |

Apply helper: `npx tsx scripts/apply-staging-bootstrap.ts`

Prefer applying the **canonical** `supabase/migrations` chain to a clean Staging project once Phase 4B.2 cutover is approved.
