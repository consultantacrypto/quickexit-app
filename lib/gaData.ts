import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";

const DEFAULT_LOOKBACK_DAYS = 7;

const TRACKED_EVENTS = [
  "click_evaluate",
  "click_post_listing",
  "click_capital_available",
  "start_evaluation",
  "evaluation_success",
  "start_post_listing",
  "checkout_listing_started",
  "start_post_demand",
  "checkout_demand_started",
  "view_capital_disponibil",
  "click_send_demand_offer",
  "view_listing",
  "click_listing_offer",
  "copy_social_share",
  "submit_demand_offer",
  "click_pricing_package",
  "hq_copilot_run",
] as const;

type TrackedEventName = (typeof TRACKED_EVENTS)[number];

type GaSnapshot = {
  available: true;
  lookbackDays: number;
  propertyId: string;
  generatedAt: string;
  summary: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    eventCount: number;
  };
  events: Record<TrackedEventName, number>;
  funnels: {
    seller: Record<string, number>;
    buyer: Record<string, number>;
    offer: Record<string, number>;
    social: Record<string, number>;
    admin: Record<string, number>;
  };
  topPages: Array<{ pagePath: string; screenPageViews: number; activeUsers: number }>;
  traffic: Array<{ source: string; medium: string; sessions: number; activeUsers: number }>;
  devices: Array<{ deviceCategory: string; sessions: number; activeUsers: number }>;
  warnings: string[];
};

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLookbackDays(): number {
  const parsed = Number(process.env.GA_LOOKBACK_DAYS ?? DEFAULT_LOOKBACK_DAYS);
  if (!Number.isFinite(parsed)) return DEFAULT_LOOKBACK_DAYS;
  return Math.max(1, Math.min(30, Math.floor(parsed)));
}

function getDateRange(lookbackDays: number) {
  return [{ startDate: `${lookbackDays}daysAgo`, endDate: "today" }];
}

function getBaseEventsMap(): Record<TrackedEventName, number> {
  return TRACKED_EVENTS.reduce((acc, eventName) => {
    acc[eventName] = 0;
    return acc;
  }, {} as Record<TrackedEventName, number>);
}

function isTrackedEventName(eventName: string): eventName is TrackedEventName {
  return (TRACKED_EVENTS as readonly string[]).includes(eventName);
}

function shortError(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 180);
  return "Eroare necunoscuta";
}

export function normalizeGaPropertyId(raw: string | undefined | null): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (value.startsWith("properties/")) {
    return value.slice("properties/".length).trim();
  }
  return value;
}

export function isGaDataConfigured(): boolean {
  const propertyId = normalizeGaPropertyId(process.env.GA_PROPERTY_ID);
  const clientEmail = String(process.env.GOOGLE_CLIENT_EMAIL ?? "").trim();
  const privateKeyRaw = String(process.env.GOOGLE_PRIVATE_KEY ?? "").trim();
  return Boolean(propertyId && clientEmail && privateKeyRaw);
}

function getGaClient() {
  const clientEmail = String(process.env.GOOGLE_CLIENT_EMAIL ?? "").trim();
  const privateKeyRaw = String(process.env.GOOGLE_PRIVATE_KEY ?? "").trim();
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

export async function getAnalyticsSnapshot(): Promise<GaSnapshot> {
  const propertyId = normalizeGaPropertyId(process.env.GA_PROPERTY_ID);
  if (!propertyId) {
    throw new Error("GA_PROPERTY_ID lipseste sau este invalid.");
  }

  if (!isGaDataConfigured()) {
    throw new Error("Config GA Data API incompleta.");
  }

  const lookbackDays = getLookbackDays();
  const warnings: string[] = [];
  const events = getBaseEventsMap();
  const client = getGaClient();
  const property = `properties/${propertyId}`;
  const dateRanges = getDateRange(lookbackDays);

  const snapshot: GaSnapshot = {
    available: true,
    lookbackDays,
    propertyId,
    generatedAt: new Date().toISOString(),
    summary: {
      activeUsers: 0,
      sessions: 0,
      screenPageViews: 0,
      eventCount: 0,
    },
    events,
    funnels: {
      seller: {
        click_evaluate: 0,
        start_evaluation: 0,
        evaluation_success: 0,
        start_post_listing: 0,
        checkout_listing_started: 0,
      },
      buyer: {
        click_capital_available: 0,
        start_post_demand: 0,
        checkout_demand_started: 0,
      },
      offer: {
        view_capital_disponibil: 0,
        click_send_demand_offer: 0,
        submit_demand_offer: 0,
        view_listing: 0,
        click_listing_offer: 0,
      },
      social: {
        view_listing: 0,
        copy_social_share: 0,
      },
      admin: {
        hq_copilot_run: 0,
      },
    },
    topPages: [],
    traffic: [],
    devices: [],
    warnings,
  };

  try {
    const [response] = await client.runReport({
      property,
      dateRanges,
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "eventCount" },
      ],
      limit: 1,
    });
    const row = response.rows?.[0];
    snapshot.summary = {
      activeUsers: toNumber(row?.metricValues?.[0]?.value),
      sessions: toNumber(row?.metricValues?.[1]?.value),
      screenPageViews: toNumber(row?.metricValues?.[2]?.value),
      eventCount: toNumber(row?.metricValues?.[3]?.value),
    };
  } catch (error) {
    warnings.push(`summary indisponibil: ${shortError(error)}`);
  }

  try {
    const [response] = await client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      limit: 200,
    });
    for (const row of response.rows ?? []) {
      const eventName = String(row.dimensionValues?.[0]?.value ?? "");
      if (isTrackedEventName(eventName)) {
        snapshot.events[eventName] = toNumber(row.metricValues?.[0]?.value);
      }
    }
  } catch (error) {
    warnings.push(`events indisponibil: ${shortError(error)}`);
  }

  snapshot.funnels = {
    seller: {
      click_evaluate: snapshot.events.click_evaluate,
      start_evaluation: snapshot.events.start_evaluation,
      evaluation_success: snapshot.events.evaluation_success,
      start_post_listing: snapshot.events.start_post_listing,
      checkout_listing_started: snapshot.events.checkout_listing_started,
    },
    buyer: {
      click_capital_available: snapshot.events.click_capital_available,
      start_post_demand: snapshot.events.start_post_demand,
      checkout_demand_started: snapshot.events.checkout_demand_started,
    },
    offer: {
      view_capital_disponibil: snapshot.events.view_capital_disponibil,
      click_send_demand_offer: snapshot.events.click_send_demand_offer,
      submit_demand_offer: snapshot.events.submit_demand_offer,
      view_listing: snapshot.events.view_listing,
      click_listing_offer: snapshot.events.click_listing_offer,
    },
    social: {
      view_listing: snapshot.events.view_listing,
      copy_social_share: snapshot.events.copy_social_share,
    },
    admin: {
      hq_copilot_run: snapshot.events.hq_copilot_run,
    },
  };

  try {
    const [response] = await client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    });
    snapshot.topPages = (response.rows ?? []).map((row) => ({
      pagePath: String(row.dimensionValues?.[0]?.value ?? "/"),
      screenPageViews: toNumber(row.metricValues?.[0]?.value),
      activeUsers: toNumber(row.metricValues?.[1]?.value),
    }));
  } catch (error) {
    warnings.push(`topPages indisponibil: ${shortError(error)}`);
  }

  try {
    const [response] = await client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });
    snapshot.traffic = (response.rows ?? []).map((row) => ({
      source: String(row.dimensionValues?.[0]?.value ?? "(direct)"),
      medium: String(row.dimensionValues?.[1]?.value ?? "(none)"),
      sessions: toNumber(row.metricValues?.[0]?.value),
      activeUsers: toNumber(row.metricValues?.[1]?.value),
    }));
  } catch (error) {
    warnings.push(`traffic indisponibil: ${shortError(error)}`);
  }

  try {
    const [response] = await client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });
    snapshot.devices = (response.rows ?? []).map((row) => ({
      deviceCategory: String(row.dimensionValues?.[0]?.value ?? "unknown"),
      sessions: toNumber(row.metricValues?.[0]?.value),
      activeUsers: toNumber(row.metricValues?.[1]?.value),
    }));
  } catch (error) {
    warnings.push(`devices indisponibil: ${shortError(error)}`);
  }

  return snapshot;
}
