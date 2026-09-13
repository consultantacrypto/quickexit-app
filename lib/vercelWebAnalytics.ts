import type { BeforeSend, BeforeSendEvent } from "@vercel/analytics/next";

function isSafeHttpUrl(parsed: URL): boolean {
  return (
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    Boolean(parsed.hostname)
  );
}

/**
 * Strips query and hash from Vercel Web Analytics URLs.
 * Invalid or non-http(s) URLs are dropped.
 */
export const sanitizeVercelAnalyticsEvent: BeforeSend = (
  event: BeforeSendEvent,
): BeforeSendEvent | null => {
  let parsed: URL;
  try {
    parsed = new URL(event.url);
  } catch {
    return null;
  }

  if (!isSafeHttpUrl(parsed)) {
    return null;
  }

  parsed.search = "";
  parsed.hash = "";

  return {
    ...event,
    url: parsed.toString(),
  };
};
