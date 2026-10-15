import type { ErrorEvent, EventHint } from "@sentry/nextjs";
import {
  resolveObservabilityEnvironment,
  resolvePublicSentryDsn,
  resolveSentryDsn,
} from "@/lib/observability/env";
import {
  sanitizeBreadcrumbData,
  sanitizeSentryEvent,
} from "@/lib/observability/redaction";

function sampleRateForEnv(): number {
  const env = resolveObservabilityEnvironment();
  if (env === "development") return 0;
  if (env === "staging") return 0.2;
  return 0.05;
}

const IGNORE_ERRORS = [
  "ResizeObserver loop",
  "Non-Error promise rejection captured",
  /Loading chunk [\d]+ failed/i,
  /ChunkLoadError/i,
];

/**
 * Staging probe: last post-beforeSend event for live redaction audit.
 * Stored on globalThis so instrumentation bundle and route handler share state
 * (Next.js may duplicate module instances otherwise).
 */
const PROBE_EVENT_KEY = "__qe_last_sanitized_probe_event__";

type ProbeGlobal = typeof globalThis & {
  [PROBE_EVENT_KEY]?: ErrorEvent | null;
};

export function consumeLastSanitizedProbeEvent(): ErrorEvent | null {
  const g = globalThis as ProbeGlobal;
  const event = g[PROBE_EVENT_KEY] ?? null;
  g[PROBE_EVENT_KEY] = null;
  return event;
}

function stashSanitizedProbeEvent(event: ErrorEvent): void {
  (globalThis as ProbeGlobal)[PROBE_EVENT_KEY] = event;
}

function isObservabilityProbeEvent(event: ErrorEvent): boolean {
  const tags = event.tags ?? {};
  if (tags["qe.probe"] || tags["qe.operation"] === "sentry_probe") return true;
  const msg = String(event.message ?? "");
  if (msg.includes("qe.observability.sentry_probe")) return true;
  const values = event.exception?.values ?? [];
  return values.some((v) =>
    String(v.value ?? "").includes("qe.observability.sentry_probe"),
  );
}

function beforeSendShared(
  event: ErrorEvent,
  _hint: EventHint,
  dsnPresent: boolean,
): ErrorEvent | null {
  const environment = resolveObservabilityEnvironment();
  if (environment === "development" || !dsnPresent) return null;
  const sanitized = sanitizeSentryEvent(event);
  if (sanitized && isObservabilityProbeEvent(sanitized)) {
    stashSanitizedProbeEvent(sanitized);
  }
  return sanitized;
}

function beforeBreadcrumbShared(breadcrumb: {
  data?: Record<string, unknown>;
  message?: string;
}) {
  if (breadcrumb.data) {
    breadcrumb.data = sanitizeBreadcrumbData(breadcrumb.data);
  }
  if (
    typeof breadcrumb.message === "string" &&
    /authorization|bearer|password|service_role|sk_live|sk_test|whsec_/i.test(
      breadcrumb.message,
    )
  ) {
    breadcrumb.message = "[Redacted]";
  }
  return breadcrumb;
}

export function buildServerSentryOptions() {
  const environment = resolveObservabilityEnvironment();
  const dsn = resolveSentryDsn();
  return {
    dsn,
    environment,
    tracesSampleRate: sampleRateForEnv(),
    sendDefaultPii: false as const,
    ignoreErrors: IGNORE_ERRORS,
    beforeSend(event: ErrorEvent, hint: EventHint) {
      return beforeSendShared(event, hint, Boolean(dsn));
    },
    beforeBreadcrumb: beforeBreadcrumbShared,
  };
}

export function buildClientSentryOptions() {
  const environment = resolveObservabilityEnvironment();
  const dsn = resolvePublicSentryDsn();
  return {
    dsn,
    environment,
    tracesSampleRate: sampleRateForEnv(),
    sendDefaultPii: false as const,
    ignoreErrors: IGNORE_ERRORS,
    beforeSend(event: ErrorEvent, hint: EventHint) {
      return beforeSendShared(event, hint, Boolean(dsn));
    },
    beforeBreadcrumb: beforeBreadcrumbShared,
  };
}
