# Production Wallet Bind Rollout Checklist

**Status:** PREPARED — **DO NOT EXECUTE** without separate explicit approval  
**Date:** 2026-10-15  
**Migration:** `20261015200000_wallet_identity_bind.sql`  
**Rollback:** `docs/internal/sql/h4b-proposed/wallet-identity-bind.ROLLBACK.sql`  
**Staging proof:** `dpl_EBBvPBAZaRrLFym6QRNBKbHSjkPs` (READY) + E2E PASS

---

## Preconditions

- [ ] Phase 1C code committed on `main`
- [ ] Staging E2E matrix green (`phase1c-staging-e2e-2026-10-15.json`)
- [ ] Apple UI remains gated (`APPLE_IDENTITY_UI_ENABLED === false`)
- [ ] Production candidate deployment recorded (not promoted)
- [ ] `autoAssignCustomDomains` remains `false`
- [ ] www / apex aliases unchanged before promotion

---

## Step 1 — Apply migration to Production

```text
Apply ONLY: supabase/migrations/20261015200000_wallet_identity_bind.sql
Target: Production ref geywuzwbzecknokvnins
Refuse: any other project / Staging-as-prod mistake
```

## Step 2 — Verify DDL

Confirm present:

- tables: `wallet_addresses`, `wallet_nonces`
- unique index: `wallet_addresses_chain_family_address_uidx`
- unique index: `wallet_nonces_nonce_uidx`
- RLS enabled on both
- policy: `wallet_addresses_select_own` (SELECT only)
- no authenticated INSERT/UPDATE/DELETE policies

## Step 3 — Use committed Production candidate

Use the Vercel candidate created from the Phase 1C commit (preview/candidate).  
Do **not** invent a second dirty tree deploy.

## Step 4 — Pre-promotion candidate checks

- `/api/health` on candidate
- wallet routes present
- Staging alias must not be required for this step
- no Production alias move yet

## Step 5 — Explicit promote

Promote candidate only after Step 2 green.  
Confirm www/apex move is intentional and `autoAssignCustomDomains` still false.

## Step 6 — Real MetaMask E2E (authenticated test account)

- [ ] request nonce
- [ ] sign SIWE message
- [ ] bind success
- [ ] reload → wallet still connected (abbreviated)
- [ ] logout / login → wallet persists
- [ ] disconnect
- [ ] reconnect

## Step 7 — Duplicate wallet conflict

Second authenticated test user attempts same address → DENY  
Copy: “This wallet is already connected to another QuickExit account.”

## Step 8 — Invariants

- [ ] KYC unchanged
- [ ] HQ unchanged
- [ ] `listings.user_id` unchanged
- [ ] `demands.buyer_id` unchanged
- [ ] `media_orders` ownership unchanged

## Step 9 — Health / logs / Sentry

- www `/api/health` = 200
- structured logs `component=wallet_identity` (no nonce/signature/full address)
- Sentry quiet for expected denials

## Step 10 — Cleanup

Remove synthetic wallet/test rows if appropriate. Leave real operator accounts intact.

---

## Production E2E acceptance matrix (checklist only)

| ID | Case | Expected |
|----|------|----------|
| A | unauth nonce | DENY |
| B | auth nonce | PASS |
| C | valid MetaMask signature | PASS |
| D | repeat bind same user | safe / idempotent |
| E | same wallet second user | DENY |
| F | invalid signature | DENY |
| G | expired nonce | DENY |
| H | replay nonce | DENY |
| I | wrong origin/domain | DENY |
| J | unlink own | PASS |
| K | unlink other | DENY |
| L | KYC invariant | PASS |
| M | HQ invariant | PASS |
| N | ownership invariant | PASS |
| O | no tx/gas/approval | PASS |
| P | no sensitive logging | PASS |

---

## Public semantics (must hold after promote)

- EN badge: **Wallet connected**
- RO badge: **Wallet conectat**
- Forbidden product wording: verified wallet user / verified buyer / verified capital / proof of funds

---

## STOP

Do not apply migration or promote until a separate Production approval message is given.
