import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function buildPageMetadata({
  title,
  description,
  path,
}: BuildPageMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonical = `${siteUrl}${normalizedPath}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${title} | Quick Exit`,
      description,
      url: canonical,
      type: "website",
      siteName: "Quick Exit",
      locale: "ro_RO",
    },
  };
}
