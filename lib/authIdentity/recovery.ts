import {
  classifyProvider,
  isRecoveryCategory,
  type AuthProviderCategory,
} from "@/lib/authIdentity/policy";

export type LinkedIdentityView = {
  provider: string;
  identityId?: string;
  /** Present when Supabase exposes it; never required for recovery count. */
  email?: string | null;
};

export function recoveryCategoriesFromIdentities(
  identities: LinkedIdentityView[],
): AuthProviderCategory[] {
  const cats = new Set<AuthProviderCategory>();
  for (const identity of identities) {
    const cat = classifyProvider(identity.provider);
    if (isRecoveryCategory(cat)) cats.add(cat);
  }
  return [...cats];
}

export function countRecoveryIdentities(identities: LinkedIdentityView[]): number {
  return identities.filter((identity) =>
    isRecoveryCategory(classifyProvider(identity.provider)),
  ).length;
}

export function canUnlinkIdentity(
  identities: LinkedIdentityView[],
  providerToUnlink: string,
): { allowed: boolean; reason?: "last_recovery" | "not_found" } {
  const target = identities.find(
    (i) => i.provider.toLowerCase() === providerToUnlink.toLowerCase(),
  );
  if (!target) return { allowed: false, reason: "not_found" };
  const unlinkingRecovery = isRecoveryCategory(classifyProvider(target.provider));
  const recoveryCount = countRecoveryIdentities(identities);
  if (unlinkingRecovery && recoveryCount <= 1) {
    return { allowed: false, reason: "last_recovery" };
  }
  return { allowed: true };
}

/**
 * Recovery hierarchy (Phase 1A):
 * 1. Email magic link / OTP
 * 2. Google
 * 3. Future Apple
 * Wallet / exchange must never be sole recovery.
 */
export const RECOVERY_HIERARCHY = [
  "email",
  "google",
  "apple",
] as const satisfies readonly AuthProviderCategory[];
