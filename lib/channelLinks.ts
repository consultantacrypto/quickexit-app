import { safeInternalPath } from "@/lib/authRedirect";
import {
  type AttributionTouch,
  ATTRIBUTION_COOKIE_NAME,
  absorbTouch,
  attributionCookieJson,
  cookieOptionsForAttribution,
  parseStoredAttribution,
} from "@/lib/attribution";
import { PRODUCTION_SITE_URL } from "@/lib/siteUrl";

export type ChannelLink = {
  code: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  label: string;
  placement: string;
};

/**
 * Short links for bios and video descriptions.
 * Add a row here, then use https://www.quickexit.ro/go/<code>
 * Optional: ?v=<video id> sets utm_content. ?to=/tarife sets the landing path.
 */
export const CHANNEL_LINKS: readonly ChannelLink[] = [
  {
    code: "yt-md",
    utm_source: "youtube",
    utm_medium: "social",
    utm_campaign: "mihai_daniel",
    label: "YouTube Mihai Daniel",
    placement: "YouTube channel Mihai Daniel — bio and video descriptions",
  },
  {
    code: "yt-qe",
    utm_source: "youtube",
    utm_medium: "social",
    utm_campaign: "quickexit",
    label: "YouTube QuickExit",
    placement: "YouTube channel QuickExit — bio and video descriptions",
  },
  {
    code: "tt-md",
    utm_source: "tiktok",
    utm_medium: "social",
    utm_campaign: "mihai_daniel",
    label: "TikTok Mihai Daniel",
    placement: "TikTok Mihai Daniel — bio",
  },
  {
    code: "tt-qe",
    utm_source: "tiktok",
    utm_medium: "social",
    utm_campaign: "quickexit",
    label: "TikTok QuickExit",
    placement: "TikTok QuickExit — bio",
  },
  {
    code: "ig-qe",
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "quickexit",
    label: "Instagram QuickExit",
    placement: "Instagram QuickExit — bio",
  },
  {
    code: "x-qe",
    utm_source: "x",
    utm_medium: "social",
    utm_campaign: "quickexit",
    label: "X QuickExit",
    placement: "X/Twitter QuickExit — bio",
  },
  {
    code: "x-md",
    utm_source: "x",
    utm_medium: "social",
    utm_campaign: "mihai_daniel",
    label: "X Mihai Daniel",
    placement: "X/Twitter Mihai Daniel — bio",
  },
];

const BY_CODE = new Map(CHANNEL_LINKS.map((link) => [link.code, link]));

export function getChannelLink(code: string): ChannelLink | null {
  return BY_CODE.get(code.trim().toLowerCase()) ?? null;
}

export function channelLinkUrl(code: string): string {
  return `${PRODUCTION_SITE_URL}/go/${code}`;
}

export function withLocalePrefix(path: string): string {
  if (path === "/" || path === "") return "/ro";
  if (
    path === "/ro" ||
    path.startsWith("/ro/") ||
    path === "/en" ||
    path.startsWith("/en/")
  ) {
    return path;
  }
  return `/ro${path.startsWith("/") ? path : `/${path}`}`;
}

export function sanitizeChannelContent(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 80);
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) return undefined;
  return trimmed;
}

export function buildChannelRedirect(input: {
  code: string;
  origin: string;
  content?: string | null;
  to?: string | null;
  existingCookie?: string | null;
  now?: string;
}): {
  location: string;
  setCookie: {
    name: string;
    value: string;
    options: ReturnType<typeof cookieOptionsForAttribution>;
  } | null;
} {
  const origin = input.origin.replace(/\/+$/, "") || PRODUCTION_SITE_URL;
  const link = getChannelLink(input.code);
  if (!link) {
    return { location: `${origin}/ro`, setCookie: null };
  }

  const requested = input.to ? safeInternalPath(input.to, "/ro") : "/ro";
  const pathOnly = requested.split("?")[0] || "/ro";
  const extraQuery = requested.includes("?") ? requested.slice(requested.indexOf("?") + 1) : "";
  const path = withLocalePrefix(pathOnly);
  const dest = new URL(path, origin);
  if (extraQuery) {
    const extra = new URLSearchParams(extraQuery);
    extra.forEach((value, key) => {
      if (!key.startsWith("utm_")) dest.searchParams.append(key, value);
    });
  }
  dest.searchParams.set("utm_source", link.utm_source);
  dest.searchParams.set("utm_medium", link.utm_medium);
  dest.searchParams.set("utm_campaign", link.utm_campaign);
  const content = sanitizeChannelContent(input.content);
  if (content) dest.searchParams.set("utm_content", content);

  const now = input.now || new Date().toISOString();
  const touch: AttributionTouch = {
    utm_source: link.utm_source,
    utm_medium: link.utm_medium,
    utm_campaign: link.utm_campaign,
    landing_path: dest.pathname,
    captured_at: now,
  };
  if (content) touch.utm_content = content;

  const existing = parseStoredAttribution(input.existingCookie);
  const next = absorbTouch(existing, touch, now);
  return {
    location: dest.toString(),
    setCookie: {
      name: ATTRIBUTION_COOKIE_NAME,
      value: attributionCookieJson(next),
      options: cookieOptionsForAttribution(dest.protocol),
    },
  };
}
