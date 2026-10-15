import { NextRequest, NextResponse } from "next/server";
import {
  WALLET_CHAIN_FAMILY,
  decideWalletBind,
} from "@/lib/walletIdentity/policy";
import { normalizeEvmAddress } from "@/lib/walletIdentity/address";
import { verifySiweBindMessage } from "@/lib/walletIdentity/siwe";
import { logWalletIdentity, captureWalletUnexpectedError } from "@/lib/walletIdentity/log";
import {
  createServiceSupabase,
  isAllowedWalletOrigin,
  requireAuthenticatedUser,
} from "@/lib/walletIdentity/serverAuth";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  if (!isAllowedWalletOrigin(req)) {
    logWalletIdentity("signature_verify", "denied", {
      error_code: "origin_rejected",
    });
    return json(403, { success: false, error_code: "origin_rejected" });
  }

  const auth = await requireAuthenticatedUser(req);
  if (!auth.ok) {
    logWalletIdentity("signature_verify", "denied", {
      error_code: auth.error_code,
    });
    return json(auth.status, { success: false, error_code: auth.error_code });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { success: false, error_code: "validation_error" });
  }

  const raw = body as { message?: unknown; signature?: unknown };
  const message = typeof raw.message === "string" ? raw.message : "";
  const signature =
    typeof raw.signature === "string" && raw.signature.startsWith("0x")
      ? (raw.signature as `0x${string}`)
      : null;

  if (!message || !signature) {
    return json(400, { success: false, error_code: "validation_error" });
  }

  // Parse nonce from message without trusting client fields for ownership.
  const nonceMatch = message.match(/\nNonce: ([^\n]+)\n/);
  const nonce = nonceMatch?.[1]?.trim() || "";
  if (!nonce || nonce.length < 8) {
    return json(400, { success: false, error_code: "invalid_nonce" });
  }

  let admin;
  try {
    admin = createServiceSupabase();
  } catch (err) {
    captureWalletUnexpectedError(err, "signature_verify");
    return json(500, { success: false, error_code: "server_error" });
  }

  const { data: nonceRow, error: nonceErr } = await admin
    .from("wallet_nonces")
    .select(
      "id, user_id, address, domain, uri, chain_id, expires_at, consumed_at, nonce",
    )
    .eq("nonce", nonce)
    .maybeSingle();

  if (nonceErr) {
    captureWalletUnexpectedError(nonceErr, "signature_verify", {
      error_code: "nonce_lookup_failed",
    });
    return json(500, { success: false, error_code: "server_error" });
  }

  if (!nonceRow) {
    logWalletIdentity("signature_verify", "denied", {
      error_code: "nonce_unknown",
    });
    return json(400, { success: false, error_code: "invalid_nonce" });
  }

  // Session swap: nonce must belong to current authenticated user.
  if (nonceRow.user_id !== auth.userId) {
    logWalletIdentity("signature_verify", "denied", {
      error_code: "session_mismatch",
    });
    return json(403, { success: false, error_code: "session_mismatch" });
  }

  if (nonceRow.consumed_at) {
    logWalletIdentity("signature_verify", "denied", {
      error_code: "nonce_reused",
    });
    return json(400, { success: false, error_code: "nonce_reused" });
  }

  const expiresAt = new Date(nonceRow.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || Date.now() > expiresAt.getTime()) {
    logWalletIdentity("signature_verify", "expired", {
      error_code: "nonce_expired",
    });
    return json(400, { success: false, error_code: "nonce_expired" });
  }

  const expectedAddress = normalizeEvmAddress(nonceRow.address);
  if (!expectedAddress) {
    return json(400, { success: false, error_code: "invalid_address" });
  }

  const verified = await verifySiweBindMessage({
    message,
    signature,
    expectedAddress,
    expectedDomain: String(nonceRow.domain),
    expectedUri: String(nonceRow.uri),
    expectedNonce: String(nonceRow.nonce),
    expectedChainId: Number(nonceRow.chain_id),
  });

  if (!verified.ok) {
    const result =
      verified.reason === "expired"
        ? "expired"
        : verified.reason === "invalid_signature"
          ? "invalid_signature"
          : "denied";
    logWalletIdentity("signature_verify", result, {
      error_code: verified.reason,
    });
    return json(400, { success: false, error_code: verified.reason });
  }

  // Consume nonce first (single-use) before bind.
  const { data: consumed, error: consumeErr } = await admin
    .from("wallet_nonces")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", nonceRow.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();

  if (consumeErr) {
    captureWalletUnexpectedError(consumeErr, "signature_verify", {
      error_code: "nonce_consume_failed",
    });
    return json(500, { success: false, error_code: "server_error" });
  }
  if (!consumed) {
    logWalletIdentity("signature_verify", "denied", {
      error_code: "nonce_reused",
    });
    return json(400, { success: false, error_code: "nonce_reused" });
  }

  const { data: existing, error: existingErr } = await admin
    .from("wallet_addresses")
    .select("id, user_id")
    .eq("chain_family", WALLET_CHAIN_FAMILY)
    .ilike("address", verified.address)
    .maybeSingle();

  if (existingErr) {
    captureWalletUnexpectedError(existingErr, "wallet_bind", {
      error_code: "wallet_lookup_failed",
    });
    return json(500, { success: false, error_code: "server_error" });
  }

  const decision = decideWalletBind({
    sessionUserId: auth.userId,
    existingOwnerUserId: existing?.user_id ?? null,
  });

  if (!decision.ok) {
    logWalletIdentity("wallet_conflict", "conflict", {
      error_code: decision.reason,
    });
    return json(409, {
      success: false,
      error_code: "wallet_owned_elsewhere",
      error:
        "This wallet is already connected to another QuickExit account.",
    });
  }

  const nowIso = new Date().toISOString();

  try {
    if (decision.action === "rebind_same_user" && existing?.id) {
      const { error: updErr } = await admin
        .from("wallet_addresses")
        .update({
          last_proof_at: nowIso,
          last_seen_chain_id: verified.chainId,
          updated_at: nowIso,
          address: verified.address,
        })
        .eq("id", existing.id)
        .eq("user_id", auth.userId);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await admin.from("wallet_addresses").insert({
        user_id: auth.userId,
        address: verified.address,
        chain_family: WALLET_CHAIN_FAMILY,
        last_seen_chain_id: verified.chainId,
        verified_at: nowIso,
        last_proof_at: nowIso,
      });
      if (insErr) {
        // Race: another user bound the same address between lookup and insert.
        if (String(insErr.code) === "23505" || /duplicate|unique/i.test(insErr.message)) {
          logWalletIdentity("wallet_conflict", "conflict", {
            error_code: "wallet_owned_elsewhere",
          });
          return json(409, {
            success: false,
            error_code: "wallet_owned_elsewhere",
            error:
              "This wallet is already connected to another QuickExit account.",
          });
        }
        throw insErr;
      }
    }
  } catch (err) {
    captureWalletUnexpectedError(err, "wallet_bind");
    return json(500, { success: false, error_code: "server_error" });
  }

  // Hard invariant: this route never writes KYC / HQ / ownership tables.
  logWalletIdentity("wallet_bind", "success", {
    chain_family: WALLET_CHAIN_FAMILY,
    action: decision.action,
  });
  logWalletIdentity("signature_verify", "success", {
    chain_family: WALLET_CHAIN_FAMILY,
  });

  return json(200, {
    success: true,
    chain_family: WALLET_CHAIN_FAMILY,
    address: verified.address,
    action: decision.action,
  });
}
