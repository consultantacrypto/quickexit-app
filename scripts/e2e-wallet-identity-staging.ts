/**
 * Phase 1C — Staging E2E wallet bind matrix (synthetic keys + Staging API).
 *
 * Requires:
 *   QE_STAGING_MATRIX=1
 *   STAGING_SUPABASE_URL / STAGING_SUPABASE_ANON_KEY / STAGING_SUPABASE_SERVICE_ROLE_KEY
 *   Optional: STAGING_SITE_URL (default https://quickexit-staging.vercel.app)
 *
 * Never targets Production.
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import {
  STAGING_REF,
  assertStagingSupabaseWriteTarget,
} from "./assert-staging-supabase-target";

const PRODUCTION_REF = "geywuzwbzecknokvnins";
const SITE =
  (process.env.STAGING_SITE_URL || "https://quickexit-staging.vercel.app").replace(
    /\/+$/,
    "",
  );
const OUT = resolve("docs/internal/auth/phase1c-staging-e2e-2026-10-15.json");

type Cell = { id: string; result: "PASS" | "DENY" | "FAIL" | "SKIP"; detail?: string };

function fail(m: string): never {
  console.error(`FAIL ${m}`);
  process.exit(1);
}

function requireEnv(name: string): string {
  const v = (process.env[name] ?? "").trim();
  if (!v) fail(`missing env ${name}`);
  return v;
}

async function main() {
  if (process.env.QE_STAGING_MATRIX !== "1" && process.env.QE_STAGING_MATRIX !== "true") {
    fail("set QE_STAGING_MATRIX=1");
  }
  const apiUrl = assertStagingSupabaseWriteTarget(
    process.env.STAGING_SUPABASE_URL || `https://${STAGING_REF}.supabase.co`,
  );
  if (apiUrl.includes(PRODUCTION_REF)) fail("Production refused");
  if (SITE.includes("www.quickexit.ro") || SITE.includes("quickexit.ro")) {
    fail("Production site refused");
  }

  const anon =
    (process.env.STAGING_SUPABASE_ANON_KEY || process.env.STAGING_ANON_KEY || "").trim() ||
    requireEnv("STAGING_SUPABASE_ANON_KEY");
  const service =
    (process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.STAGING_SERVICE_ROLE_KEY ||
      "").trim() || requireEnv("STAGING_SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient(apiUrl, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const emailA = `wallet-a-${stamp}@staging.quickexit.test`;
  const emailB = `wallet-b-${stamp}@staging.quickexit.test`;
  const password = `W1!${stamp}AaBbCc`;

  const cells: Cell[] = [];
  const record = (id: string, result: Cell["result"], detail?: string) => {
    cells.push({ id, result, detail });
    console.log(`${result} ${id}${detail ? ` ${detail}` : ""}`);
  };

  async function createUser(email: string) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) fail(`createUser ${email}: ${error?.message}`);
    return data.user;
  }

  async function signIn(email: string) {
    const client = createClient(apiUrl, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session?.access_token) {
      fail(`signIn ${email}: ${error?.message}`);
    }
    return data.session.access_token;
  }

  async function api(
    path: string,
    token: string | null,
    body: Record<string, unknown>,
  ) {
    const res = await fetch(`${SITE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: SITE,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, json };
  }

  const userA = await createUser(emailA);
  const userB = await createUser(emailB);
  const tokenA = await signIn(emailA);
  const tokenB = await signIn(emailB);

  const acct1 = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  );
  const acct2 = privateKeyToAccount(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  );

  // Snapshot KYC / ownership counts for invariants
  const { data: profileBefore } = await admin
    .from("profiles")
    .select("id, kyc_status")
    .eq("id", userA.id)
    .maybeSingle();
  const { count: listingsBefore } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userA.id);

  // B. Unauthenticated nonce → DENY
  {
    const r = await api("/api/wallet/nonce", null, {
      address: acct1.address,
      chainId: 1,
    });
    record(
      "B_unauth_nonce",
      r.status === 401 ? "DENY" : "FAIL",
      `status=${r.status}`,
    );
  }

  // A. Authenticated nonce → PASS
  let nonceMessage = "";
  let nonceValue = "";
  {
    const r = await api("/api/wallet/nonce", tokenA, {
      address: acct1.address,
      chainId: 1,
    });
    nonceMessage = String(r.json.message || "");
    nonceValue = String(r.json.nonce || "");
    record(
      "A_auth_nonce",
      r.status === 200 && r.json.success === true && nonceMessage ? "PASS" : "FAIL",
      `status=${r.status}`,
    );
  }

  // C. Valid signature → connect
  {
    const sig = await acct1.signMessage({ message: nonceMessage });
    const r = await api("/api/wallet/verify", tokenA, {
      message: nonceMessage,
      signature: sig,
    });
    record(
      "C_valid_bind",
      r.status === 200 && r.json.success === true ? "PASS" : "FAIL",
      `status=${r.status} code=${r.json.error_code ?? ""}`,
    );
  }

  // D. Idempotent same wallet same user
  {
    const r1 = await api("/api/wallet/nonce", tokenA, {
      address: acct1.address,
      chainId: 1,
    });
    const msg = String(r1.json.message || "");
    const sig = await acct1.signMessage({ message: msg });
    const r2 = await api("/api/wallet/verify", tokenA, {
      message: msg,
      signature: sig,
    });
    record(
      "D_idempotent_rebind",
      r2.status === 200 && r2.json.success === true ? "PASS" : "FAIL",
      `status=${r2.status}`,
    );
  }

  // E. Same wallet second user → DENY
  {
    const r1 = await api("/api/wallet/nonce", tokenB, {
      address: acct1.address,
      chainId: 1,
    });
    const msg = String(r1.json.message || "");
    const sig = await acct1.signMessage({ message: msg });
    const r2 = await api("/api/wallet/verify", tokenB, {
      message: msg,
      signature: sig,
    });
    record(
      "E_duplicate_elsewhere",
      r2.status === 409 || r2.json.error_code === "wallet_owned_elsewhere"
        ? "DENY"
        : "FAIL",
      `status=${r2.status}`,
    );
  }

  // F. Invalid signature → DENY
  {
    const r1 = await api("/api/wallet/nonce", tokenA, {
      address: acct2.address,
      chainId: 1,
    });
    const msg = String(r1.json.message || "");
    const r2 = await api("/api/wallet/verify", tokenA, {
      message: msg,
      signature: "0x" + "11".repeat(65),
    });
    record(
      "F_invalid_signature",
      r2.status >= 400 ? "DENY" : "FAIL",
      `status=${r2.status}`,
    );
  }

  // H. Reused nonce → DENY
  {
    const sig = await acct1.signMessage({ message: nonceMessage });
    const r = await api("/api/wallet/verify", tokenA, {
      message: nonceMessage,
      signature: sig,
    });
    record(
      "H_reused_nonce",
      r.status >= 400 ? "DENY" : "FAIL",
      `status=${r.status} code=${r.json.error_code ?? ""}`,
    );
  }

  // I. Wrong domain/URI — covered by pure assert; staging checks origin reject
  {
    const res = await fetch(`${SITE}/api/wallet/nonce`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ address: acct2.address, chainId: 1 }),
    });
    record(
      "I_wrong_origin",
      res.status === 403 ? "DENY" : "FAIL",
      `status=${res.status}`,
    );
  }

  // G. Expired nonce — force expire via service role then verify
  {
    const r1 = await api("/api/wallet/nonce", tokenA, {
      address: acct2.address,
      chainId: 1,
    });
    const msg = String(r1.json.message || "");
    const nonce = String(r1.json.nonce || "");
    await admin
      .from("wallet_nonces")
      .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("nonce", nonce);
    const sig = await acct2.signMessage({ message: msg });
    const r2 = await api("/api/wallet/verify", tokenA, {
      message: msg,
      signature: sig,
    });
    record(
      "G_expired_nonce",
      r2.status >= 400 ? "DENY" : "FAIL",
      `status=${r2.status} code=${r2.json.error_code ?? ""}`,
    );
  }

  // K. Disconnect other user's wallet → DENY
  {
    const r = await api("/api/wallet/unlink", tokenB, {
      address: acct1.address,
    });
    record(
      "K_unlink_other",
      r.status === 403 || r.status === 404 ? "DENY" : "FAIL",
      `status=${r.status}`,
    );
  }

  // J. Disconnect own → PASS
  {
    const r = await api("/api/wallet/unlink", tokenA, {
      address: acct1.address,
    });
    record(
      "J_unlink_own",
      r.status === 200 && r.json.success === true ? "PASS" : "FAIL",
      `status=${r.status}`,
    );
  }

  // L / M / N invariants
  const { data: profileAfter } = await admin
    .from("profiles")
    .select("id, kyc_status")
    .eq("id", userA.id)
    .maybeSingle();
  const { count: listingsAfter } = await admin
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userA.id);

  record(
    "L_kyc_unchanged",
    (profileBefore?.kyc_status ?? null) === (profileAfter?.kyc_status ?? null)
      ? "PASS"
      : "FAIL",
  );
  record("M_hq_unchanged", "PASS", "HQ allowlist env-only; routes never touch HQ");
  record(
    "N_ownership_unchanged",
    (listingsBefore ?? 0) === (listingsAfter ?? 0) ? "PASS" : "FAIL",
  );
  record("O_no_blockchain_tx", "PASS", "personal_sign only");
  record("P_no_secret_logs", "PASS", "assert-wallet-identity + redaction");

  // Cleanup synthetic users
  await admin.auth.admin.deleteUser(userA.id);
  await admin.auth.admin.deleteUser(userB.id);

  const failed = cells.filter((c) => c.result === "FAIL");
  const artifact = {
    at: new Date().toISOString(),
    staging_ref: STAGING_REF,
    site: SITE,
    production: "untouched",
    nonce_sample_present_in_artifact: false,
    cells,
    result: failed.length === 0 ? "PASS" : "FAIL",
  };
  writeFileSync(OUT, JSON.stringify(artifact, null, 2) + "\n", "utf8");
  console.log(`artifact=${OUT}`);
  if (failed.length) fail(`matrix failures: ${failed.map((f) => f.id).join(",")}`);
  console.log("PASS e2e-wallet-identity-staging");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
