import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseHqAdminEmails,
  isHqAdminEmail,
  getHqAdminEmails,
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

const prev = process.env.HQ_ADMIN_EMAILS;
try {
  delete process.env.HQ_ADMIN_EMAILS;
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
} finally {
  if (prev === undefined) delete process.env.HQ_ADMIN_EMAILS;
  else process.env.HQ_ADMIN_EMAILS = prev;
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
];
for (const path of hqRoutes) {
  const src = readFileSync(resolve(path), "utf8");
  assert(src.includes("assertHqAdminFromBearer"), `${path} uses bearer HQ auth`);
}

console.log("OK hq-admin-auth");
