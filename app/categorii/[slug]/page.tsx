import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
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

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const category = categoryMetaMap[slug];
  if (!category) {
    const siteUrl = getSiteUrl();
    const canonical = `${siteUrl}/categorii`;
    return {
      title: { absolute: "Categorie indisponibilă | Quick Exit" },
      description: "Categoria solicitată nu este disponibilă public.",
      alternates: { canonical },
      robots: { index: false, follow: false },
      openGraph: {
        title: "Categorie indisponibilă | Quick Exit",
        description: "Categoria solicitată nu este disponibilă public.",
        url: canonical,
        type: "website",
        siteName: "Quick Exit",
        locale: "ro_RO",
      },
    };
  }

  return buildPageMetadata({
    title: `Active ${category.label} sub prețul pieței | Quick Exit`,
    description:
      `Descoperă active din categoria ${category.label} listate pe Quick Exit cu preț de exit și oportunități pentru cumpărători/investitori.`,
    path: `/categorii/${slug}`,
  });
  });
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
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
              item: siteUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Categorii",
              item: `${siteUrl}/categorii`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: category.label,
              item: `${siteUrl}/categorii/${slug}`,
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