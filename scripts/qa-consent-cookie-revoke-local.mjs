import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function loadPlaywright() {
  const fromEnv = process.env.PLAYWRIGHT_MODULE?.trim();
  if (fromEnv) {
    try {
      return require(fromEnv);
    } catch (error) {
      fail(
        `PLAYWRIGHT_MODULE is set but could not be loaded (${fromEnv}): ${error instanceof Error ? error.message : error}`,
      );
    }
  }
  try {
    return require("playwright");
  } catch {
    fail(
      "Playwright is not installed in this repository. Set PLAYWRIGHT_MODULE to a playwright package path, or add the playwright package locally, then retry.",
    );
  }
}

const { chromium } = loadPlaywright();
const BASE = process.env.CONSENT_QA_BASE?.trim() || "http://localhost:3018";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function assert(condition, message) {
  if (!condition) fail(message);
}

function isProtectedVendorHost(url) {
  const host = url.toLowerCase();
  return host.includes("supabase.co") || host.includes("stripe.com") || host.includes("api.stripe.com");
}

function isVendorScriptUrl(url) {
  return /googletagmanager\.com\/gtag\/js/i.test(url) || /analytics\.tiktok\.com\/i18n\/pixel\/events\.js/i.test(url);
}

function isTikTokUrl(url) {
  const host = url.toLowerCase();
  return host.includes("tiktok.com") || host.includes("analytics.tiktok");
}

function isVendorCollectUrl(url) {
  const u = url.toLowerCase();
  if (isVendorScriptUrl(url)) return false;
  if (/\/g\/collect|\/j\/collect|\/r\/collect/.test(u)) return true;
  if (u.includes("google-analytics.com") && u.includes("collect")) return true;
  if (u.includes("analytics.google.com") && u.includes("collect")) return true;
  if (u.includes("stats.g.doubleclick.net")) return true;
  if (u.includes("doubleclick.net") && u.includes("collect")) return true;
  if (u.includes("googleadservices.com") || u.includes("googlesyndication.com")) return true;
  if (isTikTokUrl(url)) return true;
  return false;
}

const vendorCollect = { attempted: [], aborted: [], delivered: [] };
const network = [];

async function protect(page) {
  await page.route("**/*", async (route) => {
    const req = route.request();
    const url = req.url();
    if (WRITE_METHODS.has(req.method()) && isProtectedVendorHost(url)) {
      await route.abort();
      return;
    }
    if (isVendorCollectUrl(url)) {
      vendorCollect.attempted.push({ method: req.method(), url });
      vendorCollect.aborted.push({ method: req.method(), url });
      await route.abort();
      return;
    }
    await route.continue();
  });
  page.on("requestfinished", (req) => {
    if (isVendorCollectUrl(req.url())) {
      vendorCollect.delivered.push({ method: req.method(), url: req.url() });
    }
  });
  page.on("request", (req) => network.push({ method: req.method(), url: req.url() }));
}

function trackingCookieNames(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => /^(_ga|_gid|_gcl_|_tt|_ttp)/i.test(name) || /^tt_/i.test(name));
}

const DRAFT = JSON.stringify({
  version: 2,
  timestamp: Date.now(),
  step: 1,
  category: "Auto & Moto",
  adTitle: "BMW 320d",
});

const browser = await chromium.launch({ headless: true, channel: "msedge" });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await protect(page);
  await page.goto(`${BASE}/ro/pune-anunt`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Acceptă toate" }).click();
  await page.waitForTimeout(900);
  await page.evaluate((raw) => {
    sessionStorage.setItem("quickExitListingDraft", raw);
    localStorage.setItem("unrelated_app_key", "keep");
    document.cookie = "unrelated_cookie=keep; path=/";
    document.cookie = "_ga=GA1.1.revoke; path=/";
    document.cookie = "_ga_TEST=1; path=/";
    document.cookie = "_gid=GA1.1.revoke; path=/";
    document.cookie = "_gcl_au=1.1.revoke; path=/";
    document.cookie = "_ttp=revoke; path=/";
    document.cookie = "_tt_enable_cookie=1; path=/";
    document.cookie = "tt_pixel=1; path=/";
  }, DRAFT);
  await Promise.all([
    page.waitForEvent("framenavigated", { timeout: 8000 }).catch(() => null),
    page.evaluate(() => {
      window.quickexitSetConsentPreferences?.({ analytics: false, marketing: false });
    }),
  ]);
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    cookies: document.cookie,
    draft: sessionStorage.getItem("quickExitListingDraft"),
    unrelated: localStorage.getItem("unrelated_app_key"),
    prefs: localStorage.getItem("quickexit_consent_preferences"),
  }));
  const prefs = JSON.parse(after.prefs || "null");
  assert(prefs?.analytics === false && prefs?.marketing === false, "revoke stores denied prefs");
  assert(after.draft, "revoke keeps listing draft");
  assert(after.unrelated === "keep", "revoke keeps unrelated_app_key");
  assert(/unrelated_cookie=keep/.test(after.cookies), "revoke keeps unrelated cookie");
  assert(trackingCookieNames(after.cookies).length === 0, `tracking cookies remain: ${after.cookies}`);

  await page.evaluate(() => {
    document.cookie = "_ga=GA1.1.stale; path=/";
    document.cookie = "_ga_TEST=stale; path=/";
    document.cookie = "_gcl_au=stale; path=/";
    document.cookie = "_ttp=stale; path=/";
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  const afterReload = await page.evaluate(() => ({
    cookies: document.cookie,
    draft: sessionStorage.getItem("quickExitListingDraft"),
    unrelated: localStorage.getItem("unrelated_app_key"),
    prefs: localStorage.getItem("quickexit_consent_preferences"),
  }));
  const reloadedPrefs = JSON.parse(afterReload.prefs || "null");
  assert(
    reloadedPrefs?.analytics === false && reloadedPrefs?.marketing === false,
    "reload keeps denied prefs",
  );
  assert(afterReload.draft, "reload keeps listing draft");
  assert(afterReload.unrelated === "keep", "reload keeps unrelated_app_key");
  assert(/unrelated_cookie=keep/.test(afterReload.cookies), "reload keeps unrelated cookie");
  assert(
    trackingCookieNames(afterReload.cookies).length === 0,
    `stored denied prefs did not clear tracking cookies on reload: ${afterReload.cookies}`,
  );

  const writes = network.filter(
    (req) => isProtectedVendorHost(req.url) && WRITE_METHODS.has(req.method),
  );
  if (writes.length) fail(`supabase/stripe writes detected: ${writes.length}`);
  if (vendorCollect.delivered.length) fail(`vendor collect delivered: ${vendorCollect.delivered.length}`);
  console.log("VENDOR collect", {
    attempted: vendorCollect.attempted.length,
    aborted: vendorCollect.aborted.length,
    delivered: vendorCollect.delivered.length,
  });
  console.log("COOKIES after revoke", after.cookies);
  console.log("COOKIES after reload", afterReload.cookies);
  console.log("OK consent-cookie-revoke-qa writes=0 collect_delivered=0");
} finally {
  await browser.close();
}
