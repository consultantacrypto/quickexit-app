export {
  AUTH_IDENTITY_POLICY_VERSION,
  IDENTITY_INVARIANTS,
  classifyProvider,
  decideColdProviderLogin,
  decideExplicitLink,
  decideUnlink,
  isRecoveryCategory,
  type AuthProviderCategory,
  type IdentityLinkDecision,
} from "@/lib/authIdentity/policy";

export {
  RECOVERY_HIERARCHY,
  canUnlinkIdentity,
  countRecoveryIdentities,
  recoveryCategoriesFromIdentities,
  type LinkedIdentityView,
} from "@/lib/authIdentity/recovery";

export {
  AUTH_IDENTITY_EVENTS,
  trackAuthIdentityEvent,
  type AuthIdentityEvent,
} from "@/lib/authIdentity/analytics";

export { logAuthIdentity } from "@/lib/authIdentity/log";
export { ensureProfileRow } from "@/lib/authIdentity/ensureProfile";
export {
  APPLE_IDENTITY_UI_ENABLED,
  buildConnectedIdentityRows,
  classifyAuthCollision,
  type ConnectedIdentityRow,
  type ConnectedIdentityStatus,
} from "@/lib/authIdentity/providers";
