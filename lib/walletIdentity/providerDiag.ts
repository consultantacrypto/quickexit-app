/**
 * Staging-only, privacy-safe wallet provider diagnostics.
 * Never logs addresses, signatures, nonces, cookies, or tokens.
 */

import { trackEvent } from "@/lib/analytics";
import { isStagingWalletDiagnosticsEnabled } from "@/lib/walletIdentity/providerDiscovery";

export const WALLET_PROVIDER_DIAG_EVENTS = [
  "wallet_diag_provider_not_found",
  "wallet_diag_provider_discovered",
  "wallet_diag_provider_selected",
  "wallet_diag_request_accounts_started",
  "wallet_diag_request_accounts_resolved",
  "wallet_diag_request_accounts_rejected",
  "wallet_diag_request_accounts_timeout",
  "wallet_diag_signature_requested",
] as const;

export type WalletProviderDiagEvent = (typeof WALLET_PROVIDER_DIAG_EVENTS)[number];

type SafeDiagParams = {
  source?: string;
  kind?: string;
  reason?: string;
  provider_count?: number;
  metamask_count?: number;
  eip6963_count?: number;
};

export function trackWalletProviderDiag(
  event: WalletProviderDiagEvent,
  params?: SafeDiagParams,
): void {
  if (!isStagingWalletDiagnosticsEnabled()) return;

  trackEvent(event, {
    chain_family: "evm",
    surface: "connected_identities",
    source: params?.source ?? null,
    kind: params?.kind ?? null,
    reason: params?.reason ?? null,
    provider_count:
      typeof params?.provider_count === "number"
        ? Math.min(Math.max(0, params.provider_count), 32)
        : null,
    metamask_count:
      typeof params?.metamask_count === "number"
        ? Math.min(Math.max(0, params.metamask_count), 8)
        : null,
    eip6963_count:
      typeof params?.eip6963_count === "number"
        ? Math.min(Math.max(0, params.eip6963_count), 32)
        : null,
  });
}
