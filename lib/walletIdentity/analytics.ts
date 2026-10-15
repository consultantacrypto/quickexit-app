import { trackEvent } from "@/lib/analytics";

export const WALLET_IDENTITY_EVENTS = [
  "wallet_connect_started",
  "wallet_connect_success",
  "wallet_connect_failed",
  "wallet_disconnect_started",
  "wallet_disconnect_success",
  "wallet_disconnect_failed",
] as const;

export type WalletIdentityEvent = (typeof WALLET_IDENTITY_EVENTS)[number];

type SafeWalletParams = {
  chain_family?: "evm";
  reason?: string;
  surface?: string;
};

/** Non-PII — never address, signature, nonce, or chain payload. */
export function trackWalletIdentityEvent(
  event: WalletIdentityEvent,
  params?: SafeWalletParams,
): void {
  trackEvent(event, {
    chain_family: params?.chain_family ?? "evm",
    reason: params?.reason ?? null,
    surface: params?.surface ?? null,
  });
}
