# QuickExit Auth Recovery Policy

**Status:** Binding (Phase 1A)  
**Effective:** 2026-10-15

---

## Goal

Users must not lock themselves out of a QuickExit account that holds listings, demands, KYC, or purchases.

---

## Recovery hierarchy (canonical)

1. **Email magic link / OTP** — primary recovery for most users  
2. **Google OAuth** — primary or secondary recovery  
3. **Apple Sign-In** — future Phase 1B; treated as recovery once enabled  

**Never sole recovery (current roadmap):**

- Wallet addresses  
- Exchange OAuth (Bybit / OKX / Binance)  

---

## Unlink rules

- Require authenticated session  
- Prefer recent reauthentication when Supabase / product supports it  
- **Deny** unlink of the last remaining recovery identity  
- Unlink does **not** change KYC status  
- Unlink does **not** remove ownership of listings / demands / media orders  

Phase 1A ships the guardrails in `lib/authIdentity/recovery.ts`; unlink UI is deferred until manual linking is enabled on Staging with threat tests green.

---

## Provider unavailable / denied

Fall back to another recovery method in the hierarchy. Do not invent ownership remaps.

## Interrupted callback

User retries sign-in. No partial privileged session. Collision → clear message, no merge.

## Lost wallet (future)

Unlink wallet after proving a remaining recovery method; account UUID unchanged.

---

## Code anchors

- `lib/authIdentity/recovery.ts`  
- `lib/authIdentity/policy.ts` (`decideUnlink`, `NON_SOLE_RECOVERY_CATEGORIES`)  
- `scripts/assert-auth-identity-foundation.ts` (last-recovery DENY)
