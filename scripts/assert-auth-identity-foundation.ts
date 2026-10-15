/**
 * Phase 1A — static + pure-logic assertions for identity foundation.
 * CI-safe: no cloud credentials, no Production.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  AUTH_IDENTITY_POLICY_VERSION,
  IDENTITY_INVARIANTS,
  classifyProvider,
  decideColdProviderLogin,
  decideExplicitLink,
  decideUnlink,
} from "../lib/authIdentity/policy";
import {
  canUnlinkIdentity,
  countRecoveryIdentities,
} from "../lib/authIdentity/recovery";
import {
  APPLE_IDENTITY_UI_ENABLED,
  buildConnectedIdentityRows,
  classifyAuthCollision,
} from "../lib/authIdentity/providers";
import { AUTH_IDENTITY_EVENTS } from "../lib/authIdentity/analytics";
import { isHqAdminEmail, parseHqAdminEmails } from "../lib/hqAdminAllowlist";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

// --- A. Migration present ---
const migDir = resolve("supabase/migrations");
const migFiles = readdirSync(migDir).filter((f) => f.endsWith(".sql"));
const provisionMig = migFiles.find((f) => f.includes("auth_profile_auto_provision"));
assert(provisionMig, "migration auth_profile_auto_provision present");
const migSql = readFileSync(resolve(migDir, provisionMig!), "utf8");
assert(migSql.includes("handle_new_user_profile"), "provision function name");
assert(migSql.includes("ON CONFLICT (id) DO NOTHING"), "idempotent insert");
assert(migSql.includes("SET search_path = public"), "fixed search_path");
assert(migSql.includes("SECURITY DEFINER"), "security definer for auth.users trigger");
assert(!/kyc_status\s*=\s*'verified'/i.test(migSql), "migration must not set KYC verified");
assert(!migSql.toLowerCase().includes("hq_admin"), "migration must not touch HQ");
assert(
  existsSync(resolve("docs/internal/sql/h4b-proposed/auth-profile-auto-provision.ROLLBACK.sql")),
  "rollback artifact exists",
);

// --- B. Policy invariants ---
assert(
  AUTH_IDENTITY_POLICY_VERSION.includes("phase1c") ||
    AUTH_IDENTITY_POLICY_VERSION.includes("phase1b") ||
    AUTH_IDENTITY_POLICY_VERSION.includes("phase1a"),
  "policy version",
);
assert(decideColdProviderLogin("apple").ok === true, "apple cold login ok");
assert(IDENTITY_INVARIANTS.noOwnershipRemapByEmail, "no email ownership remap");
assert(IDENTITY_INVARIANTS.kycIndependentOfProviderLink, "KYC independent");
assert(IDENTITY_INVARIANTS.hqIndependentOfProviderLink, "HQ independent");
assert(IDENTITY_INVARIANTS.providerLinkNeverSetsKycVerified, "link never verifies KYC");

assert(classifyProvider("google") === "google", "google classify");
assert(classifyProvider("apple") === "apple", "apple classify");
assert(classifyProvider("bybit") === "exchange", "bybit classify");
assert(classifyProvider("wallet") === "wallet", "wallet classify");

assert(
  decideColdProviderLogin("wallet").ok === false,
  "A/wallet cold login denied",
);
assert(
  decideColdProviderLogin("exchange").ok === false,
  "exchange cold login denied",
);
assert(decideColdProviderLogin("google").ok === true, "google cold login ok");

const uid = "11111111-1111-4111-8111-111111111111";
assert(
  decideExplicitLink({
    sessionUserId: null,
    targetUserId: uid,
    providerAlreadyLinkedToOtherUser: false,
  }).ok === false,
  "G. unauthenticated link DENY",
);
assert(
  decideExplicitLink({
    sessionUserId: uid,
    targetUserId: uid,
    providerAlreadyLinkedToOtherUser: true,
  }).ok === false,
  "F. provider linked elsewhere DENY",
);
assert(
  decideExplicitLink({
    sessionUserId: uid,
    targetUserId: uid,
    providerAlreadyLinkedToOtherUser: false,
  }).ok === true,
  "E. authenticated explicit link ok",
);

assert(
  decideUnlink({
    sessionUserId: uid,
    recoveryIdentityCount: 1,
    unlinkingRecovery: true,
  }).ok === false,
  "H. unlink last recovery DENY",
);
assert(
  canUnlinkIdentity([{ provider: "google" }], "google").allowed === false,
  "H. canUnlink last recovery DENY",
);
assert(
  canUnlinkIdentity(
    [{ provider: "google" }, { provider: "email" }],
    "google",
  ).allowed === true,
  "unlink ok when another recovery remains",
);
assert(countRecoveryIdentities([{ provider: "wallet" }]) === 0, "wallet not recovery");

// --- C. Collision classification ---
assert(
  classifyAuthCollision("Identity is already linked") === "identity_owned_elsewhere",
  "collision classify linked",
);
assert(classifyAuthCollision("network timeout") === "generic", "collision generic");

// --- D. Connected identities surface (Apple UI gated) ---
assert(APPLE_IDENTITY_UI_ENABLED === false, "Apple identity UI gated off");
const rows = buildConnectedIdentityRows(
  [{ provider: "google" }],
  true,
);
assert(rows.length === 2, "email+google rows only while Apple gated");
assert(
  rows.every((r) => r.labelKey === "email" || r.labelKey === "google"),
  "only email/google rows",
);
assert(
  !rows.some((r) => r.labelKey === "apple"),
  "apple row hidden while gated",
);
assert(
  canUnlinkIdentity([{ provider: "apple" }], "apple").allowed === false,
  "H. apple-only last recovery DENY unlink",
);

// --- E. KYC / HQ invariants in source ---
const ensureSrc = readFileSync(resolve("lib/authIdentity/ensureProfile.ts"), "utf8");
assert(!ensureSrc.includes("kyc_status"), "I. ensureProfile never touches kyc_status");
assert(!ensureSrc.includes("buyer_verified"), "I. ensureProfile never touches buyer_verified");

const policySrc = readFileSync(resolve("lib/authIdentity/policy.ts"), "utf8");
assert(policySrc.includes("noOwnershipRemapByEmail"), "K ownership invariant documented");

// HQ unchanged by linking — allowlist is email env only
assert(parseHqAdminEmails("a@example.com").includes("a@example.com"), "HQ parse");
assert(!isHqAdminEmail("attacker@example.com"), "J. random email not HQ");
assert(
  !readFileSync(resolve("lib/hqAdminAllowlist.ts"), "utf8").includes("linkIdentity"),
  "J. HQ allowlist independent of identity linking",
);

// --- F. AuthModal cleanup ---
const authModal = readFileSync(resolve("app/components/AuthModal.tsx"), "utf8");
assert(!authModal.includes("handleWeb3Login"), "P. no Web3 handler");
assert(!authModal.includes("web3Maintenance"), "P. no wallet maintenance CTA");
assert(
  authModal.includes('provider: "google"') || authModal.includes("continueWithGoogle"),
  "Google OAuth remains",
);
assert(authModal.includes("signInWithOtp"), "email OTP remains");
assert(authModal.includes("trackAuthIdentityEvent"), "analytics wired");
assert(!authModal.includes("handleAppleLogin"), "Apple CTA handler absent");
assert(!authModal.includes("continueWithApple"), "Apple CTA not wired in AuthModal");
assert(!/provider:\s*"apple"/.test(authModal), "Apple OAuth provider not started");
assert(!authModal.toLowerCase().includes("bybit"), "no Bybit");
assert(!authModal.toLowerCase().includes("okx"), "no OKX");
assert(!authModal.toLowerCase().includes("binance"), "no Binance");
assert(!authModal.includes("handleWeb3"), "no wallet handler");

// --- G. Callback ---
const callback = readFileSync(resolve("app/[locale]/auth/callback/route.ts"), "utf8");
assert(callback.includes("ensureProfileRow"), "callback ensures profile");
assert(callback.includes("identity_conflict"), "collision redirect");
assert(callback.includes("exchangeCodeForSession"), "PKCE exchange");
assert(
  callback.includes("location.hash") || callback.includes("implicit_hash_bounce"),
  "implicit magic-link hash bounce preserved (no token drop on redirect)",
);

// --- H. Analytics event names (non-PII) ---
for (const ev of AUTH_IDENTITY_EVENTS) {
  assert(!ev.includes("email"), `event name has no email: ${ev}`);
  assert(!ev.includes("token"), `event name has no token: ${ev}`);
}

// --- I. Docs ---
assert(
  existsSync(resolve("docs/internal/auth/identity-foundation-phase1a-2026-10-15.md")),
  "foundation doc",
);
assert(
  existsSync(resolve("docs/internal/auth/identity-linking-policy.md")),
  "linking policy doc",
);
assert(
  existsSync(resolve("docs/internal/auth/auth-recovery-policy.md")),
  "recovery policy doc",
);

// --- J. Ownership remap forbidden in app auth identity libs ---
const identityDir = resolve("lib/authIdentity");
for (const f of readdirSync(identityDir)) {
  if (!f.endsWith(".ts")) continue;
  const src = readFileSync(resolve(identityDir, f), "utf8");
  assert(
    !/\.update\(\s*\{\s*user_id/.test(src),
    `no ownership user_id update in ${f}`,
  );
  assert(
    !/\.from\(\s*["']listings["']\s*\)/.test(src) &&
      !/\.from\(\s*["']demands["']\s*\)/.test(src) &&
      !/\.from\(\s*["']media_orders["']\s*\)/.test(src),
    `no business-table ownership writes in ${f}`,
  );
}

console.log("PASS assert-auth-identity-foundation");
console.log(
  JSON.stringify({
    policy: AUTH_IDENTITY_POLICY_VERSION,
    migration: provisionMig,
    threat_matrix_pure: [
      "A_new_email_profile_via_trigger_documented",
      "B_new_google_profile_via_trigger_documented",
      "C_retry_idempotent_on_conflict",
      "E_explicit_link_session_ok",
      "F_elsewhere_deny",
      "G_unauth_deny",
      "H_last_recovery_deny",
      "I_kyc_untouched_in_provision",
      "J_hq_untouched",
    ],
  }),
);
