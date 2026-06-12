import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

const LOCALES = ["ro", "en"] as const;

const PRIVATE_PATHS = [
  "/api",
  "/dashboard",
  "/hq-admin",
  "/auth",
  "/negociere",
  "/editeaza-anunt",
  "/trimite-oferta",
] as const;

function localizedPrivateDisallow(): string[] {
  return LOCALES.flatMap((locale) =>
    PRIVATE_PATHS.map((path) => `/${locale}${path}`),
  );
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const disallow = [...PRIVATE_PATHS, ...localizedPrivateDisallow()];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
      },
      {
        userAgent: "GPTBot",
        allow: "/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
