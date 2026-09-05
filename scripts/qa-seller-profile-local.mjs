import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
        `PLAYWRIGHT_MODULE is set but could not be loaded: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  try {
    return require("playwright");
  } catch {
    // continue
  }

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  let current = scriptDir;
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(current, "node_modules", "playwright");
    try {
      return require(candidate);
    } catch {
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  fail(
    "Playwright is not installed in this repository. Add the playwright package locally, then retry.",
  );
}

const { chromium } = loadPlaywright();

const BASE = process.env.SELLER_QA_BASE?.trim() || "http://localhost:3012";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const GENERIC_ID = "d3fa3f7e-81d9-4c86-83c0-9baa2f98a199";
const PREMIUM_ID = "50e8decd-635a-46f7-908e-2ac1fddf8ac6";
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

function assert(condition, message) {
  if (!condition) fail(message);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "qa", "seller-profile-local");
mkdirSync(outDir, { recursive: true });

const writes = [];
const gets = [];

async function openPage() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("request", (req) => {
    const method = req.method();
    const url = req.url();
    if (WRITE_METHODS.has(method)) {
      writes.push({ method, url });
    } else if (method === "GET") {
      gets.push(url);
    }
  });
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (WRITE_METHODS.has(req.method())) {
      writes.push({ method: req.method(), url: req.url(), blocked: true });
      await route.abort();
      return;
    }
    await route.continue();
  });
  return { browser, page };
}

async function gotoListing(page, locale, id) {
  const url = `${BASE}/${locale}/anunt/${id}`;
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  assert(res, `no response for ${url}`);
  assert(res.ok(), `${url} returned ${res.status()}`);
  await page.waitForTimeout(800);
  return url;
}

function textHas(haystack, needle) {
  return haystack.includes(needle);
}

async function capture(page, name) {
  const path = join(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

const { browser, page } = await openPage();
const report = { base: BASE, writes: 0, pages: [] };

try {
  for (const locale of ["ro", "en"]) {
    await gotoListing(page, locale, GENERIC_ID);
    const html = await page.content();
    const card = page.locator("#seller-about-heading").locator("xpath=..");
    assert((await page.locator("#seller-about-heading").count()) === 1, `${locale} generic missing seller about heading`);
    await page.locator("#seller-about-heading").scrollIntoViewIfNeeded();
    const cardHtml = await card.evaluate((el) => el.outerHTML);
    const cardText = await card.innerText();

    assert(!html.includes("/render/image/"), `${locale} generic used /render/image/`);
    assert(!cardHtml.includes("Utilizator Quick Exit"), `${locale} generic card still shows Utilizator Quick Exit`);
    assert(!cardHtml.includes("Quick Exit user"), `${locale} generic card still shows Quick Exit user`);
    assert(!cardHtml.includes("userType"), `${locale} generic card still references userType`);

    if (locale === "ro") {
      assert(textHas(cardHtml, "Despre vânzător"), "RO title missing");
      assert(textHas(cardHtml, "Vânzător Quick Exit"), "RO fallback name missing");
      assert(textHas(cardHtml, "1 anunț activ"), "RO seller-scoped count missing");
      assert(
        textHas(
          cardHtml,
          "Datele de contact nu sunt afișate public. Trimite o ofertă pentru a iniția contactul.",
        ),
        "RO protected-contact missing",
      );
      assert(textHas(cardHtml, ">VQ<") || textHas(cardText, "VQ"), "RO initials VQ missing");
    } else {
      assert(textHas(cardHtml, "About the seller"), "EN title missing");
      assert(textHas(cardHtml, "Quick Exit seller"), "EN fallback name missing");
      assert(textHas(cardHtml, "1 active listing"), "EN seller-scoped count missing");
      assert(
        textHas(
          cardHtml,
          "Contact details are not displayed publicly. Submit an offer to start the conversation.",
        ),
        "EN protected-contact missing",
      );
      assert(textHas(cardHtml, ">QE<") || textHas(cardText, "QE"), "EN initials QE missing");
    }

    assert(!/Role|Rolul|user type|User type/i.test(cardText), `${locale} generic card still has role`);
    assert(!cardHtml.includes("@"), `${locale} generic card leaked email`);
    assert(!/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(cardHtml), `${locale} generic card leaked uuid`);
    assert(!textHas(cardHtml, "38"), `${locale} generic card used platform-wide 38`);

    const offerCta = page.getByRole("button").filter({
      hasText: locale === "ro" ? /ofert|detalii|licita/i : /offer|details|bid|auction/i,
    });
    assert((await offerCta.count()) >= 1, `${locale} generic missing offer CTA`);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.locator("#seller-about-heading").scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      await capture(page, `generic-${locale}-${vp.width}`);
    }

    report.pages.push({
      id: GENERIC_ID,
      locale,
      kind: "generic",
      title: locale === "ro" ? "Despre vânzător" : "About the seller",
      count: locale === "ro" ? "1 anunț activ" : "1 active listing",
    });
  }

  for (const locale of ["ro", "en"]) {
    await gotoListing(page, locale, PREMIUM_ID);
    const premiumHtml = await page.content();
    assert((await page.locator("#seller-about-heading").count()) === 0, `${locale} premium unexpectedly uses generic card`);
    assert((await page.locator("#managed-listing-heading").count()) === 1, `${locale} premium missing managed heading`);
    if (locale === "ro") {
      assert(premiumHtml.includes("Listare administrată de Quick Exit"), "RO managed title missing");
    } else {
      assert(premiumHtml.includes("Managed by Quick Exit"), "EN managed title missing");
    }
    const premiumCountMatch = premiumHtml.match(/Anunțuri active listate<\/span><span[^>]*>\s*(\d+)\s*<\/span>|Active listings<\/span><span[^>]*>\s*(\d+)\s*<\/span>/i);
    const premiumCount = Number(premiumCountMatch?.[1] || premiumCountMatch?.[2] || 0);
    assert(premiumCount > 1, `${locale} premium seller count should stay seller-scoped and above 1, got ${premiumCount}`);
    assert(premiumCount !== 1, `${locale} premium card must not use the generic single-listing fallback`);
    const premiumCountEl = page.locator("span").filter({ hasText: new RegExp(`^${premiumCount}$`) });
    if ((await premiumCountEl.count()) > 0) {
      await premiumCountEl.first().scrollIntoViewIfNeeded();
    }
    for (const vp of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(250);
      await capture(page, `premium-${locale}-${vp.width}`);
    }
    report.pages.push({ id: PREMIUM_ID, locale, kind: "premium", count: premiumCount });
  }

  assert(writes.length === 0, `unexpected writes: ${JSON.stringify(writes)}`);
  report.writes = writes.length;
  report.getCount = gets.length;
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log("OK seller-profile-browser");
  console.log(JSON.stringify({ writes: report.writes, pages: report.pages.length, shots: "qa/seller-profile-local" }, null, 2));
} finally {
  await browser.close();
}
