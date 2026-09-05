import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

const CANONICAL_PERSISTED_RO_VALUES = [
  "Auto & Moto",
  "Imobiliare",
  "Lux & Ceasuri",
  "Afaceri de vânzare",
  "Gadgets",
  "Foto & Audio",
  "Benzină",
  "Diesel",
  "Hibrid",
  "Electric",
  "Automată",
  "Manuală",
  "Sedan",
  "SUV",
  "Coupe",
  "Cabrio",
  "Off-Road",
  "Înmatriculat RO",
  "Neînmatriculat",
  "Înmatriculat Extern",
  "Nu (Vânzător PF)",
  "Da (Vânzător PJ)",
  "Apartament",
  "Casă / Vilă",
  "Teren",
  "Spațiu Comercial",
  "Inclus în preț",
  "Disponibil contra cost",
  "Fără parcare",
  "Automat",
  "Manual",
  "Quartz",
  "Full Set (Cutie + Acte)",
  "Doar Ceasul",
  "Ceas + Cutie",
] as const;

const AUTH_KEYS_USED = [
  "closeModal",
  "welcomeLead",
  "welcomeHighlight",
  "welcomeSubtitle",
  "emailLabel",
  "emailPlaceholder",
  "submitLoading",
  "submitButton",
  "autoAccountHint",
  "advancedOptions",
  "google",
  "web3Wallet",
  "errorPrefix",
  "magicLinkSent",
  "web3Maintenance",
] as const;

const VISIBLE_RO_MUST_NOT_APPEAR_IN_EN_COPY = [
  "Continuă la poze și descriere",
  "Plătește și publică anunțul",
  "Date despre activ",
  "Alege viteza de vânzare",
  "Înapoi la preț",
  "Se pregătește plata",
  "Completează titlul anunțului",
  "Afaceri de vânzare",
  "Lux & Ceasuri",
  "Foto & Audio",
  "Benzină",
  "Automată",
  "Înmatriculat RO",
  "Nu (Vânzător PF)",
  "Casă / Vilă",
  "Inclus în preț",
  "Doar Ceasul",
  "Bine ai venit",
  "Primește link-ul de acces",
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publish = readFileSync(join(root, "app/[locale]/pune-anunt/PuneAnuntClient.tsx"), "utf8");
const auth = readFileSync(join(root, "app/components/AuthModal.tsx"), "utf8");
const qaLocal = readFileSync(join(root, "scripts/qa-publish-en-i18n-local.mjs"), "utf8");
const ro = JSON.parse(readFileSync(join(root, "messages/ro.json"), "utf8")) as {
  PostListing: Record<string, unknown>;
  Auth: Record<string, unknown>;
};
const en = JSON.parse(readFileSync(join(root, "messages/en.json"), "utf8")) as {
  PostListing: Record<string, unknown>;
  Auth: Record<string, unknown>;
};

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
    flattenKeys(nested, prefix ? `${prefix}.${key}` : key),
  );
}

function readPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[part];
  }, source);
}

const roKeys = flattenKeys(ro.PostListing).sort();
const enKeys = flattenKeys(en.PostListing).sort();
assert(roKeys.length > 0, "RO PostListing has keys");
assert(
  JSON.stringify(roKeys) === JSON.stringify(enKeys),
  `PostListing key parity failed. RO-only=${roKeys.filter((k) => !enKeys.includes(k)).join(",")} EN-only=${enKeys.filter((k) => !roKeys.includes(k)).join(",")}`,
);

for (const key of AUTH_KEYS_USED) {
  assert(typeof ro.Auth[key] === "string", `RO Auth.${key} missing`);
  assert(typeof en.Auth[key] === "string", `EN Auth.${key} missing`);
  if (key !== "welcomeLead") {
    assert(String(ro.Auth[key]).length > 0, `RO Auth.${key} empty`);
    assert(String(en.Auth[key]).length > 0, `EN Auth.${key} empty`);
  } else {
    assert(String(ro.Auth[key]).length > 0, "RO Auth.welcomeLead empty");
  }
  assert(auth.includes(`t("${key}")`), `AuthModal does not use Auth.${key}`);
}

for (const key of enKeys) {
  const value = readPath(en.PostListing, key);
  assert(typeof value === "string" && value.length > 0, `EN PostListing.${key} empty`);
  const copy = String(value);
  assert(!/^PostListing\./.test(copy), `raw key rendered as EN copy: ${key}`);
  assert(copy !== key, `EN PostListing.${key} looks like a raw key`);
}

assert(ro.PostListing.descriptionFallback === "Anunț detaliat.", "RO description fallback unchanged");
assert(en.PostListing.descriptionFallback === "Detailed listing.", "EN description fallback");
assert(publish.includes('tPost("descriptionFallback")'), "publish uses localized description fallback");
assert(!publish.includes('"Anunț detaliat."'), "publish no longer hardcodes RO description fallback");

assert(publish.includes("CATEGORY_I18N_KEYS"), "category labels go through i18n map");
assert(publish.includes('tPost(`categories.${CATEGORY_I18N_KEYS'), "category chips use localized labels");

for (const value of CANONICAL_PERSISTED_RO_VALUES) {
  if (value === "Auto & Moto" || value === "Gadgets") {
    assert(publish.includes(`"${value}"`), `canonical category ${value} still stored`);
    continue;
  }
  if (
    ["Diesel", "Electric", "Sedan", "SUV", "Coupe", "Quartz", "Teren", "Manual"].includes(value)
  ) {
    assert(
      publish.includes(`value="${value}"`) || publish.includes(`"${value}"`),
      `canonical value ${value} still persisted`,
    );
    continue;
  }
  assert(
    publish.includes(`value="${value}"`) || publish.includes(`"${value}"`),
    `canonical persisted value missing: ${value}`,
  );
}

const optionTags = publish.match(/<option\b[^>]*>[\s\S]*?<\/option>/g) ?? [];
assert(optionTags.length >= CANONICAL_PERSISTED_RO_VALUES.length - 6, "enough option tags");
for (const tag of optionTags) {
  assert(/value="/.test(tag), `option missing persisted value: ${tag}`);
  assert(/\{tPost\("options\./.test(tag), `option missing localized label: ${tag}`);
  assert(!/>[A-ZĂÂÎȘȚa-zăâîșț][^<{]*</.test(tag), `option still shows raw text: ${tag}`);
}

const leftover = [
  "Continuă la poze și descriere",
  "Plătește și publică anunțul",
  "Date despre activ",
  "Alege viteza de vânzare",
  "Înapoi la preț",
  "Se pregătește plata",
  "Bine ai venit",
  "Primește link-ul de acces",
];
for (const phrase of leftover) {
  assert(!publish.includes(phrase), `publish still hardcodes: ${phrase}`);
}
assert(!auth.includes("Primește link-ul de acces"), "auth submit is not hardcoded RO");
assert(auth.includes('useTranslations("Auth")'), "auth modal uses Auth namespace");

function collectStrings(value: unknown, acc: string[] = []): string[] {
  if (typeof value === "string") {
    acc.push(value);
    return acc;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, acc);
    }
  }
  return acc;
}

const enCopy = collectStrings(en.PostListing).concat(collectStrings(en.Auth));
for (const phrase of VISIBLE_RO_MUST_NOT_APPEAR_IN_EN_COPY) {
  assert(
    !enCopy.some((text) => text.includes(phrase)),
    `EN catalog still contains visible RO: ${phrase}`,
  );
}

assert(readPath(ro.PostListing, "step1.continue") === "Continuă la poze și descriere →", "RO step1 CTA");
assert(readPath(en.PostListing, "step1.continue") === "Continue to photos and description →", "EN step1 CTA");
assert(readPath(ro.PostListing, "actions.payAndPublish") === "Plătește și publică anunțul", "RO pay CTA");
assert(readPath(en.PostListing, "actions.payAndPublish") === "Pay and publish listing", "EN pay CTA");
assert(publish.includes('tPost("successTitle")'), "success title is localized");
assert(publish.includes('tPost("successDescription")'), "success description is localized");
assert(publish.includes('tPost("goToDashboard")'), "success CTA is localized");
assert(!qaLocal.includes("D:/"), "QA runner has no D:/ path");
assert(!qaLocal.includes("D:\\\\"), "QA runner has no escaped D: path");
assert(qaLocal.includes('require("playwright")') || qaLocal.includes("PLAYWRIGHT_MODULE"), "QA runner resolves Playwright portably");
assert(!/sk_live|sk_test|SERVICE_ROLE|x-vercel-protection-bypass/.test(qaLocal), "QA runner has no credentials");
assert(qaLocal.includes("supabase.co") && qaLocal.includes("WRITE_METHODS"), "QA runner tracks vendor writes");

console.log("OK publish-en-i18n");
