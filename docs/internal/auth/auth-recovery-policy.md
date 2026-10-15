# QuickExit Auth Recovery Policy

**Status:** Binding (Phase 1C)  
**Effective:** 2026-10-15

---

## Goal

Users must not lock themselves out of a QuickExit account that holds listings, demands, KYC, or purchases.

---

## Recovery hierarchy (canonical)

1. **Email magic link / OTP** — primary recovery for most users  
2. **Google OAuth** — primary or secondary recovery  
3. **Apple Sign-In** — retained in recovery policy, but **user-facing Apple CTAs/rows are gated OFF** until configured (`APPLE_IDENTITY_UI_ENABLED = false`). No dead Apple buttons in AuthModal / ConnectedIdentities.

**Apple private relay:** if Apple is later enabled, relay addresses must not be used to merge with another QuickExit UUID.

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

## Lost / disconnected wallet (Phase 1C)

Wallet is **not** a recovery method. Users may unlink a connected wallet while signed in with email/Google/Apple without account lockout. Unlink removes `wallet_addresses` binding only; UUID, KYC, and ownership rows are unchanged.

---

## Code anchors

- `lib/authIdentity/recovery.ts`  
- `lib/authIdentity/policy.ts` (`decideUnlink`, `NON_SOLE_RECOVERY_CATEGORIES`)  
- `lib/walletIdentity/policy.ts` (`decideWalletUnlink`)  
- `scripts/assert-auth-identity-foundation.ts` (last-recovery DENY)  
- `scripts/assert-wallet-identity.ts`
