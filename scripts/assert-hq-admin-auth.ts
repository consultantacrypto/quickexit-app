import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  parseHqAdminEmails,
  isHqAdminEmail,
  getHqAdminEmails,
  getEffectiveHqAdminEmails,
  getHqStagingAdditionalEmails,
  isHqStagingAdditionalAllowlistEligible,
  extractBearerToken,
} from "../lib/hqAdminAuth";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const ADMIN = "admin@quickexit.ro";
const OTHER = "user@example.com";
const STAGING_EXTRA = "staging-extra@example.test";
const STAGING_URL = "https://nlnzlswjjplofpkhoxtr.supabase.co";
const PRODUCTION_URL = "https://geywuzwbzecknokvnins.supabase.co";

const savedEnv: Record<string, string | undefined> = {
  HQ_ADMIN_EMAILS: process.env.HQ_ADMIN_EMAILS,
  HQ_STAGING_ADDITIONAL_EMAILS: process.env.HQ_STAGING_ADDITIONAL_EMAILS,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  QE_STAGING_SITE: process.env.QE_STAGING_SITE,
  NODE_ENV: process.env.NODE_ENV,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearAdditiveEnv() {
  delete process.env.HQ_ADMIN_EMAILS;
  delete process.env.HQ_STAGING_ADDITIONAL_EMAILS;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.VERCEL_ENV;
  delete process.env.QE_STAGING_SITE;
}

// --- A–G: allowlist parsing / membership (pure) ---

assert(parseHqAdminEmails(undefined).length === 0, "env missing -> empty allowlist");
assert(parseHqAdminEmails(null).length === 0, "env null -> empty");
assert(parseHqAdminEmails("").length === 0, "env empty -> empty");
assert(parseHqAdminEmails("   ").length === 0, "env whitespace -> empty");
assert(parseHqAdminEmails("not-an-email,also-bad").length === 0, "invalid env -> empty");
assert(
  parseHqAdminEmails(`  ${ADMIN.toUpperCase()} , ${OTHER} `).join(",") ===
    `${ADMIN},${OTHER}`,
  "uppercase/whitespace normalization"
);
assert(
  parseHqAdminEmails(`${ADMIN},${ADMIN}`).join(",") === ADMIN,
  "dedupe emails"
);

try {
  clearAdditiveEnv();
  assert(getHqAdminEmails().length === 0, "live env missing -> empty");
  assert(!isHqAdminEmail(ADMIN), "env missing -> deny even listed-looking email");

  process.env.HQ_ADMIN_EMAILS = "";
  assert(getHqAdminEmails().length === 0, "live env empty -> empty");
  assert(!isHqAdminEmail(ADMIN), "env empty -> deny");

  process.env.HQ_ADMIN_EMAILS = ",,,";
  assert(getHqAdminEmails().length === 0, "live env invalid -> empty");
  assert(!isHqAdminEmail(ADMIN), "env invalid -> deny");

  process.env.HQ_ADMIN_EMAILS = ` ${ADMIN.toUpperCase()} `;
  assert(getHqAdminEmails().join(",") === ADMIN, "valid env normalized");
  assert(isHqAdminEmail(ADMIN), "authenticated listed admin -> allow");
  assert(isHqAdminEmail(` ${ADMIN.toUpperCase()} `), "membership normalizes input");
  assert(!isHqAdminEmail(OTHER), "authenticated non-admin -> deny");
  assert(!isHqAdminEmail(""), "empty email -> deny");
  assert(!isHqAdminEmail(null), "null email -> deny");

  // --- Staging additive allowlist ---
  clearAdditiveEnv();
  process.env.HQ_ADMIN_EMAILS = ADMIN;
  process.env.HQ_STAGING_ADDITIONAL_EMAILS = STAGING_EXTRA;
  process.env.NEXT_PUBLIC_SUPABASE_URL = STAGING_URL;
  process.env.VERCEL_ENV = "preview";

  assert(
    isHqStagingAdditionalAllowlistEligible(),
    "staging host + preview vercel -> additional eligible",
  );
  assert(
    getHqStagingAdditionalEmails().join(",") === STAGING_EXTRA,
    "additional emails parsed when eligible",
  );
  assert(
    getEffectiveHqAdminEmails().join(",") === `${ADMIN},${STAGING_EXTRA}`,
    "effective = primary ∪ additional",
  );
  assert(isHqAdminEmail(ADMIN), "primary admin still allowed with additive");
  assert(isHqAdminEmail(STAGING_EXTRA), "staging additional admin allowed");
  assert(!isHqAdminEmail(OTHER), "unknown user denied with additive");
  assert(
    getHqAdminEmails().join(",") === ADMIN,
    "primary getHqAdminEmails unchanged by additive",
  );

  // Production URL denies additional even on Preview
  process.env.NEXT_PUBLIC_SUPABASE_URL = PRODUCTION_URL;
  process.env.VERCEL_ENV = "preview";
  process.env.QE_STAGING_SITE = "1";
  assert(
    !isHqStagingAdditionalAllowlistEligible(),
    "production URL not eligible for additional",
  );
  assert(
    getHqStagingAdditionalEmails().length === 0,
    "additional empty on production URL",
  );
  assert(isHqAdminEmail(ADMIN), "primary still works on production URL");
  assert(
    !isHqAdminEmail(STAGING_EXTRA),
    "additional denied on production URL despite preview label + QE_STAGING_SITE",
  );

  // Production Vercel context denies additional even with Staging URL
  process.env.NEXT_PUBLIC_SUPABASE_URL = STAGING_URL;
  process.env.VERCEL_ENV = "production";
  delete process.env.QE_STAGING_SITE;
  assert(
    !isHqStagingAdditionalAllowlistEligible(),
    "production vercel env denies additional",
  );
  assert(
    !isHqAdminEmail(STAGING_EXTRA),
    "additional denied on production deployment context with staging URL",
  );
  assert(isHqAdminEmail(ADMIN), "primary still works under production vercel env");

  // Missing / invalid environment denies additional
  clearAdditiveEnv();
  process.env.HQ_ADMIN_EMAILS = ADMIN;
  process.env.HQ_STAGING_ADDITIONAL_EMAILS = STAGING_EXTRA;
  process.env.NEXT_PUBLIC_SUPABASE_URL = STAGING_URL;
  // no VERCEL_ENV
  assert(
    !isHqStagingAdditionalAllowlistEligible(),
    "missing VERCEL_ENV fails closed for additional",
  );
  assert(!isHqAdminEmail(STAGING_EXTRA), "additional denied without vercel context");

  process.env.VERCEL_ENV = "preview";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert(
    !isHqStagingAdditionalAllowlistEligible(),
    "missing supabase URL fails closed for additional",
  );
  assert(!isHqAdminEmail(STAGING_EXTRA), "additional denied without supabase URL");

  process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
  assert(
    !isHqStagingAdditionalAllowlistEligible(),
    "invalid supabase URL fails closed for additional",
  );

  process.env.NEXT_PUBLIC_SUPABASE_URL = STAGING_URL;
  process.env.HQ_STAGING_ADDITIONAL_EMAILS = "not-an-email,,,";
  assert(
    getHqStagingAdditionalEmails().length === 0,
    "invalid additional emails parse to empty",
  );
  assert(!isHqAdminEmail(STAGING_EXTRA), "invalid additional does not invent membership");

  // Preview labels alone with Production URL do not grant access
  clearAdditiveEnv();
  process.env.HQ_STAGING_ADDITIONAL_EMAILS = STAGING_EXTRA;
  process.env.NEXT_PUBLIC_SUPABASE_URL = PRODUCTION_URL;
  process.env.VERCEL_ENV = "preview";
  process.env.QE_STAGING_SITE = "1";
  process.env.NODE_ENV = "production";
  assert(
    !isHqAdminEmail(STAGING_EXTRA),
    "preview + QE_STAGING_SITE + production URL deny additional",
  );

  // Additive-only (empty primary) on verified Staging preview
  clearAdditiveEnv();
  process.env.HQ_STAGING_ADDITIONAL_EMAILS = STAGING_EXTRA;
  process.env.NEXT_PUBLIC_SUPABASE_URL = STAGING_URL;
  process.env.VERCEL_ENV = "preview";
  assert(getHqAdminEmails().length === 0, "primary empty preserved");
  assert(
    isHqAdminEmail(STAGING_EXTRA),
    "additive-only membership works on verified staging preview",
  );
  assert(!isHqAdminEmail(OTHER), "additive-only still denies strangers");
} finally {
  restoreEnv();
}

assert(extractBearerToken(new Request("http://localhost/x")) === "", "unauthenticated bearer empty");

// --- Static architecture ---

const hqAuth = readFileSync(resolve("lib/hqAdminAuth.ts"), "utf8");
const allowlist = readFileSync(resolve("lib/hqAdminAllowlist.ts"), "utf8");
const pageAuth = readFileSync(resolve("lib/hqAdminPageAuth.ts"), "utf8");
const mediaAuth = readFileSync(resolve("lib/mediaHqServerAuth.ts"), "utf8");
const layout = readFileSync(resolve("app/[locale]/hq-admin/layout.tsx"), "utf8");
const adminActions = readFileSync(resolve("app/actions/adminActions.ts"), "utf8");
const copilot = readFileSync(resolve("app/api/hq/copilot/route.ts"), "utf8");
const financing = readFileSync(resolve("lib/financingLead.ts"), "utf8");
const hqPage = readFileSync(resolve("app/[locale]/hq-admin/page.tsx"), "utf8");
const leadClient = readFileSync(
  resolve("app/[locale]/hq-admin/lead-agent/LeadAgentClient.tsx"),
  "utf8"
);
const bmk = readFileSync(resolve("app/[locale]/hq-admin/bmk-lab/page.tsx"), "utf8");
const briefClient = readFileSync(
  resolve("app/[locale]/hq-admin/operator-brief/OperatorBriefClient.tsx"),
  "utf8"
);
const mediaPage = readFileSync(resolve("app/[locale]/hq-admin/media/page.tsx"), "utf8");
const forceActivate = readFileSync(
  resolve("app/api/admin/force-activate/route.ts"),
  "utf8"
);

assert(allowlist.includes("parseHqAdminEmails"), "canonical parser in allowlist module");
assert(
  allowlist.includes("HQ_STAGING_ADDITIONAL_EMAILS"),
  "additive staging env documented in allowlist module",
);
assert(
  allowlist.includes("nlnzlswjjplofpkhoxtr.supabase.co"),
  "exact staging supabase host gate",
);
assert(
  allowlist.includes("VERCEL_ENV") && allowlist.includes("preview"),
  "vercel non-production deployment gate",
);
assert(
  !allowlist.includes("QE_STAGING_SITE") ||
    allowlist.includes("Does not trust QE_STAGING_SITE"),
  "must not authorize on QE_STAGING_SITE alone",
);
assert(pageAuth.includes("resolveHqAdminPageAuth"), "cookie page auth in page module");
assert(pageAuth.includes("createServerSupabaseClient"), "page auth uses cookie session");
assert(!hqAuth.includes("next/headers") && !hqAuth.includes("createServerSupabaseClient"), "API auth module stays free of next/headers");
assert(hqAuth.includes("assertHqAdminFromAccessToken"), "access-token auth exported");
assert(hqAuth.includes("assertHqAdminFromBearer"), "bearer auth exported");
assert(
  !allowlist.includes("consultantacrypto.ro@gmail.com") &&
    !hqAuth.includes("consultantacrypto.ro@gmail.com") &&
    !pageAuth.includes("consultantacrypto.ro@gmail.com"),
  "no hardcoded fallback in HQ auth modules"
);
assert(
  allowlist.includes("allowlist.length === 0") || allowlist.includes("length === 0"),
  "empty allowlist fails closed"
);

// Only the allowlist module may read HQ_STAGING_ADDITIONAL_EMAILS
function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) out.push(full);
  }
  return out;
}
const root = resolve(".");
const offenders = walkTsFiles(root).filter((path) => {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.endsWith("/lib/hqAdminAllowlist.ts")) return false;
  if (normalized.includes("/scripts/assert-hq-admin-auth.ts")) return false;
  if (normalized.includes("/scripts/_tmp_")) return false;
  const src = readFileSync(path, "utf8");
  return src.includes("HQ_STAGING_ADDITIONAL_EMAILS");
});
assert(
  offenders.length === 0,
  `no other module reads HQ_STAGING_ADDITIONAL_EMAILS (${offenders.join(", ")})`,
);

assert(mediaAuth.includes("resolveHqAdminPageAuth"), "Media HQ reuses canonical page auth");
assert(!mediaAuth.includes("consultantacrypto.ro@gmail.com"), "Media auth no hardcoded email");

assert(layout.includes("resolveHqAdminPageAuth"), "hq-admin layout server-gated");
assert(layout.includes("from \"@/lib/hqAdminPageAuth\""), "layout imports server page auth");
assert(layout.includes("HqAdminUnauthorized"), "unauthorized UI for denied users");
assert(!layout.includes("consultantacrypto.ro@gmail.com"), "layout no hardcoded email");

const unauthorized = readFileSync(
  resolve("app/components/HqAdminUnauthorized.tsx"),
  "utf8"
);
assert(
  unauthorized.includes("Please sign in to continue.") &&
    unauthorized.includes("Conectează-te pentru a continua."),
  "anon HQ copy is sign-in required"
);
const anonSlice = unauthorized.slice(
  unauthorized.indexOf('variant === "anon"'),
  unauthorized.indexOf('variant === "error"')
);
assert(
  !anonSlice.includes("Access denied.") && !anonSlice.includes("Acces refuzat."),
  "anon HQ must not also say access denied"
);

assert(
  adminActions.includes("assertHqAdminFromAccessToken"),
  "server actions use canonical access-token auth"
);
assert(
  !adminActions.includes("consultantacrypto.ro@gmail.com") &&
    !adminActions.includes("function getAdminEmails"),
  "adminActions no local allowlist/fallback"
);

assert(copilot.includes("assertHqAdminFromBearer"), "copilot uses canonical bearer auth");
assert(!copilot.includes("consultantacrypto.ro@gmail.com"), "copilot no hardcoded fallback");
assert(
  forceActivate.includes("assertHqAdminFromBearer"),
  "force-activate uses canonical bearer auth"
);

assert(
  !financing.includes('?? "consultantacrypto.ro@gmail.com"') &&
    !financing.includes("consultantacrypto.ro@gmail.com"),
  "financing owner email no hardcoded fallback"
);

for (const [name, src] of [
  ["hq page", hqPage],
  ["lead client", leadClient],
  ["bmk", bmk],
  ["brief client", briefClient],
] as const) {
  assert(!src.includes("consultantacrypto.ro@gmail.com"), `${name}: no hardcoded admin email`);
  assert(!/ADMIN_EMAILS\s*=/.test(src), `${name}: no client ADMIN_EMAILS allowlist`);
}

assert(!hqPage.includes("isAdminEmail"), "main HQ no client isAdminEmail authority");
assert(mediaPage.includes("MediaOpsClient"), "Media page still renders ops client");
assert(
  !mediaPage.includes("resolveMediaHqPageAuth"),
  "Media page relies on shared hq-admin layout gate"
);

// API routes still use bearer auth before service-role work
const hqRoutes = [
  "app/api/hq/inquiries/route.ts",
  "app/api/hq/leads/route.ts",
  "app/api/hq/leads/ai/route.ts",
  "app/api/hq/leads/messages/route.ts",
  "app/api/hq/media-orders/route.ts",
  "app/api/hq/overview/route.ts",
  "app/api/hq/risk-resolutions/route.ts",
];
for (const path of hqRoutes) {
  const src = readFileSync(resolve(path), "utf8");
  assert(src.includes("assertHqAdminFromBearer"), `${path} uses bearer HQ auth`);
}

assert(
  adminActions.includes("adminSoftHideListing") &&
    adminActions.includes("adminSoftHideDemand"),
  "soft-hide moderation uses server actions"
);
assert(
  !hqPage.includes('.from("listings")') &&
    !hqPage.includes('.from("admin_risk_resolutions")'),
  "main HQ no longer browser-selects HQ operational tables"
);

console.log("OK hq-admin-auth");
