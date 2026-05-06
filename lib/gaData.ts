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
  available: boolean;
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
  debugErrors?: GaErrorDebugInfo[];
};

type RunReportRequest = Parameters<BetaAnalyticsDataClient["runReport"]>[0];
type GaErrorDebugInfo = {
  label: string;
  message: string;
  rawShape: {
    constructorName: string | null;
    ownPropertyNames: string[];
    message: string | null;
    code: string | number | null;
    status: string | number | null;
    details: string | null;
    responseStatus: string | number | null;
    responseStatusText: string | null;
    responseDataErrorMessage: string | null;
    responseDataErrorStatus: string | null;
    responseDataErrorCode: string | number | null;
    serializedPreview: string;
  };
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

function isUsefulMessage(value: unknown) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim() !== "undefined undefined: undefined" &&
    value.trim() !== "undefined"
  );
}

function safeStringifyError(error: unknown) {
  try {
    if (error instanceof Error) {
      const ownProps = Object.getOwnPropertyNames(error).reduce((acc, key) => {
        acc[key] = (error as unknown as Record<string, unknown>)[key];
        return acc;
      }, {} as Record<string, unknown>);

      return JSON.stringify(ownProps).slice(0, 1500);
    }

    return JSON.stringify(error).slice(0, 1500);
  } catch {
    return String(error);
  }
}

function getGaErrorMessage(error: unknown) {
  const e = error as Record<string, any>;

  const candidates = [
    e?.details,
    e?.statusDetails,
    e?.status,
    e?.code,
    e?.message,
    e?.response?.data?.error?.message,
    e?.response?.data?.error?.status,
    e?.response?.data?.error?.code,
    e?.response?.data?.error_description,
    e?.response?.statusText,
    e?.response?.status,
    e?.errors?.[0]?.message,
    e?.errors?.[0]?.reason,
    e?.errors?.[0]?.domain,
    e?.error?.message,
    e?.error?.status,
    e?.error?.code,
  ];

  const useful = candidates.filter(isUsefulMessage).map(String);
  if (useful.length > 0) {
    return useful.join(" | ").slice(0, 1500);
  }

  const fallback = safeStringifyError(error);
  if (isUsefulMessage(fallback)) {
    return fallback;
  }

  return "Eroare GA necunoscuta: obiectul de eroare nu contine mesaj util.";
}

function getGaErrorDebugShape(error: unknown) {
  const e = error as Record<string, any>;
  const constructorName =
    typeof e?.constructor?.name === "string" ? (e.constructor.name as string) : null;
  const ownPropertyNames =
    typeof e === "object" && e !== null ? Object.getOwnPropertyNames(e) : [];
  const serializedPreview = safeStringifyError(error);

  return {
    constructorName,
    ownPropertyNames,
    message: typeof e?.message === "string" ? e.message : null,
    code: typeof e?.code === "string" || typeof e?.code === "number" ? e.code : null,
    status: typeof e?.status === "string" || typeof e?.status === "number" ? e.status : null,
    details: typeof e?.details === "string" ? e.details : null,
    responseStatus:
      typeof e?.response?.status === "string" || typeof e?.response?.status === "number"
        ? e.response.status
        : null,
    responseStatusText:
      typeof e?.response?.statusText === "string" ? e.response.statusText : null,
    responseDataErrorMessage:
      typeof e?.response?.data?.error?.message === "string"
        ? e.response.data.error.message
        : null,
    responseDataErrorStatus:
      typeof e?.response?.data?.error?.status === "string"
        ? e.response.data.error.status
        : null,
    responseDataErrorCode:
      typeof e?.response?.data?.error?.code === "string" ||
      typeof e?.response?.data?.error?.code === "number"
        ? e.response.data.error.code
        : null,
    serializedPreview,
  };
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
  const normalizedPrivateKey = privateKeyRaw.replace(/\\n/g, "\n");
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: normalizedPrivateKey,
    },
    fallback: true,
  });
}

async function runGaReport(
  analyticsDataClient: BetaAnalyticsDataClient,
  label: string,
  request: RunReportRequest
) {
  try {
    const [report] = await analyticsDataClient.runReport(request);
    return { report, warning: null as string | null, debugError: null as GaErrorDebugInfo | null };
  } catch (error) {
    const message = getGaErrorMessage(error);
    const safeMessage = isUsefulMessage(message)
      ? message
      : "Eroare GA fara mesaj util; verifica gaDebugErrors din selftest.";
    return {
      report: null,
      warning: `${label} indisponibil: ${safeMessage}`,
      debugError: {
        label,
        message: safeMessage,
        rawShape: getGaErrorDebugShape(error),
      },
    };
  }
}

export async function getAnalyticsSnapshot(options?: { includeDebugErrors?: boolean }): Promise<GaSnapshot> {
  const normalizedPropertyId = normalizeGaPropertyId(process.env.GA_PROPERTY_ID);
  if (!normalizedPropertyId) {
    throw new Error("GA_PROPERTY_ID lipseste sau este invalid.");
  }

  if (!isGaDataConfigured()) {
    throw new Error("Config GA Data API incompleta.");
  }

  const lookbackDays = getLookbackDays();
  const warnings: string[] = [];
  const debugErrors: GaErrorDebugInfo[] = [];
  const events = getBaseEventsMap();
  const analyticsDataClient = getGaClient();
  const property = `properties/${normalizedPropertyId}`;
  const dateRanges = getDateRange(lookbackDays);
  let successfulReports = 0;

  const snapshot: GaSnapshot = {
    available: true,
    lookbackDays,
    propertyId: normalizedPropertyId,
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

  {
    const { report, warning, debugError } = await runGaReport(analyticsDataClient, "summary", {
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
    if (warning) {
      warnings.push(warning);
      if (options?.includeDebugErrors && debugError) debugErrors.push(debugError);
    } else if (report) {
      successfulReports += 1;
      const row = report.rows?.[0];
      snapshot.summary = {
        activeUsers: Number(row?.metricValues?.[0]?.value ?? 0),
        sessions: Number(row?.metricValues?.[1]?.value ?? 0),
        screenPageViews: Number(row?.metricValues?.[2]?.value ?? 0),
        eventCount: Number(row?.metricValues?.[3]?.value ?? 0),
      };
    }
  }

  {
    const { report, warning, debugError } = await runGaReport(analyticsDataClient, "events", {
      property,
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      limit: 200,
    });
    if (warning) {
      warnings.push(warning);
      if (options?.includeDebugErrors && debugError) debugErrors.push(debugError);
    } else if (report) {
      successfulReports += 1;
      for (const row of report.rows ?? []) {
        const eventName = String(row.dimensionValues?.[0]?.value ?? "");
        if (isTrackedEventName(eventName)) {
          snapshot.events[eventName] = Number(row.metricValues?.[0]?.value ?? 0);
        }
      }
    }
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

  {
    const { report, warning, debugError } = await runGaReport(analyticsDataClient, "topPages", {
      property,
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    });
    if (warning) {
      warnings.push(warning);
      if (options?.includeDebugErrors && debugError) debugErrors.push(debugError);
    } else if (report) {
      successfulReports += 1;
      snapshot.topPages = (report.rows ?? []).map((row) => ({
        pagePath: String(row.dimensionValues?.[0]?.value ?? ""),
        screenPageViews: Number(row.metricValues?.[0]?.value ?? 0),
        activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
      }));
    }
  }

  {
    const { report, warning, debugError } = await runGaReport(analyticsDataClient, "traffic", {
      property,
      dateRanges,
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });
    if (warning) {
      warnings.push(warning);
      if (options?.includeDebugErrors && debugError) debugErrors.push(debugError);
    } else if (report) {
      successfulReports += 1;
      snapshot.traffic = (report.rows ?? []).map((row) => ({
        source: String(row.dimensionValues?.[0]?.value ?? ""),
        medium: String(row.dimensionValues?.[1]?.value ?? ""),
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
        activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
      }));
    }
  }

  {
    const { report, warning, debugError } = await runGaReport(analyticsDataClient, "devices", {
      property,
      dateRanges,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });
    if (warning) {
      warnings.push(warning);
      if (options?.includeDebugErrors && debugError) debugErrors.push(debugError);
    } else if (report) {
      successfulReports += 1;
      snapshot.devices = (report.rows ?? []).map((row) => ({
        deviceCategory: String(row.dimensionValues?.[0]?.value ?? ""),
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
        activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
      }));
    }
  }

  snapshot.available = successfulReports > 0;
  if (options?.includeDebugErrors) {
    snapshot.debugErrors = debugErrors;
  }
  return snapshot;
}
