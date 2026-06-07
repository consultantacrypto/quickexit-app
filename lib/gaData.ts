import "server-only";

import { BetaAnalyticsDataClient } from "@google-analytics/data";

const DEFAULT_LOOKBACK_DAYS = 7;

const TRACKED_EVENTS = [
  "click_evaluate",
  "click_post_listing",
  "click_capital_available",
  "start_evaluation",
  "evaluation_success",
  "evaluation_failed",
  "selected_price_strategy",
  "click_evaluation_to_listing",
  "listing_prefilled_from_evaluation",
  "listing_step_completed",
  "listing_submit_attempt",
  "start_post_listing",
  "checkout_listing_started",
  "checkout_created",
  "checkout_listing_success",
  "checkout_listing_cancel",
  "payment_success_from_evaluation",
  "payment_cancel_from_evaluation",
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
  computedRates: {
    evaluation_success_rate: number | null;
    evaluation_to_listing_rate: number | null;
    listing_to_checkout_rate: number | null;
    checkout_success_rate: number | null;
    evaluation_to_payment_rate: number | null;
  };
  topPages: Array<{ pagePath: string; screenPageViews: number; activeUsers: number }>;
  traffic: Array<{ source: string; medium: string; sessions: number; activeUsers: number }>;
  devices: Array<{ deviceCategory: string; sessions: number; activeUsers: number }>;
  warnings: string[];
  debugErrors?: GaErrorDebugInfo[];
};

type RunReportRequest = Parameters<BetaAnalyticsDataClient["runReport"]>[0];
type GaAuthMode = "oauth" | "service_account";
type GaReport = { rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }> };
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

function safeRatePercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(2));
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

export function getGaAuthMode(): GaAuthMode {
  return String(process.env.GOOGLE_AUTH_MODE ?? "").trim().toLowerCase() === "oauth"
    ? "oauth"
    : "service_account";
}

export function isGaDataConfigured(): boolean {
  const propertyId = normalizeGaPropertyId(process.env.GA_PROPERTY_ID);
  if (!propertyId) return false;

  if (getGaAuthMode() === "oauth") {
    const oauthClientId = String(process.env.GOOGLE_OAUTH_CLIENT_ID ?? "").trim();
    const oauthClientSecret = String(process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "").trim();
    const oauthRefreshToken = String(process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? "").trim();
    return Boolean(oauthClientId && oauthClientSecret && oauthRefreshToken);
  }

  const clientEmail = String(process.env.GOOGLE_CLIENT_EMAIL ?? "").trim();
  const privateKeyRaw = String(process.env.GOOGLE_PRIVATE_KEY ?? "").trim();
  return Boolean(clientEmail && privateKeyRaw);
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

async function getGoogleOAuthAccessToken() {
  const clientId = String(process.env.GOOGLE_OAUTH_CLIENT_ID ?? "").trim();
  const clientSecret = String(process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "").trim();
  const refreshToken = String(process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? "").trim();

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!refreshToken) missing.push("GOOGLE_OAUTH_REFRESH_TOKEN");
  if (missing.length > 0) {
    throw new Error(`OAuth GA config incomplet: lipseste ${missing.join(" / ")}`);
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const rawBody = await response.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(`OAuth token fetch failed: ${getGaErrorMessage(parsed ?? rawBody)}`);
  }

  const accessToken = parsed?.access_token;
  if (typeof accessToken !== "string" || !accessToken.trim()) {
    throw new Error("OAuth token fetch failed: access_token lipseste.");
  }

  return accessToken;
}

async function runGaReportWithOAuth(params: {
  label: string;
  propertyId: string;
  requestBody: Record<string, unknown>;
}): Promise<{ report: GaReport | null; warning: string | null; debugError: GaErrorDebugInfo | null }> {
  try {
    const accessToken = await getGoogleOAuthAccessToken();
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(params.propertyId)}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params.requestBody),
      }
    );

    const rawBody = await response.text();
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const message = getGaErrorMessage(parsed ?? rawBody);
      const safeMessage = isUsefulMessage(message)
        ? message
        : "Eroare GA fara mesaj util; verifica gaDebugErrors din selftest.";
      return {
        report: null,
        warning: `${params.label} indisponibil: ${safeMessage}`,
        debugError: {
          label: params.label,
          message: safeMessage,
          rawShape: getGaErrorDebugShape(parsed ?? rawBody),
        },
      };
    }

    return { report: (parsed ?? {}) as GaReport, warning: null, debugError: null };
  } catch (error) {
    const message = getGaErrorMessage(error);
    const safeMessage = isUsefulMessage(message)
      ? message
      : "Eroare GA fara mesaj util; verifica gaDebugErrors din selftest.";
    return {
      report: null,
      warning: `${params.label} indisponibil: ${safeMessage}`,
      debugError: {
        label: params.label,
        message: safeMessage,
        rawShape: getGaErrorDebugShape(error),
      },
    };
  }
}

async function runGaReport(
  analyticsDataClient: BetaAnalyticsDataClient | null,
  authMode: GaAuthMode,
  propertyId: string,
  label: string,
  request: RunReportRequest
) {
  if (authMode === "oauth") {
    return runGaReportWithOAuth({
      label,
      propertyId,
      requestBody: request as Record<string, unknown>,
    });
  }

  if (!analyticsDataClient) {
    return {
      report: null,
      warning: `${label} indisponibil: Clientul GA service account nu este initializat.`,
      debugError: null as GaErrorDebugInfo | null,
    };
  }

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

  const authMode = getGaAuthMode();
  const lookbackDays = getLookbackDays();
  const warnings: string[] = [];
  const debugErrors: GaErrorDebugInfo[] = [];
  const events = getBaseEventsMap();
  const analyticsDataClient = authMode === "service_account" ? getGaClient() : null;
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
        evaluation_failed: 0,
        selected_price_strategy: 0,
        click_evaluation_to_listing: 0,
        listing_prefilled_from_evaluation: 0,
        listing_step_completed: 0,
        listing_submit_attempt: 0,
        start_post_listing: 0,
        checkout_listing_started: 0,
        checkout_created: 0,
        checkout_listing_success: 0,
        checkout_listing_cancel: 0,
        payment_success_from_evaluation: 0,
        payment_cancel_from_evaluation: 0,
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
    computedRates: {
      evaluation_success_rate: null,
      evaluation_to_listing_rate: null,
      listing_to_checkout_rate: null,
      checkout_success_rate: null,
      evaluation_to_payment_rate: null,
    },
  };

  {
    const { report, warning, debugError } = await runGaReport(
      analyticsDataClient,
      authMode,
      normalizedPropertyId,
      "summary",
      {
      property,
      dateRanges,
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "eventCount" },
      ],
      limit: 1,
      }
    );
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
    const { report, warning, debugError } = await runGaReport(
      analyticsDataClient,
      authMode,
      normalizedPropertyId,
      "events",
      {
      property,
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      limit: 200,
      }
    );
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
      evaluation_failed: snapshot.events.evaluation_failed,
      selected_price_strategy: snapshot.events.selected_price_strategy,
      click_evaluation_to_listing: snapshot.events.click_evaluation_to_listing,
      listing_prefilled_from_evaluation: snapshot.events.listing_prefilled_from_evaluation,
      listing_step_completed: snapshot.events.listing_step_completed,
      listing_submit_attempt: snapshot.events.listing_submit_attempt,
      start_post_listing: snapshot.events.start_post_listing,
      checkout_listing_started: snapshot.events.checkout_listing_started,
      checkout_created: snapshot.events.checkout_created,
      checkout_listing_success: snapshot.events.checkout_listing_success,
      checkout_listing_cancel: snapshot.events.checkout_listing_cancel,
      payment_success_from_evaluation: snapshot.events.payment_success_from_evaluation,
      payment_cancel_from_evaluation: snapshot.events.payment_cancel_from_evaluation,
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

  const listingPrefillOrStart = Math.max(
    snapshot.events.listing_prefilled_from_evaluation,
    snapshot.events.start_post_listing,
  );

  snapshot.computedRates = {
    evaluation_success_rate: safeRatePercent(
      snapshot.events.evaluation_success,
      snapshot.events.start_evaluation,
    ),
    evaluation_to_listing_rate: safeRatePercent(
      snapshot.events.click_evaluation_to_listing,
      snapshot.events.evaluation_success,
    ),
    listing_to_checkout_rate: safeRatePercent(
      snapshot.events.checkout_listing_started,
      listingPrefillOrStart,
    ),
    checkout_success_rate: safeRatePercent(
      snapshot.events.checkout_listing_success,
      snapshot.events.checkout_listing_started,
    ),
    evaluation_to_payment_rate: safeRatePercent(
      snapshot.events.payment_success_from_evaluation,
      snapshot.events.evaluation_success,
    ),
  };

  {
    const { report, warning, debugError } = await runGaReport(
      analyticsDataClient,
      authMode,
      normalizedPropertyId,
      "topPages",
      {
      property,
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      }
    );
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
    const { report, warning, debugError } = await runGaReport(
      analyticsDataClient,
      authMode,
      normalizedPropertyId,
      "traffic",
      {
      property,
      dateRanges,
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      limit: 10,
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }
    );
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
    const { report, warning, debugError } = await runGaReport(
      analyticsDataClient,
      authMode,
      normalizedPropertyId,
      "devices",
      {
      property,
      dateRanges,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }, { name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }
    );
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
