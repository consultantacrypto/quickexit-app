import { trackEvent } from "@/lib/analytics";
import type { AuthProviderCategory } from "@/lib/authIdentity/policy";

export const AUTH_IDENTITY_EVENTS = [
  "auth_started",
  "auth_provider_selected",
  "auth_success",
  "auth_failed",
  "identity_link_started",
  "identity_link_success",
  "identity_link_failed",
  "identity_unlink_started",
  "identity_unlink_success",
  "identity_unlink_failed",
] as const;

export type AuthIdentityEvent = (typeof AUTH_IDENTITY_EVENTS)[number];

type SafeAuthParams = {
  provider_category?: AuthProviderCategory | string;
  reason?: string;
  surface?: string;
};

/** Non-PII auth analytics — provider category allowed; never email/token. */
export function trackAuthIdentityEvent(
  event: AuthIdentityEvent,
  params?: SafeAuthParams,
): void {
  trackEvent(event, {
    provider_category: params?.provider_category ?? null,
    reason: params?.reason ?? null,
    surface: params?.surface ?? null,
  });
}
