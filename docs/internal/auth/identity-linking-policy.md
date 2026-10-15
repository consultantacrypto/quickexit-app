# QuickExit Identity Linking Policy

**Status:** Binding (Phase 1C)  
**Effective:** 2026-10-15  
**Policy version:** `phase1c-2026-10-15`

---

## Canonical rules

1. **QuickExit account identity = `auth.users.id` (UUID).**  
   All ownership columns (`listings.user_id`, `demands.buyer_id`, offers, rooms, `media_orders.user_id`, …) bind to this UUID (or `profiles.id` which equals it).

2. **OAuth / provider identities may link to an existing UUID** via Supabase Auth (`auth.identities`), never by rewriting business table FKs.

3. **Provider linking never changes ownership rows.**  
   No app-side “merge by email” that moves listings, demands, offers, rooms, or media orders.

4. **No ownership migration by matching email strings** in `profiles`, offers contact fields, or CRM leads.

5. **KYC remains independent.**  
   Linking Google/Apple/exchange/wallet must **not** set `profiles.kyc_status`, `demands.buyer_verified`, or seller verified badges. KYC updates remain service-role webhooks only.

6. **HQ remains independent.**  
   HQ = `HQ_ADMIN_EMAILS` + authenticated session + server gate. Link/unlink must not grant or revoke HQ.

7. **At least one recoverable auth method must remain.**  
   Recovery hierarchy: email magic link → Google → Apple (policy-ready).  
   **Apple user-facing UI is gated OFF** until configured (`APPLE_IDENTITY_UI_ENABLED = false`).  
   Wallet / exchange must never be sole recovery.

8. **Apple private relay is not a merge key.**  
   `@privaterelay.appleid.com` addresses must not be treated as equivalent to an existing Google/email identity. No silent ownership remap.

---

## Allowed link paths

| Path | When | Notes |
|------|------|--------|
| Supabase auto-link same verified email | Cold OAuth with matching verified email | Platform behavior; do not reimplement in app tables |
| Explicit `linkIdentity` (future Staging) | User already signed in | Requires manual linking enabled; same-session only |
| Wallet bind-after-auth (Phase 1C Staging) | User already signed in | `wallet_addresses` via SIWE; not `auth.users` orphan login; not recovery |

## Forbidden

- Silent merge of Apple private-relay / no-email providers into another UUID by heuristic  
- Cold wallet-only or exchange-only login creating a second economic identity without bind rules  
- Any UI that “moves” listings to another account by email match  
- KYC/HQ elevation from provider metadata  

---

## Collision UX

If a provider identity already belongs to another QuickExit user:

> “This identity is already connected to another QuickExit account.”

No destructive merge UI in Phase 1A.

---

## Wallet conflict UX

If an EVM address already belongs to another QuickExit UUID:

> “This wallet is already connected to another QuickExit account.”

No merge. No ownership remap. See `wallet-identity-semantics.md`.

## Code anchors

- `lib/authIdentity/policy.ts`  
- `lib/authIdentity/recovery.ts`  
- `lib/walletIdentity/*`  
- `app/api/wallet/{nonce,verify,unlink}/route.ts`  
- `app/[locale]/auth/callback/route.ts`  
- `scripts/assert-auth-identity-foundation.ts`  
- `scripts/assert-wallet-identity.ts`
