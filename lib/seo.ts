import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export type PageLocale = "ro" | "en";

export function resolvePageLocale(locale: string | undefined): PageLocale {
  return locale === "en" ? "en" : "ro";
}

type BuildPageMetadataInput = {
  locale: PageLocale;
  title: string;
  description: string;
  /** Locale-free app path, e.g. `/evaluare` or `/` for homepage */
  path: string;
  robots?: Metadata["robots"];
};

function localePath(locale: PageLocale, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/") {
    return `/${locale}`;
  }
  return `/${locale}${normalizedPath}`;
}

export function buildPageMetadata({
  locale,
  title,
  description,
  path,
  robots = { index: true, follow: true },
}: BuildPageMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const canonicalPath = localePath(locale, path);
  const canonical = `${siteUrl}${canonicalPath}`;
  const finalTitle = title.includes("Quick Exit") ? title : `${title} | Quick Exit`;
  const ogLocale = locale === "en" ? "en_GB" : "ro_RO";
  const roPath = localePath("ro", path);
  const enPath = localePath("en", path);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      absolute: finalTitle,
    },
    description,
    robots,
    alternates: {
      canonical,
      languages: {
        ro: `${siteUrl}${roPath}`,
        en: `${siteUrl}${enPath}`,
        "x-default": `${siteUrl}${roPath}`,
      },
    },
    openGraph: {
      title: finalTitle,
      description,
      url: canonical,
      type: "website",
      siteName: "Quick Exit",
      locale: ogLocale,
      images: [
        {
          url: `${siteUrl}/logo.png`,
          width: 512,
          height: 512,
          alt: "Quick Exit",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description,
      images: [`${siteUrl}/logo.png`],
    },
  };
}
