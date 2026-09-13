import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { sanitizeVercelAnalyticsEvent } from "../lib/vercelWebAnalytics";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
};
const installed = JSON.parse(
  readFileSync(resolve("node_modules/@vercel/analytics/package.json"), "utf8"),
) as { version: string };
const depRange = pkg.dependencies?.["@vercel/analytics"] ?? "";
assert(depRange.includes("^2") || depRange.startsWith("2."), "1 package.json depends on @vercel/analytics 2.x");
assert(installed.version.startsWith("2."), `1 installed @vercel/analytics is 2.x, got ${installed.version}`);

const wrapper = readFileSync(resolve("app/components/VercelWebAnalytics.tsx"), "utf8");
const helper = readFileSync(resolve("lib/vercelWebAnalytics.ts"), "utf8");
const localeLayout = readFileSync(resolve("app/[locale]/layout.tsx"), "utf8");
const rootLayout = readFileSync(resolve("app/layout.tsx"), "utf8");
const consentProvider = readFileSync(resolve("app/components/ConsentProvider.tsx"), "utf8");
const pageViewTracker = readFileSync(resolve("app/components/ConsentedPageViewTracker.tsx"), "utf8");
const gaAnalytics = readFileSync(resolve("lib/analytics.ts"), "utf8");
const consentTags = readFileSync(resolve("lib/consentTags.ts"), "utf8");

const analyticsMounts = [
  wrapper,
  helper,
  localeLayout,
  rootLayout,
  consentProvider,
  pageViewTracker,
  gaAnalytics,
  consentTags,
].join("\n").match(/<Analytics\b/g) ?? [];
assert(analyticsMounts.length === 1, `2 <Analytics /> mounted exactly once, found ${analyticsMounts.length}`);
assert(wrapper.includes('<Analytics beforeSend={sanitizeVercelAnalyticsEvent} />'), "2 wrapper mounts <Analytics />");
assert((wrapper.match(/<Analytics\b/g) ?? []).length === 1, "2 wrapper contains a single <Analytics />");
assert(!localeLayout.includes("<Analytics"), "2 locale layout does not mount <Analytics /> directly");
assert(localeLayout.includes("<VercelWebAnalytics />"), "2 locale layout mounts the wrapper once");
assert((localeLayout.match(/<VercelWebAnalytics \/>/g) ?? []).length === 1, "2 wrapper is mounted exactly once");
assert(!rootLayout.includes("VercelWebAnalytics"), "2 root layout does not remount analytics");

assert(wrapper.includes("beforeSend={sanitizeVercelAnalyticsEvent}"), "3 wrapper passes beforeSend");
assert(helper.includes("export const sanitizeVercelAnalyticsEvent"), "3 sanitizer is exported");

const clean = sanitizeVercelAnalyticsEvent({
  type: "pageview",
  url: "https://www.quickexit.ro/ro/anunturi",
});
assert(clean?.url === "https://www.quickexit.ro/ro/anunturi", "4 URL without query/hash is unchanged");
assert(clean?.type === "pageview", "4 event type is preserved");

const withQuery = sanitizeVercelAnalyticsEvent({
  type: "pageview",
  url: "https://www.quickexit.ro/ro/cauta?city=bucuresti&gclid=abc123",
});
assert(withQuery?.url === "https://www.quickexit.ro/ro/cauta", "5 query string is removed");
assert(!withQuery?.url.includes("?"), "5 result has no query delimiter");

const withHash = sanitizeVercelAnalyticsEvent({
  type: "pageview",
  url: "https://www.quickexit.ro/ro/dashboard#oferte",
});
assert(withHash?.url === "https://www.quickexit.ro/ro/dashboard", "6 hash is removed");
assert(!withHash?.url.includes("#"), "6 result has no hash delimiter");

const sensitive = sanitizeVercelAnalyticsEvent({
  type: "event",
  url: "https://www.quickexit.ro/ro/auth/callback?gclid=Aw123&email=user@example.com&token=secret.jwt&code=oauth",
});
assert(sensitive?.type === "event", "7 custom-shaped library event keeps type");
assert(sensitive?.url === "https://www.quickexit.ro/ro/auth/callback", "7 pathname is kept");
assert(!sensitive?.url.includes("gclid"), "7 gclid is not in the sent URL");
assert(!sensitive?.url.includes("email"), "7 email is not in the sent URL");
assert(!sensitive?.url.includes("token"), "7 token is not in the sent URL");
assert(!sensitive?.url.includes("code"), "7 code is not in the sent URL");

assert(sanitizeVercelAnalyticsEvent({ type: "pageview", url: "not a url" }) === null, "8 invalid URL is null");
assert(sanitizeVercelAnalyticsEvent({ type: "pageview", url: "" }) === null, "8 empty URL is null");
assert(sanitizeVercelAnalyticsEvent({ type: "pageview", url: "/ro/dashboard" }) === null, "8 relative URL is null");
assert(sanitizeVercelAnalyticsEvent({ type: "pageview", url: "javascript:alert(1)" }) === null, "8 non-http URL is null");

assert(!wrapper.includes("useConsent"), "9 wrapper does not read GA4 consent");
assert(!wrapper.includes("ConsentProvider"), "9 wrapper is not gated by ConsentProvider");
assert(!helper.includes("hasAnalyticsConsent"), "9 sanitizer does not check GA4 consent");
assert(!helper.includes("localStorage"), "9 sanitizer does not read storage");
assert(!wrapper.includes("track("), "9 wrapper does not send custom events");
assert(!wrapper.includes("localStorage"), "9 wrapper does not read localStorage");
assert(!wrapper.includes("document.cookie"), "9 wrapper does not read cookies");
const vercelInProvider = localeLayout.indexOf("<VercelWebAnalytics />");
const consentOpen = localeLayout.indexOf("<ConsentProvider>");
assert(vercelInProvider >= 0 && consentOpen > vercelInProvider, "9 Vercel analytics sits outside ConsentProvider");

const gaTouched = execFileSync(
  "git",
  [
    "diff",
    "--name-only",
    "HEAD",
    "--",
    "lib/analytics.ts",
    "lib/consentTags.ts",
    "app/components/ConsentedPageViewTracker.tsx",
    "app/components/ConsentProvider.tsx",
    "lib/consentPreferences.ts",
  ],
  { encoding: "utf8" },
).trim();
assert(gaTouched === "", `10 GA4 files are unmodified, got: ${gaTouched || "(empty)"}`);
assert(!pageViewTracker.includes("@vercel/analytics"), "10 GA4 page_view tracker does not import Vercel");
assert(!gaAnalytics.includes("@vercel/analytics"), "10 lib/analytics.ts does not import Vercel");
assert(!consentTags.includes("@vercel/analytics"), "10 consent tags do not import Vercel");

console.log("OK vercel-web-analytics");
