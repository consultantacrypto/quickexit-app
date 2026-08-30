import type { MetadataRoute } from "next";
import { AI_ANSWER_LANDING_PATHS } from "@/lib/aiAnswerLanding";
import { PRODUCTION_SITE_URL } from "@/lib/siteUrl";

export const SITEMAP_LOCALES = ["ro", "en"] as const;
export const SITEMAP_DEFAULT_LISTING_LOCALE = "ro";

const LISTING_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ListingSitemapRow = {
  id?: unknown;
  created_at?: unknown;
  status?: unknown;
  is_seed?: unknown;
};

export function isPublicListingSitemapId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (!LISTING_ID_RE.test(trimmed)) return false;
  if (trimmed.includes("/") || trimmed.includes("?") || trimmed.includes("#")) {
    return false;
  }
  return true;
}

export function isActivePublicListingRow(row: ListingSitemapRow | null | undefined): boolean {
  if (!row) return false;
  if (!isPublicListingSitemapId(row.id)) return false;
  if (row.status !== "active") return false;
  if (row.is_seed !== false) return false;
  return true;
}

export function sitemapLastModified(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

export function localizedSitemapUrl(siteUrl: string, locale: string, path: string): string {
  const origin = siteUrl.replace(/\/+$/, "") || PRODUCTION_SITE_URL;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return `${origin}/${locale}`;
  }
  return `${origin}/${locale}${normalized}`;
}

export function staticAndCategorySitemapPaths(): string[] {
  return [
    "/",
    "/evaluare",
    "/pune-anunt",
    "/posteaza-cerere",
    "/pentru-investitori",
    "/pentru-vanzatori",
    "/ghid/exit-price",
    "/ghid/active-sub-pretul-pietei",
    "/capital-disponibil",
    "/licitatii",
    "/tarife",
    "/cum-functioneaza",
    "/future-mobility",
    "/contact",
    "/termeni",
    "/confidentialitate",
    "/cookies",
    ...AI_ANSWER_LANDING_PATHS,
    "/categorii/auto",
    "/categorii/imobiliare",
    "/categorii/lux",
    "/categorii/gadgets",
    "/categorii/foto",
    "/categorii/business",
  ];
}

export function buildStaticSitemapEntries(
  siteUrl: string,
  now: Date,
): MetadataRoute.Sitemap {
  const origin = siteUrl.replace(/\/+$/, "") || PRODUCTION_SITE_URL;
  return SITEMAP_LOCALES.flatMap((locale) =>
    staticAndCategorySitemapPaths().map((path) => {
      const isAiLanding = AI_ANSWER_LANDING_PATHS.includes(
        path as (typeof AI_ANSWER_LANDING_PATHS)[number],
      );
      const isGuide = path.startsWith("/ghid/");
      return {
        url: localizedSitemapUrl(origin, locale, path),
        lastModified: now,
        changeFrequency: isGuide || isAiLanding ? ("monthly" as const) : ("daily" as const),
        priority: path === "/" ? 1 : isGuide ? 0.7 : isAiLanding ? 0.75 : 0.8,
      };
    }),
  );
}

export function buildListingSitemapEntries(
  rows: unknown,
  siteUrl: string,
  now: Date,
): MetadataRoute.Sitemap {
  if (!Array.isArray(rows)) return [];
  const origin = siteUrl.replace(/\/+$/, "") || PRODUCTION_SITE_URL;

  return rows.flatMap((raw) => {
    try {
      const row = raw as ListingSitemapRow;
      if (!isActivePublicListingRow(row)) return [];
      const id = String(row.id).trim();
      return [
        {
          url: `${origin}/${SITEMAP_DEFAULT_LISTING_LOCALE}/anunt/${id}`,
          lastModified: sitemapLastModified(row.created_at, now),
          changeFrequency: "daily" as const,
          priority: 0.8,
        },
      ];
    } catch {
      return [];
    }
  });
}

export function mergeSitemapEntries(
  ...groups: MetadataRoute.Sitemap[]
): MetadataRoute.Sitemap {
  const deduped = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const group of groups) {
    for (const entry of group) {
      if (!entry?.url || typeof entry.url !== "string") continue;
      if (
        !/^https:\/\/www\.quickexit\.ro\//.test(entry.url) &&
        !entry.url.includes("localhost") &&
        !entry.url.includes("127.0.0.1")
      ) {
        continue;
      }
      deduped.set(entry.url, entry);
    }
  }
  return Array.from(deduped.values());
}
