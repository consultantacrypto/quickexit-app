import { logError, logInfo, logWarn, type LogResult } from "@/lib/observability/log";

export type AuthIdentityOperation =
  | "profile_provision"
  | "identity_link"
  | "identity_unlink"
  | "collision"
  | "recovery_guard"
  | "auth_callback";

export type AuthIdentityResult = Extract<
  LogResult,
  "success" | "denied" | "conflict" | "error" | "ok"
>;

const COMPONENT = "auth_identity";

/** Expected conflicts → structured warn, not Sentry. */
export function logAuthIdentity(
  operation: AuthIdentityOperation,
  result: AuthIdentityResult,
  fields?: Record<string, unknown>,
): void {
  const payload = {
    component: COMPONENT,
    operation,
    result,
    // Never pass tokens/emails/cookies here — callers must scrub.
    ...fields,
  };

  if (result === "error") {
    logError(payload);
    return;
  }
  if (result === "denied" || result === "conflict") {
    logWarn(payload);
    return;
  }
  logInfo(payload);
}
