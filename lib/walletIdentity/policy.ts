/**
 * Phase 1C — wallet bind policy (pure, no I/O).
 * Wallet proves EVM address control only. Never login / KYC / POF / recovery.
 */

export const WALLET_IDENTITY_POLICY_VERSION = "phase1c-2026-10-15";

export const WALLET_CHAIN_FAMILY = "evm" as const;
export type WalletChainFamily = typeof WALLET_CHAIN_FAMILY;

/** Nonce TTL — short-lived one-time challenge. */
export const WALLET_NONCE_TTL_MS = 10 * 60 * 1000;

/**
 * SIWE chainId is verified for message integrity only.
 * Identity is stored as EVM address (+ optional last_seen_chain_id).
 * Any positive EVM chain id is accepted — no funds required on a specific chain.
 */
export const WALLET_SIWE_STATEMENT =
  "Sign this message to connect your wallet to your QuickExit account.";

export const WALLET_IDENTITY_INVARIANTS = {
  accountIdIsAuthUserUuid: true,
  walletIsNotLogin: true,
  walletIsNotRecovery: true,
  walletIsNotKyc: true,
  walletIsNotProofOfFunds: true,
  walletNeverSetsKycStatus: true,
  walletNeverSetsBuyerVerified: true,
  walletNeverGrantsHq: true,
  walletNeverRemapsOwnership: true,
  oneWalletOneUser: true,
} as const;

export type WalletBindDecision =
  | { ok: true; action: "bind" | "rebind_same_user" | "unlink" }
  | {
      ok: false;
      action: "deny";
      reason:
        | "unauthenticated"
        | "wallet_owned_elsewhere"
        | "invalid_address"
        | "invalid_chain"
        | "wrong_owner"
        | "not_found";
    };

export function decideWalletBind(input: {
  sessionUserId: string | null | undefined;
  existingOwnerUserId: string | null | undefined;
}): WalletBindDecision {
  const session = String(input.sessionUserId || "").trim();
  if (!session) {
    return { ok: false, action: "deny", reason: "unauthenticated" };
  }
  const existing = String(input.existingOwnerUserId || "").trim();
  if (existing && existing !== session) {
    return { ok: false, action: "deny", reason: "wallet_owned_elsewhere" };
  }
  if (existing && existing === session) {
    return { ok: true, action: "rebind_same_user" };
  }
  return { ok: true, action: "bind" };
}

export function decideWalletUnlink(input: {
  sessionUserId: string | null | undefined;
  walletOwnerUserId: string | null | undefined;
}): WalletBindDecision {
  const session = String(input.sessionUserId || "").trim();
  if (!session) {
    return { ok: false, action: "deny", reason: "unauthenticated" };
  }
  const owner = String(input.walletOwnerUserId || "").trim();
  if (!owner) {
    return { ok: false, action: "deny", reason: "not_found" };
  }
  if (owner !== session) {
    return { ok: false, action: "deny", reason: "wrong_owner" };
  }
  return { ok: true, action: "unlink" };
}

/** Badge copy keys — address ownership only; never KYC/capital. */
export const WALLET_BADGE = {
  en: "Wallet connected",
  ro: "Wallet conectat",
} as const;
