/**
 * Phase 1C.1 — MetaMask / injected-provider UX helpers.
 * Pure logic: timeouts restore UI without cancelling the underlying RPC.
 * Never log or return signatures, nonces, or full addresses.
 */

export const WALLET_PROVIDER_UI_TIMEOUT_MS = 60_000;

/** Explicit connect/disconnect flow phases shown in the UI. */
export type WalletFlowPhase =
  | "idle"
  | "awaiting_accounts"
  | "obtaining_challenge"
  | "awaiting_signature"
  | "verifying"
  | "disconnecting"
  | "connected"
  | "error";

export type WalletProviderErrorCode =
  | "user_rejected"
  | "request_pending"
  | "wallet_locked"
  | "provider_unavailable"
  | "metamask_not_found_among_injected"
  | "ambiguous_multiple_metamask"
  | "account_changed"
  | "chain_changed"
  | "provider_disconnected"
  | "request_timeout"
  | "auth_required"
  | "no_account"
  | "wallet_owned_elsewhere"
  | "connect_failed"
  | "disconnect_failed"
  | "unknown";

export type ClassifiedProviderError = {
  code: WalletProviderErrorCode;
  /** Short analytics-safe reason (no PII). */
  reason: string;
};

const TIMEOUT_SENTINEL = Symbol("wallet_provider_ui_timeout");

export function isWalletFlowBusy(phase: WalletFlowPhase): boolean {
  return (
    phase === "awaiting_accounts" ||
    phase === "obtaining_challenge" ||
    phase === "awaiting_signature" ||
    phase === "verifying" ||
    phase === "disconnecting"
  );
}

/**
 * Race a provider promise against a UI timeout.
 * Timeout does NOT cancel the underlying MetaMask RPC — callers must ignore
 * late resolutions via attempt guards.
 */
export async function withProviderUiTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = WALLET_PROVIDER_UI_TIMEOUT_MS,
): Promise<{ ok: true; value: T } | { ok: false; timedOut: true }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raced = await Promise.race([
      promise.then((value) => ({ kind: "value" as const, value })),
      new Promise<{ kind: "timeout" }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
      }),
    ]);
    if (raced.kind === "timeout") {
      // Detach: swallow late rejection so it does not become an unhandled rejection.
      void promise.then(
        () => undefined,
        () => undefined,
      );
      return { ok: false, timedOut: true };
    }
    return { ok: true, value: raced.value };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** @internal test helper */
export function walletProviderTimeoutSentinel(): typeof TIMEOUT_SENTINEL {
  return TIMEOUT_SENTINEL;
}

export function createWalletAttemptGuard() {
  let current = 0;
  return {
    begin(): number {
      current += 1;
      return current;
    },
    isCurrent(attempt: number): boolean {
      return attempt === current;
    },
    invalidate(): void {
      current += 1;
    },
    get current() {
      return current;
    },
  };
}

function readErrorCode(err: unknown): string | number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { code?: unknown; error?: { code?: unknown } };
  if (typeof e.code === "number" || typeof e.code === "string") return e.code;
  if (
    e.error &&
    (typeof e.error.code === "number" || typeof e.error.code === "string")
  ) {
    return e.error.code;
  }
  return undefined;
}

function readErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  if (typeof err === "string") return err;
  return "";
}

/**
 * Map MetaMask / EIP-1193 style errors to actionable UX codes.
 */
export function classifyProviderError(err: unknown): ClassifiedProviderError {
  if (err && typeof err === "object" && "timedOut" in err) {
    return { code: "request_timeout", reason: "request_timeout" };
  }

  const code = readErrorCode(err);
  const msg = readErrorMessage(err).toLowerCase();

  if (code === 4001 || code === "4001" || msg.includes("user rejected")) {
    return { code: "user_rejected", reason: "user_rejected" };
  }
  if (
    code === -32002 ||
    code === "-32002" ||
    msg.includes("already pending") ||
    msg.includes("request already pending")
  ) {
    return { code: "request_pending", reason: "request_pending" };
  }
  if (
    msg.includes("locked") ||
    msg.includes("unlock") ||
    code === -32000 ||
    code === "-32000"
  ) {
    // -32000 is overloaded; only treat as locked when message hints.
    if (msg.includes("locked") || msg.includes("unlock")) {
      return { code: "wallet_locked", reason: "wallet_locked" };
    }
  }
  if (msg.includes("locked") || msg.includes("unlock your wallet")) {
    return { code: "wallet_locked", reason: "wallet_locked" };
  }
  if (
    msg.includes("disconnected") ||
    msg.includes("provider disconnected") ||
    code === 4900 ||
    code === "4900"
  ) {
    return { code: "provider_disconnected", reason: "provider_disconnected" };
  }
  if (msg.includes("chain") && (msg.includes("chang") || msg.includes("mismatch"))) {
    return { code: "chain_changed", reason: "chain_changed" };
  }
  if (msg.includes("account") && msg.includes("chang")) {
    return { code: "account_changed", reason: "account_changed" };
  }
  if (
    msg === "auth_required" ||
    msg.includes("not authenticated") ||
    msg.includes("jwt")
  ) {
    return { code: "auth_required", reason: "auth_required" };
  }
  if (msg === "no_account" || msg.includes("no account")) {
    return { code: "no_account", reason: "no_account" };
  }
  if (msg === "wallet_owned_elsewhere") {
    return { code: "wallet_owned_elsewhere", reason: "wallet_owned_elsewhere" };
  }
  if (
    msg.includes("no ethereum") ||
    (msg.includes("provider") && msg.includes("undefined")) ||
    msg.includes("provider not found")
  ) {
    return { code: "provider_unavailable", reason: "provider_unavailable" };
  }

  return {
    code: "connect_failed",
    reason: (typeof code !== "undefined" ? String(code) : msg || "error").slice(
      0,
      40,
    ),
  };
}

/** i18n key under Dashboard.connectedIdentities for a classified error. */
export function providerErrorMessageKey(
  code: WalletProviderErrorCode,
):
  | "walletUserRejected"
  | "walletRequestPending"
  | "walletLocked"
  | "walletNoProvider"
  | "walletMetaMaskNotSelected"
  | "walletMultipleMetaMask"
  | "walletAccountChanged"
  | "walletChainChanged"
  | "walletProviderDisconnected"
  | "walletRequestTimeout"
  | "walletAuthRequired"
  | "walletNoAccount"
  | "walletOwnedElsewhere"
  | "walletConnectFailed"
  | "walletDisconnectFailed" {
  switch (code) {
    case "user_rejected":
      return "walletUserRejected";
    case "request_pending":
      return "walletRequestPending";
    case "wallet_locked":
      return "walletLocked";
    case "provider_unavailable":
      return "walletNoProvider";
    case "metamask_not_found_among_injected":
      return "walletMetaMaskNotSelected";
    case "ambiguous_multiple_metamask":
      return "walletMultipleMetaMask";
    case "account_changed":
      return "walletAccountChanged";
    case "chain_changed":
      return "walletChainChanged";
    case "provider_disconnected":
      return "walletProviderDisconnected";
    case "request_timeout":
      return "walletRequestTimeout";
    case "auth_required":
      return "walletAuthRequired";
    case "no_account":
      return "walletNoAccount";
    case "wallet_owned_elsewhere":
      return "walletOwnedElsewhere";
    case "disconnect_failed":
      return "walletDisconnectFailed";
    case "connect_failed":
    case "unknown":
    default:
      return "walletConnectFailed";
  }
}

/** i18n key for in-progress phase status line. */
export function flowPhaseStatusKey(
  phase: WalletFlowPhase,
):
  | "walletPhaseAwaitingAccounts"
  | "walletPhaseObtainingChallenge"
  | "walletPhaseAwaitingSignature"
  | "walletPhaseVerifying"
  | "walletPhaseDisconnecting"
  | null {
  switch (phase) {
    case "awaiting_accounts":
      return "walletPhaseAwaitingAccounts";
    case "obtaining_challenge":
      return "walletPhaseObtainingChallenge";
    case "awaiting_signature":
      return "walletPhaseAwaitingSignature";
    case "verifying":
      return "walletPhaseVerifying";
    case "disconnecting":
      return "walletPhaseDisconnecting";
    default:
      return null;
  }
}
