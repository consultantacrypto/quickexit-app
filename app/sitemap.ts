import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/siteUrl";

export const revalidate = 3600;

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes = [
    "/",
    "/evaluare",
    "/pune-anunt",
    "/posteaza-cerere",
    "/capital-disponibil",
    "/tarife",
    "/cum-functioneaza",
    "/contact",
    "/termeni",
    "/confidentialitate",
    "/cookies",
  ];

  const categoryRoutes = [
    "/categorii/auto",
    "/categorii/imobiliare",
    "/categorii/lux",
    "/categorii/gadgets",
    "/categorii/foto",
    "/categorii/business",
  ];

  const entries: MetadataRoute.Sitemap = [...staticRoutes, ...categoryRoutes].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: route === "/" ? 1 : 0.8,
  }));

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
          url: `${siteUrl}/anunt/${id}`,
          lastModified: Number.isNaN(lastModified.getTime()) ? now : lastModified,
          changeFrequency: "daily",
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
