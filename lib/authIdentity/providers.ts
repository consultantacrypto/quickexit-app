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
  labelKey: "email" | "google" | "apple";
  status: ConnectedIdentityStatus;
  provider: string;
};

/**
 * Apple Sign-In UI remains gated until Apple Developer + Staging provider
 * secrets are configured. Keep classifier/recovery abstractions; no dead CTAs.
 */
export const APPLE_IDENTITY_UI_ENABLED = false;

/**
 * Visible ConnectedIdentities rows: Email + Google.
 * Wallet is rendered separately (Phase 1C bind-after-auth).
 * Apple omitted while APPLE_IDENTITY_UI_ENABLED is false.
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
  const hasApple = providers.has("apple");

  const recoveryCats = identities
    .map((i) => classifyProvider(i.provider))
    .filter(isRecoveryCategory);
  const primary: AuthProviderCategory =
    recoveryCats.includes("email") || hasEmailIdentity
      ? "email"
      : recoveryCats.includes("google")
        ? "google"
        : APPLE_IDENTITY_UI_ENABLED && recoveryCats.includes("apple")
          ? "apple"
          : "email";

  const rows: ConnectedIdentityRow[] = [
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

  if (APPLE_IDENTITY_UI_ENABLED) {
    rows.push({
      category: "apple",
      labelKey: "apple",
      provider: "apple",
      status: hasApple
        ? primary === "apple"
          ? "primary_recovery"
          : "connected"
        : "not_connected",
    });
  }

  return rows;
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
