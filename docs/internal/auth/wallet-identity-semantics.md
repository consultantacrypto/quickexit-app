# Wallet Identity Semantics

**Status:** Binding (Phase 1C)  
**Effective:** 2026-10-15  
**Policy version:** `phase1c-2026-10-15`

---

## What wallet binding means

Connecting a wallet proves **control of an EVM address** via EIP-4361 / SIWE message signature.

| Claim | True after bind? |
|-------|------------------|
| Address ownership proven | Yes |
| QuickExit account UUID unchanged | Yes |
| User can sign in with wallet alone | **No** |
| Recovery method | **No** |
| KYC / identity verified | **No** |
| Buyer / seller verified badge | **No** |
| Proof of funds / capital verified | **No** |
| HQ access | **No** |
| Ownership remap of listings/demands | **No** |

## Badge wording

- **EN:** Wallet connected  
- **RO:** Wallet conectat  

These badges mean **address ownership proven** only.

Forbidden product wording for this badge:

- verified wallet user  
- verified buyer  
- verified capital  
- proof of funds  

## Visible Connected Identities (current)

- Email  
- Google  
- Wallet (bind-after-auth)  

Apple Sign-In UI remains gated until configured.

## Canonical identity

QuickExit account identity remains `auth.users.id` (UUID).  
Wallet rows in `wallet_addresses` are secondary connected identities.

## Chain model

- Phase 1C: **EVM only**
- SIWE `chainId` is validated for message integrity
- Stored identity is `chain_family = 'evm'` + checksummed address
- Optional `last_seen_chain_id` for audit — not a funds requirement
- No requirement to hold tokens on any chain

## Future: Solana

Deferred. Would use a separate chain_family + signature scheme, same “bind after auth” model — never wallet-only login in this roadmap phase.

## Future: Verified capital (NOT implemented)

Wallet binding could later support:

- on-chain balance proof against a chosen RPC
- signed balance snapshot at a block height
- privacy-preserving balance bands
- product label such as “Capital verificat”

**Explicit:** wallet connection alone is **not** proof of funds.
