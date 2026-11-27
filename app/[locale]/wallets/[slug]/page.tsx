import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSiteUrl } from "@/lib/siteUrl";
import {
  WALLET_SEO_LANDING_SLUGS,
  buildWalletSeoJsonLd,
  getWalletSeoLanding,
  isWalletSeoLandingSlug,
  walletSeoLandingCanonicalPath,
} from "@/lib/walletSeoLandings";
import WalletSeoLandingView from "./WalletSeoLandingView";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return WALLET_SEO_LANDING_SLUGS.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isWalletSeoLandingSlug(slug)) return {};

  const landing = getWalletSeoLanding(slug);
  const canonical = `${getSiteUrl()}${walletSeoLandingCanonicalPath(slug)}`;
  const romanian = locale === "ro";

  return {
    title: { absolute: landing.metaTitle },
    description: landing.metaDescription,
    robots: romanian ? { index: true, follow: true } : { index: false, follow: true },
    alternates: {
      canonical,
      languages: {
        ro: canonical,
        "x-default": canonical,
      },
    },
    openGraph: {
      title: landing.metaTitle,
      description: landing.metaDescription,
      url: canonical,
      type: "website",
      siteName: "Quick Exit",
      locale: "ro_RO",
      images: [{ url: "/logo.png", width: 512, height: 512, alt: "Quick Exit" }],
    },
    twitter: {
      card: "summary_large_image",
      title: landing.metaTitle,
      description: landing.metaDescription,
      images: ["/logo.png"],
    },
  };
}

export default async function WalletSeoLandingPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isWalletSeoLandingSlug(slug)) notFound();
  if (locale !== "ro") permanentRedirect(walletSeoLandingCanonicalPath(slug));

  setRequestLocale("ro");
  const landing = getWalletSeoLanding(slug);
  const jsonLd = buildWalletSeoJsonLd(landing, getSiteUrl());

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <WalletSeoLandingView landing={landing} />
    </>
  );
}
