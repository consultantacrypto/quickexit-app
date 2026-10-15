/**
 * Observability environment resolution.
 * Prefer explicit SENTRY_ENVIRONMENT; else map Vercel / staging flags.
 * Never invent a third plane that mixes Production with Preview.
 */

export type ObservabilityEnvironment =
  | "production"
  | "staging"
  | "development"
  | "unknown";

export function resolveObservabilityEnvironment(): ObservabilityEnvironment {
  const explicit = (process.env.SENTRY_ENVIRONMENT ?? "")
    .trim()
    .toLowerCase();
  if (explicit === "production" || explicit === "prod") return "production";
  if (
    explicit === "staging" ||
    explicit === "preview" ||
    explicit === "stage"
  ) {
    return "staging";
  }
  if (explicit === "development" || explicit === "dev") return "development";

  if (process.env.QE_STAGING_SITE === "1") return "staging";

  const vercelEnv = (process.env.VERCEL_ENV ?? "").trim().toLowerCase();
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "staging";
  if (vercelEnv === "development") return "development";

  if (process.env.NODE_ENV === "development") return "development";
  if (process.env.NODE_ENV === "production") return "production";

  return "unknown";
}

export function isStagingObservabilityPlane(): boolean {
  return resolveObservabilityEnvironment() === "staging";
}

export function isProductionObservabilityPlane(): boolean {
  return resolveObservabilityEnvironment() === "production";
}

/** Public DSN is safe for browser; server may use SENTRY_DSN fallback. */
export function resolveSentryDsn(): string | undefined {
  const dsn =
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    "";
  return dsn || undefined;
}

export function resolvePublicSentryDsn(): string | undefined {
  const dsn =
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    process.env.SENTRY_DSN?.trim() ||
    "";
  return dsn || undefined;
}
