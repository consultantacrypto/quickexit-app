import {
  classifyProvider,
  isRecoveryCategory,
  type AuthProviderCategory,
} from "@/lib/authIdentity/policy";
import type { LinkedIdentityView } from "@/lib/authIdentity/recovery";

export type ConnectedIdentityStatus =
  | "connected"
  | "primary_recovery"
  | "available"
  | "not_connected";

export type ConnectedIdentityRow = {
  category: AuthProviderCategory;
  labelKey: "email" | "google";
  status: ConnectedIdentityStatus;
  provider: string;
};

/**
 * Phase 1A UI surface: Email + Google only.
 * Apple/wallet intentionally omitted (no dead buttons).
 */
export function buildConnectedIdentityRows(
  identities: LinkedIdentityView[],
  sessionHasEmail: boolean,
): ConnectedIdentityRow[] {
  const providers = new Set(
    identities.map((i) => String(i.provider || "").toLowerCase()),
  );
  const hasEmailIdentity =
    sessionHasEmail || providers.has("email") || identities.some((i) => i.email);
  const hasGoogle = providers.has("google");

  const recoveryCats = identities
    .map((i) => classifyProvider(i.provider))
    .filter(isRecoveryCategory);
  const primary: AuthProviderCategory =
    recoveryCats.includes("email") || hasEmailIdentity
      ? "email"
      : recoveryCats.includes("google")
        ? "google"
        : "email";

  return [
    {
      category: "email",
      labelKey: "email",
      provider: "email",
      status: hasEmailIdentity
        ? primary === "email"
          ? "primary_recovery"
          : "connected"
        : "not_connected",
    },
    {
      category: "google",
      labelKey: "google",
      provider: "google",
      status: hasGoogle
        ? primary === "google"
          ? "primary_recovery"
          : "connected"
        : "not_connected",
    },
  ];
}

/** Map Supabase auth error messages to collision UX codes (no PII). */
export function classifyAuthCollision(
  errorMessage: string | null | undefined,
): "identity_owned_elsewhere" | "generic" {
  const msg = String(errorMessage || "").toLowerCase();
  if (
    msg.includes("already been registered") ||
    msg.includes("already linked") ||
    msg.includes("identity is already") ||
    msg.includes("user already exists") ||
    msg.includes("manual linking")
  ) {
    return "identity_owned_elsewhere";
  }
  return "generic";
}
