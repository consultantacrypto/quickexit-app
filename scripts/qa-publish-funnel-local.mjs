import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("D:/MEDIA/quickexit/qa/uiux-audit/node_modules/playwright");

const BASE = "http://localhost:3006";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const defaultForm = {
  make: "",
  model: "",
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
};

function draftPayload(overrides = {}) {
  return {
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
    formData: { ...defaultForm, make: "BMW", model: "320d" },
    evaluationPrefillActive: false,
    evaluationHandoffActive: false,
    ...overrides,
  };
}

async function attachNetwork(page, bucket) {
  page.on("request", (req) => {
    bucket.push({ method: req.method(), url: req.url() });
  });
}

function writeHits(bucket) {
  return bucket.filter((req) => {
    const host = req.url.toLowerCase();
    const isTarget =
      host.includes("supabase.co") ||
      host.includes("stripe.com") ||
      host.includes("api.stripe.com");
    return isTarget && WRITE_METHODS.has(req.method);
  });
}

async function noHorizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
}

async function seedDraft(page, payload) {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  await page.addInitScript((value) => {
    sessionStorage.setItem("quickExitListingDraft", value);
  }, raw);
}

async function seedRejectedOptional(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "quickexit_consent_preferences",
      JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        necessary: true,
        analytics: false,
        marketing: false,
      }),
    );
  });
}

function isGoogleTagUrl(url) {
  const host = url.toLowerCase();
  return (
    host.includes("googletagmanager.com") ||
    host.includes("google-analytics.com") ||
    host.includes("doubleclick.net") ||
    host.includes("googlesyndication.com") ||
    host.includes("googleadservices.com")
  );
}

function isTikTokUrl(url) {
  const host = url.toLowerCase();
  return host.includes("tiktok.com") || host.includes("analytics.tiktok");
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
      await attachNetwork(page, network);
      await page.goto(`${BASE}/${locale}/pune-anunt`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      const body = await page.locator("body").innerText();
      assert(/Date activ|Asset details|1\./i.test(body) || body.includes("Date despre activ") || body.includes("Publică"), `fresh ${locale} ${viewport.width} loaded`);
      assert(!(await page.getByRole("dialog").count()), `fresh ${locale} ${viewport.width} has no recovery dialog`);
      assert(await page.getByRole("button", { name: locale === "en" ? "Accept all" : "Acceptă toate" }).count(), `banner accept ${locale} ${viewport.width}`);
      assert(await page.getByRole("button", { name: locale === "en" ? "Reject optional" : "Respinge opționale" }).count(), `banner reject ${locale} ${viewport.width}`);
      assert(await noHorizontalOverflow(page), `no overflow ${locale} ${viewport.width}`);
      const renderHits = network.filter((req) => req.url.includes("/render/image/"));
      assert(renderHits.length === 0, `publish page has no /render/image/ (${locale} ${viewport.width})`);
      await context.close();
    }
  }

  const ro = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ro.newPage();
  await attachNetwork(page, network);
  await seedRejectedOptional(page);

  await page.goto(`${BASE}/ro/pune-anunt`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  assert(await page.getByRole("heading", { name: /Publică/i }).count(), "RO heading");
  assert((await page.getByRole("dialog").count()) === 0, "fresh session no dialog");
  assert(await page.getByRole("button", { name: /Continuă la poze/i }).count(), "step 1 continue visible");

  const make = page.getByRole("combobox", { name: /Marcă|Make|Brand/i });
  await make.click();
  await make.fill("BMW");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  assert(await page.getByRole("button", { name: /Continuă la poze/i }).count(), "Enter did not leave step 1");
  assert((await page.getByRole("button", { name: /Plătește/i }).count()) === 0, "Enter did not open checkout");
  await ro.close();

  async function openWithDraft(payload, locale = "ro") {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const nextPage = await context.newPage();
    await attachNetwork(nextPage, network);
    await seedRejectedOptional(nextPage);
    await seedDraft(nextPage, payload);
    await nextPage.goto(`${BASE}/${locale}/pune-anunt`, { waitUntil: "domcontentloaded" });
    await nextPage.waitForTimeout(600);
    return { context, page: nextPage };
  }

  const recovered = await openWithDraft(
    draftPayload({ step: 4, pricingMode: "fixed_price", exitPrice: "25000" }),
  );
  assert(
    (await recovered.page.getByText("Continuă ciorna").count()) > 0,
    "valid draft shows recovery dialog",
  );
  assert(await recovered.page.getByRole("button", { name: "Continuă ciorna" }).count(), "continue CTA");
  assert(await recovered.page.getByRole("button", { name: "Șterge ciorna și începe un anunț nou" }).count(), "destructive CTA");
  assert(await recovered.page.getByText(/datele salvate din formular vor fi eliminate/i).count(), "RO consequence copy");
  assert((await recovered.page.getByRole("button", { name: /Plătește/i }).count()) === 0, "no silent checkout");

  await recovered.page.getByRole("button", { name: "Șterge ciorna și începe un anunț nou" }).click();
  await recovered.page.waitForTimeout(400);
  assert((await recovered.page.getByText("Continuă ciorna").count()) === 0, "new listing closes dialog");
  assert(await recovered.page.getByRole("button", { name: /Continuă la poze/i }).count(), "new listing is step 1");
  const leftover = await recovered.page.evaluate(() => sessionStorage.getItem("quickExitListingDraft"));
  assert(!leftover, "new listing cleared publish draft");
  await recovered.context.close();

  const continued = await openWithDraft(
    draftPayload({ step: 4, pricingMode: "fixed_price", exitPrice: "25000" }),
  );
  await continued.page.getByRole("button", { name: "Continuă ciorna" }).click();
  await continued.page.waitForTimeout(500);
  assert(await continued.page.getByRole("button", { name: /Plătește și publică/i }).count(), "valid continue can show step 4");
  assert(await continued.page.getByRole("button", { name: /Abandonează ciorna/i }).count(), "discard remains after continue");
  await continued.context.close();

  const incomplete = await openWithDraft(draftPayload({ step: 4, pricingMode: null, exitPrice: "" }));
  await incomplete.page.getByRole("button", { name: "Continuă ciorna" }).click();
  await incomplete.page.waitForTimeout(500);
  assert((await incomplete.page.getByRole("button", { name: /Plătește și publică/i }).count()) === 0, "invalid step-4 draft cannot reach checkout");
  const step3 = await incomplete.page.locator("body").innerText();
  assert(/Preț|price|modalitate/i.test(step3), "invalid step-4 lands on earlier pricing step");
  await incomplete.context.close();

  const corrupt = await openWithDraft("{not-json");
  assert((await corrupt.page.getByText("Continuă ciorna").count()) === 0, "corrupt draft has no recovery");
  assert(await corrupt.page.getByRole("button", { name: /Continuă la poze/i }).count(), "corrupt draft starts at step 1");
  await corrupt.context.close();

  const en = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const enPage = await en.newPage();
  await attachNetwork(enPage, network);
  await enPage.addInitScript((raw) => {
    localStorage.setItem(
      "quickexit_consent_preferences",
      JSON.stringify({ version: 1, timestamp: Date.now(), necessary: true, analytics: false, marketing: false }),
    );
    sessionStorage.setItem("quickExitListingDraft", raw);
  }, JSON.stringify(draftPayload({ step: 4, pricingMode: "fixed_price", exitPrice: "25000" })));
  await enPage.goto(`${BASE}/en/pune-anunt`, { waitUntil: "domcontentloaded" });
  await enPage.waitForTimeout(500);
  assert(await enPage.getByRole("button", { name: "Continue draft" }).count(), "EN recovery dialog");
  assert(await enPage.getByRole("button", { name: "Delete draft and start a new listing" }).count(), "EN destructive");
  assert(await enPage.getByText(/Your account is not affected/i).count(), "EN consequence copy");
  assert(await noHorizontalOverflow(enPage), "EN 390 no overflow");
  const enContinueBox = await enPage.getByRole("button", { name: "Continue draft" }).boundingBox();
  const enDeleteBox = await enPage.getByRole("button", { name: "Delete draft and start a new listing" }).boundingBox();
  assert(enContinueBox && enContinueBox.width > 40 && enContinueBox.height > 24, "EN continue tappable at 390");
  assert(enDeleteBox && enDeleteBox.width > 40 && enDeleteBox.height > 24, "EN delete tappable at 390");

  await enPage.keyboard.press("Escape");
  assert(await enPage.getByRole("dialog").count(), "Escape does not dismiss recovery dialog");
  const focusedStart = await enPage.evaluate(() => (document.activeElement?.textContent || "").trim());
  assert(/Continue draft/i.test(focusedStart), "focus starts on continue");
  await enPage.keyboard.press("Tab");
  const focusedDelete = await enPage.evaluate(() => (document.activeElement?.textContent || "").trim());
  assert(/Delete draft and start a new listing/i.test(focusedDelete), "Tab moves to destructive action");
  await enPage.keyboard.press("Tab");
  const focusedWrap = await enPage.evaluate(() => (document.activeElement?.textContent || "").trim());
  assert(/Continue draft/i.test(focusedWrap), "Tab wraps back to continue");
  await en.close();

  const ro390 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ro390Page = await ro390.newPage();
  await attachNetwork(ro390Page, network);
  await ro390Page.addInitScript((raw) => {
    localStorage.setItem(
      "quickexit_consent_preferences",
      JSON.stringify({ version: 1, timestamp: Date.now(), necessary: true, analytics: false, marketing: false }),
    );
    sessionStorage.setItem("quickExitListingDraft", raw);
  }, JSON.stringify(draftPayload({ step: 4, pricingMode: "fixed_price", exitPrice: "25000" })));
  await ro390Page.goto(`${BASE}/ro/pune-anunt`, { waitUntil: "domcontentloaded" });
  await ro390Page.waitForTimeout(500);
  const roContinueBox = await ro390Page.getByRole("button", { name: "Continuă ciorna" }).boundingBox();
  const roDeleteBox = await ro390Page.getByRole("button", { name: "Șterge ciorna și începe un anunț nou" }).boundingBox();
  assert(roContinueBox && roContinueBox.width > 40, "RO continue tappable at 390");
  assert(roDeleteBox && roDeleteBox.width > 40, "RO delete tappable at 390");
  await ro390.close();

  async function consentState(label, prefs) {
    const hits = [];
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const next = await context.newPage();
    next.on("request", (req) => {
      hits.push({ method: req.method(), url: req.url() });
      network.push({ method: req.method(), url: req.url() });
    });
    await next.addInitScript((raw) => {
      localStorage.removeItem("quickexit_attribution");
      localStorage.removeItem("quickexit_analytics_consent");
      if (raw) localStorage.setItem("quickexit_consent_preferences", raw);
      else localStorage.removeItem("quickexit_consent_preferences");
    }, prefs ? JSON.stringify({ version: 1, timestamp: Date.now(), necessary: true, ...prefs }) : null);
    await next.goto(
      `${BASE}/ro/pune-anunt?utm_source=google&utm_medium=cpc&utm_campaign=privacyqa&utm_content=hero&utm_term=exit`,
      { waitUntil: "domcontentloaded" },
    );
    await next.waitForTimeout(900);
    const stored = await next.evaluate(() => ({
      prefs: localStorage.getItem("quickexit_consent_preferences"),
      attribution: localStorage.getItem("quickexit_attribution"),
      events: (window.dataLayer || [])
        .map((row) => {
          try {
            const arr = Array.from(row);
            return arr[0] === "event" ? arr[1] : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    }));
    const google = hits.filter((h) => isGoogleTagUrl(h.url));
    const tiktok = hits.filter((h) => isTikTokUrl(h.url));
    await context.close();
    return { stored, google, tiktok, formOk: true };
  }

  const absent = await consentState("absent", null);
  assert(!absent.stored.attribution, "absent stores no UTM");
  assert(!absent.stored.events.includes("publish_page_view"), "absent has no funnel event");
  assert(absent.google.length === 0, `absent has 0 Google tag requests, got ${absent.google.length}`);
  assert(absent.tiktok.length === 0, `absent has 0 TikTok requests, got ${absent.tiktok.length}`);
  console.log("NETWORK absent", { google: absent.google.length, tiktok: absent.tiktok.length });

  const rejected = await consentState("reject", { analytics: false, marketing: false });
  assert(!rejected.stored.attribution, "reject stores no UTM");
  assert(rejected.google.length === 0, "reject has 0 Google tag requests");
  assert(rejected.tiktok.length === 0, "reject has 0 TikTok requests");
  console.log("NETWORK reject", { google: rejected.google.length, tiktok: rejected.tiktok.length });

  const analyticsOnly = await consentState("analytics only", { analytics: true, marketing: false });
  assert(analyticsOnly.stored.attribution && analyticsOnly.stored.attribution.includes("google"), "analytics-only stores UTM");
  assert(analyticsOnly.tiktok.length === 0, "analytics-only has 0 TikTok requests");
  assert(analyticsOnly.google.length > 0, "analytics-only may load gtag.js");
  console.log("NETWORK analytics-only", { google: analyticsOnly.google.length, tiktok: analyticsOnly.tiktok.length });

  const marketingOnly = await consentState("marketing only", { analytics: false, marketing: true });
  assert(!marketingOnly.stored.attribution, "marketing-only stores no analytics UTM");
  assert(!marketingOnly.stored.events.includes("publish_page_view"), "marketing-only has no funnel");
  assert(marketingOnly.google.length === 0, "marketing-only has 0 GA4/gtag requests");
  assert(marketingOnly.tiktok.length > 0, "marketing-only loads TikTok after grant");
  console.log("NETWORK marketing-only", { google: marketingOnly.google.length, tiktok: marketingOnly.tiktok.length });

  const acceptAll = await consentState("accept all", { analytics: true, marketing: true });
  assert(acceptAll.stored.attribution && acceptAll.stored.attribution.includes("google"), "accept-all stores UTM");
  assert(acceptAll.google.length > 0, "accept-all loads Google tags");
  assert(acceptAll.tiktok.length > 0, "accept-all loads TikTok");
  console.log("NETWORK accept-all", { google: acceptAll.google.length, tiktok: acceptAll.tiktok.length });

  const customizeCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const customizePage = await customizeCtx.newPage();
  await attachNetwork(customizePage, network);
  await customizePage.goto(`${BASE}/ro/pune-anunt`, { waitUntil: "domcontentloaded" });
  await customizePage.waitForTimeout(400);
  const acceptBox = await customizePage.getByRole("button", { name: "Acceptă toate" }).boundingBox();
  const rejectBox = await customizePage.getByRole("button", { name: "Respinge opționale" }).boundingBox();
  assert(acceptBox && rejectBox && Math.abs(acceptBox.height - rejectBox.height) < 8, "accept/reject comparable height");
  await customizePage.getByRole("button", { name: "Personalizează" }).click();
  await customizePage.waitForTimeout(200);
  const checks = customizePage.locator('input[type="checkbox"]');
  assert((await checks.count()) === 3, "three category toggles");
  assert(await checks.nth(0).isChecked(), "necessary is on");
  assert(await checks.nth(0).isDisabled(), "necessary is disabled");
  assert(!(await checks.nth(1).isChecked()), "analytics is not preselected");
  assert(!(await checks.nth(2).isChecked()), "marketing is not preselected");
  await customizePage.getByRole("button", { name: "Anulează" }).click();
  assert(await customizePage.getByRole("button", { name: "Acceptă toate" }).count(), "cancel keeps the banner / no saved optional consent");
  await customizePage.getByRole("button", { name: "Respinge opționale" }).click();
  await customizePage.waitForTimeout(300);
  assert(await customizePage.getByRole("button", { name: /Continuă la poze/i }).count(), "reject keeps the publish form");
  await customizePage.getByRole("button", { name: "Setări cookies" }).scrollIntoViewIfNeeded();
  await customizePage.getByRole("button", { name: "Setări cookies" }).click();
  await customizePage.waitForTimeout(200);
  assert(await customizePage.getByRole("dialog").count(), "footer reopens preferences");
  await customizeCtx.close();

  const enBanner = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const enBannerPage = await enBanner.newPage();
  await attachNetwork(enBannerPage, network);
  await enBannerPage.goto(`${BASE}/en/pune-anunt`, { waitUntil: "domcontentloaded" });
  await enBannerPage.waitForTimeout(400);
  assert(await enBannerPage.getByRole("button", { name: "Accept all" }).count(), "EN accept");
  assert(await enBannerPage.getByRole("button", { name: "Reject optional" }).count(), "EN reject");
  assert(await enBannerPage.getByRole("button", { name: "Customize" }).count(), "EN customize");
  await enBanner.close();

  const revokeHits = [];
  const revokeCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const revokePage = await revokeCtx.newPage();
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
  }, JSON.stringify(draftPayload({ step: 1 })));
  await revokePage.goto(
    `${BASE}/ro/pune-anunt?utm_source=google&utm_medium=cpc&utm_campaign=privacyqa`,
    { waitUntil: "domcontentloaded" },
  );
  await revokePage.waitForTimeout(800);
  await Promise.all([
    revokePage.waitForEvent("framenavigated", { timeout: 8000 }),
    revokePage.evaluate(() => {
      sessionStorage.setItem("qe_qa_revoke_done", "1");
      window.quickexitSetConsentPreferences?.({ analytics: false, marketing: false });
    }),
  ]);
  const hitsAfterNavigation = revokeHits.length;
  await revokePage.waitForTimeout(900);
  const afterRevoke = await revokePage.evaluate(() => ({
    prefs: localStorage.getItem("quickexit_consent_preferences"),
    attribution: localStorage.getItem("quickexit_attribution"),
    draft: sessionStorage.getItem("quickExitListingDraft"),
    unrelated: localStorage.getItem("unrelated_app_key"),
  }));
  const parsedPrefs = JSON.parse(afterRevoke.prefs || "null");
  assert(parsedPrefs?.analytics === false && parsedPrefs?.marketing === false, "revoke stores both false");
  assert(!afterRevoke.attribution, "revoke removes helper attribution");
  assert(afterRevoke.draft, "revoke does not clear publish draft");
  assert(afterRevoke.unrelated === "keep", "revoke does not clear unrelated keys");
  const afterReloadHits = revokeHits.slice(hitsAfterNavigation);
  const postRevokeGoogle = afterReloadHits.filter((h) => isGoogleTagUrl(h.url));
  const postRevokeTikTok = afterReloadHits.filter((h) => isTikTokUrl(h.url));
  if (postRevokeGoogle.length || postRevokeTikTok.length) {
    console.error("POST-RELOAD OPTIONAL", afterReloadHits.filter((h) => isGoogleTagUrl(h.url) || isTikTokUrl(h.url)));
  }
  assert(postRevokeGoogle.length === 0, `revoke+reload has 0 new Google tag requests, got ${postRevokeGoogle.length}`);
  assert(postRevokeTikTok.length === 0, `revoke+reload has 0 new TikTok requests, got ${postRevokeTikTok.length}`);
  console.log("NETWORK revoke-reload", { google: postRevokeGoogle.length, tiktok: postRevokeTikTok.length, afterReload: afterReloadHits.length });
  await revokeCtx.close();

  const writes = writeHits(network);
  if (writes.length) {
    console.error(writes.slice(0, 20));
    fail(`supabase/stripe writes detected: ${writes.length}`);
  }
  console.log(`OK browser-qa requests=${network.length} writes=0 locales=ro,en viewports=390,768,1024,1440`);
} finally {
  await browser.close();
}
