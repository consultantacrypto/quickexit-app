export {
  WALLET_IDENTITY_POLICY_VERSION,
  WALLET_CHAIN_FAMILY,
  WALLET_NONCE_TTL_MS,
  WALLET_SIWE_STATEMENT,
  WALLET_IDENTITY_INVARIANTS,
  WALLET_BADGE,
  decideWalletBind,
  decideWalletUnlink,
} from "@/lib/walletIdentity/policy";

export {
  normalizeEvmAddress,
  abbreviateEvmAddress,
  isSameEvmAddress,
} from "@/lib/walletIdentity/address";

export {
  buildSiweMessage,
  verifySiweBindMessage,
  createWalletNonce,
} from "@/lib/walletIdentity/siwe";

export {
  WALLET_IDENTITY_EVENTS,
  trackWalletIdentityEvent,
} from "@/lib/walletIdentity/analytics";

export { logWalletIdentity } from "@/lib/walletIdentity/log";
