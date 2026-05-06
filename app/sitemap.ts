import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [...staticRoutes, ...categoryRoutes].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: route === "/" ? 1 : 0.8,
  }));
}
