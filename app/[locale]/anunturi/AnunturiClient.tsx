"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import AdCard from "@/app/components/AdCard";
import { Link } from "@/src/i18n/navigation";
import { listingsIndexPath } from "@/src/i18n/paths";
import { getNumberLocale } from "@/lib/i18n/format";
import {
  LISTING_CATEGORY_FILTERS,
  filterListingsByCategorySlug,
  type ListingCategorySlug,
} from "@/lib/listingCategories";
import { adCardPricingProps } from "@/lib/listingPrice";
import { normalizeSaleType } from "@/utils/normalizeSaleType";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80";

export type PublicListingCard = {
  id: string;
  title: string;
  images?: string[] | null;
  market_price?: number | string | null;
  exit_price?: number | string | null;
  discount?: number | string | null;
  deal_score?: number | null;
  sale_strategy?: string | null;
  offer_count?: number | null;
  highest_offer?: number | string | null;
  expires_at?: string | null;
  category?: string | null;
  status?: string | null;
  is_seed?: boolean | null;
  details?: unknown;
};

type AnunturiClientProps = {
  listings: PublicListingCard[];
  fetchError: boolean;
  activeSlug: ListingCategorySlug | null;
};

export default function AnunturiClient({
  listings,
  fetchError,
  activeSlug,
}: AnunturiClientProps) {
  const locale = useLocale();
  const numberLocale = getNumberLocale(locale);
  const t = useTranslations("AllListings");
  const tCat = useTranslations("Categories");
  const visible = useMemo(
    () => filterListingsByCategorySlug(listings, activeSlug),
    [listings, activeSlug],
  );

  const countLabel =
    visible.length === 1 ? t("countOne") : t("count", { count: visible.length });

  return (
    <div className="min-h-screen bg-white font-sans text-black selection:bg-[#FFD100] selection:text-black">
      <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-8 md:px-8 md:pb-28 md:pt-12">
        <Link
          href="/"
          className="border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black"
        >
          ← {t("backHome")}
        </Link>

        <header className="mt-8 max-w-3xl md:mt-10">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">
            {t("kicker")}
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase italic tracking-tight text-black md:text-4xl lg:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-neutral-600 md:text-base">
            {t("description")}
          </p>
        </header>

        <div
          className="mt-8 flex flex-wrap gap-2 md:mt-10 md:gap-3"
          role="group"
          aria-label={t("filterLabel")}
        >
          <Link
            href={listingsIndexPath()}
            className={`rounded-xl border-2 px-4 py-2 text-xs font-black uppercase tracking-widest italic transition ${
              !activeSlug
                ? "border-black bg-black text-[#FFD100] shadow-[2px_2px_0_0_#FFD100]"
                : "border-black bg-white text-neutral-700 hover:text-black"
            }`}
          >
            {t("filterAll")}
          </Link>
          {LISTING_CATEGORY_FILTERS.map((category) => (
            <Link
              key={category.slug}
              href={listingsIndexPath(category.slug)}
              className={`rounded-xl border-2 px-4 py-2 text-xs font-black uppercase tracking-widest italic transition ${
                activeSlug === category.slug
                  ? "border-black bg-black text-[#FFD100] shadow-[2px_2px_0_0_#FFD100]"
                  : "border-black bg-white text-black shadow-[2px_2px_0_0_rgba(0,0,0,0.12)] hover:-translate-y-0.5"
              }`}
            >
              {tCat(category.labelKey)}
            </Link>
          ))}
        </div>

        {fetchError ? (
          <div className="mt-12 rounded-2xl border-[3px] border-dashed border-black bg-[#FDFCF8] px-8 py-16 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <p className="text-sm font-bold text-neutral-700">{t("error")}</p>
          </div>
        ) : visible.length > 0 ? (
          <>
            <p className="mt-8 text-[11px] font-black uppercase tracking-widest text-neutral-600">
              {countLabel}
            </p>
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3 lg:gap-10">
              {visible.map((item) => (
                <AdCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.images?.[0] || FALLBACK_IMAGE}
                  {...adCardPricingProps(item, numberLocale)}
                  type={normalizeSaleType(item.sale_strategy)}
                  offerCount={item.offer_count}
                  highestOffer={item.highest_offer}
                  expiresAt={item.expires_at}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="mt-12 rounded-2xl border-[3px] border-dashed border-black bg-[#FDFCF8] px-8 py-16 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <p className="text-sm font-bold text-neutral-600">
              {activeSlug ? t("emptyFiltered") : t("empty")}
            </p>
            <Link
              href="/pune-anunt"
              className="mt-6 inline-flex items-center justify-center rounded-2xl border-[3px] border-black bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#FFD100]"
            >
              {t("postCta")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
