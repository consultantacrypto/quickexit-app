/**
 * Safe internal redirect paths for auth callbacks.
 * Rejects open redirects: protocol-relative (//host), backslash, absolute URLs.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (raw == null || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("@")) return fallback;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
  if (decoded.includes("\\") || decoded.includes("://") || decoded.includes("@")) {
    return fallback;
  }

  return trimmed;
}
