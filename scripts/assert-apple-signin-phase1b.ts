/**
 * Apple Sign-In — UI gate assertions (CI-safe).
 * Apple remains in recovery/policy abstractions but must NOT appear as a user-facing CTA
 * until Apple Developer + Staging Supabase provider secrets are configured.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  AUTH_IDENTITY_POLICY_VERSION,
  decideColdProviderLogin,
  classifyProvider,
} from "../lib/authIdentity/policy";
import { canUnlinkIdentity, RECOVERY_HIERARCHY } from "../lib/authIdentity/recovery";
import {
  APPLE_IDENTITY_UI_ENABLED,
  buildConnectedIdentityRows,
} from "../lib/authIdentity/providers";
import { isHqAdminEmail } from "../lib/hqAdminAllowlist";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

assert(
  AUTH_IDENTITY_POLICY_VERSION.includes("phase1c") ||
    AUTH_IDENTITY_POLICY_VERSION.includes("phase1b"),
  "policy version",
);
assert(classifyProvider("apple") === "apple", "apple classify retained");
assert(decideColdProviderLogin("apple").ok === true, "apple cold login policy retained");
assert(RECOVERY_HIERARCHY.includes("apple"), "apple in recovery hierarchy");
assert(APPLE_IDENTITY_UI_ENABLED === false, "Apple identity UI gated OFF");

const authModal = readFileSync(resolve("app/components/AuthModal.tsx"), "utf8");
assert(!authModal.includes("handleAppleLogin"), "AuthModal has no Apple handler");
assert(!authModal.includes("continueWithApple"), "AuthModal has no Apple CTA key");
assert(!/provider:\s*"apple"/.test(authModal), "AuthModal does not start Apple OAuth");
assert(!/bybit|okx|binance|handleWeb3|web3Login/i.test(authModal), "no wallet/exchange login");

const connected = readFileSync(resolve("app/components/ConnectedIdentities.tsx"), "utf8");
assert(!connected.includes("linkIdentity"), "no linkIdentity UI");
assert(!connected.includes("unlinkIdentity"), "no unlinkIdentity UI");
assert(connected.includes("walletConnect"), "wallet bind CTA present");

const rows = buildConnectedIdentityRows([{ provider: "apple" }], false);
assert(!rows.some((r) => r.labelKey === "apple"), "Apple row hidden while gated");
assert(rows.some((r) => r.labelKey === "email"), "email row present");
assert(rows.some((r) => r.labelKey === "google"), "google row present");
assert(
  canUnlinkIdentity([{ provider: "apple" }], "apple").allowed === false,
  "Apple-only account cannot unlink last recovery",
);

const en = JSON.parse(readFileSync(resolve("messages/en.json"), "utf8"));
const ro = JSON.parse(readFileSync(resolve("messages/ro.json"), "utf8"));
assert(!String(en.Auth.welcomeSubtitle).includes("Apple"), "EN welcome omits Apple");
assert(!String(ro.Auth.welcomeSubtitle).includes("Apple"), "RO welcome omits Apple");
assert(!String(en.Auth.identityConflictBody).includes("Apple"), "EN conflict omits Apple");
assert(!String(ro.Auth.identityConflictBody).includes("Apple"), "RO conflict omits Apple");
assert(!String(en.Auth.authErrorBody).includes("Apple"), "EN authError omits Apple");
assert(!String(ro.Auth.authErrorBody).includes("Apple"), "RO authError omits Apple");

assert(!isHqAdminEmail("someone@privaterelay.appleid.com"), "relay email not HQ");

const noSecrets = readFileSync(resolve("scripts/assert-no-secrets-tracked.ts"), "utf8");
assert(
  noSecrets.includes("private_key_block"),
  "no-secrets retains private_key_block rule",
);

/** Built dynamically so this test file does not trip assert:no-secrets. */
const PEM_BEGIN = ["BEG", "IN"].join("");
const PEM_PRIVATE = ["PRIV", "ATE"].join("");
const PEM_KEY = ["KE", "Y"].join("");
const PRIVATE_KEY_MARKER = `${PEM_BEGIN} ${PEM_PRIVATE} ${PEM_KEY}`;
const PRIVATE_KEY_DOC_RE = new RegExp(PRIVATE_KEY_MARKER, "i");
/** Same shape as assert-no-secrets `private_key_block` (scanner unchanged). */
const PRIVATE_KEY_SCANNER_RE = new RegExp(
  `${PEM_BEGIN} (RSA |OPENSSH )?${PEM_PRIVATE} ${PEM_KEY}`,
);

if (existsSync(resolve("docs/internal/auth/apple-signin-phase1b-2026-10-15.md"))) {
  const docs = readFileSync(
    resolve("docs/internal/auth/apple-signin-phase1b-2026-10-15.md"),
    "utf8",
  );
  assert(!PRIVATE_KEY_DOC_RE.test(docs), "doc has no private key");
  assert(!/enable.*Production Apple|Production Apple enabled/i.test(docs), "doc does not enable Production");
}

// Regression: scanner rule still matches a synthetic PEM fixture (never committed).
const tmpDir = mkdtempSync(join(tmpdir(), "qe-nosecrets-regr-"));
const fixturePath = join(tmpDir, "synthetic-private-key.pem");
try {
  writeFileSync(
    fixturePath,
    `-----${PRIVATE_KEY_MARKER}-----\nci-only-fixture-not-a-credential\n-----END ${PEM_PRIVATE} ${PEM_KEY}-----\n`,
    "utf8",
  );
  const fixture = readFileSync(fixturePath, "utf8");
  assert(
    PRIVATE_KEY_SCANNER_RE.test(fixture),
    "no-secrets private_key_block still matches synthetic PEM fixture",
  );
  assert(
    !PRIVATE_KEY_SCANNER_RE.test(readFileSync(resolve("scripts/assert-apple-signin-phase1b.ts"), "utf8")),
    "this assert file no longer embeds a complete private-key literal",
  );
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}

console.log("PASS assert-apple-signin-phase1b (UI gated)");
console.log(
  JSON.stringify({
    policy: AUTH_IDENTITY_POLICY_VERSION,
    apple_ui_enabled: APPLE_IDENTITY_UI_ENABLED,
    apple_oauth_cta: false,
    production_apple: false,
    no_secrets_private_key_false_positive_fixed: true,
  }),
);
