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

const BASE = process.env.MEASUREMENT_QA_BASE?.trim() || "http://localhost:3017";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function assert(condition, message) {
  if (!condition) fail(message);
}

function isProtectedVendorHost(url) {
  const host = url.toLowerCase();
  return host.includes("supabase.co") || host.includes("stripe.com") || host.includes("api.stripe.com");
}

function isGoogleTagUrl(url) {
  const host = url.toLowerCase();
  return (
    host.includes("googletagmanager.com") ||
    host.includes("google-analytics.com") ||
    host.includes("analytics.google.com") ||
    host.includes("doubleclick.net") ||
    host.includes("googlesyndication.com") ||
    host.includes("googleadservices.com")
  );
}

function isGtagJsUrl(url) {
  return /googletagmanager\.com\/gtag\/js/i.test(url);
}

function isTikTokUrl(url) {
  const host = url.toLowerCase();
  return host.includes("tiktok.com") || host.includes("analytics.tiktok");
}

function isVendorScriptUrl(url) {
  return isGtagJsUrl(url) || /analytics\.tiktok\.com\/i18n\/pixel\/events\.js/i.test(url);
}

function isVendorCollectUrl(url) {
  const u = url.toLowerCase();
  if (isVendorScriptUrl(url)) return false;
  if (/\/g\/collect|\/j\/collect|\/r\/collect/.test(u)) return true;
  if (u.includes("google-analytics.com") && u.includes("collect")) return true;
  if (u.includes("analytics.google.com") && u.includes("collect")) return true;
  if (u.includes("stats.g.doubleclick.net")) return true;
  if (u.includes("doubleclick.net") && u.includes("collect")) return true;
  if (u.includes("googleadservices.com")) return true;
  if (u.includes("googlesyndication.com")) return true;
  if (isTikTokUrl(url)) return true;
  return false;
}

const vendorCollect = {
  attempted: [],
  aborted: [],
  delivered: [],
};

async function protectVendorWrites(page) {
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
}

async function noHorizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
}

function seedPrefs(prefs) {
  return (raw) => {
    localStorage.removeItem("quickexit_attribution");
    localStorage.removeItem("quickexit_analytics_consent");
    if (raw) localStorage.setItem("quickexit_consent_preferences", raw);
    else localStorage.removeItem("quickexit_consent_preferences");
  };
}

async function readLayer(page) {
  return page.evaluate(() => {
    const rows = [];
    for (const row of window.dataLayer || []) {
      try {
        rows.push(Array.from(row));
      } catch {
        // ignore non-array-like
      }
    }
    return rows;
  });
}

function googleCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => /^(_ga|_gid|_gat|_gcl|_gac)/i.test(name));
}

function tiktokCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => /^(_tt|_ttp)/i.test(name) || /^tt_/i.test(name));
}

async function inspectPage(page) {
  const layer = await readLayer(page);
  const defaultCall = layer.find((row) => row[0] === "consent" && row[1] === "default");
  const defaultIdx = layer.findIndex((row) => row[0] === "consent" && row[1] === "default");
  const configIdx = layer.findIndex((row) => row[0] === "config");
  const eventIdx = layer.findIndex((row) => row[0] === "event");
  const storage = await page.evaluate(() => ({
    prefs: localStorage.getItem("quickexit_consent_preferences"),
    attribution: localStorage.getItem("quickexit_attribution"),
    draft: sessionStorage.getItem("quickExitListingDraft"),
    unrelated: localStorage.getItem("unrelated_app_key"),
    cookies: document.cookie,
    gtagCount: document.querySelectorAll('script[data-qe-tag="gtag"]').length,
    tiktokCount: document.querySelectorAll('script[data-qe-tag="tiktok"]').length,
    href: location.href,
  }));
  const events = layer.filter((row) => row[0] === "event").map((row) => row[1]);
  return { layer, defaultCall, defaultIdx, configIdx, eventIdx, storage, events };
}

function assertNoReservedKeys(params, label) {
  for (const key of ["source", "medium", "campaign", "campaign_id", "term", "content", "gclid", "dclid"]) {
    assert(!Object.prototype.hasOwnProperty.call(params || {}, key), `${label} has reserved key ${key}`);
  }
}

function assertConsentDefaultDenied(snapshot, label) {
  assert(snapshot.defaultIdx >= 0 && snapshot.defaultCall, `${label}: consent default exists`);
  assert(
    snapshot.configIdx === -1 || snapshot.defaultIdx < snapshot.configIdx,
    `${label}: consent default before config`,
  );
  assert(
    snapshot.eventIdx === -1 || snapshot.defaultIdx < snapshot.eventIdx,
    `${label}: consent default before event`,
  );
  const params = snapshot.defaultCall?.[2] || {};
  assert(params.analytics_storage === "denied", `${label}: default analytics_storage denied`);
  assert(params.ad_storage === "denied", `${label}: default ad_storage denied`);
  assert(params.ad_user_data === "denied", `${label}: default ad_user_data denied`);
  assert(params.ad_personalization === "denied", `${label}: default ad_personalization denied`);
}

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

const browser = await chromium.launch({
  headless: true,
  channel: "msedge",
});
const network = [];

try {
  for (const locale of ["ro", "en"]) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await protectVendorWrites(page);
      page.on("request", (req) => network.push({ method: req.method(), url: req.url() }));
      await page.goto(`${BASE}/${locale}/pune-anunt`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const acceptName = locale === "en" ? "Accept all" : "Acceptă toate";
      const rejectName = locale === "en" ? "Reject optional" : "Respinge opționale";
      assert(await page.getByRole("button", { name: acceptName }).count(), `banner accept ${locale} ${viewport.width}`);
      assert(await page.getByRole("button", { name: rejectName }).count(), `banner reject ${locale} ${viewport.width}`);
      assert(await noHorizontalOverflow(page), `no overflow ${locale} ${viewport.width}`);
      const acceptBox = await page.getByRole("button", { name: acceptName }).boundingBox();
      const rejectBox = await page.getByRole("button", { name: rejectName }).boundingBox();
      assert(acceptBox && rejectBox, `banner actions boxed ${locale} ${viewport.width}`);
      assert(Math.abs(acceptBox.height - rejectBox.height) < 8, `accept/reject comparable ${locale} ${viewport.width}`);
      const banner = page.getByRole("region").filter({ hasText: locale === "en" ? "Your privacy matters" : "Confidențialitatea ta contează" });
      if (await banner.count()) {
        const box = await banner.boundingBox();
        assert(box && box.width <= viewport.width + 1, `banner fits viewport ${locale} ${viewport.width}`);
      }
      await context.close();
    }
  }

  const utmCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const utmPage = await utmCtx.newPage();
  await protectVendorWrites(utmPage);
  await utmPage.goto(
    `${BASE}/?utm_source=google&utm_medium=cpc&utm_campaign=qa_attr&utm_content=hero&utm_term=exit`,
    { waitUntil: "domcontentloaded" },
  );
  await utmPage.waitForTimeout(400);
  const utmHref = utmPage.url();
  assert(/utm_source=google/.test(utmHref), `locale routing keeps utm_source (${utmHref})`);
  assert(/utm_medium=cpc/.test(utmHref), "locale routing keeps utm_medium");
  assert(/utm_campaign=qa_attr/.test(utmHref), "locale routing keeps utm_campaign");
  await utmCtx.close();

  async function state(label, prefs, locale = "ro") {
    const hits = [];
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await protectVendorWrites(page);
    page.on("request", (req) => {
      const row = { method: req.method(), url: req.url() };
      hits.push(row);
      network.push(row);
    });
    await page.addInitScript(seedPrefs(prefs), prefs
      ? JSON.stringify({ version: 1, timestamp: Date.now(), necessary: true, ...prefs })
      : null);
    await page.goto(
      `${BASE}/${locale}/pune-anunt?utm_source=google&utm_medium=cpc&utm_campaign=privacyqa&utm_content=hero&utm_term=exit`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForTimeout(1200);
    const snapshot = await inspectPage(page);
    const google = hits.filter((h) => isGoogleTagUrl(h.url));
    const gtagJs = hits.filter((h) => isGtagJsUrl(h.url));
    const tiktok = hits.filter((h) => isTikTokUrl(h.url));
    const collect = hits.filter((h) => /google-analytics\.com|analytics\.google\.com|\/g\/collect|\/j\/collect/i.test(h.url));
    await context.close();
    return { label, snapshot, google, gtagJs, tiktok, collect, hits };
  }

  const absent = await state("A absent", null);
  assertConsentDefaultDenied(absent.snapshot, "A");
  assert(absent.gtagJs.length <= 1, `A gtag.js <= 1, got ${absent.gtagJs.length}`);
  assert(absent.gtagJs.length === 1 || absent.snapshot.storage.gtagCount <= 1, "A google tag loads at most once");
  assert(absent.tiktok.length === 0, `A TikTok requests=0, got ${absent.tiktok.length}`);
  assert(!absent.snapshot.storage.attribution, "A stores no UTM");
  assert(googleCookies(absent.snapshot.storage.cookies).length === 0, "A has zero Google cookies");
  assert(tiktokCookies(absent.snapshot.storage.cookies).length === 0, "A has zero TikTok cookies");
  const absentPageViews = absent.snapshot.events.filter((name) => name === "publish_page_view");
  assert(absentPageViews.length <= 1, `A publish_page_view not duplicated (${absentPageViews.length})`);
  for (const event of absent.snapshot.layer.filter((row) => row[0] === "event")) {
    const params = event[2] || {};
    assert(!("source" in params), "A event has no reserved source");
    assert(!("medium" in params), "A event has no reserved medium");
    assert(!("campaign" in params), "A event has no reserved campaign");
    assert(!("utm_source" in params), "A cookieless event has no UTM");
    if (event[1] === "publish_page_view") {
      assert(params.funnel_source === "publish_form" || !params.funnel_source, "A uses funnel_source when present");
    }
  }
  console.log("NETWORK A absent", {
    gtagJs: absent.gtagJs.length,
    google: absent.google.length,
    collect: absent.collect.length,
    tiktok: absent.tiktok.length,
    events: absent.snapshot.events,
  });

  const rejected = await state("B reject", { analytics: false, marketing: false });
  assertConsentDefaultDenied(rejected.snapshot, "B");
  assert(rejected.gtagJs.length <= 1, `B gtag.js <= 1, got ${rejected.gtagJs.length}`);
  assert(rejected.tiktok.length === 0, "B TikTok requests=0");
  assert(!rejected.snapshot.storage.attribution, "B stores no UTM");
  assert(googleCookies(rejected.snapshot.storage.cookies).length === 0, "B has zero Google cookies");
  assert(tiktokCookies(rejected.snapshot.storage.cookies).length === 0, "B has zero TikTok cookies");
  console.log("NETWORK B reject", {
    gtagJs: rejected.gtagJs.length,
    google: rejected.google.length,
    collect: rejected.collect.length,
    tiktok: rejected.tiktok.length,
  });

  const analyticsOnly = await state("C analytics", { analytics: true, marketing: false });
  const analyticsUpdates = analyticsOnly.snapshot.layer.filter(
    (row) => row[0] === "consent" && row[1] === "update",
  );
  assert(
    analyticsUpdates.some((row) => row[2]?.analytics_storage === "granted"),
    "C analytics_storage granted",
  );
  assert(
    analyticsUpdates.every((row) => row[2]?.ad_storage !== "granted" && row[2]?.ad_personalization !== "granted"),
    "C ad_* stay denied",
  );
  assert(analyticsOnly.tiktok.length === 0, "C TikTok requests=0");
  assert(analyticsOnly.google.length > 0, "C GA4/gtag network is present");
  assert(
    analyticsOnly.snapshot.storage.attribution && analyticsOnly.snapshot.storage.attribution.includes("google"),
    "C stores UTM",
  );
  const analyticsView = analyticsOnly.snapshot.layer.find((row) => row[0] === "event" && row[1] === "publish_page_view");
  if (analyticsView?.[2]) {
    assert(!("source" in analyticsView[2]), "C payload has no reserved source");
    assert(analyticsView[2].funnel_source === "publish_form", "C payload uses funnel_source");
  }
  console.log("NETWORK C analytics-only", {
    gtagJs: analyticsOnly.gtagJs.length,
    google: analyticsOnly.google.length,
    collect: analyticsOnly.collect.length,
    tiktok: analyticsOnly.tiktok.length,
    attribution: Boolean(analyticsOnly.snapshot.storage.attribution),
  });

  const marketingOnly = await state("D marketing", { analytics: false, marketing: true });
  const marketingUpdates = marketingOnly.snapshot.layer.filter(
    (row) => row[0] === "consent" && row[1] === "update",
  );
  assert(
    marketingUpdates.some((row) => row[2]?.ad_storage === "granted" && row[2]?.ad_user_data === "granted"),
    "D ad_storage and ad_user_data granted",
  );
  assert(
    marketingUpdates.every((row) => row[2]?.ad_personalization !== "granted"),
    "D ad_personalization stays denied",
  );
  assert(
    marketingUpdates.every((row) => row[2]?.analytics_storage !== "granted"),
    "D analytics_storage stays denied",
  );
  assert(marketingOnly.tiktok.length > 0, "D TikTok is allowed");
  assert(!marketingOnly.snapshot.storage.attribution, "D stores no analytics UTM");
  assert(googleCookies(marketingOnly.snapshot.storage.cookies).length === 0, "D has no analytics cookies");
  console.log("NETWORK D marketing-only", {
    gtagJs: marketingOnly.gtagJs.length,
    google: marketingOnly.google.length,
    collect: marketingOnly.collect.length,
    tiktok: marketingOnly.tiktok.length,
  });

  const acceptAll = await state("E accept", { analytics: true, marketing: true });
  const acceptUpdates = acceptAll.snapshot.layer.filter((row) => row[0] === "consent" && row[1] === "update");
  assert(
    acceptUpdates.some((row) => row[2]?.analytics_storage === "granted" && row[2]?.ad_storage === "granted"),
    "E analytics and ad_storage granted",
  );
  assert(
    acceptUpdates.every((row) => row[2]?.ad_personalization !== "granted"),
    "E ad_personalization stays denied",
  );
  assert(acceptAll.google.length > 0, "E Google tags load");
  assert(acceptAll.tiktok.length > 0, "E TikTok loads");
  const pageViews = acceptAll.snapshot.events.filter((name) => name === "publish_page_view");
  assert(pageViews.length <= 1, `E publish_page_view not duplicated (${pageViews.length})`);
  assert(
    acceptAll.snapshot.storage.attribution && acceptAll.snapshot.storage.attribution.includes("google"),
    "E stores UTM",
  );
  const acceptEvent = acceptAll.snapshot.layer.find((row) => row[0] === "event" && row[1] === "publish_page_view");
  if (acceptEvent?.[2]) {
    assert(!("source" in acceptEvent[2]), "E payload has no reserved source");
    assert(acceptEvent[2].funnel_source === "publish_form", "E payload uses funnel_source");
  }
  console.log("NETWORK E accept-all", {
    gtagJs: acceptAll.gtagJs.length,
    google: acceptAll.google.length,
    collect: acceptAll.collect.length,
    tiktok: acceptAll.tiktok.length,
    events: acceptAll.snapshot.events,
  });

  const enAccept = await state("E-en accept", { analytics: true, marketing: true }, "en");
  const enPageViews = enAccept.snapshot.events.filter((name) => name === "publish_page_view");
  assert(enPageViews.length <= 1, "EN accept-all does not duplicate publish_page_view");
  if (enAccept.snapshot.layer.find((row) => row[0] === "event" && row[1] === "publish_page_view")?.[2]) {
    const params = enAccept.snapshot.layer.find((row) => row[0] === "event" && row[1] === "publish_page_view")[2];
    assert(params.locale === "en" || params.funnel_source === "publish_form", "EN funnel payload is namespaced");
    assert(!("source" in params), "EN payload has no reserved source");
  }

  async function homepageTrackedClick(locale) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await protectVendorWrites(page);
    page.on("request", (req) => network.push({ method: req.method(), url: req.url() }));
    await page.addInitScript(
      seedPrefs({ analytics: true, marketing: false }),
      JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        necessary: true,
        analytics: true,
        marketing: false,
      }),
    );
    await page.goto(`${BASE}/${locale}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const cta = page.locator('a.group.relative[href*="pune-anunt"]').first();
    assert((await cta.count()) > 0, `${locale} homepage has a publish TrackedLink`);
    await cta.evaluate((el) => {
      el.addEventListener("click", (event) => event.preventDefault(), true);
    });
    await cta.click();
    await page.waitForTimeout(400);
    const snapshot = await inspectPage(page);
    const event = snapshot.layer.find((row) => row[0] === "event" && row[1] === "click_post_listing");
    assert(event, `${locale} homepage TrackedLink fired click_post_listing`);
    const params = event[2] || {};
    assert(params.interaction_source === "home_hero", `${locale} homepage uses interaction_source`);
    assertNoReservedKeys(params, `${locale} homepage TrackedLink`);
    await context.close();
    return params;
  }

  const homeRo = await homepageTrackedClick("ro");
  const homeEn = await homepageTrackedClick("en");
  console.log("PAYLOAD homepage", { ro: homeRo, en: homeEn });

  async function listingFunnel(locale) {
    const finder = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const finderPage = await finder.newPage();
    await protectVendorWrites(finderPage);
    finderPage.on("request", (req) => network.push({ method: req.method(), url: req.url() }));
    await finderPage.addInitScript(
      seedPrefs({ analytics: true, marketing: false }),
      JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        necessary: true,
        analytics: true,
        marketing: false,
      }),
    );
    await finderPage.goto(`${BASE}/${locale}`, { waitUntil: "domcontentloaded" });
    await finderPage.waitForTimeout(700);
    let listingHref = await finderPage.evaluate(() => {
      const hit = [...document.querySelectorAll("a")].find((anchor) =>
        /\/anunt\/[^/?#]+/.test(anchor.getAttribute("href") || ""),
      );
      return hit?.getAttribute("href") || "";
    });
    if (!listingHref) {
      await finderPage.goto(`${BASE}/${locale}/anunturi`, { waitUntil: "domcontentloaded" });
      await finderPage.waitForTimeout(700);
      listingHref = await finderPage.evaluate(() => {
        const hit = [...document.querySelectorAll("a")].find((anchor) =>
          /\/anunt\/[^/?#]+/.test(anchor.getAttribute("href") || ""),
        );
        return hit?.getAttribute("href") || "";
      });
    }
    await finder.close();
    assert(listingHref && /\/anunt\/[^/?#]+/.test(listingHref), `${locale} exposes a listing URL`);

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await protectVendorWrites(page);
    page.on("request", (req) => network.push({ method: req.method(), url: req.url() }));
    await page.addInitScript(
      seedPrefs({ analytics: true, marketing: false }),
      JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        necessary: true,
        analytics: true,
        marketing: false,
      }),
    );
    const listingUrl = listingHref.startsWith("http") ? listingHref : `${BASE}${listingHref}`;
    console.log("LISTING URL", locale, listingUrl);
    await page.goto(listingUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        for (const row of window.dataLayer || []) {
          try {
            const arr = Array.from(row);
            if (arr[0] === "event" && arr[1] === "listing_view") return true;
          } catch {
            // ignore
          }
        }
        return false;
      },
      { timeout: 10000 },
    );
    let snapshot = await inspectPage(page);
    const listingView = snapshot.layer.find((row) => row[0] === "event" && row[1] === "listing_view");
    assert(listingView, `${locale} listing_view fired`);
    assert(listingView[2]?.funnel_source === "listing_detail", `${locale} listing_view uses funnel_source`);
    assertNoReservedKeys(listingView[2], `${locale} listing_view`);

    const cta = page.locator("button:visible").filter({
      hasText: /Solicită detalii|Request details|Cerere ofertă|Request offer/i,
    }).first();
    await cta.scrollIntoViewIfNeeded();
    await cta.click();
    await page.waitForTimeout(500);
    snapshot = await inspectPage(page);
    const requestClick = snapshot.layer.find((row) => row[0] === "event" && row[1] === "request_details_click");
    const offerStarted = snapshot.layer.find((row) => row[0] === "event" && row[1] === "offer_started");
    assert(requestClick, `${locale} request_details_click fired`);
    assert(offerStarted, `${locale} offer_started fired`);
    assert(requestClick[2]?.funnel_source === "listing_detail", `${locale} request_details_click uses funnel_source`);
    assert(offerStarted[2]?.funnel_source === "listing_detail", `${locale} offer_started uses funnel_source`);
    assertNoReservedKeys(requestClick[2], `${locale} request_details_click`);
    assertNoReservedKeys(offerStarted[2], `${locale} offer_started`);
    assert((await page.locator('input[type="submit"], button[type="submit"]').count()) >= 0, `${locale} modal may be open`);
    const offerSubmit = snapshot.layer.find((row) => row[0] === "event" && row[1] === "offer_submitted");
    assert(!offerSubmit, `${locale} did not submit an offer`);
    await context.close();
    return {
      listing_view: listingView[2],
      request_details_click: requestClick[2],
      offer_started: offerStarted[2],
    };
  }

  const listingRo = await listingFunnel("ro");
  const listingEn = await listingFunnel("en");
  console.log("PAYLOAD listing", { ro: listingRo, en: listingEn });

  const customizeCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const customizePage = await customizeCtx.newPage();
  await protectVendorWrites(customizePage);
  customizePage.on("request", (req) => network.push({ method: req.method(), url: req.url() }));
  await customizePage.goto(`${BASE}/ro/pune-anunt`, { waitUntil: "domcontentloaded" });
  await customizePage.waitForTimeout(400);
  await customizePage.getByRole("button", { name: "Personalizează" }).click();
  await customizePage.waitForTimeout(200);
  const checks = customizePage.locator('input[type="checkbox"]');
  assert((await checks.count()) === 3, "three category toggles");
  assert(await checks.nth(0).isChecked(), "necessary is on");
  assert(await checks.nth(0).isDisabled(), "necessary is disabled");
  assert(!(await checks.nth(1).isChecked()), "analytics is not preselected");
  assert(!(await checks.nth(2).isChecked()), "marketing is not preselected");
  await customizePage.getByRole("button", { name: "Anulează" }).click();
  await customizeCtx.close();

  const DRAFT_KEEP = JSON.stringify({
    version: 2,
    timestamp: Date.now(),
    step: 1,
    category: "Auto & Moto",
    adTitle: "BMW 320d",
    description: "",
    exitPrice: "",
    pricingMode: null,
    isExitPriceManuallyEdited: false,
    manualMarketPrice: "",
    marketPrice: 0,
    analyzedItems: 0,
    saleStrategy: "standard",
    selectedPackage: "standard",
    saleMethod: "direct",
    formData: {
      make: "BMW",
      model: "320d",
      year: "",
      km: "",
      fuel: "Benzină",
      engine: "",
      transmission: "Automată",
      bodyType: "Sedan",
      status: "Înmatriculat RO",
      tva: "Nu (Vânzător PF)",
      propType: "Apartament",
      surface: "",
      rooms: "",
      buildYear: "",
      floor: "",
      parking: "Inclus în preț",
      landSurface: "",
      location: "",
      brand: "",
      refModel: "",
      purchaseYear: "",
      mechanism: "Automat",
      material: "",
      boxPapers: "Full Set (Cutie + Acte)",
      businessDomain: "",
      businessAge: "",
      revenue: "",
      profit: "",
      employees: "",
      includes: "",
      specs: "",
      warranty: "",
    },
    evaluationPrefillActive: false,
    evaluationHandoffActive: false,
  });

  const revokeHits = [];
  const revokeCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const revokePage = await revokeCtx.newPage();
  await protectVendorWrites(revokePage);
  revokePage.on("request", (req) => {
    revokeHits.push({ method: req.method(), url: req.url() });
    network.push({ method: req.method(), url: req.url() });
  });
  await revokePage.addInitScript((raw) => {
    if (sessionStorage.getItem("qe_qa_revoke_done") === "1") return;
    localStorage.setItem(
      "quickexit_consent_preferences",
      JSON.stringify({ version: 1, timestamp: Date.now(), necessary: true, analytics: true, marketing: true }),
    );
    sessionStorage.setItem("quickExitListingDraft", raw);
    localStorage.setItem("unrelated_app_key", "keep");
    localStorage.setItem("quickexit_attribution", JSON.stringify({ utm_source: "google", utm_medium: "cpc" }));
    document.cookie = "_ga=GA1.1.revoke; path=/";
    document.cookie = "_ga_G-8LLK172SCX=GS1.1.revoke; path=/";
    document.cookie = "_gid=GA1.1.revoke; path=/";
    document.cookie = "_gcl_au=1.1.revoke; path=/";
    document.cookie = "_ttp=revoke-ttp; path=/";
    document.cookie = "_tt_enable_cookie=1; path=/";
    document.cookie = "tt_pixel=1; path=/";
    sessionStorage.setItem("tt_sessionId", "pixel");
    sessionStorage.setItem("_tt_enable_cookie", "1");
  }, DRAFT_KEEP);
  await revokePage.goto(
    `${BASE}/ro/pune-anunt?utm_source=google&utm_medium=cpc&utm_campaign=privacyqa`,
    { waitUntil: "domcontentloaded" },
  );
  await revokePage.waitForTimeout(900);
  await revokePage.evaluate((raw) => {
    sessionStorage.setItem("quickExitListingDraft", raw);
    localStorage.setItem("unrelated_app_key", "keep");
  }, DRAFT_KEEP);
  await Promise.all([
    revokePage.waitForEvent("framenavigated", { timeout: 8000 }),
    revokePage.evaluate(() => {
      sessionStorage.setItem("qe_qa_revoke_done", "1");
      window.quickexitSetConsentPreferences?.({ analytics: false, marketing: false });
    }),
  ]);
  const hitsAfterNavigation = revokeHits.length;
  await revokePage.waitForTimeout(1100);
  const afterRevoke = await inspectPage(revokePage);
  const parsedPrefs = JSON.parse(afterRevoke.storage.prefs || "null");
  assert(parsedPrefs?.analytics === false && parsedPrefs?.marketing === false, "F revoke stores both false");
  assert(!afterRevoke.storage.attribution, "F revoke removes helper attribution");
  assert(afterRevoke.storage.draft, "F revoke keeps publish draft");
  assert(afterRevoke.storage.unrelated === "keep", "F revoke keeps unrelated keys");
  assert(googleCookies(afterRevoke.storage.cookies).length === 0, "F revoke clears first-party Google cookies");
  assert(tiktokCookies(afterRevoke.storage.cookies).length === 0, "F revoke clears first-party TikTok cookies");
  assertConsentDefaultDenied(afterRevoke, "F");
  const afterReloadHits = revokeHits.slice(hitsAfterNavigation);
  const postRevokeTikTok = afterReloadHits.filter((h) => isTikTokUrl(h.url));
  const postRevokeGtag = afterReloadHits.filter((h) => isGtagJsUrl(h.url));
  assert(postRevokeTikTok.length === 0, `F revoke+reload TikTok=0, got ${postRevokeTikTok.length}`);
  assert(postRevokeGtag.length <= 1, `F revoke+reload gtag.js <= 1, got ${postRevokeGtag.length}`);
  console.log("NETWORK F revoke-reload", {
    google: afterReloadHits.filter((h) => isGoogleTagUrl(h.url)).length,
    gtagJs: postRevokeGtag.length,
    tiktok: postRevokeTikTok.length,
    cookies: afterRevoke.storage.cookies,
  });
  await revokeCtx.close();

  const writes = network.filter((req) => isProtectedVendorHost(req.url) && WRITE_METHODS.has(req.method));
  if (writes.length) {
    console.error(writes.slice(0, 20));
    fail(`supabase/stripe writes detected: ${writes.length}`);
  }
  if (vendorCollect.delivered.length) {
    console.error(vendorCollect.delivered.slice(0, 20));
    fail(`vendor collect delivered: ${vendorCollect.delivered.length}`);
  }
  console.log("VENDOR collect", {
    attempted: vendorCollect.attempted.length,
    aborted: vendorCollect.aborted.length,
    delivered: vendorCollect.delivered.length,
  });
  console.log(
    `OK browser-qa requests=${network.length} writes=0 locales=ro,en viewports=390,768,1024,1440 collect_delivered=0`,
  );
} finally {
  await browser.close();
}
