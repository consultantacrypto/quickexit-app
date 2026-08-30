import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  buildListingSitemapEntries,
  buildStaticSitemapEntries,
  mergeSitemapEntries,
} from "@/lib/sitemapEntries";
import { PRODUCTION_SITE_URL } from "@/lib/siteUrl";

export const revalidate = 3600;

function getEnv(name: string): string | null {
  const value = process.env[name];
  if (!value || !value.trim()) return null;
  return value.trim();
}

function fallbackSitemap(): MetadataRoute.Sitemap {
  return buildStaticSitemapEntries(PRODUCTION_SITE_URL, new Date());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const siteUrl = PRODUCTION_SITE_URL;
    const now = new Date();
    const staticEntries = buildStaticSitemapEntries(siteUrl, now);

    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("sitemap listings skipped: missing public Supabase env", {
        missingNextPublicSupabaseUrl: !supabaseUrl,
        missingNextPublicSupabaseAnonKey: !supabaseAnonKey,
      });
      return mergeSitemapEntries(staticEntries);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const listingQuery = supabase
      .from("listings")
      .select("id,created_at,status,is_seed")
      .eq("status", "active")
      .eq("is_seed", false)
      .order("created_at", { ascending: false })
      .limit(500);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("sitemap listings timeout")), 5000);
    });
    const { data, error } = await Promise.race([listingQuery, timeout]);

    if (error) {
      console.warn("sitemap listings query failed", {
        code: error.code ?? null,
        message: error.message ?? null,
      });
      return mergeSitemapEntries(staticEntries);
    }

    const listingEntries = buildListingSitemapEntries(data, siteUrl, now);
    return mergeSitemapEntries(staticEntries, listingEntries);
  } catch (error) {
    const err = error as { message?: string };
    console.warn("sitemap unexpected error", {
      message: err?.message ?? "unknown error",
    });
    return fallbackSitemap();
  }
}
