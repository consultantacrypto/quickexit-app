import { resolveObservabilityEnvironment } from "@/lib/observability/env";
import { redactDeep } from "@/lib/observability/redaction";

export type LogResult =
  | "ok"
  | "success"
  | "error"
  | "warn"
  | "skip"
  | "info"
  | "blocked_zero_images"
  | "denied"
  | "not_found"
  | "validation_failed";

export type StructuredLogFields = {
  component: string;
  operation: string;
  result: LogResult;
  correlation_id?: string | null;
  request_id?: string | null;
  entity_id?: string | null;
  error_code?: string | null;
  [key: string]: unknown;
};

function baseFields() {
  return {
    timestamp: new Date().toISOString(),
    environment: resolveObservabilityEnvironment(),
  };
}

/**
 * Lightweight structured logs for Vercel log drains.
 * Values are redacted before emit — never log secrets/PII intentionally.
 */
export function structuredLog(
  level: "info" | "warn" | "error",
  fields: StructuredLogFields,
): void {
  const payload = redactDeep({
    ...baseFields(),
    ...fields,
  });

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logInfo(fields: StructuredLogFields): void {
  structuredLog("info", fields);
}

export function logWarn(fields: StructuredLogFields): void {
  structuredLog("warn", { ...fields, result: fields.result ?? "warn" });
}

export function logError(fields: StructuredLogFields): void {
  structuredLog("error", { ...fields, result: fields.result ?? "error" });
}
