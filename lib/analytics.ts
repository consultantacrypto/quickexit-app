"use client";

import {
  buildConsentPreferences,
  emitConsentChange,
  googleConsentUpdateFromPreferences,
  hasAnalyticsConsent as hasAnalyticsPreference,
  hasMarketingConsent as hasMarketingPreference,
  persistConsentPreferences,
  readConsentPreferences,
  type ConsentChoiceInput,
  type ConsentPreferences,
  LEGACY_ANALYTICS_CONSENT_STORAGE_KEY,
} from "@/lib/consentPreferences";
import { applyConsentTags, clearFirstPartyTikTokCookies, dispatchGtagEvent } from "@/lib/consentTags";

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-8LLK172SCX";

export const TIKTOK_PIXEL_ID =
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "D8MJJNJC77U4U91BBCT0";

type EventParams = Record<string, string | number | boolean | null | undefined>;
export type AttributionData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

export const ATTRIBUTION_STORAGE_KEY = "quickexit_attribution";
export const ANALYTICS_CONSENT_STORAGE_KEY = LEGACY_ANALYTICS_CONSENT_STORAGE_KEY;
export const MAX_ATTR_FIELD_LENGTH = 120;
export const ATTRIBUTION_UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const ATTRIBUTION_KEY = ATTRIBUTION_STORAGE_KEY;
const UTM_KEYS = ATTRIBUTION_UTM_KEYS;
const UTM_VALUE_RE = /^[a-zA-Z0-9._\- ]+$/;
const CLICK_ID_RE = /gclid|fbclid|ttclid|msclkid|wbraid|gbraid|dclid|twclid/i;

export type AnalyticsConsentState = "granted" | "denied";

export type AnalyticsTrackOptions = {
  attributionMode?: "full" | "utm_only" | "none";
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ttq?: {
      track?: (eventName: string, params?: Record<string, unknown>) => void;
      page?: () => void;
      holdConsent?: () => void;
      grantConsent?: () => void;
      revokeConsent?: () => void;
    };
    quickexitSetAnalyticsConsent?: (state: AnalyticsConsentState) => void;
    quickexitRevokeAnalyticsConsent?: () => void;
    quickexitSetConsentPreferences?: (input: ConsentChoiceInput) => void;
    quickexitGetConsentPreferences?: () => ConsentPreferences | null;
  }
}

const TIKTOK_EVENT_MAP: Record<string, string> = {
  checkout_listing_started: "InitiateCheckout",
  checkout_demand_started: "InitiateCheckout",
  checkout_listing_success: "CompletePayment",
  checkout_demand_success: "CompletePayment",
  payment_success_from_evaluation: "CompletePayment",
  view_listing: "ViewContent",
  view_capital_disponibil: "ViewContent",
  start_post_listing: "Lead",
  start_post_demand: "Lead",
  submit_demand_offer: "Lead",
  evaluation_success: "Lead",
  click_pricing_package: "ClickButton",
  click_post_listing: "ClickButton",
  click_evaluate: "ClickButton",
  click_send_demand_offer: "ClickButton",
  view_future_mobility: "ViewContent",
  click_future_mobility_model: "ClickButton",
  click_request_personalized_offer: "Lead",
  click_premium_seller_phone: "ClickButton",
  click_premium_seller_whatsapp: "ClickButton",
  click_premium_seller_tiktok: "ClickButton",
  open_financing_calculator: "ClickButton",
  change_financing_interest: "ClickButton",
  change_financing_deposit: "ClickButton",
  change_financing_term: "ClickButton",
  open_financing_request_form: "ClickButton",
  submit_financing_request: "Lead",
  financing_request_success: "Lead",
  financing_request_error: "ClickButton",
};

export function isAnalyticsEnabled(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}

function normalizeField(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_ATTR_FIELD_LENGTH);
}

export function sanitizeUtmValue(
  value: string | null | undefined,
): string | undefined {
  const normalized = normalizeField(value);
  if (!normalized) return undefined;
  if (normalized.includes("@") || normalized.includes("://")) return undefined;
  if (CLICK_ID_RE.test(normalized)) return undefined;
  if (!UTM_VALUE_RE.test(normalized)) return undefined;
  return normalized;
}

export function hasAnalyticsConsent(): boolean {
  return hasAnalyticsPreference();
}

export function hasMarketingConsent(): boolean {
  return hasMarketingPreference();
}

export function getAnalyticsConsent(): AnalyticsConsentState | null {
  const prefs = readConsentPreferences();
  if (!prefs) return null;
  return prefs.analytics ? "granted" : "denied";
}

export function syncVendorConsent(prefs: ConsentPreferences | null = readConsentPreferences()): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("consent", "update", googleConsentUpdateFromPreferences(prefs));
    }
    if (prefs?.marketing) {
      window.ttq?.grantConsent?.();
    } else {
      window.ttq?.revokeConsent?.();
      window.ttq?.holdConsent?.();
    }
  } catch {
    // vendor consent sync must never crash the app
  }
}

export function clearAnalyticsAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ATTRIBUTION_KEY);
    window.sessionStorage.removeItem(ATTRIBUTION_KEY);
  } catch {
    // ignore
  }
}

export function applyConsentPreferences(input: ConsentChoiceInput): ConsentPreferences {
  const next = buildConsentPreferences(input);
  persistConsentPreferences(next);
  if (next.analytics) {
    captureAttribution();
  } else {
    clearAnalyticsAttribution();
  }
  if (!next.marketing) {
    clearFirstPartyTikTokCookies();
  }
  syncVendorConsent(next);
  emitConsentChange(next);
  return next;
}

export function setAnalyticsConsent(state: AnalyticsConsentState): void {
  const existing = readConsentPreferences();
  applyConsentPreferences({
    analytics: state === "granted",
    marketing: state === "granted" ? Boolean(existing?.marketing) : false,
  });
}

export function revokeAnalyticsConsent(): void {
  applyConsentPreferences({ analytics: false, marketing: false });
}

function readStoredAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: AttributionData = {};
    for (const key of UTM_KEYS) {
      out[key] = sanitizeUtmValue(
        typeof parsed[key] === "string" ? parsed[key] : undefined,
      );
    }
    return out;
  } catch {
    return null;
  }
}

function buildUtmOnlyAttribution(): AttributionData {
  if (typeof window === "undefined") return {};
  try {
    const currentUrl = new URL(window.location.href);
    const utm: AttributionData = {};
    for (const key of UTM_KEYS) {
      utm[key] = sanitizeUtmValue(currentUrl.searchParams.get(key));
    }
    return utm;
  } catch {
    return {};
  }
}

function hasAnyUtm(data: AttributionData): boolean {
  return UTM_KEYS.some((key) => Boolean(data[key]));
}

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  try {
    const existing = readStoredAttribution();
    if (existing && hasAnyUtm(existing)) return;
    const data = buildUtmOnlyAttribution();
    if (!hasAnyUtm(data)) return;
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data));
  } catch {
    // attribution is best-effort; never break runtime
  }
}

export function getAttribution(): AttributionData {
  if (typeof window === "undefined") return {};
  if (!hasAnalyticsConsent()) return {};
  try {
    return readStoredAttribution() ?? {};
  } catch {
    return {};
  }
}

export function appendAttributionParams(
  params?: EventParams,
  mode: AnalyticsTrackOptions["attributionMode"] = "utm_only",
): EventParams {
  if (mode === "none") return { ...(params ?? {}) };
  const attribution = getAttribution();
  const utmParams: EventParams = {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_term: attribution.utm_term,
  };
  return { ...utmParams, ...(params ?? {}) };
}

export function pageview(url: string): void {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window.gtag !== "function") return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
}

function trackTikTokEvent(eventName: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  if (!hasMarketingConsent()) return;
  if (!TIKTOK_PIXEL_ID) return;

  const tiktokEvent = TIKTOK_EVENT_MAP[eventName];
  if (!tiktokEvent) return;
  if (typeof window.ttq?.track !== "function") return;

  try {
    const payload = Object.fromEntries(
      Object.entries(params ?? {}).filter(([, value]) => value != null),
    ) as Record<string, unknown>;
    window.ttq.track(tiktokEvent, payload);
  } catch {
    // TikTok tracking is best-effort; never break runtime
  }
}

export function trackEvent(
  eventName: string,
  params?: EventParams,
  options?: AnalyticsTrackOptions,
): void {
  if (typeof window === "undefined") return;
  const analyticsOk = hasAnalyticsConsent();
  const marketingOk = hasMarketingConsent();
  if (!analyticsOk && !marketingOk) return;

  try {
    if (analyticsOk || marketingOk) {
      const prefs = readConsentPreferences();
      if (prefs) applyConsentTags(prefs);
    }
    if (analyticsOk) {
      captureAttribution();
      const enrichedParams = appendAttributionParams(
        params,
        options?.attributionMode ?? "utm_only",
      );
      if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
        dispatchGtagEvent(eventName, enrichedParams);
      }
      if (marketingOk) {
        trackTikTokEvent(eventName, enrichedParams);
      }
      return;
    }

    if (marketingOk) {
      trackTikTokEvent(eventName, params);
    }
  } catch {
    // Consent denial, missing gtag, or blocked storage must never crash the app.
  }
}
