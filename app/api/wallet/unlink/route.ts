import { NextRequest, NextResponse } from "next/server";
import { WALLET_CHAIN_FAMILY, decideWalletUnlink } from "@/lib/walletIdentity/policy";
import { normalizeEvmAddress } from "@/lib/walletIdentity/address";
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
    logWalletIdentity("wallet_unbind", "denied", {
      error_code: "origin_rejected",
    });
    return json(403, { success: false, error_code: "origin_rejected" });
  }

  const auth = await requireAuthenticatedUser(req);
  if (!auth.ok) {
    logWalletIdentity("wallet_unbind", "denied", {
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

  const raw = body as { address?: unknown };
  const address = normalizeEvmAddress(
    typeof raw.address === "string" ? raw.address : null,
  );
  if (!address) {
    return json(400, { success: false, error_code: "invalid_address" });
  }

  let admin;
  try {
    admin = createServiceSupabase();
  } catch (err) {
    captureWalletUnexpectedError(err, "wallet_unbind");
    return json(500, { success: false, error_code: "server_error" });
  }

  const { data: row, error: lookupErr } = await admin
    .from("wallet_addresses")
    .select("id, user_id")
    .eq("chain_family", WALLET_CHAIN_FAMILY)
    .ilike("address", address)
    .maybeSingle();

  if (lookupErr) {
    captureWalletUnexpectedError(lookupErr, "wallet_unbind", {
      error_code: "wallet_lookup_failed",
    });
    return json(500, { success: false, error_code: "server_error" });
  }

  const decision = decideWalletUnlink({
    sessionUserId: auth.userId,
    walletOwnerUserId: row?.user_id ?? null,
  });

  if (!decision.ok) {
    logWalletIdentity("wallet_unbind", "denied", {
      error_code: decision.reason,
    });
    const status = decision.reason === "not_found" ? 404 : 403;
    return json(status, { success: false, error_code: decision.reason });
  }

  const { error: delErr } = await admin
    .from("wallet_addresses")
    .delete()
    .eq("id", row!.id)
    .eq("user_id", auth.userId);

  if (delErr) {
    captureWalletUnexpectedError(delErr, "wallet_unbind");
    return json(500, { success: false, error_code: "server_error" });
  }

  // Unlink changes wallet binding only — never auth.users, KYC, ownership.
  logWalletIdentity("wallet_unbind", "success", {
    chain_family: WALLET_CHAIN_FAMILY,
  });

  return json(200, {
    success: true,
    chain_family: WALLET_CHAIN_FAMILY,
  });
}
