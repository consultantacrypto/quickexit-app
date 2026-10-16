# Wallet Bind Phase 1C.1 — MetaMask UX reliability

**Date:** 2026-10-16  
**Scope:** Staging-first UI reliability for injected wallet connect (no DB / security model changes).

## Problem

Production UI could show „Se lucrează…” indefinitely while `eth_requestAccounts` / `personal_sign` stayed pending.

## Fix

- Explicit flow phases + RO/EN copy
- 60s UI timeout via `Promise.race` (does not cancel MetaMask RPC)
- Attempt guards ignore stale late resolutions
- Busy gate blocks double-click / concurrent nonce+verify
- Actionable MetaMask error mapping (4001, -32002, locked, timeout, etc.)
