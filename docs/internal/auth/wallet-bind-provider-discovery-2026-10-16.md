# Wallet bind — MetaMask provider discovery fix

**Date:** 2026-10-16  
**Mode:** Staging first — Production untouched

## Cause

`ConnectedIdentities` selected `window.ethereum` blindly. With multiple injected wallets, a non-MetaMask provider can own that object; `eth_requestAccounts` then never reaches MetaMask (busy UI, no popup, no `/api/wallet/nonce`).

## Fix

- EIP-6963 discovery (`eip6963:requestProvider` / `announceProvider`)
- Prefer `rdns` `io.metamask` / `io.metamask.flask`
- Legacy fallback via `ethereum.providers` + `isMetaMask` soft signals
- Refuse silent selection of unrelated wallets
- Staging-only privacy-safe provider diagnostics
