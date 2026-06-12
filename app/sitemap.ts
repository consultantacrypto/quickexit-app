import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/siteUrl";

export const revalidate = 3600;

const LOCALES = ["ro", "en"] as const;
const DEFAULT_LISTING_LOCALE = "ro";

type ListingSitemapRow = {
  id: string | null;
  created_at: string | null;
  status: string | null;
  is_seed: boolean | null;
};

function getEnv(name: string): string | null {
  const value = process.env[name];
  if (!value || !value.trim()) return null;
  return value.trim();
}

function localizedUrl(siteUrl: string, locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return `${siteUrl}/${locale}`;
  }
  return `${siteUrl}/${locale}${normalized}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticPaths = [
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
    "/contact",
    "/termeni",
    "/confidentialitate",
    "/cookies",
  ];

  const categoryPaths = [
    "/categorii/auto",
    "/categorii/imobiliare",
    "/categorii/lux",
    "/categorii/gadgets",
    "/categorii/foto",
    "/categorii/business",
  ];

  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: localizedUrl(siteUrl, locale, path),
      lastModified: now,
      changeFrequency: path.startsWith("/ghid/") ? ("monthly" as const) : ("daily" as const),
      priority: path === "/" ? 1 : path.startsWith("/ghid/") ? 0.7 : 0.8,
    })),
  );

  const categoryEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    categoryPaths.map((path) => ({
      url: localizedUrl(siteUrl, locale, path),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  );

  const entries: MetadataRoute.Sitemap = [...staticEntries, ...categoryEntries];

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("sitemap listings skipped: missing public Supabase env", {
      missingNextPublicSupabaseUrl: !supabaseUrl,
      missingNextPublicSupabaseAnonKey: !supabaseAnonKey,
    });
    return entries;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data, error } = await supabase
      .from("listings")
      .select("id,created_at,status,is_seed")
      .eq("status", "active")
      .eq("is_seed", false)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.warn("sitemap listings query failed", {
        code: error.code ?? null,
        message: error.message ?? null,
      });
      return entries;
    }

    const listingEntries: MetadataRoute.Sitemap = (data ?? [])
      .filter((row: ListingSitemapRow) => {
        const id = typeof row?.id === "string" ? row.id.trim() : "";
        return id.length > 0 && row.status === "active" && row.is_seed === false;
      })
      .map((row: ListingSitemapRow) => {
        const id = (row.id as string).trim();
        const createdAt = typeof row.created_at === "string" ? row.created_at.trim() : "";
        const lastModified = createdAt ? new Date(createdAt) : now;

        return {
          url: `${siteUrl}/${DEFAULT_LISTING_LOCALE}/anunt/${id}`,
          lastModified: Number.isNaN(lastModified.getTime()) ? now : lastModified,
          changeFrequency: "daily" as const,
          priority: 0.8,
        };
      });

    const dedupedByUrl = new Map<string, MetadataRoute.Sitemap[number]>();
    [...entries, ...listingEntries].forEach((entry) => {
      dedupedByUrl.set(entry.url, entry);
    });
    return Array.from(dedupedByUrl.values());
  } catch (error) {
    const err = error as { message?: string };
    console.warn("sitemap listings unexpected error", {
      message: err?.message ?? "unknown error",
    });
    return entries;
  }
}
