import { type PricingMode } from "@/lib/pricingMode";
import {
  coerceCompatibleSaleIntent,
  parseListingSalePackageId,
  type ListingSalePackageId,
  type SaleMethod,
} from "@/lib/listingSaleStrategy";

export const LISTING_DRAFT_STORAGE_KEY = "quickExitListingDraft";
export const LISTING_AUTH_HANDOFF_STORAGE_KEY = "quickExitListingDraftAuthHandoff";
export const LISTING_AUTH_RESUME_FLAG_KEY = "quickExitListingAuthResume";
/** Current draft schema version (V1 drafts are migrated on read). */
export const LISTING_DRAFT_VERSION = 2 as const;
const LISTING_DRAFT_ACCEPTED_VERSIONS = new Set([1, 2]);
export const LISTING_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
/** Auth handoff TTL — cross-tab magic link (45 min). */
export const LISTING_AUTH_HANDOFF_TTL_MS = 45 * 60 * 1000;
export const LISTING_DRAFT_SAVE_DEBOUNCE_MS = 400;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ListingDraftPackageId = ListingSalePackageId;

export type ListingDraftFormData = {
  make: string;
  model: string;
  year: string;
  km: string;
  fuel: string;
  engine: string;
  transmission: string;
  bodyType: string;
  status: string;
  tva: string;
  propType: string;
  surface: string;
  rooms: string;
  buildYear: string;
  floor: string;
  parking: string;
  landSurface: string;
  location: string;
  brand: string;
  refModel: string;
  purchaseYear: string;
  mechanism: string;
  material: string;
  boxPapers: string;
  businessDomain: string;
  businessAge: string;
  revenue: string;
  profit: string;
  employees: string;
  includes: string;
  specs: string;
  warranty: string;
};

export type ListingDraftV1 = {
  version: typeof LISTING_DRAFT_VERSION;
  timestamp: number;
  step: number;
  category: string;
  adTitle: string;
  description: string;
  exitPrice: string;
  pricingMode: PricingMode | null;
  isExitPriceManuallyEdited: boolean;
  manualMarketPrice: string;
  marketPrice: number;
  analyzedItems: number;
  saleStrategy: string;
  selectedPackage: ListingDraftPackageId;
  saleMethod: SaleMethod;
  formData: ListingDraftFormData;
  evaluationConfidenceScore?: number;
  evaluationPrefillActive: boolean;
  evaluationHandoffActive: boolean;
  /** Server-validated pending_payment listing to resume checkout (never trust alone). */
  pendingListingId?: string;
  pendingListingCreatedAt?: number;
};

export type ListingAuthHandoffV1 = {
  version: typeof LISTING_DRAFT_VERSION;
  timestamp: number;
  expiresAt: number;
  reason: "auth_required";
  draft: ListingDraftV1;
};

export type ListingDraftRestoreSource = "session" | "auth_handoff";

export type ListingDraftRestoreResult = {
  draft: ListingDraftV1;
  source: ListingDraftRestoreSource;
  handoffReason?: "auth_required";
};

export type ListingDraftAnalyticsParams = {
  step: number;
  category: string;
  package: string;
  draft_version: number;
  reason: string;
  source?: string;
};

const VALID_PRICING_MODES = new Set<PricingMode>([
  "evaluated",
  "fixed_price",
  "price_on_request",
]);

const FORM_DATA_KEYS = [
  "make",
  "model",
  "year",
  "km",
  "fuel",
  "engine",
  "transmission",
  "bodyType",
  "status",
  "tva",
  "propType",
  "surface",
  "rooms",
  "buildYear",
  "floor",
  "parking",
  "landSurface",
  "location",
  "brand",
  "refModel",
  "purchaseYear",
  "mechanism",
  "material",
  "boxPapers",
  "businessDomain",
  "businessAge",
  "revenue",
  "profit",
  "employees",
  "includes",
  "specs",
  "warranty",
] as const;

export const DEFAULT_LISTING_FORM_DATA: ListingDraftFormData = {
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

const MAX_TEXT = 8_000;
const MAX_TITLE = 200;
const MAX_SHORT = 120;

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function clampStep(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(4, Math.max(1, Math.round(n)));
}

function sanitizeText(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trimStart();
  if (!trimmed) return "";
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function sanitizeShort(value: unknown, max = MAX_SHORT): string {
  return sanitizeText(value, max);
}

function sanitizeFormData(raw: unknown): ListingDraftFormData {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out: ListingDraftFormData = { ...DEFAULT_LISTING_FORM_DATA };
  for (const key of FORM_DATA_KEYS) {
    const value = sanitizeShort(source[key], key === "includes" || key === "specs" ? 2_000 : MAX_SHORT);
    if (value || key in DEFAULT_LISTING_FORM_DATA) {
      out[key] = value || DEFAULT_LISTING_FORM_DATA[key];
    }
  }
  return out;
}

function sanitizePackage(value: unknown): ListingDraftPackageId {
  return parseListingSalePackageId(value) ?? "standard";
}

function sanitizePricingMode(value: unknown): PricingMode | null {
  if (value === null || value === undefined || value === "") return null;
  return VALID_PRICING_MODES.has(value as PricingMode) ? (value as PricingMode) : null;
}

function sanitizeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function sanitizePendingListingId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  return UUID_RE.test(id) ? id : undefined;
}

function sanitizePendingListingCreatedAt(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function buildListingDraft(input: {
  step: number;
  category: string;
  adTitle: string;
  description: string;
  exitPrice: string;
  pricingMode: PricingMode | null;
  isExitPriceManuallyEdited: boolean;
  manualMarketPrice: string;
  marketPrice: number;
  analyzedItems: number;
  saleStrategy: string;
  selectedPackage: ListingDraftPackageId;
  saleMethod?: SaleMethod | string;
  formData: ListingDraftFormData;
  evaluationConfidenceScore?: number;
  evaluationPrefillActive?: boolean;
  evaluationHandoffActive?: boolean;
  pendingListingId?: string;
  pendingListingCreatedAt?: number;
  timestamp?: number;
}): ListingDraftV1 {
  const confidence = input.evaluationConfidenceScore;
  const pendingListingId = sanitizePendingListingId(input.pendingListingId);
  const pendingListingCreatedAt = pendingListingId
    ? sanitizePendingListingCreatedAt(input.pendingListingCreatedAt) ?? Date.now()
    : undefined;
  const saleIntent = coerceCompatibleSaleIntent({
    saleMethod: input.saleMethod,
    packageId: input.selectedPackage,
    pricingMode: input.pricingMode,
  });
  return {
    version: LISTING_DRAFT_VERSION,
    timestamp:
      typeof input.timestamp === "number" && Number.isFinite(input.timestamp)
        ? input.timestamp
        : Date.now(),
    step: clampStep(input.step),
    category: sanitizeShort(input.category, 80) || "Auto & Moto",
    adTitle: sanitizeText(input.adTitle, MAX_TITLE),
    description: sanitizeText(input.description, MAX_TEXT),
    exitPrice: sanitizeShort(input.exitPrice, 40),
    pricingMode: sanitizePricingMode(input.pricingMode),
    isExitPriceManuallyEdited: Boolean(input.isExitPriceManuallyEdited),
    manualMarketPrice: sanitizeShort(input.manualMarketPrice, 40),
    marketPrice: sanitizeNumber(input.marketPrice),
    analyzedItems: Math.round(sanitizeNumber(input.analyzedItems)),
    selectedPackage: saleIntent.packageId,
    saleStrategy: saleIntent.detailsStrategy,
    saleMethod: saleIntent.saleMethod,
    formData: sanitizeFormData(input.formData),
    evaluationConfidenceScore:
      typeof confidence === "number" && Number.isFinite(confidence)
        ? Math.min(100, Math.max(0, Math.round(confidence)))
        : undefined,
    evaluationPrefillActive: Boolean(input.evaluationPrefillActive),
    evaluationHandoffActive: Boolean(input.evaluationHandoffActive),
    ...(pendingListingId
      ? { pendingListingId, pendingListingCreatedAt }
      : {}),
  };
}

function parseListingDraftRecord(parsed: Record<string, unknown>): ListingDraftV1 | null {
  const version = Number(parsed.version);
  if (!LISTING_DRAFT_ACCEPTED_VERSIONS.has(version)) return null;

  const timestamp = Number(parsed.timestamp);
  if (!Number.isFinite(timestamp)) return null;

  return buildListingDraft({
    timestamp,
    step: clampStep(parsed.step),
    category: String(parsed.category ?? ""),
    adTitle: String(parsed.adTitle ?? ""),
    description: String(parsed.description ?? ""),
    exitPrice: String(parsed.exitPrice ?? ""),
    pricingMode: sanitizePricingMode(parsed.pricingMode),
    isExitPriceManuallyEdited: Boolean(parsed.isExitPriceManuallyEdited),
    manualMarketPrice: String(parsed.manualMarketPrice ?? ""),
    marketPrice: sanitizeNumber(parsed.marketPrice),
    analyzedItems: sanitizeNumber(parsed.analyzedItems),
    saleStrategy: String(parsed.saleStrategy ?? "standard"),
    selectedPackage: sanitizePackage(parsed.selectedPackage),
    saleMethod: typeof parsed.saleMethod === "string" ? parsed.saleMethod : undefined,
    formData: sanitizeFormData(parsed.formData),
    evaluationConfidenceScore:
      typeof parsed.evaluationConfidenceScore === "number"
        ? parsed.evaluationConfidenceScore
        : undefined,
    evaluationPrefillActive: Boolean(parsed.evaluationPrefillActive),
    evaluationHandoffActive: Boolean(parsed.evaluationHandoffActive),
    pendingListingId:
      typeof parsed.pendingListingId === "string" ? parsed.pendingListingId : undefined,
    pendingListingCreatedAt:
      typeof parsed.pendingListingCreatedAt === "number"
        ? parsed.pendingListingCreatedAt
        : undefined,
  });
}

export function listingDraftAnalyticsParams(
  draft: Pick<ListingDraftV1, "step" | "category" | "selectedPackage" | "version">,
  reason: string,
  source?: string,
): ListingDraftAnalyticsParams {
  return {
    step: draft.step,
    category: draft.category,
    package: draft.selectedPackage,
    draft_version: draft.version,
    reason,
    ...(source ? { source } : {}),
  };
}

export function saveListingDraftImmediate(draft: ListingDraftV1): boolean {
  if (typeof window === "undefined") return false;
  try {
    const payload = buildListingDraft(draft);
    window.sessionStorage.setItem(LISTING_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function saveListingDraftDebounced(
  draft: ListingDraftV1,
  delayMs = LISTING_DRAFT_SAVE_DEBOUNCE_MS,
  onSaved?: (ok: boolean) => void,
): void {
  if (typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const ok = saveListingDraftImmediate(draft);
    onSaved?.(ok);
  }, delayMs);
}

export function flushListingDraftSave(draft: ListingDraftV1): boolean {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  return saveListingDraftImmediate(draft);
}

export function loadListingDraftFromSession(): ListingDraftV1 | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(LISTING_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const draft = parseListingDraftRecord(parsed);
    if (!draft) {
      clearListingDraftSession();
      return null;
    }

    if (Date.now() - draft.timestamp > LISTING_DRAFT_TTL_MS) {
      clearListingDraftSession();
      return null;
    }

    return draft;
  } catch {
    clearListingDraftSession();
    return null;
  }
}

export function clearListingAuthHandoff(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LISTING_AUTH_HANDOFF_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function clearListingDraftSession(): void {
  if (typeof window === "undefined") return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    window.sessionStorage.removeItem(LISTING_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Clears session draft + auth handoff + same-tab resume flag. */
export function clearListingDraft(): void {
  clearListingDraftSession();
  clearListingAuthHandoff();
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(LISTING_AUTH_RESUME_FLAG_KEY);
    }
  } catch {
    // ignore
  }
}

export function saveListingAuthHandoff(
  draft: ListingDraftV1,
  reason: "auth_required" = "auth_required",
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const now = Date.now();
    const payload: ListingAuthHandoffV1 = {
      version: LISTING_DRAFT_VERSION,
      timestamp: now,
      expiresAt: now + LISTING_AUTH_HANDOFF_TTL_MS,
      reason,
      draft: buildListingDraft(draft),
    };
    window.localStorage.setItem(LISTING_AUTH_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadListingAuthHandoff(): ListingAuthHandoffV1 | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LISTING_AUTH_HANDOFF_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!LISTING_DRAFT_ACCEPTED_VERSIONS.has(Number(parsed.version))) {
      clearListingAuthHandoff();
      return null;
    }

    const expiresAt = Number(parsed.expiresAt);
    const timestamp = Number(parsed.timestamp);
    if (!Number.isFinite(expiresAt) || !Number.isFinite(timestamp) || Date.now() > expiresAt) {
      clearListingAuthHandoff();
      return null;
    }

    if (parsed.reason !== "auth_required") {
      clearListingAuthHandoff();
      return null;
    }

    const draftRaw =
      parsed.draft && typeof parsed.draft === "object" && !Array.isArray(parsed.draft)
        ? (parsed.draft as Record<string, unknown>)
        : null;
    if (!draftRaw) {
      clearListingAuthHandoff();
      return null;
    }

    const draft = parseListingDraftRecord(draftRaw);
    if (!draft) {
      clearListingAuthHandoff();
      return null;
    }

    return {
      version: LISTING_DRAFT_VERSION,
      timestamp,
      expiresAt,
      reason: "auth_required",
      draft,
    };
  } catch {
    clearListingAuthHandoff();
    return null;
  }
}

/**
 * Persist pendingListingId into session draft (+ auth handoff if present).
 * Call immediately after first pending_payment INSERT, before Stripe checkout.
 */
export function persistPendingListingIdOnDraft(
  baseDraft: ListingDraftV1,
  listingId: string,
  createdAt: number = Date.now(),
): ListingDraftV1 | null {
  const pendingListingId = sanitizePendingListingId(listingId);
  if (!pendingListingId) return null;

  const next = buildListingDraft({
    ...baseDraft,
    pendingListingId,
    pendingListingCreatedAt: createdAt,
    timestamp: Date.now(),
  });

  const saved = flushListingDraftSave(next);
  if (!saved) return null;

  // Keep handoff in sync if magic-link flow left one open.
  const handoff = loadListingAuthHandoff();
  if (handoff) {
    saveListingAuthHandoff(next, handoff.reason);
  }

  return next;
}

/** Drop only pending listing pointers; keep the rest of the draft. */
export function clearPendingListingIdOnDraft(baseDraft: ListingDraftV1): ListingDraftV1 {
  const next = buildListingDraft({
    ...baseDraft,
    pendingListingId: undefined,
    pendingListingCreatedAt: undefined,
    timestamp: Date.now(),
  });
  flushListingDraftSave(next);
  const handoff = loadListingAuthHandoff();
  if (handoff) {
    saveListingAuthHandoff(next, handoff.reason);
  }
  return next;
}

/**
 * If a draft exists, attach pendingListingId (e.g. Stripe cancel return).
 * No-op when there is no draft — does not create a new draft from listingId alone.
 */
export function syncPendingListingIdIntoExistingDraft(listingId: string): boolean {
  const pendingListingId = sanitizePendingListingId(listingId);
  if (!pendingListingId) return false;

  const existing =
    loadListingDraftFromSession() ?? loadListingAuthHandoff()?.draft ?? null;
  if (!existing) return false;

  return Boolean(
    persistPendingListingIdOnDraft(
      existing,
      pendingListingId,
      existing.pendingListingCreatedAt ?? Date.now(),
    ),
  );
}

/**
 * Resolve draft for mount restore:
 * - prefer newer timestamp between session and auth handoff;
 * - import handoff into sessionStorage only when handoff wins / is sole source;
 * - remove handoff only after successful import.
 */
export function resolveListingDraftForRestore(): ListingDraftRestoreResult | null {
  if (typeof window === "undefined") return null;

  const sessionDraft = loadListingDraftFromSession();
  const handoff = loadListingAuthHandoff();

  if (!sessionDraft && !handoff) return null;

  if (sessionDraft && handoff) {
    if (sessionDraft.timestamp >= handoff.draft.timestamp) {
      // Newer session wins — leave handoff for other tabs until TTL/success/discard.
      return { draft: sessionDraft, source: "session" };
    }
    const imported = saveListingDraftImmediate(handoff.draft);
    if (imported) {
      clearListingAuthHandoff();
      return {
        draft: handoff.draft,
        source: "auth_handoff",
        handoffReason: handoff.reason,
      };
    }
    return { draft: sessionDraft, source: "session" };
  }

  if (sessionDraft) {
    return { draft: sessionDraft, source: "session" };
  }

  if (handoff) {
    const imported = saveListingDraftImmediate(handoff.draft);
    if (imported) {
      clearListingAuthHandoff();
      return {
        draft: handoff.draft,
        source: "auth_handoff",
        handoffReason: handoff.reason,
      };
    }
    // Import failed — still return handoff draft for UI this mount (best effort).
    return {
      draft: handoff.draft,
      source: "auth_handoff",
      handoffReason: handoff.reason,
    };
  }

  return null;
}

export function markListingAuthResumePending(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LISTING_AUTH_RESUME_FLAG_KEY, "1");
  } catch {
    // ignore
  }
}

export function consumeListingAuthResumePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const pending = window.sessionStorage.getItem(LISTING_AUTH_RESUME_FLAG_KEY) === "1";
    if (pending) {
      window.sessionStorage.removeItem(LISTING_AUTH_RESUME_FLAG_KEY);
    }
    return pending;
  } catch {
    return false;
  }
}
