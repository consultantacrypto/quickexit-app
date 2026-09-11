# Listing inquiries — rollout (internal)

SQL in `docs/internal/sql/listing-inquiries.sql` must be applied (local/staging first) **before** deploying the inquiry UI and APIs. Until that schema exists, persist returns a generic failure (`table_missing` / 503). The application is **not production-safe** without this schema.

## Authoritative integrity

- Buyer and seller IDs are derived in `listing_inquiries_assign_ownership` (`auth.uid()`, listing owner). Client-supplied ownership is ignored.
- Listing eligibility (exists, `status = active`, `is_seed = false`, seller present, not self, `expires_at` null or in the future) is enforced in the API **and** in that trigger.
- Consent is explicit `consent === true` in the API. `consent_version` is always the server constant `LISTING_INQUIRY_CONSENT_VERSION` (`2026-08`), matching the SQL CHECK/trigger. Client versions are not trusted.
- **Authoritative** duplicate/rate protection is database-backed: transaction-scoped `pg_advisory_xact_lock` plus rolling 15-minute per listing and 5-per-hour per buyer counts. The unique 900s index and the instance-local Map are **supplemental** only.

## Notifications

- Persist happens before notify. Notification failure never deletes or rolls back the inquiry.
- Seller email uses Resend only, and only when `QUICKEXIT_ENABLE_SELLER_EMAIL=1` plus `RESEND_API_KEY` and `RESEND_FROM`. SMTP env vars are not a provider.
- HQ fallback view (`view=fallback`) lists inquiries whose notification is not `sent`.

## Seller / HQ

- Sellers change status only via `listing_inquiries_seller_set_status` (seen from new; closed from new/seen; closed is final). No authenticated `UPDATE` grant on `listing_inquiries`.
- Dashboard also filters `seller_id = auth user` in the query, not only by listing IDs.
- HQ GET defaults to server-side `fallback`, paginated (max 50). “All inquiries” is an explicit view.

## Buyer “My requests”

Not in this hardening. Later product enhancement: a buyer-facing list of their own inquiries.

## Rollout order

1. Apply `listing-inquiries.sql` on a non-production database; verify RLS/RPC.
2. Deploy application code that calls the tables/RPC.
3. Enable seller email only after Resend is configured (`QUICKEXIT_ENABLE_SELLER_EMAIL=1`).

## Rollback order

1. Disable or roll back the UI/API deploy so inserts stop.
2. Optionally disable seller email (`QUICKEXIT_ENABLE_SELLER_EMAIL` unset).
3. Manual SQL rollback is documented at the top of `listing-inquiries.sql` (`DROP FUNCTION` / `DROP TABLE`). Do not drop `listings` or `profiles`.

Do not store secrets or live personal data in this document.
