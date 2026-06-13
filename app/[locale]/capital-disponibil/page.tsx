import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import CapitalDisponibilClient from "./CapitalDisponibilClient";
import CapitalDisponibilIntro from "./CapitalDisponibilIntro";
import {
  buildCapitalFaqJsonLd,
  buildCapitalItemListJsonLd,
} from "@/lib/capitalDisponibilContent";
import { PAGE_METADATA_COPY } from "@/lib/pageMetadataCopy";
import { fetchPublicActiveDemands } from "@/lib/publicDemands";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const copy = PAGE_METADATA_COPY.capitalDisponibil[loc];

  return buildPageMetadata({
    locale: loc,
    title: copy.title,
    description: copy.description,
    path: "/capital-disponibil",
  });
}

export default async function CapitalDirectoryPage({ params }: PageProps) {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  setRequestLocale(loc);

  const [initialDemands, siteUrl] = await Promise.all([
    fetchPublicActiveDemands(),
    Promise.resolve(getSiteUrl()),
  ]);

  const faqJsonLd = buildCapitalFaqJsonLd(loc);
  const itemListJsonLd = buildCapitalItemListJsonLd(initialDemands, loc, siteUrl);

  return (
    <div className="min-h-screen bg-[#F7F4EC] pt-8 pb-20 font-sans text-black selection:bg-black selection:text-[#FFD100]">
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        type="application/ld+json"
      />
      {itemListJsonLd && (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
          type="application/ld+json"
        />
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <CapitalDisponibilIntro locale={loc} />
        <CapitalDisponibilClient initialDemands={initialDemands} locale={loc} />
      </div>
    </div>
  );
}
