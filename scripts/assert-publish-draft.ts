import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LISTING_AUTH_HANDOFF_STORAGE_KEY,
  LISTING_AUTH_HANDOFF_STORED_FIELDS,
  LISTING_AUTH_HANDOFF_TTL_MS,
  LISTING_AUTH_RESUME_FLAG_KEY,
  LISTING_AUTH_RESUME_FLAG_VALUE,
  LISTING_DRAFT_FORM_DATA_KEYS,
  LISTING_DRAFT_STORAGE_KEY,
  LISTING_DRAFT_STORED_FIELDS,
  LISTING_DRAFT_TTL_HOURS,
  LISTING_DRAFT_TTL_MS,
  LISTING_DRAFT_VERSION,
  PUBLISH_DRAFT_LOCAL_KEYS,
  PUBLISH_DRAFT_SESSION_KEYS,
  buildListingDraft,
  clearListingDraft,
  DEFAULT_LISTING_FORM_DATA,
  isPublishDraftStorageKey,
  listingDraftJsonLooksUnsafe,
  listingDraftSchemaHasForbiddenFields,
  loadListingAuthHandoff,
  parseListingDraftJson,
  peekPublishDraft,
  saveListingAuthHandoff,
  saveListingDraftImmediate,
} from "../lib/listingDraft";
import { EVALUATION_DRAFT_STORAGE_KEY } from "../lib/evaluationDraft";
import {
  assertPublishCheckoutReady,
  earliestIncompletePublishStep,
  guardedPublishStep,
  listingDraftToGuardInput,
  validatePublishStep1,
  validatePublishStep2,
} from "../lib/publishDraftGuard";
import { resolveCarBrandComboboxEnter } from "../lib/carBrandComboboxKeyboard";
import { handlePublishRecoveryDialogKeyDown } from "../lib/publishDraftRecoveryDialog";

const ATTRIBUTION_STORAGE_KEY = "quickexit_attribution";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

function installBrowserStorage() {
  const sessionStorage = memoryStorage();
  const localStorage = memoryStorage();
  Object.defineProperty(globalThis, "window", {
    value: { sessionStorage, localStorage },
    configurable: true,
    writable: true,
  });
  return { sessionStorage, localStorage };
}

const now = Date.now();

function validStep1Draft(
  overrides: Partial<Parameters<typeof buildListingDraft>[0]> = {},
) {
  return buildListingDraft({
    timestamp: now,
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
    formData: { ...DEFAULT_LISTING_FORM_DATA, make: "BMW", model: "320d" },
    evaluationPrefillActive: false,
    evaluationHandoffActive: false,
    ...overrides,
  });
}

function validCheckoutDraft() {
  return buildListingDraft({
    timestamp: now,
    step: 4,
    category: "Auto & Moto",
    adTitle: "BMW 320d",
    description: "Stare bună",
    exitPrice: "25000",
    pricingMode: "fixed_price",
    isExitPriceManuallyEdited: true,
    manualMarketPrice: "",
    marketPrice: 0,
    analyzedItems: 0,
    saleStrategy: "standard",
    selectedPackage: "standard",
    saleMethod: "direct",
    formData: { ...DEFAULT_LISTING_FORM_DATA, make: "BMW", model: "320d" },
    evaluationPrefillActive: false,
    evaluationHandoffActive: false,
  });
}

assert(LISTING_DRAFT_VERSION === 2, "draft schema is v2");
assert(LISTING_DRAFT_TTL_HOURS === 24, "draft TTL is 24 hours");
assert(LISTING_DRAFT_TTL_MS === 24 * 60 * 60 * 1000, "TTL ms matches 24h");
assert(LISTING_AUTH_HANDOFF_TTL_MS === 45 * 60 * 1000, "auth handoff TTL is 45 minutes");
assert(LISTING_AUTH_RESUME_FLAG_VALUE === "1", "resume flag is a boolean marker only");
assert(!listingDraftSchemaHasForbiddenFields(), "draft schema has no email/phone/token/file fields");
assert(LISTING_DRAFT_STORED_FIELDS.includes("adTitle"), "draft stores adTitle");
assert(LISTING_DRAFT_STORED_FIELDS.includes("pendingListingId"), "draft may store pending listing UUID");
assert(!(LISTING_DRAFT_STORED_FIELDS as readonly string[]).includes("email"), "draft has no email field");
assert(!(LISTING_DRAFT_FORM_DATA_KEYS as readonly string[]).includes("phone"), "formData has no phone field");
assert(LISTING_AUTH_HANDOFF_STORED_FIELDS.join(",") === "version,timestamp,expiresAt,reason,draft", "handoff fields exact");
assert(!listingDraftJsonLooksUnsafe(JSON.stringify(validStep1Draft())), "valid draft JSON is not a forbidden payload");
assert(listingDraftJsonLooksUnsafe("data:image/png;base64,aaaa"), "base64 image payload is forbidden");
assert(listingDraftJsonLooksUnsafe("blob:http://localhost/1"), "blob URL payload is forbidden");
assert(listingDraftJsonLooksUnsafe("sk_test_placeholdersecret"), "stripe secret payload is forbidden");
assert(
  PUBLISH_DRAFT_SESSION_KEYS.includes(LISTING_DRAFT_STORAGE_KEY),
  "session draft key listed",
);
assert(
  PUBLISH_DRAFT_SESSION_KEYS.includes(LISTING_AUTH_RESUME_FLAG_KEY),
  "resume flag listed",
);
assert(
  PUBLISH_DRAFT_LOCAL_KEYS.includes(LISTING_AUTH_HANDOFF_STORAGE_KEY),
  "handoff key listed",
);
assert(isPublishDraftStorageKey(LISTING_DRAFT_STORAGE_KEY), "publish key detected");
assert(!isPublishDraftStorageKey(ATTRIBUTION_STORAGE_KEY), "attribution is not a publish key");
assert(
  !isPublishDraftStorageKey(EVALUATION_DRAFT_STORAGE_KEY),
  "evaluation draft is not a publish key",
);

assert(parseListingDraftJson("{").ok === false, "invalid JSON fails closed");
assert(parseListingDraftJson("[]").ok === false, "array fails closed");
assert(parseListingDraftJson("null").ok === false, "null fails closed");

const unexpected = parseListingDraftJson(
  JSON.stringify({ ...validStep1Draft(), unexpected_field: true }),
);
assert(unexpected.ok === false, "unexpected fields fail closed");
if (!unexpected.ok) {
  assert(unexpected.reason === "unexpected_fields", "unexpected_fields reason");
}

const badVersion = parseListingDraftJson(
  JSON.stringify({ ...validStep1Draft(), version: 99 }),
);
assert(badVersion.ok === false, "incompatible version fails closed");

const expired = parseListingDraftJson(
  JSON.stringify({ ...validStep1Draft(), timestamp: now - LISTING_DRAFT_TTL_MS - 1 }),
  now,
);
assert(expired.ok === false, "expired draft fails closed");
if (!expired.ok) assert(expired.reason === "expired", "expired reason");

const parsedOk = parseListingDraftJson(JSON.stringify(validStep1Draft()), now);
assert(parsedOk.ok === true, "valid draft parses");

assert(validatePublishStep1({
  category: "Auto & Moto",
  adTitle: "",
  formData: DEFAULT_LISTING_FORM_DATA,
}) === "title", "empty title is step 1");
assert(
  validatePublishStep2({
    category: "Auto & Moto",
    adTitle: "BMW 320d",
    formData: { ...DEFAULT_LISTING_FORM_DATA, make: "BMW", model: "320d" },
  }) === true,
  "step 2 does not require photos or description",
);

const incompleteStep4 = validStep1Draft({ step: 4, exitPrice: "", pricingMode: null });
assert(
  earliestIncompletePublishStep(listingDraftToGuardInput(incompleteStep4)) === 3,
  "step-4 claim with no pricing returns step 3",
);
assert(
  guardedPublishStep(4, listingDraftToGuardInput(incompleteStep4)) === 3,
  "guard clamps claimed step 4 to earliest incomplete",
);
assert(
  assertPublishCheckoutReady(listingDraftToGuardInput(incompleteStep4)).ok === false,
  "incomplete step-4 draft cannot checkout",
);

const emptyTitleStep4 = validStep1Draft({
  step: 4,
  adTitle: "",
  formData: DEFAULT_LISTING_FORM_DATA,
});
assert(
  earliestIncompletePublishStep(listingDraftToGuardInput(emptyTitleStep4)) === 1,
  "step-4 claim with empty title returns step 1",
);

const ready = listingDraftToGuardInput(validCheckoutDraft());
assert(assertPublishCheckoutReady(ready).ok === true, "valid 1-3 draft can checkout");
assert(earliestIncompletePublishStep(ready) === 4, "complete draft earliest is 4");
assert(
  guardedPublishStep(4, ready) === 4,
  "valid continuation may show step 4",
);

const { sessionStorage, localStorage } = installBrowserStorage();
localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({ utm_source: "google" }));
sessionStorage.setItem(EVALUATION_DRAFT_STORAGE_KEY, "{\"keep\":true}");
sessionStorage.setItem("unrelated_key", "keep-me");
localStorage.setItem("cookie-consent", "granted");

assert(peekPublishDraft().status === "none", "no draft starts as none / step 1");

const emptySaved = saveListingDraftImmediate(
  buildListingDraft({
    timestamp: now,
    step: 1,
    category: "Auto & Moto",
    adTitle: "",
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
    formData: { ...DEFAULT_LISTING_FORM_DATA },
    evaluationPrefillActive: false,
    evaluationHandoffActive: false,
  }),
);
assert(emptySaved === false, "empty form is not persisted");
assert(sessionStorage.getItem(LISTING_DRAFT_STORAGE_KEY) === null, "empty save leaves no draft key");

saveListingDraftImmediate(validStep1Draft());
const peeked = peekPublishDraft();
assert(peeked.status === "available", "valid draft is available for explicit choice");
assert(peeked.status === "available" && peeked.draft.step === 1, "peek does not invent step 4");

const beforeClear = {
  attr: localStorage.getItem(ATTRIBUTION_STORAGE_KEY),
  evalDraft: sessionStorage.getItem(EVALUATION_DRAFT_STORAGE_KEY),
  unrelated: sessionStorage.getItem("unrelated_key"),
  consent: localStorage.getItem("cookie-consent"),
};
clearListingDraft();
assert(sessionStorage.getItem(LISTING_DRAFT_STORAGE_KEY) === null, "publish draft cleared");
assert(sessionStorage.getItem(LISTING_AUTH_RESUME_FLAG_KEY) === null, "resume flag cleared");
assert(localStorage.getItem(LISTING_AUTH_HANDOFF_STORAGE_KEY) === null, "handoff cleared");
assert(localStorage.getItem(ATTRIBUTION_STORAGE_KEY) === beforeClear.attr, "attribution kept");
assert(
  sessionStorage.getItem(EVALUATION_DRAFT_STORAGE_KEY) === beforeClear.evalDraft,
  "evaluation draft kept",
);
assert(sessionStorage.getItem("unrelated_key") === beforeClear.unrelated, "unrelated session kept");
assert(localStorage.getItem("cookie-consent") === beforeClear.consent, "consent kept");
assert(peekPublishDraft().status === "none", "after new listing, no draft / step 1");

saveListingDraftImmediate(validStep1Draft());
const handoffSaved = saveListingAuthHandoff(validStep1Draft());
assert(handoffSaved, "auth handoff saves");
const loadedHandoff = loadListingAuthHandoff();
assert(loadedHandoff?.reason === "auth_required", "handoff reason is auth_required");
assert(
  loadedHandoff !== null && loadedHandoff.expiresAt - loadedHandoff.timestamp === LISTING_AUTH_HANDOFF_TTL_MS,
  "handoff TTL is exactly 45 minutes",
);
assert(!("email" in (loadedHandoff ?? {})), "handoff wrapper has no email");
localStorage.setItem(
  LISTING_AUTH_HANDOFF_STORAGE_KEY,
  JSON.stringify({
    ...loadedHandoff,
    expiresAt: Date.now() - 1,
  }),
);
assert(loadListingAuthHandoff() === null, "expired handoff is removed");
assert(localStorage.getItem(LISTING_AUTH_HANDOFF_STORAGE_KEY) === null, "expired handoff key cleared");

const withImage = buildListingDraft({
  ...validStep1Draft(),
  description: "see data:image/png;base64,aaaaBBBBcccc and blob:http://localhost/1",
});
assert(!withImage.description.includes("data:image"), "base64 images stripped from stored description");
assert(!withImage.description.includes("blob:"), "blob URLs stripped from stored description");

sessionStorage.setItem(LISTING_DRAFT_STORAGE_KEY, "{not-json");
assert(peekPublishDraft().status === "none", "corrupted draft treated as none");
assert(sessionStorage.getItem(LISTING_DRAFT_STORAGE_KEY) === null, "corrupted draft cleared");

saveListingDraftImmediate(validCheckoutDraft());
const continued = peekPublishDraft();
assert(continued.status === "available", "valid continuation peek");
if (continued.status === "available") {
  const restored = listingDraftToGuardInput(continued.draft);
  assert(restored.adTitle === "BMW 320d", "continuation restores title");
  assert(restored.formData.make === "BMW", "continuation restores make");
  assert(restored.exitPrice === "25000", "continuation restores price");
  assert(assertPublishCheckoutReady(restored).ok === true, "valid continuation can checkout");
}

assert(
  resolveCarBrandComboboxEnter({ open: true, highlighted: "BMW" }) === "select_highlight",
  "Enter selects highlighted make",
);
assert(
  resolveCarBrandComboboxEnter({ open: false, highlighted: "BMW" }) === "ignore",
  "Enter does not submit when closed",
);
assert(
  resolveCarBrandComboboxEnter({ open: true, highlighted: undefined }) === "ignore",
  "Enter does not submit without highlight",
);

const publish = readFileSync("app/[locale]/pune-anunt/PuneAnuntClient.tsx", "utf8");
assert(publish.includes("peekPublishDraft"), "publish peeks instead of silent restore");
assert(!publish.includes("resolveListingDraftForRestore()"), "no silent resolve on mount");
assert(publish.includes("continueRecoveredDraft"), "continue draft action");
assert(publish.includes("startNewListingFromRecovery"), "start new listing action");
assert(publish.includes("draft.continue"), "continue copy key");
assert(publish.includes("draft.startNew"), "start new copy key");
assert(publish.includes("draft.recoveryConsequence"), "consequence copy key");
assert(publish.includes("PublishDraftRecoveryDialog"), "recovery uses dialog component");
assert(publish.includes("inert"), "form behind dialog is inert");
assert(publish.includes('aria-hidden'), "form behind dialog is aria-hidden");
assert(!publish.includes("window.confirm") || publish.includes("discardConfirm"), "no nested confirm on recovery; discard confirm remains separate");
assert(publish.includes("handlePublishFormSubmit"), "form submit is intercepted");
assert(publish.includes("event.preventDefault()"), "form submit prevented");
assert(publish.includes("assertPublishCheckoutReady"), "client checkout guard present");
assert(publish.includes("Abandonează ciorna") || publish.includes("draft.discard"), "discard remains");

const combobox = readFileSync("app/components/CarBrandCombobox.tsx", "utf8");
assert(combobox.includes("resolveCarBrandComboboxEnter"), "combobox uses enter helper");
assert(combobox.includes("event.stopPropagation()"), "Enter does not bubble to form");
assert(combobox.includes('type="button"'), "combobox options are type=button");

function assertButtonsAreTypeButton(src: string, label: string) {
  const tags = src.match(/<button\b[\s\S]*?>/g) ?? [];
  assert(tags.length > 0, `${label} has buttons`);
  for (const tag of tags) {
    assert(tag.includes('type="button"'), `${label} button is type=button: ${tag.slice(0, 80)}`);
  }
}

assertButtonsAreTypeButton(combobox, "CarBrandCombobox");
assertButtonsAreTypeButton(publish, "PuneAnuntClient");

assert(!existsSync(resolve("lib/listingInquiry.ts")), "Phase 2B listingInquiry absent");
assert(!existsSync(resolve("app/api/listings")), "Phase 2B listings inquiry API absent");
assert(!existsSync(resolve("app/api/hq/inquiries")), "Phase 2B hq inquiries API absent");
assert(!publish.includes("listingInquiry"), "publish client has no Phase 2B inquiry");

const messagesRo = JSON.parse(readFileSync("messages/ro.json", "utf8")) as {
  PostListing: { draft: Record<string, string> };
};
const messagesEn = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
  PostListing: { draft: Record<string, string> };
};
assert(messagesRo.PostListing.draft.continue === "Continuă ciorna", "RO continue label");
assert(
  messagesRo.PostListing.draft.startNew === "Șterge ciorna și începe un anunț nou",
  "RO destructive label",
);
assert(
  messagesRo.PostListing.draft.recoveryConsequence.includes("Contul tău rămâne neschimbat"),
  "RO copy explains account is unaffected",
);
assert(messagesEn.PostListing.draft.continue === "Continue draft", "EN continue label");
assert(
  messagesEn.PostListing.draft.startNew === "Delete draft and start a new listing",
  "EN destructive label",
);
assert(
  messagesEn.PostListing.draft.recoveryConsequence.includes("Your account is not affected"),
  "EN copy explains account is unaffected",
);

const dialogSrc = readFileSync("app/[locale]/pune-anunt/PublishDraftRecoveryDialog.tsx", "utf8");
assert(dialogSrc.includes('role="dialog"'), "dialog semantics");
assert(dialogSrc.includes("aria-modal"), "aria-modal");
assert(dialogSrc.includes("aria-labelledby"), "accessible title");
assert(dialogSrc.includes("continueRef.current?.focus()"), "focus enters dialog");
assert(dialogSrc.includes("handlePublishRecoveryDialogKeyDown"), "keyboard handler wired");
assert(!dialogSrc.includes('key === "Escape"'), "Escape is handled by helper, not as an action");
assertButtonsAreTypeButton(dialogSrc, "PublishDraftRecoveryDialog");

const escapeAction = handlePublishRecoveryDialogKeyDown(
  {
    key: "Escape",
    shiftKey: false,
    preventDefault() {
      this.prevented = true;
    },
    stopPropagation() {
      this.stopped = true;
    },
    prevented: false,
    stopped: false,
  } as {
    key: string;
    shiftKey: boolean;
    preventDefault: () => void;
    stopPropagation: () => void;
    prevented?: boolean;
    stopped?: boolean;
  },
  { getFocusables: () => [], getActive: () => null },
);
assert(escapeAction === "escape_ignored", "Escape does not choose continue or delete");

const first = { id: "continue", focus() { this.focused = true; }, focused: false };
const last = { id: "delete", focus() { this.focused = true; }, focused: false };
const wrap = handlePublishRecoveryDialogKeyDown(
  {
    key: "Tab",
    shiftKey: false,
    preventDefault() {},
    stopPropagation() {},
  },
  { getFocusables: () => [first, last], getActive: () => last },
);
assert(wrap === "tab_wrapped", "Tab order wraps between the two actions");
assert(first.focused === true, "Tab from last returns to continue");

console.log("OK publish-draft");
