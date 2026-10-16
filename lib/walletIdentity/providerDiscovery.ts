/**
 * Injected EVM provider discovery for wallet bind.
 * Prefers EIP-6963 announcements; falls back to legacy window.ethereum / .providers.
 * Selection metadata is for UX routing only — not a cryptographic identity guarantee.
 */

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
  isMetaMask?: boolean;
  providers?: Eip1193Provider[];
  // Present on genuine MetaMask; used as a soft capability hint only.
  _metamask?: unknown;
};

export type ProviderKind =
  | "metamask"
  | "metamask_flask"
  | "legacy_metamask"
  | "other"
  | "none";

export type ProviderSource = "eip6963" | "legacy_providers" | "legacy_ethereum";

export type ProviderSelectionOk = {
  ok: true;
  provider: Eip1193Provider;
  source: ProviderSource;
  kind: Exclude<ProviderKind, "none" | "other">;
  /** Total distinct provider handles observed (privacy-safe count). */
  providerCount: number;
  metamaskCount: number;
  eip6963Count: number;
};

export type ProviderSelectionFail = {
  ok: false;
  reason:
    | "provider_not_found"
    | "metamask_not_found_among_injected"
    | "ambiguous_multiple_metamask";
  providerCount: number;
  metamaskCount: number;
  eip6963Count: number;
};

export type ProviderSelectionResult = ProviderSelectionOk | ProviderSelectionFail;

/** Official MetaMask EIP-6963 reverse-DNS identifiers. */
export const METAMASK_RDNS = ["io.metamask", "io.metamask.flask"] as const;

const EIP6963_REQUEST = "eip6963:requestProvider";
const EIP6963_ANNOUNCE = "eip6963:announceProvider";

type Eip6963ProviderDetail = {
  info?: { rdns?: string; name?: string; uuid?: string };
  provider?: Eip1193Provider;
};

export function isStagingWalletDiagnosticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  if (host === "quickexit-staging.vercel.app") return true;
  if (host === "staging.quickexit.ro") return true;
  if (process.env.NEXT_PUBLIC_QE_STAGING_SITE === "1") return true;
  if (process.env.NEXT_PUBLIC_QE_WALLET_PROVIDER_DIAG === "1") return true;
  return false;
}

export function classifyRdns(rdns: string | undefined): ProviderKind {
  if (!rdns) return "other";
  const n = rdns.toLowerCase();
  if (n === "io.metamask") return "metamask";
  if (n === "io.metamask.flask") return "metamask_flask";
  return "other";
}

/** Soft capability check — never treat as a security proof. */
export function looksLikeLegacyMetaMask(provider: Eip1193Provider): boolean {
  if (provider.isMetaMask !== true) return false;
  // Prefer presence of MetaMask private API surface when available.
  if (provider._metamask !== undefined) return true;
  // Accept isMetaMask alone as last-resort legacy signal.
  return true;
}

/**
 * Collect EIP-6963 announcements for a short window.
 * Spec: dispatch requestProvider; wallets reply with announceProvider.
 */
export async function discoverEip6963Providers(
  windowMs: number = 300,
): Promise<Array<{ rdns?: string; provider: Eip1193Provider }>> {
  if (typeof window === "undefined") return [];

  const found: Array<{ rdns?: string; provider: Eip1193Provider }> = [];
  const seen = new WeakSet<object>();

  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
    const provider = detail?.provider;
    if (!provider || typeof provider.request !== "function") return;
    if (seen.has(provider as object)) return;
    seen.add(provider as object);
    found.push({
      rdns:
        typeof detail?.info?.rdns === "string" ? detail.info.rdns : undefined,
      provider,
    });
  };

  window.addEventListener(EIP6963_ANNOUNCE, onAnnounce as EventListener);
  try {
    window.dispatchEvent(new Event(EIP6963_REQUEST));
    // Many wallets announce synchronously; wait briefly for late announcers.
    await new Promise((r) => setTimeout(r, windowMs));
  } finally {
    window.removeEventListener(EIP6963_ANNOUNCE, onAnnounce as EventListener);
  }

  return found;
}

export function collectLegacyProviders(): Eip1193Provider[] {
  if (typeof window === "undefined") return [];
  const eth = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
  if (!eth) return [];
  const out: Eip1193Provider[] = [];
  const seen = new Set<Eip1193Provider>();
  const push = (p: Eip1193Provider | undefined) => {
    if (!p || typeof p.request !== "function") return;
    if (seen.has(p)) return;
    seen.add(p);
    out.push(p);
  };
  push(eth);
  if (Array.isArray(eth.providers)) {
    for (const p of eth.providers) push(p);
  }
  return out;
}

/**
 * Select MetaMask for wallet bind.
 * Order: EIP-6963 rdns → legacy providers with MetaMask signals →
 * sole legacy window.ethereum if it looks like MetaMask.
 */
export async function selectMetaMaskProvider(
  eip6963WindowMs: number = 300,
): Promise<ProviderSelectionResult> {
  const eip = await discoverEip6963Providers(eip6963WindowMs);
  const eip6963Count = eip.length;

  const metamaskFrom6963 = eip.filter((p) => {
    const kind = classifyRdns(p.rdns);
    return kind === "metamask" || kind === "metamask_flask";
  });

  if (metamaskFrom6963.length === 1) {
    const chosen = metamaskFrom6963[0]!;
    const kind = classifyRdns(chosen.rdns);
    return {
      ok: true,
      provider: chosen.provider,
      source: "eip6963",
      kind: kind === "metamask_flask" ? "metamask_flask" : "metamask",
      providerCount: Math.max(eip6963Count, collectLegacyProviders().length),
      metamaskCount: metamaskFrom6963.length,
      eip6963Count,
    };
  }

  if (metamaskFrom6963.length > 1) {
    // Prefer stable MetaMask over Flask when both announce.
    const stable = metamaskFrom6963.find(
      (p) => classifyRdns(p.rdns) === "metamask",
    );
    const chosen = stable ?? metamaskFrom6963[0]!;
    return {
      ok: true,
      provider: chosen.provider,
      source: "eip6963",
      kind:
        classifyRdns(chosen.rdns) === "metamask_flask"
          ? "metamask_flask"
          : "metamask",
      providerCount: Math.max(eip6963Count, collectLegacyProviders().length),
      metamaskCount: metamaskFrom6963.length,
      eip6963Count,
    };
  }

  const legacy = collectLegacyProviders();
  const legacyMeta = legacy.filter(looksLikeLegacyMetaMask);

  if (legacyMeta.length === 1) {
    return {
      ok: true,
      provider: legacyMeta[0]!,
      source: legacy.length > 1 ? "legacy_providers" : "legacy_ethereum",
      kind: "legacy_metamask",
      providerCount: Math.max(eip6963Count, legacy.length),
      metamaskCount: legacyMeta.length,
      eip6963Count,
    };
  }

  if (legacyMeta.length > 1) {
    return {
      ok: false,
      reason: "ambiguous_multiple_metamask",
      providerCount: Math.max(eip6963Count, legacy.length),
      metamaskCount: legacyMeta.length,
      eip6963Count,
    };
  }

  if (legacy.length > 0 || eip6963Count > 0) {
    return {
      ok: false,
      reason: "metamask_not_found_among_injected",
      providerCount: Math.max(eip6963Count, legacy.length),
      metamaskCount: 0,
      eip6963Count,
    };
  }

  return {
    ok: false,
    reason: "provider_not_found",
    providerCount: 0,
    metamaskCount: 0,
    eip6963Count: 0,
  };
}

/** Pure helper for tests: choose among already-discovered candidates. */
export function selectFromDiscovered(input: {
  eip6963: Array<{ rdns?: string; provider: Eip1193Provider }>;
  legacy: Eip1193Provider[];
}): ProviderSelectionResult {
  const eip6963Count = input.eip6963.length;
  const metamaskFrom6963 = input.eip6963.filter((p) => {
    const kind = classifyRdns(p.rdns);
    return kind === "metamask" || kind === "metamask_flask";
  });

  if (metamaskFrom6963.length >= 1) {
    const stable = metamaskFrom6963.find(
      (p) => classifyRdns(p.rdns) === "metamask",
    );
    const chosen = stable ?? metamaskFrom6963[0]!;
    return {
      ok: true,
      provider: chosen.provider,
      source: "eip6963",
      kind:
        classifyRdns(chosen.rdns) === "metamask_flask"
          ? "metamask_flask"
          : "metamask",
      providerCount: Math.max(eip6963Count, input.legacy.length),
      metamaskCount: metamaskFrom6963.length,
      eip6963Count,
    };
  }

  const legacyMeta = input.legacy.filter(looksLikeLegacyMetaMask);
  if (legacyMeta.length === 1) {
    return {
      ok: true,
      provider: legacyMeta[0]!,
      source: input.legacy.length > 1 ? "legacy_providers" : "legacy_ethereum",
      kind: "legacy_metamask",
      providerCount: Math.max(eip6963Count, input.legacy.length),
      metamaskCount: 1,
      eip6963Count,
    };
  }
  if (legacyMeta.length > 1) {
    return {
      ok: false,
      reason: "ambiguous_multiple_metamask",
      providerCount: Math.max(eip6963Count, input.legacy.length),
      metamaskCount: legacyMeta.length,
      eip6963Count,
    };
  }
  if (input.legacy.length > 0 || eip6963Count > 0) {
    return {
      ok: false,
      reason: "metamask_not_found_among_injected",
      providerCount: Math.max(eip6963Count, input.legacy.length),
      metamaskCount: 0,
      eip6963Count,
    };
  }
  return {
    ok: false,
    reason: "provider_not_found",
    providerCount: 0,
    metamaskCount: 0,
    eip6963Count: 0,
  };
}
