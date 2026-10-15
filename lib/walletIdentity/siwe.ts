import { verifyMessage, type Address, type Hex } from "viem";
import {
  createSiweMessage,
  parseSiweMessage,
  validateSiweMessage,
} from "viem/siwe";
import {
  WALLET_NONCE_TTL_MS,
  WALLET_SIWE_STATEMENT,
} from "@/lib/walletIdentity/policy";
import { normalizeEvmAddress } from "@/lib/walletIdentity/address";

export type SiweChallengeParams = {
  address: string;
  domain: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt?: Date;
  expirationTime?: Date;
};

export function buildSiweMessage(params: SiweChallengeParams): string {
  const address = normalizeEvmAddress(params.address) as Address | null;
  if (!address) throw new Error("invalid_address");
  if (!Number.isInteger(params.chainId) || params.chainId <= 0) {
    throw new Error("invalid_chain");
  }
  const issuedAt = params.issuedAt ?? new Date();
  const expirationTime =
    params.expirationTime ?? new Date(issuedAt.getTime() + WALLET_NONCE_TTL_MS);

  return createSiweMessage({
    address,
    chainId: params.chainId,
    domain: params.domain,
    uri: params.uri,
    version: "1",
    nonce: params.nonce,
    statement: WALLET_SIWE_STATEMENT,
    issuedAt,
    expirationTime,
  });
}

export type SiweVerifyInput = {
  message: string;
  signature: `0x${string}`;
  expectedAddress: string;
  expectedDomain: string;
  expectedUri: string;
  expectedNonce: string;
  expectedChainId: number;
  now?: Date;
};

export type SiweVerifyResult =
  | { ok: true; address: string; chainId: number }
  | {
      ok: false;
      reason:
        | "invalid_message"
        | "invalid_address"
        | "wrong_domain"
        | "wrong_uri"
        | "wrong_nonce"
        | "wrong_chain"
        | "expired"
        | "invalid_signature"
        | "wrong_statement";
    };

export async function verifySiweBindMessage(
  input: SiweVerifyInput,
): Promise<SiweVerifyResult> {
  const expectedAddress = normalizeEvmAddress(input.expectedAddress) as Address | null;
  if (!expectedAddress) {
    return { ok: false, reason: "invalid_address" };
  }

  let parsed: ReturnType<typeof parseSiweMessage>;
  try {
    parsed = parseSiweMessage(input.message);
  } catch {
    return { ok: false, reason: "invalid_message" };
  }

  const messageAddress = normalizeEvmAddress(parsed.address);
  if (!messageAddress || messageAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
    return { ok: false, reason: "invalid_address" };
  }

  if (String(parsed.domain || "") !== input.expectedDomain) {
    return { ok: false, reason: "wrong_domain" };
  }
  if (String(parsed.uri || "") !== input.expectedUri) {
    return { ok: false, reason: "wrong_uri" };
  }
  if (String(parsed.nonce || "") !== input.expectedNonce) {
    return { ok: false, reason: "wrong_nonce" };
  }
  if (Number(parsed.chainId) !== Number(input.expectedChainId)) {
    return { ok: false, reason: "wrong_chain" };
  }
  if (String(parsed.statement || "") !== WALLET_SIWE_STATEMENT) {
    return { ok: false, reason: "wrong_statement" };
  }

  const now = input.now ?? new Date();
  const validFields = validateSiweMessage({
    address: expectedAddress,
    domain: input.expectedDomain,
    nonce: input.expectedNonce,
    message: parsed,
    time: now,
  });
  if (!validFields) {
    if (parsed.expirationTime && now > new Date(parsed.expirationTime)) {
      return { ok: false, reason: "expired" };
    }
    return { ok: false, reason: "invalid_message" };
  }

  let signatureOk = false;
  try {
    signatureOk = await verifyMessage({
      address: expectedAddress,
      message: input.message,
      signature: input.signature as Hex,
    });
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }
  if (!signatureOk) {
    return { ok: false, reason: "invalid_signature" };
  }

  return {
    ok: true,
    address: expectedAddress,
    chainId: Number(parsed.chainId),
  };
}

/** Cryptographically random SIWE nonce (hex, no secrets in analytics). */
export function createWalletNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
