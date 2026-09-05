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
      fail(`PLAYWRIGHT_MODULE could not be loaded: ${error instanceof Error ? error.message : error}`);
    }
  }
  try {
    return require("playwright");
  } catch {
    fail("Playwright is not installed. Set PLAYWRIGHT_MODULE or add the playwright package locally.");
  }
}

const { chromium } = loadPlaywright();
const BASE = process.env.PUBLISH_QA_BASE?.trim() || "http://127.0.0.1:3013";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

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

const writes = [];

function isVendorWrite(url) {
  const host = url.toLowerCase();
  return (
    host.includes("supabase.co") ||
    host.includes("stripe.com") ||
    host.includes("api.stripe.com")
  );
}

async function openPage() {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("request", (req) => {
    if (WRITE_METHODS.has(req.method()) && isVendorWrite(req.url())) {
      writes.push({ method: req.method(), url: req.url() });
    }
  });
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (WRITE_METHODS.has(req.method()) && isVendorWrite(req.url())) {
      writes.push({ method: req.method(), url: req.url(), blocked: true });
      await route.abort();
      return;
    }
    await route.continue();
  });
  return { browser, page };
}

async function gotoPublish(page, locale, draft) {
  const res = await page.goto(`${BASE}/${locale}/pune-anunt`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  assert(res, `no response ${locale}`);
  assert(res.ok(), `${locale} publish ${res.status()}`);
  if (draft) {
    await page.evaluate((raw) => {
      sessionStorage.setItem("quickExitListingDraft", raw);
    }, JSON.stringify(draft));
    await page.reload({ waitUntil: "domcontentloaded" });
  } else {
    await page.evaluate(() => {
      sessionStorage.removeItem("quickExitListingDraft");
      localStorage.removeItem("quickExitListingDraftAuthHandoff");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(500);
}

async function noOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
}

async function visibleText(page) {
  return page.locator("body").innerText();
}

async function collectSelectPairs(page) {
  return page.locator("select option").evaluateAll((options) =>
    options.map((option) => ({
      value: option.getAttribute("value") || "",
      text: (option.textContent || "").trim(),
    })),
  );
}

async function openAuthModal(page, localePath) {
  const res = await page.goto(`${BASE}${localePath}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  assert(res, `no response ${localePath}`);
  assert(res.ok(), `${localePath} ${res.status()}`);
  await page.evaluate(() => {
    sessionStorage.removeItem("quickExitListingDraft");
    localStorage.removeItem("quickExitListingDraftAuthHandoff");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);
  if ((await page.getByRole("dialog").count()) > 0) {
    const startNew = page.getByRole("button", { name: /Delete draft and start a new listing|Șterge ciorna/i });
    if ((await startNew.count()) > 0) {
      await startNew.click();
      await page.waitForTimeout(300);
    }
  }
  await page.getByRole("button", { name: /sign in/i }).first().click();
  const close = page.getByRole("button", { name: /close sign-in dialog/i });
  await close.waitFor({ timeout: 8000 });
  return close.locator("xpath=ancestor::div[contains(@class,'max-w-md')]").first();
}

const EN_CATEGORIES = [
  {
    name: "Auto",
    button: /Auto & Moto/i,
    labels: [/listing title/i, /make/i, /model/i, /fuel/i, /gearbox/i, /registration/i],
    placeholders: [/mercedes|herastrau/i],
    pairs: [
      { value: "Benzină", text: /petrol/i },
      { value: "Automată", text: /automatic/i },
      { value: "Înmatriculat RO", text: /registered in romania/i },
      { value: "Nu (Vânzător PF)", text: /no \(individual seller\)/i },
    ],
    hidden: [/benzină/i, /automată/i, /înmatriculat ro/i, /nu \(vânzător pf\)/i],
    titleOnlyValidation: /enter the vehicle make and model/i,
  },
  {
    name: "Imobiliare",
    button: /Real estate/i,
    labels: [/property type/i, /usable area/i, /exact location/i, /parking/i],
    placeholders: [/bucharest|sector/i],
    pairs: [
      { value: "Casă / Vilă", text: /house \/ villa/i },
      { value: "Spațiu Comercial", text: /commercial space/i },
      { value: "Inclus în preț", text: /included in the price/i },
    ],
    hidden: [/casă \/ vilă/i, /spațiu comercial/i, /inclus în preț/i, /imobiliare/i],
    titleOnlyValidation: /enter the location and surface area/i,
  },
  {
    name: "Lux",
    button: /Luxury & watches/i,
    labels: [/brand/i, /movement/i, /set & provenance/i],
    placeholders: [/patek|rolex|nautilus/i],
    pairs: [
      { value: "Automat", text: /automatic/i },
      { value: "Doar Ceasul", text: /watch only/i },
      { value: "Full Set (Cutie + Acte)", text: /full set \(box \+ papers\)/i },
    ],
    hidden: [/doar ceasul/i, /full set \(cutie \+ acte\)/i, /lux & ceasuri/i],
    titleOnlyValidation: /enter the brand and model/i,
  },
  {
    name: "Business",
    button: /Businesses for sale/i,
    labels: [/industry/i, /annual revenue/i, /employees/i],
    placeholders: [/e-commerce|restaurant/i],
    pairs: [],
    hidden: [/afaceri de vânzare/i],
    titleOnlyValidation: /enter the industry and revenue/i,
  },
  {
    name: "Gadgets",
    button: /Gadgets/i,
    labels: [/exact brand/i, /key specifications/i, /remaining warranty/i],
    placeholders: [/macbook|battery/i],
    pairs: [],
    hidden: [],
    titleOnlyValidation: /enter the product brand and model/i,
  },
  {
    name: "Foto",
    button: /Photo & audio/i,
    labels: [/exact brand/i, /key specifications/i],
    placeholders: [/macbook|battery/i],
    pairs: [],
    hidden: [/foto & audio/i],
    titleOnlyValidation: /enter the product brand and model/i,
  },
];

const { browser, page } = await openPage();

try {
  for (const locale of ["ro", "en"]) {
    await gotoPublish(page, locale);
    assert((await page.getByRole("dialog").count()) === 0, `${locale} fresh opened recovery`);
    const body = await page.locator("body").innerText();
    const folded = body.toLocaleLowerCase("ro-RO");
    if (locale === "ro") {
      await page.getByRole("button", { name: /Continuă la poze și descriere/i }).waitFor({ timeout: 8000 });
      assert(/continuă la poze și descriere/i.test(body), "RO CTA missing");
      assert(/date despre activ|date activ/i.test(body), "RO step1 title missing");
      assert(!/continue to photos and description/i.test(body), "RO showed EN CTA");
    } else {
      await page.getByRole("button", { name: /Continue to photos and description/i }).waitFor({ timeout: 8000 });
      assert(/continue to photos and description/i.test(body), "EN CTA missing");
      assert(!folded.includes("continuă la poze"), "EN still shows RO CTA");
      assert(!folded.includes("plătește și publică"), "EN still shows RO pay");
      assert(!folded.includes("înapoi la preț"), "EN still shows RO back");
      assert(!folded.includes("date despre activ"), "EN still shows RO step1");
      assert(!folded.includes("alege viteza de vânzare"), "EN still shows RO step3 CTA");
      assert(!folded.includes("completează titlul anunțului"), "EN still shows RO validation");
    }
    assert((await page.getByRole("button", { name: /Plătește|Pay and publish/i }).count()) === 0, `${locale} pay on step 1`);

    const make = page.getByRole("combobox").first();
    if ((await make.count()) > 0) {
      await make.click();
      await make.fill("BMW");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      assert(
        (await page.getByRole("button", { name: /Continuă la poze|Continue to photos/i }).count()) >= 1,
        `${locale} Enter left step 1`,
      );
      assert((await page.getByRole("button", { name: /Plătește|Pay and publish/i }).count()) === 0, `${locale} Enter opened pay`);
    }

    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(200);
      assert(await noOverflow(page), `${locale} overflow at ${vp.width}`);
    }
  }

  await gotoPublish(page, "en", draftPayload());
  await page.getByRole("dialog").waitFor({ timeout: 8000 });
  const dialog = await page.getByRole("dialog").innerText();
  assert(/continue draft/i.test(dialog), "EN recovery continue missing");
  assert(/delete draft and start a new listing/i.test(dialog), "EN recovery start-new missing");
  assert(!/continuă ciorna/i.test(dialog), "EN recovery still RO");
  await page.getByRole("button", { name: /Delete draft and start a new listing/i }).click();
  await page.waitForTimeout(400);
  assert((await page.getByRole("dialog").count()) === 0, "EN start-new left dialog");
  await page.getByRole("button", { name: /Continue to photos and description/i }).waitFor({ timeout: 8000 });

  await gotoPublish(page, "ro", draftPayload());
  await page.getByRole("dialog").waitFor({ timeout: 8000 });
  const roDialog = await page.getByRole("dialog").innerText();
  assert(/continuă ciorna/i.test(roDialog), "RO recovery continue missing");
  await page.getByRole("button", { name: /Continuă ciorna/i }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Continuă la poze și descriere/i }).waitFor({ timeout: 8000 });

  await gotoPublish(page, "en", draftPayload({
    step: 3,
    pricingMode: "fixed_price",
    exitPrice: "12000",
    saleMethod: "direct",
  }));
  if ((await page.getByRole("dialog").count()) > 0) {
    await page.getByRole("button", { name: /Continue draft/i }).click();
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: /Choose listing speed/i }).waitFor({ timeout: 8000 });
  const step3 = await page.locator("body").innerText();
  assert(/sale method|price/i.test(step3), "EN step 3 missing");
  assert(!/alege viteza de vânzare/i.test(step3), "EN step 3 still RO");

  await gotoPublish(page, "en", draftPayload({
    step: 4,
    pricingMode: "fixed_price",
    exitPrice: "12000",
    saleMethod: "direct",
    selectedPackage: "standard",
  }));
  if ((await page.getByRole("dialog").count()) > 0) {
    await page.getByRole("button", { name: /Continue draft/i }).click();
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: /Pay and publish listing/i }).waitFor({ timeout: 8000 });
  const step4 = await page.locator("body").innerText();
  assert(/pay and publish listing/i.test(step4), "EN pay CTA missing");
  assert(!/plătește și publică/i.test(step4), "EN step 4 still RO pay");
  assert(/fast sale|maximum exposure/i.test(step4), "EN packages missing");

  await gotoPublish(page, "en", draftPayload({ step: 4, pricingMode: null, exitPrice: "", adTitle: "" }));
  if ((await page.getByRole("dialog").count()) > 0) {
    await page.getByRole("button", { name: /Continue draft/i }).click();
    await page.waitForTimeout(400);
  }
  assert((await page.getByRole("button", { name: /Pay and publish listing/i }).count()) === 0, "incomplete draft reached pay");
  await page.getByRole("button", { name: /Continue to photos and description/i }).waitFor({ timeout: 8000 });

  await gotoPublish(page, "ro", draftPayload({
    step: 2,
    adTitle: "BMW 320d",
    formData: { ...defaultForm, make: "BMW", model: "320d" },
  }));
  if ((await page.getByRole("dialog").count()) > 0) {
    await page.getByRole("button", { name: /Continuă ciorna/i }).click();
    await page.waitForTimeout(400);
  }
  const roStep2 = await visibleText(page);
  assert(/poze și descriere|poze & descriere/i.test(roStep2), "RO step 2 missing");
  assert(!/continue to photos and description/i.test(roStep2), "RO step 2 showed EN");

  await gotoPublish(page, "ro", draftPayload({
    step: 3,
    pricingMode: "fixed_price",
    exitPrice: "12000",
    saleMethod: "direct",
  }));
  if ((await page.getByRole("dialog").count()) > 0) {
    await page.getByRole("button", { name: /Continuă ciorna/i }).click();
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: /Alege viteza de vânzare/i }).waitFor({ timeout: 8000 });

  await gotoPublish(page, "ro", draftPayload({
    step: 4,
    pricingMode: "fixed_price",
    exitPrice: "12000",
    saleMethod: "direct",
    selectedPackage: "standard",
  }));
  if ((await page.getByRole("dialog").count()) > 0) {
    await page.getByRole("button", { name: /Continuă ciorna/i }).click();
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: /Plătește și publică anunțul/i }).waitFor({ timeout: 8000 });
  const roStep4 = await visibleText(page);
  assert(/plătește și publică anunțul/i.test(roStep4), "RO pay CTA missing");
  assert(!/pay and publish listing/i.test(roStep4), "RO step 4 showed EN pay");

  await gotoPublish(page, "en");
  const enHtml = await page.content();
  assert(enHtml.includes("Listing activated successfully"), "EN success title missing from catalog payload");
  assert(enHtml.includes("Your listing is live"), "EN success description missing from catalog payload");
  assert(enHtml.includes("Go to my account"), "EN success CTA missing from catalog payload");
  assert(enHtml.includes("Detailed listing."), "EN description fallback missing from catalog payload");
  const enVisible = await visibleText(page);
  assert(!/listing activated successfully/i.test(enVisible), "success screen rendered without local success state");

  await gotoPublish(page, "ro");
  const roHtml = await page.content();
  assert(roHtml.includes("Anunț detaliat."), "RO description fallback missing from catalog payload");
  assert(roHtml.includes("Anunț activat cu succes"), "RO success title missing from catalog payload");

  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoPublish(page, "en");
  for (const category of EN_CATEGORIES) {
    await page.getByRole("button", { name: category.button }).first().click();
    await page.waitForTimeout(250);
    const body = await visibleText(page);
    for (const label of category.labels) {
      assert(label.test(body), `${category.name} missing label ${label}`);
    }
    for (const hidden of category.hidden) {
      assert(!hidden.test(body), `${category.name} still shows stored RO ${hidden}`);
    }
    const placeholders = await page.locator("input[placeholder]").evaluateAll((inputs) =>
      inputs.map((input) => input.getAttribute("placeholder") || ""),
    );
    if (category.placeholders.length > 0) {
      assert(
        placeholders.some((placeholder) => category.placeholders.some((re) => re.test(placeholder))),
        `${category.name} missing EN placeholder`,
      );
    }
    const pairs = await collectSelectPairs(page);
    for (const pair of category.pairs) {
      const match = pairs.find((item) => item.value === pair.value);
      assert(match, `${category.name} missing persisted value ${pair.value}`);
      assert(pair.text.test(match.text), `${category.name} value ${pair.value} rendered ${match.text}`);
      assert(match.text !== pair.value, `${category.name} displayed stored value ${pair.value}`);
    }
    await page.getByRole("button", { name: /Continue to photos and description/i }).click();
    await page.waitForTimeout(200);
    let error = await visibleText(page);
    assert(/enter the listing title/i.test(error), `${category.name} missing title validation`);
    await page.locator("input[type='text']").first().fill("QA title");
    await page.getByRole("button", { name: /Continue to photos and description/i }).click();
    await page.waitForTimeout(200);
    error = await visibleText(page);
    assert(category.titleOnlyValidation.test(error), `${category.name} missing field validation`);
    await page.locator("input[type='text']").first().fill("");
    assert((await page.getByRole("button", { name: /Pay and publish listing/i }).count()) === 0, `${category.name} left step 1`);
  }

  const authFromPublish = await openAuthModal(page, "/en/pune-anunt");
  const authPublishCopy = await authFromPublish.innerText();
  assert(/welcome/i.test(authPublishCopy), "EN auth welcome missing on publish");
  assert(/send access link/i.test(authPublishCopy), "EN auth email CTA missing on publish");
  assert(/google/i.test(authPublishCopy), "EN auth Google missing on publish");
  assert(/create an account or sign in with email/i.test(authPublishCopy), "EN auth email label missing on publish");
  assert(!/bine ai/i.test(authPublishCopy), "EN auth still shows RO welcome on publish");
  assert(!/primește link-ul de acces/i.test(authPublishCopy), "EN auth still shows RO submit on publish");
  await page.getByRole("button", { name: /close sign-in dialog/i }).click();
  await page.waitForTimeout(200);

  const authFromHome = await openAuthModal(page, "/en");
  const authHomeCopy = await authFromHome.innerText();
  assert(/welcome/i.test(authHomeCopy), "EN auth welcome missing on home");
  assert(/send access link/i.test(authHomeCopy), "EN auth email CTA missing on home");
  assert(/google/i.test(authHomeCopy), "EN auth Google missing on home");
  assert(!/bine ai/i.test(authHomeCopy), "EN auth still shows RO welcome on home");
  await page.getByRole("button", { name: /close sign-in dialog/i }).click();

  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(200);
    assert(await noOverflow(page), `home overflow at ${vp.width}`);
  }

  assert(writes.length === 0, `unexpected vendor writes: ${JSON.stringify(writes)}`);
  console.log(JSON.stringify({ ok: true, writes: writes.length, locales: ["ro", "en"], viewports: VIEWPORTS.map((v) => v.width) }, null, 2));
} finally {
  await browser.close();
}
