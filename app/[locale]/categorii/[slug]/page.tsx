import type { Metadata } from "next";
import {
  getCategoryMetadataCopy,
  getUnavailableCategoryMetadata,
} from "@/lib/pageMetadataCopy";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";
import CategorieClient from "./CategorieClient";

type CategoryMeta = { label: string };

const categoryMetaMap: Record<string, CategoryMeta> = {
  auto: { label: "Auto" },
  imobiliare: { label: "Imobiliare" },
  lux: { label: "Lux" },
  gadgets: { label: "Gadgets" },
  foto: { label: "Foto" },
  business: { label: "Business" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc = resolvePageLocale(locale);
  const category = categoryMetaMap[slug];

  if (!category) {
    const unavailable = getUnavailableCategoryMetadata(loc);
    return buildPageMetadata({
      locale: loc,
      title: unavailable.title,
      description: unavailable.description,
      path: `/categorii/${slug}`,
      robots: { index: false, follow: false },
    });
  }

  const copy = getCategoryMetadataCopy(slug, loc);
  if (!copy) {
    const unavailable = getUnavailableCategoryMetadata(loc);
    return buildPageMetadata({
      locale: loc,
      title: unavailable.title,
      description: unavailable.description,
      path: `/categorii/${slug}`,
      robots: { index: false, follow: false },
    });
  }

  return buildPageMetadata({
    locale: loc,
    title: copy.title,
    description: copy.description,
    path: `/categorii/${slug}`,
  });
}

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function CategoryPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const category = categoryMetaMap[slug];
  const siteUrl = getSiteUrl();
  const breadcrumbJsonLd =
    category
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Quick Exit",
              item: `${siteUrl}/${locale}`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Categorii",
              item: `${siteUrl}/${locale}/categorii/${slug}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: category.label,
              item: `${siteUrl}/${locale}/categorii/${slug}`,
            },
          ],
        }
      : null;

  return (
    <>
      {breadcrumbJsonLd && (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
          type="application/ld+json"
        />
      )}
      <CategorieClient />
    </>
  );
}
