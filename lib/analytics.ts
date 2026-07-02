"use client";

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-8LLK172SCX";

export const TIKTOK_PIXEL_ID =
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "D8MJJNJC77U4U91BBCT0";

type EventParams = Record<string, string | number | boolean | null | undefined>;
type AttributionData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_path?: string;
  first_seen_at?: string;
};
const ATTRIBUTION_KEY = "quickexit_attribution";
const MAX_ATTR_FIELD_LENGTH = 120;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ttq?: {
      track?: (eventName: string, params?: Record<string, unknown>) => void;
      page?: () => void;
    };
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

function sanitizeReferrer(rawReferrer: string): string | undefined {
  try {
    const parsed = new URL(rawReferrer);
    return normalizeField(`${parsed.origin}${parsed.pathname}`);
  } catch {
    return undefined;
  }
}

function readStoredAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttributionData;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function buildCurrentAttribution(): AttributionData {
  if (typeof window === "undefined") return {};
  try {
    const currentUrl = new URL(window.location.href);
    const referrer =
      typeof document !== "undefined" && document.referrer
        ? sanitizeReferrer(document.referrer)
        : undefined;
    return {
      utm_source: normalizeField(currentUrl.searchParams.get("utm_source")),
      utm_medium: normalizeField(currentUrl.searchParams.get("utm_medium")),
      utm_campaign: normalizeField(currentUrl.searchParams.get("utm_campaign")),
      utm_content: normalizeField(currentUrl.searchParams.get("utm_content")),
      utm_term: normalizeField(currentUrl.searchParams.get("utm_term")),
      referrer,
      landing_path: normalizeField(`${window.location.pathname}${window.location.search}`),
      first_seen_at: new Date().toISOString(),
    };
  } catch {
    return {};
  }
}

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readStoredAttribution();
    if (existing) return; // first-touch only in this sprint
    const data = buildCurrentAttribution();
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data));
  } catch {
    // attribution is best-effort; never break runtime
  }
}

export function getAttribution(): AttributionData {
  if (typeof window === "undefined") return {};
  try {
    const existing = readStoredAttribution();
    if (existing) return existing;
    return {};
  } catch {
    return {};
  }
}

export function appendAttributionParams(params?: EventParams): EventParams {
  const attribution = getAttribution();
  const attributionParams: EventParams = {
    attribution_utm_source: attribution.utm_source,
    attribution_utm_medium: attribution.utm_medium,
    attribution_utm_campaign: attribution.utm_campaign,
    attribution_utm_content: attribution.utm_content,
    attribution_utm_term: attribution.utm_term,
    attribution_referrer: attribution.referrer,
    attribution_landing_path: attribution.landing_path,
    attribution_first_seen_at: attribution.first_seen_at,
  };
  // Explicit event params win on conflicts.
  return { ...attributionParams, ...(params ?? {}) };
}

export function pageview(url: string): void {
  if (typeof window === "undefined") return;
  if (!GA_MEASUREMENT_ID) return;
  if (typeof window.gtag !== "function") return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
}

function trackTikTokEvent(eventName: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
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

export function trackEvent(eventName: string, params?: EventParams): void {
  if (typeof window === "undefined") return;

  captureAttribution();
  const enrichedParams = appendAttributionParams(params);

  if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
    window.gtag("event", eventName, enrichedParams);
  }

  trackTikTokEvent(eventName, enrichedParams);
}

