"use client";

import {
  getAttribution,
  hasAnalyticsConsent,
  trackEvent,
} from "@/lib/analytics";
import { applyConsentTags } from "@/lib/consentTags";
import { readConsentPreferences } from "@/lib/consentPreferences";
import { categoryLabelToTrackingKey } from "@/lib/evaluationTracking";

export const SELLER_FUNNEL_EVENTS = [
  "publish_page_view",
  "listing_started",
  "listing_step_1_complete",
  "listing_step_2_complete",
  "listing_step_3_complete",
  "begin_checkout",
] as const;

export const BUYER_FUNNEL_EVENTS = [
  "listing_view",
  "request_details_click",
  "offer_started",
  "offer_submitted",
] as const;

export const FUNNEL_EVENTS = [
  ...SELLER_FUNNEL_EVENTS,
  ...BUYER_FUNNEL_EVENTS,
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];

export const FUNNEL_LOCALES = ["ro", "en"] as const;
export type FunnelLocale = (typeof FUNNEL_LOCALES)[number];

export const FUNNEL_CATEGORIES = [
  "auto",
  "imobiliare",
  "lux",
  "business",
  "gadgets",
  "foto",
  "unknown",
] as const;
export type FunnelCategory = (typeof FUNNEL_CATEGORIES)[number];

export const FUNNEL_SOURCES = [
  "publish_form",
  "listing_detail",
  "draft_recovery",
  "direct",
  "evaluation",
] as const;
export type FunnelSource = (typeof FUNNEL_SOURCES)[number];

export const FUNNEL_SALE_STRATEGIES = ["direct", "auction"] as const;
export type FunnelSaleStrategy = (typeof FUNNEL_SALE_STRATEGIES)[number];

export const FUNNEL_STEPS = [1, 2, 3, 4] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export type FunnelEventParams = {
  locale?: FunnelLocale;
  category?: FunnelCategory;
  step?: FunnelStep;
  source?: FunnelSource;
  sale_strategy?: FunnelSaleStrategy;
};

const PII_KEY_RE =
  /(email|phone|telefon|title|adtitle|description|user[_-]?id|listing[_-]?id|demand[_-]?id|full[_-]?name|\bname\b|message|token|password|secret)/i;

const PII_VALUE_RE =
  /(@[a-z0-9.-]+\.[a-z]{2,})|(^\+?\d[\d\s().-]{7,}$)/i;

const ALLOWED_PARAM_KEYS = new Set([
  "locale",
  "category",
  "step",
  "source",
  "sale_strategy",
]);

const BLOCKED_EVENT_NAMES = new Set([
  "purchase",
  "ecommerce_purchase",
  "checkout_listing_success",
]);

/**
 * Canonical funnel event → legacy event(s) at the same user boundary.
 * Both may still fire (HQ / historical dashboards). Google Ads must import
 * only one conversion per boundary — never both.
 */
export const FUNNEL_LEGACY_EQUIVALENTS = {
  publish_page_view: {
    legacy: ["gtag_config_page_view"] as const,
    recommendedKeyEvent: false,
    countingMethod: "once_per_real_page_load",
    googleAds: "do_not_count_as_ads_conversion",
  },
  listing_started: {
    legacy: ["start_post_listing"] as const,
    recommendedKeyEvent: false,
    countingMethod: "once_per_page_load",
    googleAds: "prefer_canonical_or_legacy_not_both",
  },
  listing_step_1_complete: {
    legacy: ["listing_step_completed"] as const,
    recommendedKeyEvent: true,
    countingMethod: "once_per_successful_step_transition_per_page_load",
    googleAds: "prefer_canonical_or_legacy_not_both",
  },
  listing_step_2_complete: {
    legacy: ["listing_step_completed"] as const,
    recommendedKeyEvent: false,
    countingMethod: "once_per_successful_step_transition_per_page_load",
    googleAds: "prefer_canonical_or_legacy_not_both",
  },
  listing_step_3_complete: {
    legacy: ["listing_step_completed"] as const,
    recommendedKeyEvent: true,
    countingMethod: "once_per_successful_step_transition_per_page_load",
    googleAds: "prefer_canonical_or_legacy_not_both",
  },
  begin_checkout: {
    legacy: ["checkout_listing_started", "checkout_created"] as const,
    recommendedKeyEvent: true,
    countingMethod: "once_per_checkout_attempt_retry_allowed",
    googleAds: "prefer_canonical_or_legacy_not_both",
  },
  listing_view: {
    legacy: ["view_listing"] as const,
    recommendedKeyEvent: false,
    countingMethod: "once_per_valid_active_listing_load",
    googleAds: "prefer_canonical_or_legacy_not_both",
  },
  request_details_click: {
    legacy: ["click_listing_offer", "click_request_personalized_offer"] as const,
    recommendedKeyEvent: false,
    countingMethod: "once_per_page_load",
    googleAds: "prefer_canonical_or_legacy_not_both",
  },
  offer_started: {
    legacy: [] as const,
    recommendedKeyEvent: false,
    countingMethod: "once_per_page_load",
    googleAds: "canonical_only",
  },
  offer_submitted: {
    legacy: ["submit_listing_offer"] as const,
    recommendedKeyEvent: true,
    countingMethod: "once_per_successful_insert",
    googleAds: "prefer_canonical_or_legacy_not_both",
  },
} as const;

export const FUNNEL_RECOMMENDED_KEY_EVENTS = [
  "listing_step_1_complete",
  "listing_step_3_complete",
  "begin_checkout",
  "offer_submitted",
] as const;

export function isFunnelEventName(value: string): value is FunnelEventName {
  return (FUNNEL_EVENTS as readonly string[]).includes(value);
}

export function isBlockedFabricatedPurchaseEvent(value: string): boolean {
  return BLOCKED_EVENT_NAMES.has(value);
}

export function looksLikePiiKey(key: string): boolean {
  return PII_KEY_RE.test(key);
}

export function looksLikePiiValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return PII_VALUE_RE.test(value.trim());
}

export function parseFunnelLocale(value: unknown): FunnelLocale | undefined {
  return value === "en" || value === "ro" ? value : undefined;
}

export function parseFunnelCategory(value: unknown): FunnelCategory | undefined {
  if (typeof value !== "string") return undefined;
  if ((FUNNEL_CATEGORIES as readonly string[]).includes(value)) {
    return value as FunnelCategory;
  }
  const mapped = categoryLabelToTrackingKey(value);
  return (FUNNEL_CATEGORIES as readonly string[]).includes(mapped)
    ? (mapped as FunnelCategory)
    : undefined;
}

export function parseFunnelSource(value: unknown): FunnelSource | undefined {
  if (typeof value !== "string") return undefined;
  return (FUNNEL_SOURCES as readonly string[]).includes(value)
    ? (value as FunnelSource)
    : undefined;
}

export function parseFunnelSaleStrategy(
  value: unknown,
): FunnelSaleStrategy | undefined {
  return value === "direct" || value === "auction" ? value : undefined;
}

export function parseFunnelStep(value: unknown): FunnelStep | undefined {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : undefined;
}

export function sanitizeFunnelParams(
  params?: Record<string, unknown> | FunnelEventParams | null,
): FunnelEventParams {
  const out: FunnelEventParams = {};
  if (!params || typeof params !== "object") return out;

  for (const [rawKey, rawValue] of Object.entries(params)) {
    if (!ALLOWED_PARAM_KEYS.has(rawKey)) continue;
    if (looksLikePiiKey(rawKey) || looksLikePiiValue(rawValue)) continue;
    if (rawKey === "locale") {
      const locale = parseFunnelLocale(rawValue);
      if (locale) out.locale = locale;
      continue;
    }
    if (rawKey === "category") {
      const category = parseFunnelCategory(rawValue);
      if (category) out.category = category;
      continue;
    }
    if (rawKey === "step") {
      const step = parseFunnelStep(rawValue);
      if (step) out.step = step;
      continue;
    }
    if (rawKey === "source") {
      const source = parseFunnelSource(rawValue);
      if (source) out.source = source;
      continue;
    }
    if (rawKey === "sale_strategy") {
      const sale = parseFunnelSaleStrategy(rawValue);
      if (sale) out.sale_strategy = sale;
    }
  }

  return out;
}

export function funnelUtmParams(): Record<string, string> {
  const attribution = getAttribution();
  const out: Record<string, string> = {};
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ] as const;
  for (const key of keys) {
    const value = attribution[key];
    if (typeof value === "string" && value && !looksLikePiiValue(value)) {
      out[key] = value;
    }
  }
  return out;
}

export function createFunnelOnceGate() {
  const fired = new Set<string>();
  return {
    shouldFire(key: string): boolean {
      if (fired.has(key)) return false;
      fired.add(key);
      return true;
    },
    has(key: string): boolean {
      return fired.has(key);
    },
    reset(): void {
      fired.clear();
    },
  };
}

const defaultOnceGate = createFunnelOnceGate();

function funnelOnceKey(eventName: FunnelEventName, extra?: string): string {
  return extra ? `${eventName}:${extra}` : eventName;
}

export function trackFunnelEvent(
  eventName: string,
  params?: Record<string, unknown> | FunnelEventParams,
  options?: { onceKey?: string; skipOnce?: boolean },
): boolean {
  try {
    if (!isFunnelEventName(eventName)) return false;
    if (isBlockedFabricatedPurchaseEvent(eventName)) return false;
    // Consent is checked before the once-gate so a denied/absent first call
    // cannot consume the key and block a later granted dispatch.
    if (!hasAnalyticsConsent()) return false;

    // Inject permitted tags before the once-gate. Hydration can fire this
    // helper before ConsentProvider's effect creates window.gtag; consuming
    // the gate then would drop the event forever.
    const prefs = readConsentPreferences();
    if (prefs) applyConsentTags(prefs);
    if (typeof window !== "undefined" && typeof window.gtag !== "function") {
      return false;
    }

    const onceKey = funnelOnceKey(eventName, options?.onceKey);
    if (!options?.skipOnce && !defaultOnceGate.shouldFire(onceKey)) return false;

    const clean = sanitizeFunnelParams(params);
    trackEvent(eventName, clean, { attributionMode: "utm_only" });
    return true;
  } catch {
    return false;
  }
}

export function resetFunnelOnceGateForTests(): void {
  defaultOnceGate.reset();
}
