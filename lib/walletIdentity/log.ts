import { logError, logInfo, logWarn, type LogResult } from "@/lib/observability/log";
import { captureException } from "@/lib/observability/capture";

export type WalletIdentityOperation =
  | "nonce_issue"
  | "signature_verify"
  | "wallet_bind"
  | "wallet_unbind"
  | "wallet_conflict";

/** success | denied | conflict | expired | invalid_signature | error */
export type WalletIdentityResult =
  | Extract<LogResult, "success" | "denied" | "conflict" | "error">
  | "expired"
  | "invalid_signature";

const COMPONENT = "wallet_identity";

function toLogResult(result: WalletIdentityResult): LogResult {
  if (result === "expired" || result === "invalid_signature") return "denied";
  return result;
}

/**
 * Structured wallet identity logs.
 * Never pass: signature, nonce, full address, cookies, tokens.
 */
export function logWalletIdentity(
  operation: WalletIdentityOperation,
  result: WalletIdentityResult,
  fields?: Record<string, unknown>,
): void {
  const payload = {
    component: COMPONENT,
    operation,
    result: toLogResult(result),
    wallet_result: result,
    ...fields,
  };

  if (result === "error") {
    logError(payload);
    return;
  }
  if (
    result === "denied" ||
    result === "conflict" ||
    result === "expired" ||
    result === "invalid_signature"
  ) {
    logWarn(payload);
    return;
  }
  logInfo(payload);
}

export function captureWalletUnexpectedError(
  err: unknown,
  operation: WalletIdentityOperation,
  context?: Record<string, unknown>,
): void {
  logWalletIdentity(operation, "error", {
    error_code: "unexpected",
    ...context,
  });
  captureException(err, {
    component: COMPONENT,
    operation,
    error_code: "unexpected",
    extra: context,
  });
}
