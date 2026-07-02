import { fetchFutureMobilityListings } from "@/lib/listingSeo";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import FutureMobilityHubClient from "./FutureMobilityHubClient";
import FutureMobilityListingGrid from "./FutureMobilityListingGrid";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FutureMobility" });

  return buildPageMetadata({
    locale: resolvePageLocale(locale),
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/future-mobility",
  });
}

export default async function FutureMobilityPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("FutureMobility");
  const listings = await fetchFutureMobilityListings();

  return (
    <div className="min-h-screen bg-[#F7F4EC] font-sans text-black selection:bg-[#FFD100]/40 antialiased">
      <FutureMobilityHubClient />

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-24 md:px-8 md:pt-28">
        <section className="mb-14 rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
            ⚡ {t("eyebrow")}
          </p>
          <h1 className="mt-5 text-3xl font-black uppercase italic leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300 md:text-base">
            {t("subtitle")}
          </p>
          <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-neutral-200">
            {t("subtitleLine2")}
          </p>
        </section>

        {listings.length > 0 ? (
          <FutureMobilityListingGrid listings={listings} />
        ) : (
          <div className="rounded-[2rem] border-[3px] border-dashed border-black bg-white px-6 py-16 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <p className="text-lg font-black uppercase italic tracking-tight text-black">
              {t("emptyTitle")}
            </p>
            <p className="mx-auto mt-4 max-w-lg text-sm font-medium leading-relaxed text-neutral-600">
              {t("emptyDescription")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
