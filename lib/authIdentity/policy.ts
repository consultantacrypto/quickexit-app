/**
 * Phase 1A — canonical identity linking policy (pure, no I/O).
 * Ownership and KYC never migrate by email string match.
 */

export const AUTH_IDENTITY_POLICY_VERSION = "phase1c-2026-10-15";

/** Canonical QuickExit account identity. */
export type QuickExitAccountId = string; // auth.users.id UUID

export type AuthProviderCategory =
  | "email"
  | "google"
  | "apple"
  | "wallet"
  | "exchange"
  | "other";

/** Providers that may act as recovery methods today / near-term. */
export const RECOVERY_PROVIDER_CATEGORIES: ReadonlySet<AuthProviderCategory> =
  new Set(["email", "google", "apple"]);

/** Providers that must never be sole recovery. */
export const NON_SOLE_RECOVERY_CATEGORIES: ReadonlySet<AuthProviderCategory> =
  new Set(["wallet", "exchange"]);

export type IdentityLinkDecision =
  | { ok: true; action: "login" | "auto_link_same_email" | "explicit_link" }
  | {
      ok: false;
      action: "deny";
      reason:
        | "unauthenticated"
        | "identity_owned_elsewhere"
        | "last_recovery"
        | "wallet_or_exchange_orphan_login"
        | "kyc_escalation_forbidden"
        | "ownership_remap_forbidden"
        | "cross_session_link_forbidden";
    };

export function classifyProvider(provider: string | null | undefined): AuthProviderCategory {
  const p = String(provider || "")
    .trim()
    .toLowerCase();
  if (!p || p === "email") return "email";
  if (p === "google") return "google";
  if (p === "apple") return "apple";
  if (p === "wallet" || p === "web3" || p === "ethereum" || p === "solana") {
    return "wallet";
  }
  if (
    p === "bybit" ||
    p === "okx" ||
    p === "binance" ||
    p.startsWith("custom:bybit") ||
    p.startsWith("custom:okx") ||
    p.startsWith("custom:binance")
  ) {
    return "exchange";
  }
  return "other";
}

export function isRecoveryCategory(category: AuthProviderCategory): boolean {
  return RECOVERY_PROVIDER_CATEGORIES.has(category);
}

/**
 * Explicit link may only start from an authenticated session for the target UUID.
 * Never email-match ownership rows in app tables.
 */
export function decideExplicitLink(input: {
  sessionUserId: string | null | undefined;
  targetUserId: string | null | undefined;
  providerAlreadyLinkedToOtherUser: boolean;
}): IdentityLinkDecision {
  const session = String(input.sessionUserId || "").trim();
  const target = String(input.targetUserId || "").trim();
  if (!session) {
    return { ok: false, action: "deny", reason: "unauthenticated" };
  }
  if (!target || session !== target) {
    return { ok: false, action: "deny", reason: "cross_session_link_forbidden" };
  }
  if (input.providerAlreadyLinkedToOtherUser) {
    return { ok: false, action: "deny", reason: "identity_owned_elsewhere" };
  }
  return { ok: true, action: "explicit_link" };
}

/**
 * Cold login via wallet/exchange alone is forbidden in Phase 1A roadmap.
 * Apple/Google/email remain allowed (handled by Supabase Auth).
 */
export function decideColdProviderLogin(category: AuthProviderCategory): IdentityLinkDecision {
  if (NON_SOLE_RECOVERY_CATEGORIES.has(category)) {
    return {
      ok: false,
      action: "deny",
      reason: "wallet_or_exchange_orphan_login",
    };
  }
  return { ok: true, action: "login" };
}

/** Unlink must leave at least one recovery identity. */
export function decideUnlink(input: {
  sessionUserId: string | null | undefined;
  recoveryIdentityCount: number;
  unlinkingRecovery: boolean;
}): IdentityLinkDecision {
  const session = String(input.sessionUserId || "").trim();
  if (!session) {
    return { ok: false, action: "deny", reason: "unauthenticated" };
  }
  if (input.unlinkingRecovery && input.recoveryIdentityCount <= 1) {
    return { ok: false, action: "deny", reason: "last_recovery" };
  }
  return { ok: true, action: "explicit_link" };
}

/** Hard invariants — never violated by linking flows. */
export const IDENTITY_INVARIANTS = {
  accountIdIsAuthUserUuid: true,
  noOwnershipRemapByEmail: true,
  kycIndependentOfProviderLink: true,
  hqIndependentOfProviderLink: true,
  providerLinkNeverSetsKycVerified: true,
  atLeastOneRecoveryMethodRequired: true,
} as const;
