import { NextRequest, NextResponse } from "next/server";
import {
  WALLET_CHAIN_FAMILY,
  WALLET_NONCE_TTL_MS,
  WALLET_SIWE_STATEMENT,
} from "@/lib/walletIdentity/policy";
import { normalizeEvmAddress } from "@/lib/walletIdentity/address";
import { buildSiweMessage, createWalletNonce } from "@/lib/walletIdentity/siwe";
import { logWalletIdentity, captureWalletUnexpectedError } from "@/lib/walletIdentity/log";
import {
  createServiceSupabase,
  isAllowedWalletOrigin,
  requireAuthenticatedUser,
  resolveSiweDomain,
  resolveSiweUri,
} from "@/lib/walletIdentity/serverAuth";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function json(
  status: number,
  body: Record<string, unknown>,
) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  if (!isAllowedWalletOrigin(req)) {
    logWalletIdentity("nonce_issue", "denied", { error_code: "origin_rejected" });
    return json(403, { success: false, error_code: "origin_rejected" });
  }

  const auth = await requireAuthenticatedUser(req);
  if (!auth.ok) {
    logWalletIdentity("nonce_issue", "denied", { error_code: auth.error_code });
    return json(auth.status, { success: false, error_code: auth.error_code });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error_code: "validation_error" });
  }

  const raw = body as { address?: unknown; chainId?: unknown };
  const address = normalizeEvmAddress(
    typeof raw.address === "string" ? raw.address : null,
  );
  const chainId =
    typeof raw.chainId === "number"
      ? raw.chainId
      : typeof raw.chainId === "string"
        ? Number.parseInt(raw.chainId, 10)
        : NaN;

  if (!address) {
    return json(400, { success: false, error_code: "invalid_address" });
  }
  if (!Number.isInteger(chainId) || chainId <= 0 || chainId > 2_147_483_647) {
    return json(400, { success: false, error_code: "invalid_chain" });
  }

  const domain = resolveSiweDomain(req);
  if (!domain) {
    return json(400, { success: false, error_code: "invalid_domain" });
  }
  const uri = resolveSiweUri(req, domain);
  const nonce = createWalletNonce();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + WALLET_NONCE_TTL_MS);

  let message: string;
  try {
    message = buildSiweMessage({
      address,
      domain,
      uri,
      chainId,
      nonce,
      issuedAt,
      expirationTime: expiresAt,
    });
  } catch {
    return json(400, { success: false, error_code: "validation_error" });
  }

  try {
    const admin = createServiceSupabase();
    const { error } = await admin.from("wallet_nonces").insert({
      user_id: auth.userId,
      address,
      chain_family: WALLET_CHAIN_FAMILY,
      nonce,
      domain,
      uri,
      chain_id: chainId,
      expires_at: expiresAt.toISOString(),
    });
    if (error) {
      captureWalletUnexpectedError(error, "nonce_issue", {
        error_code: "nonce_persist_failed",
      });
      return json(500, { success: false, error_code: "server_error" });
    }
  } catch (err) {
    captureWalletUnexpectedError(err, "nonce_issue");
    return json(500, { success: false, error_code: "server_error" });
  }

  logWalletIdentity("nonce_issue", "success", {
    chain_family: WALLET_CHAIN_FAMILY,
  });

  return json(200, {
    success: true,
    chain_family: WALLET_CHAIN_FAMILY,
    address,
    chainId,
    domain,
    uri,
    statement: WALLET_SIWE_STATEMENT,
    issuedAt: issuedAt.toISOString(),
    expirationTime: expiresAt.toISOString(),
    // Nonce is required for the client to sign the returned message;
    // it must not appear in analytics/logs.
    nonce,
    message,
  });
}
