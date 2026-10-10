import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decideKycStartAuth } from "../lib/kycStartAuth";
import { isSafeKycRedirectUrl } from "../lib/kycRedirectSafety";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

// --- A. decideKycStartAuth (pure identity matrix) ---

const noAuthBodyUuid = decideKycStartAuth({
  cookieUserId: null,
  bearerUserId: null,
  bodyUserId: USER_A,
});
assert(!noAuthBodyUuid.ok, "no auth + body UUID must fail");
assert(
  !noAuthBodyUuid.ok && noAuthBodyUuid.status === 401,
  "no auth + body UUID -> 401"
);
assert(
  !noAuthBodyUuid.ok && noAuthBodyUuid.error === "authentication_required",
  "no auth + body UUID -> authentication_required"
);

const noAuthNoBody = decideKycStartAuth({
  cookieUserId: null,
  bearerUserId: null,
  bodyUserId: "",
});
assert(
  !noAuthNoBody.ok &&
    noAuthNoBody.status === 401 &&
    noAuthNoBody.error === "authentication_required",
  "no auth + no body -> 401 authentication_required"
);

const cookieOk = decideKycStartAuth({
  cookieUserId: USER_A,
  bearerUserId: null,
  bodyUserId: "",
});
assert(cookieOk.ok && cookieOk.userId === USER_A, "cookie auth succeeds");
assert(cookieOk.ok && cookieOk.source === "session_cookie", "cookie source");

const bearerOk = decideKycStartAuth({
  cookieUserId: null,
  bearerUserId: USER_A,
  bodyUserId: "",
});
assert(bearerOk.ok && bearerOk.userId === USER_A, "bearer auth succeeds");
assert(bearerOk.ok && bearerOk.source === "session_bearer", "bearer source");

const sameBody = decideKycStartAuth({
  cookieUserId: USER_A,
  bearerUserId: null,
  bodyUserId: USER_A,
});
assert(
  sameBody.ok && sameBody.userId === USER_A,
  "authenticated + same body userId allowed (compat)"
);

const mismatchBody = decideKycStartAuth({
  cookieUserId: USER_A,
  bearerUserId: null,
  bodyUserId: USER_B,
});
assert(
  !mismatchBody.ok &&
    mismatchBody.status === 403 &&
    mismatchBody.error === "identity_mismatch",
  "authenticated + different body userId -> 403 identity_mismatch"
);

const cookieBearerMismatch = decideKycStartAuth({
  cookieUserId: USER_A,
  bearerUserId: USER_B,
  bodyUserId: "",
});
assert(
  !cookieBearerMismatch.ok &&
    cookieBearerMismatch.status === 403 &&
    cookieBearerMismatch.error === "identity_mismatch",
  "cookie/bearer mismatch -> 403 identity_mismatch"
);

const cookieBearerSame = decideKycStartAuth({
  cookieUserId: USER_A,
  bearerUserId: USER_A,
  bodyUserId: "",
});
assert(
  cookieBearerSame.ok && cookieBearerSame.userId === USER_A,
  "matching cookie+bearer succeeds"
);

const bodyNotAuthoritative = decideKycStartAuth({
  cookieUserId: null,
  bearerUserId: null,
  bodyUserId: USER_A,
});
assert(
  !bodyNotAuthoritative.ok,
  "body UUID alone never authenticates (no body_fallback)"
);

// --- B. Static: /api/kyc/start ---

const kycStart = readFileSync(resolve("app/api/kyc/start/route.ts"), "utf8");
const kycAuth = readFileSync(resolve("lib/kycStartAuth.ts"), "utf8");
const kycClient = readFileSync(resolve("lib/kycClient.ts"), "utf8");
const kycBanner = readFileSync(resolve("app/components/KycBanner.tsx"), "utf8");
const createSession = readFileSync(
  resolve("app/api/create-verification-session/route.ts"),
  "utf8"
);
const stripeKycWebhook = readFileSync(
  resolve("app/api/webhooks/kyc/route.ts"),
  "utf8"
);
const diditWebhook = readFileSync(
  resolve("app/api/webhooks/didit/route.ts"),
  "utf8"
);

assert(kycStart.includes("resolveKycStartUserId"), "kyc/start uses auth resolver");
assert(
  kycStart.includes('vendor_data: userId') || kycStart.includes("vendor_data: userId"),
  "Didit vendor_data uses server-derived userId"
);
assert(
  kycStart.includes("metadata: {\n      userId,") ||
    kycStart.includes("userId,"),
  "Stripe metadata.userId uses server-derived userId"
);
assert(
  kycStart.includes('{ error: authResult.error }'),
  "kyc/start returns safe error code only"
);
assert(!kycStart.includes("auth: authResult.debug"), "kyc/start does not leak auth debug");
assert(!kycAuth.includes("body_fallback"), "body_fallback removed from auth helper");
assert(
  kycAuth.includes('error: "authentication_required"'),
  "auth helper emits authentication_required"
);
assert(
  kycAuth.includes('error: "identity_mismatch"'),
  "auth helper emits identity_mismatch"
);
assert(
  kycAuth.includes("cookie_bearer_mismatch"),
  "auth helper rejects cookie/bearer mismatch"
);
assert(
  !kycAuth.includes('source: "body_fallback"') &&
    !kycAuth.includes("Fallback auth"),
  "no unauthenticated body UUID auth path"
);

// --- C. Client: shared helper, no authoritative userId ---

assert(
  kycClient.includes("buildKycStartRequestInit(): Promise<RequestInit>"),
  "kycClient no longer takes userId"
);
assert(
  kycClient.includes('body: JSON.stringify({})'),
  "kycClient sends empty body (no userId)"
);
assert(
  kycClient.includes("Bearer ${session.access_token}"),
  "kycClient still sends Bearer when available"
);
assert(
  kycClient.includes("export async function startKycVerification"),
  "shared startKycVerification helper exists"
);
assert(
  kycClient.includes('fetch("/api/kyc/start"'),
  "shared helper calls /api/kyc/start"
);
assert(
  kycClient.includes("isSafeKycRedirectUrl"),
  "shared helper validates redirect URL"
);
assert(
  !kycClient.includes("NEXT_PUBLIC_DIDIT_VERIFICATION_URL") &&
    !kycClient.includes("verify.didit.me"),
  "shared helper has no generic Didit URL fallback"
);
assert(
  !kycBanner.includes("userId"),
  "KycBanner no longer accepts or sends userId"
);
assert(
  kycBanner.includes("startKycVerification"),
  "KycBanner uses shared startKycVerification"
);
assert(
  !kycBanner.includes("create-verification-session"),
  "KycBanner does not call legacy create-verification-session"
);
assert(
  !kycBanner.includes("NEXT_PUBLIC_DIDIT_VERIFICATION_URL") &&
    !kycBanner.includes("verify.didit.me"),
  "KycBanner has no direct Didit hosted URL"
);

// --- D. Legacy create-verification-session disabled ---

assert(createSession.includes("410"), "legacy route returns 410");
assert(
  createSession.includes('status: 410') || createSession.includes("{ status: 410 }"),
  "legacy route status 410"
);
assert(
  !createSession.includes("verificationSessions.create") &&
    !createSession.includes("identity.verificationSessions"),
  "legacy route does not create Stripe Identity session"
);
assert(
  !createSession.includes("const { userId } = body") &&
    !createSession.includes("body.userId"),
  "legacy route does not trust body.userId"
);
assert(!createSession.includes("new Stripe"), "legacy route does not init Stripe");

// --- E. Webhook binding (unchanged contract) ---

assert(
  stripeKycWebhook.includes("constructEvent"),
  "Stripe KYC webhook verifies signature"
);
assert(
  stripeKycWebhook.includes("getVerificationUserId") ||
    stripeKycWebhook.includes("metadata?.userId"),
  "Stripe KYC webhook maps session to userId"
);
assert(
  stripeKycWebhook.includes("update({ kyc_status })"),
  "Stripe KYC webhook updates profiles.kyc_status"
);
assert(
  diditWebhook.includes("verifyDiditSignatureV2"),
  "Didit webhook verifies signature"
);
assert(
  diditWebhook.includes("extractDiditUserId"),
  "Didit webhook maps vendor_data to userId"
);
assert(
  diditWebhook.includes("update({ kyc_status })"),
  "Didit webhook updates profiles.kyc_status"
);

// Provider calls only after auth in kyc/start (call sites, not function defs)
const authFailReturn = kycStart.indexOf("if (!authResult.ok)");
const postHandler = kycStart.indexOf("export async function POST");
assert(authFailReturn >= 0 && authFailReturn > postHandler, "kyc/start has auth failure branch in POST");
const diditCall = kycStart.indexOf("return await startDiditKyc(userId)");
const stripeCall = kycStart.indexOf("return await startStripeKyc(userId)");
assert(diditCall > authFailReturn, "Didit called only after auth gate");
assert(stripeCall > authFailReturn, "Stripe Identity called only after auth gate");
assert(
  kycStart.indexOf("async function startDiditKyc") < authFailReturn,
  "Didit helper defined before gate; invocation after"
);

// --- F. H2: unified initiation + redirect safety + Didit error hardening ---

const dashboard = readFileSync(
  resolve("app/[locale]/dashboard/page.tsx"),
  "utf8"
);
const footer = readFileSync(resolve("app/components/Footer.tsx"), "utf8");

assert(
  dashboard.includes("startKycVerification"),
  "Dashboard KYC uses shared startKycVerification"
);
assert(
  !dashboard.includes("NEXT_PUBLIC_DIDIT_VERIFICATION_URL"),
  "Dashboard does not use NEXT_PUBLIC_DIDIT_VERIFICATION_URL"
);
assert(
  !dashboard.includes("DIDIT_HOSTED_VERIFICATION_URL"),
  "Dashboard does not define DIDIT_HOSTED_VERIFICATION_URL"
);
assert(
  !dashboard.includes("verify.didit.me"),
  "Dashboard has no hardcoded Didit hosted URL"
);
assert(
  !dashboard.includes("window.location.href = DIDIT") &&
    !/window\.location\.href\s*=\s*["']https:\/\/verify\.didit\.me/.test(
      dashboard
    ),
  "Dashboard does not redirect directly to Didit"
);
assert(
  dashboard.includes("Inițiază Verificarea"),
  "Dashboard still exposes KYC start CTA"
);

assert(
  !kycStart.includes("diditRawResponse"),
  "kyc/start does not return diditRawResponse to clients"
);
assert(
  kycStart.includes('error: "kyc_provider_error"'),
  "Didit failures return safe kyc_provider_error"
);

assert(isSafeKycRedirectUrl("https://verify.didit.me/session/abc"), "https ok");
assert(isSafeKycRedirectUrl("https://verify.stripe.com/v/x"), "stripe https ok");
assert(!isSafeKycRedirectUrl("http://verify.didit.me/session/abc"), "http rejected");
assert(!isSafeKycRedirectUrl("javascript:alert(1)"), "javascript rejected");
assert(!isSafeKycRedirectUrl("not-a-url"), "garbage rejected");
assert(!isSafeKycRedirectUrl(""), "empty rejected");

assert(
  footer.includes("https://www.didit.me/"),
  "Footer marketing Didit link retained (non-account KYC)"
);
assert(
  !footer.includes("verify.didit.me"),
  "Footer does not deep-link hosted verification"
);

console.log("OK kyc-auth");
