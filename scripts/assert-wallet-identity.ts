/**
 * Phase 1C — wallet bind / SIWE assertions (CI-safe, no cloud credentials).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import {
  WALLET_BADGE,
  WALLET_CHAIN_FAMILY,
  WALLET_IDENTITY_INVARIANTS,
  WALLET_IDENTITY_POLICY_VERSION,
  WALLET_SIWE_STATEMENT,
  decideWalletBind,
  decideWalletUnlink,
} from "../lib/walletIdentity/policy";
import {
  abbreviateEvmAddress,
  isSameEvmAddress,
  normalizeEvmAddress,
} from "../lib/walletIdentity/address";
import {
  buildSiweMessage,
  createWalletNonce,
  verifySiweBindMessage,
} from "../lib/walletIdentity/siwe";
import { WALLET_IDENTITY_EVENTS } from "../lib/walletIdentity/analytics";
import {
  classifyRdns,
  looksLikeLegacyMetaMask,
  selectFromDiscovered,
  type Eip1193Provider,
} from "../lib/walletIdentity/providerDiscovery";
import { WALLET_PROVIDER_DIAG_EVENTS } from "../lib/walletIdentity/providerDiag";
import {
  WALLET_PROVIDER_UI_TIMEOUT_MS,
  classifyProviderError,
  createWalletAttemptGuard,
  flowPhaseStatusKey,
  isWalletFlowBusy,
  providerErrorMessageKey,
  withProviderUiTimeout,
} from "../lib/walletIdentity/providerUx";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

async function main() {
  const uidA = "11111111-1111-4111-8111-111111111111";
  const uidB = "22222222-2222-4222-8222-222222222222";

  // --- A. Migration + rollback ---
  const migDir = resolve("supabase/migrations");
  const migFiles = readdirSync(migDir).filter((f) => f.endsWith(".sql"));
  const walletMig = migFiles.find((f) => f.includes("wallet_identity_bind"));
  assert(walletMig, "migration wallet_identity_bind present");
  const migSql = readFileSync(resolve(migDir, walletMig!), "utf8");
  assert(migSql.includes("wallet_addresses"), "wallet_addresses table");
  assert(migSql.includes("wallet_nonces"), "wallet_nonces table");
  assert(
    migSql.includes("wallet_addresses_chain_family_address_uidx"),
    "unique address index",
  );
  assert(migSql.includes("ENABLE ROW LEVEL SECURITY"), "RLS enabled");
  assert(migSql.includes("wallet_addresses_select_own"), "select-own policy");
  assert(!/FOR INSERT/i.test(migSql), "no client insert policy");
  assert(!/FOR UPDATE/i.test(migSql), "no client update policy");
  assert(!/FOR DELETE/i.test(migSql), "no client delete policy");
  assert(!/kyc_status/i.test(migSql), "migration must not touch KYC");
  assert(!migSql.toLowerCase().includes("hq_admin"), "migration must not touch HQ");
  assert(
    existsSync(
      resolve("docs/internal/sql/h4b-proposed/wallet-identity-bind.ROLLBACK.sql"),
    ),
    "rollback artifact",
  );

  // --- B. Policy invariants ---
  assert(WALLET_IDENTITY_POLICY_VERSION.includes("phase1c"), "policy version");
  assert(WALLET_IDENTITY_INVARIANTS.walletIsNotLogin, "not login");
  assert(WALLET_IDENTITY_INVARIANTS.walletIsNotKyc, "not KYC");
  assert(WALLET_IDENTITY_INVARIANTS.walletIsNotProofOfFunds, "not POF");
  assert(WALLET_IDENTITY_INVARIANTS.walletNeverRemapsOwnership, "no ownership remap");
  assert(WALLET_CHAIN_FAMILY === "evm", "evm family");
  assert(WALLET_BADGE.en === "Wallet connected", "EN badge");
  assert(WALLET_BADGE.ro === "Wallet conectat", "RO badge");

  assert(
    decideWalletBind({ sessionUserId: null, existingOwnerUserId: null }).ok === false,
    "unauthenticated bind DENY",
  );
  assert(
    decideWalletBind({
      sessionUserId: uidA,
      existingOwnerUserId: uidB,
    }).ok === false,
    "duplicate wallet elsewhere DENY",
  );
  assert(
    decideWalletBind({
      sessionUserId: uidA,
      existingOwnerUserId: uidA,
    }).ok === true,
    "same-user rebind ok",
  );
  assert(
    decideWalletUnlink({
      sessionUserId: uidA,
      walletOwnerUserId: uidB,
    }).ok === false,
    "unlink other user DENY",
  );
  assert(
    decideWalletUnlink({
      sessionUserId: uidA,
      walletOwnerUserId: uidA,
    }).ok === true,
    "unlink own ok",
  );

  // --- C. Address normalization / collision ---
  const mixed = "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e";
  const lower = mixed.toLowerCase();
  const norm = normalizeEvmAddress(lower);
  assert(norm === mixed, "checksum normalize");
  assert(isSameEvmAddress(mixed, lower), "case-insensitive same");
  assert(abbreviateEvmAddress(mixed).includes("…"), "abbreviated");
  assert(!abbreviateEvmAddress(mixed).includes(mixed.slice(10, 30)), "no mid full leak");

  // --- D. SIWE verify matrix (local crypto) ---
  const account = privateKeyToAccount(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  );
  const domain = "quickexit-staging.vercel.app";
  const uri = `https://${domain}`;
  const nonce = createWalletNonce();
  const issuedAt = new Date();
  const expirationTime = new Date(issuedAt.getTime() + 10 * 60 * 1000);
  const message = buildSiweMessage({
    address: account.address,
    domain,
    uri,
    chainId: 1,
    nonce,
    issuedAt,
    expirationTime,
  });
  assert(message.includes(WALLET_SIWE_STATEMENT), "statement in message");
  assert(message.includes(`Nonce: ${nonce}`), "nonce in message");

  const signature = await account.signMessage({ message });
  const ok = await verifySiweBindMessage({
    message,
    signature,
    expectedAddress: account.address,
    expectedDomain: domain,
    expectedUri: uri,
    expectedNonce: nonce,
    expectedChainId: 1,
  });
  assert(ok.ok === true, "C. valid signature PASS");

  const badSig = await verifySiweBindMessage({
    message,
    signature: ("0x" + "11".repeat(65)) as `0x${string}`,
    expectedAddress: account.address,
    expectedDomain: domain,
    expectedUri: uri,
    expectedNonce: nonce,
    expectedChainId: 1,
  });
  assert(badSig.ok === false, "F. invalid signature DENY");

  const wrongDomain = await verifySiweBindMessage({
    message,
    signature,
    expectedAddress: account.address,
    expectedDomain: "evil.example",
    expectedUri: uri,
    expectedNonce: nonce,
    expectedChainId: 1,
  });
  assert(wrongDomain.ok === false, "I. wrong domain DENY");

  const wrongUri = await verifySiweBindMessage({
    message,
    signature,
    expectedAddress: account.address,
    expectedDomain: domain,
    expectedUri: "https://evil.example",
    expectedNonce: nonce,
    expectedChainId: 1,
  });
  assert(wrongUri.ok === false, "I. wrong URI DENY");

  const wrongChain = await verifySiweBindMessage({
    message,
    signature,
    expectedAddress: account.address,
    expectedDomain: domain,
    expectedUri: uri,
    expectedNonce: nonce,
    expectedChainId: 999,
  });
  assert(wrongChain.ok === false, "wrong chain DENY");

  const expired = await verifySiweBindMessage({
    message,
    signature,
    expectedAddress: account.address,
    expectedDomain: domain,
    expectedUri: uri,
    expectedNonce: nonce,
    expectedChainId: 1,
    now: new Date(expirationTime.getTime() + 1000),
  });
  assert(expired.ok === false, "G. expired DENY");

  const wrongWallet = privateKeyToAccount(
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  );
  const wrongAddr = await verifySiweBindMessage({
    message,
    signature,
    expectedAddress: wrongWallet.address,
    expectedDomain: domain,
    expectedUri: uri,
    expectedNonce: nonce,
    expectedChainId: 1,
  });
  assert(wrongAddr.ok === false, "wrong wallet address DENY");

  // --- E. Routes + frontend source guards ---
  const nonceRoute = readFileSync(resolve("app/api/wallet/nonce/route.ts"), "utf8");
  const verifyRoute = readFileSync(resolve("app/api/wallet/verify/route.ts"), "utf8");
  const unlinkRoute = readFileSync(resolve("app/api/wallet/unlink/route.ts"), "utf8");
  for (const [name, src] of [
    ["nonce", nonceRoute],
    ["verify", verifyRoute],
    ["unlink", unlinkRoute],
  ] as const) {
    assert(src.includes("requireAuthenticatedUser"), `${name} requires auth`);
    assert(!/kyc_status/i.test(src), `${name} never touches kyc_status`);
    assert(!/buyer_verified/i.test(src), `${name} never touches buyer_verified`);
    assert(!/\.from\(\s*["']listings["']\s*\)/.test(src), `${name} no listings write`);
    assert(!/\.from\(\s*["']demands["']\s*\)/.test(src), `${name} no demands write`);
    assert(!/\.from\(\s*["']media_orders["']\s*\)/.test(src), `${name} no media_orders`);
    assert(!src.includes("console.log(nonce"), `${name} no nonce console`);
    assert(!src.includes("console.log(signature"), `${name} no signature console`);
  }

  assert(verifyRoute.includes("wallet_owned_elsewhere"), "conflict code");
  assert(verifyRoute.includes("nonce_reused"), "reuse guard");
  assert(unlinkRoute.includes("decideWalletUnlink"), "unlink decision");

  const connected = readFileSync(
    resolve("app/components/ConnectedIdentities.tsx"),
    "utf8",
  );
  assert(connected.includes("walletConnect"), "connect CTA");
  assert(connected.includes("walletDisconnect"), "disconnect CTA");
  assert(connected.includes("abbreviateEvmAddress"), "abbreviated address");
  assert(connected.includes("walletProofHint"), "proof hint");
  assert(connected.includes("withProviderUiTimeout"), "provider UI timeout");
  assert(connected.includes("createWalletAttemptGuard"), "attempt guard");
  assert(connected.includes("awaiting_accounts"), "flow phase awaiting_accounts");
  assert(connected.includes("isWalletFlowBusy"), "busy gate blocks double click");
  assert(connected.includes("selectMetaMaskProvider"), "uses MetaMask provider selection");
  assert(!connected.includes("getInjectedEthereum"), "no bare window.ethereum helper");
  assert(
    !/window\.ethereum(?!\?)/.test(connected) ||
      connected.includes("selectMetaMaskProvider"),
    "must not rely solely on window.ethereum",
  );
  assert(!connected.toLowerCase().includes("sign in with wallet"), "no wallet login CTA");

  // --- E2. Provider UX pure logic (Phase 1C.1) ---
  assert(WALLET_PROVIDER_UI_TIMEOUT_MS === 60_000, "60s UI timeout");
  assert(isWalletFlowBusy("awaiting_accounts"), "busy awaiting_accounts");
  assert(isWalletFlowBusy("awaiting_signature"), "busy awaiting_signature");
  assert(!isWalletFlowBusy("idle"), "idle not busy");
  assert(!isWalletFlowBusy("error"), "error not busy — recoverable");
  assert(
    flowPhaseStatusKey("awaiting_accounts") === "walletPhaseAwaitingAccounts",
    "phase key accounts",
  );
  assert(
    providerErrorMessageKey("request_timeout") === "walletRequestTimeout",
    "timeout message key",
  );
  assert(
    providerErrorMessageKey("request_pending") === "walletRequestPending",
    "pending message key",
  );
  assert(classifyProviderError({ code: 4001 }).code === "user_rejected", "4001");
  assert(
    classifyProviderError({ code: -32002, message: "Already pending" }).code ===
      "request_pending",
    "-32002",
  );
  assert(
    classifyProviderError({ message: "MetaMask is locked" }).code === "wallet_locked",
    "locked",
  );

  const guard = createWalletAttemptGuard();
  const a1 = guard.begin();
  const a2 = guard.begin();
  assert(guard.isCurrent(a2), "latest attempt current");
  assert(!guard.isCurrent(a1), "stale attempt ignored");
  guard.invalidate();
  assert(!guard.isCurrent(a2), "invalidate drops in-flight");

  const slow = new Promise<string>((resolve) => {
    setTimeout(() => resolve("late"), 30);
  });
  const timed = await withProviderUiTimeout(slow, 5);
  assert(timed.ok === false && timed.timedOut === true, "UI timeout wins race");
  // Late resolution must not throw; wait past original resolve.
  await new Promise((r) => setTimeout(r, 40));

  const fast = withProviderUiTimeout(Promise.resolve("ok"), 1000);
  const fastResult = await fast;
  assert(fastResult.ok && fastResult.value === "ok", "fast provider resolves");

  // --- E3. Provider discovery selection (Phase 1C.1.1) ---
  const stub = (flags: {
    isMetaMask?: boolean;
    _metamask?: unknown;
  }): Eip1193Provider => ({
    request: async () => [],
    isMetaMask: flags.isMetaMask,
    _metamask: flags._metamask,
  });
  assert(classifyRdns("io.metamask") === "metamask", "rdns metamask");
  assert(classifyRdns("io.metamask.flask") === "metamask_flask", "rdns flask");
  assert(classifyRdns("com.coinbase") === "other", "rdns other");
  assert(looksLikeLegacyMetaMask(stub({ isMetaMask: true })), "legacy mm");
  assert(!looksLikeLegacyMetaMask(stub({})), "non-mm legacy");

  const mm = stub({ isMetaMask: true, _metamask: {} });
  const other = stub({});
  const eipPick = selectFromDiscovered({
    eip6963: [{ rdns: "io.metamask", provider: mm }],
    legacy: [other],
  });
  assert(eipPick.ok === true && eipPick.source === "eip6963", "prefer eip6963 mm");
  assert(eipPick.ok && eipPick.provider === mm, "eip6963 provider handle");

  const hijack = selectFromDiscovered({
    eip6963: [{ rdns: "com.coinbase.wallet", provider: other }],
    legacy: [other],
  });
  assert(
    hijack.ok === false && hijack.reason === "metamask_not_found_among_injected",
    "refuse non-MetaMask injected as silent default",
  );

  const legacyOnly = selectFromDiscovered({
    eip6963: [],
    legacy: [mm],
  });
  assert(
    legacyOnly.ok === true && legacyOnly.kind === "legacy_metamask",
    "legacy MetaMask fallback",
  );

  for (const ev of WALLET_PROVIDER_DIAG_EVENTS) {
    assert(ev.startsWith("wallet_diag_"), `diag event prefix ${ev}`);
    assert(!ev.includes("0x"), `diag no address ${ev}`);
    assert(!ev.includes("nonce"), `diag no nonce ${ev}`);
  }
  const diagSrc = readFileSync(
    resolve("lib/walletIdentity/providerDiag.ts"),
    "utf8",
  );
  assert(
    diagSrc.includes("isStagingWalletDiagnosticsEnabled"),
    "diag gated to staging",
  );
  // Event names may say "signature_requested"; payloads must never carry signature values.
  assert(
    !diagSrc.includes("signature:") && !diagSrc.includes("nonce:"),
    "diag payload has no signature/nonce fields",
  );

  const authModal = readFileSync(resolve("app/components/AuthModal.tsx"), "utf8");
  assert(!authModal.includes("handleWeb3Login"), "AuthModal no web3 login");
  assert(
    !authModal.toLowerCase().includes("connect wallet"),
    "AuthModal no connect wallet login",
  );

  for (const ev of WALLET_IDENTITY_EVENTS) {
    assert(!ev.includes("0x"), `event no address: ${ev}`);
    assert(!ev.includes("nonce"), `event no nonce: ${ev}`);
    assert(!ev.includes("signature"), `event no signature: ${ev}`);
  }

  const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8")) as {
    Dashboard: { connectedIdentities: Record<string, string> };
  };
  const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8")) as {
    Dashboard: { connectedIdentities: Record<string, string> };
  };
  assert(
    en.Dashboard.connectedIdentities.walletBadge === "Wallet connected",
    "EN badge i18n",
  );
  assert(
    ro.Dashboard.connectedIdentities.walletBadge === "Wallet conectat",
    "RO badge i18n",
  );
  assert(
    en.Dashboard.connectedIdentities.walletOwnedElsewhere.includes(
      "another QuickExit account",
    ),
    "EN conflict copy",
  );
  const requiredUxKeys = [
    "walletPhaseAwaitingAccounts",
    "walletPhaseObtainingChallenge",
    "walletPhaseAwaitingSignature",
    "walletPhaseVerifying",
    "walletPhaseDisconnecting",
    "walletFreeHint",
    "walletUserRejected",
    "walletRequestPending",
    "walletLocked",
    "walletMetaMaskNotSelected",
    "walletMultipleMetaMask",
    "walletAccountChanged",
    "walletChainChanged",
    "walletProviderDisconnected",
    "walletRequestTimeout",
    "walletAuthRequired",
    "walletNoAccount",
  ] as const;
  for (const key of requiredUxKeys) {
    assert(
      typeof en.Dashboard.connectedIdentities[key] === "string" &&
        en.Dashboard.connectedIdentities[key].length > 8,
      `EN i18n ${key}`,
    );
    assert(
      typeof ro.Dashboard.connectedIdentities[key] === "string" &&
        ro.Dashboard.connectedIdentities[key].length > 8,
      `RO i18n ${key}`,
    );
  }
  assert(
    en.Dashboard.connectedIdentities.walletFreeHint.toLowerCase().includes("gas"),
    "EN free/gas hint",
  );
  assert(
    ro.Dashboard.connectedIdentities.walletRequestTimeout.includes("60"),
    "RO timeout mentions 60s",
  );
  assert(
    !en.Dashboard.connectedIdentities.walletProofHint.toLowerCase().includes("0x"),
    "no address in proof hint",
  );

  // --- F. Docs ---
  assert(
    existsSync(resolve("docs/internal/auth/wallet-identity-semantics.md")),
    "semantics doc",
  );
  assert(
    existsSync(resolve("docs/internal/auth/wallet-bind-phase1c-2026-10-15.md")),
    "phase1c report doc",
  );

  const libDir = resolve("lib/walletIdentity");
  for (const f of readdirSync(libDir)) {
    if (!f.endsWith(".ts")) continue;
    const src = readFileSync(resolve(libDir, f), "utf8");
    assert(!/\.update\(\s*\{\s*user_id/.test(src), `no ownership remap in ${f}`);
    assert(!/\.from\(\s*["']listings["']\s*\)/.test(src), `no listings in ${f}`);
  }

  console.log("PASS assert-wallet-identity");
  console.log(
    JSON.stringify({
      policy: WALLET_IDENTITY_POLICY_VERSION,
      migration: walletMig,
      threat_matrix_pure: [
        "C_valid_signature",
        "F_invalid_signature",
        "G_expired",
        "I_wrong_domain_uri",
        "duplicate_elsewhere_deny",
        "unlink_other_deny",
        "kyc_untouched",
        "ownership_untouched",
      ],
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
