import * as Sentry from "@sentry/nextjs";
import { resolveObservabilityEnvironment } from "@/lib/observability/env";
import { redactDeep } from "@/lib/observability/redaction";

export type CaptureContext = {
  component: string;
  operation: string;
  correlation_id?: string | null;
  entity_id?: string | null;
  error_code?: string | null;
  /** Safe business tags only — no secrets/PII. */
  tags?: Record<string, string | number | boolean | null | undefined>;
  extra?: Record<string, unknown>;
  level?: Sentry.SeverityLevel;
};

function applyContext(ctx: CaptureContext): void {
  const env = resolveObservabilityEnvironment();
  Sentry.setTag("qe.environment", env);
  Sentry.setTag("qe.component", ctx.component);
  Sentry.setTag("qe.operation", ctx.operation);
  if (ctx.correlation_id) {
    Sentry.setTag("qe.correlation_id", ctx.correlation_id);
  }
  if (ctx.entity_id) {
    Sentry.setTag("qe.entity_id", String(ctx.entity_id));
  }
  if (ctx.error_code) {
    Sentry.setTag("qe.error_code", ctx.error_code);
  }
  if (ctx.tags) {
    for (const [key, value] of Object.entries(ctx.tags)) {
      if (value === undefined || value === null) continue;
      Sentry.setTag(`qe.${key}`, String(value));
    }
  }
  if (ctx.extra) {
    Sentry.setContext(
      "qe",
      redactDeep({
        component: ctx.component,
        operation: ctx.operation,
        correlation_id: ctx.correlation_id ?? null,
        entity_id: ctx.entity_id ?? null,
        error_code: ctx.error_code ?? null,
        ...ctx.extra,
      }) as Record<string, unknown>,
    );
  }
}

/** Capture unexpected exceptions on critical paths. */
export function captureException(
  error: unknown,
  ctx: CaptureContext,
): string | undefined {
  const err = error instanceof Error ? error : new Error(String(error));
  return Sentry.withScope((scope) => {
    applyContext(ctx);
    if (ctx.level) scope.setLevel(ctx.level);
    return Sentry.captureException(err);
  });
}

/**
 * Capture abnormal-but-expected states (e.g. invalid webhook signature).
 * Prefer warning; avoid flooding with routine noise.
 */
export function captureMessage(
  message: string,
  ctx: CaptureContext,
): string | undefined {
  return Sentry.withScope((scope) => {
    applyContext(ctx);
    scope.setLevel(ctx.level ?? "warning");
    return Sentry.captureMessage(message);
  });
}
