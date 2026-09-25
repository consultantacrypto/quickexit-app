import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import AdCard from "@/app/components/AdCard";
import HeroSearchBar from "@/app/components/HeroSearchBar";
import { supabase } from "@/lib/supabase";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { getNumberLocale } from "@/lib/i18n/format";
import { adCardPricingProps } from "@/lib/listingPrice";
import { listingLocationLabelFromUnknown } from "@/lib/listingLocation";
import {
  buildPublicSearchPath,
  fetchPublicSearchListings,
  parsePublicListingSearchParams,
  PUBLIC_SEARCH_MAX_PAGE,
} from "@/lib/publicListings";
import { listingAcceptsCrypto } from "@/lib/cryptoPayment";
import { isCatalogOffer } from "@/lib/listingInventory";
import { normalizeSaleType } from "@/utils/normalizeSaleType";

export const revalidate = 60;

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    country?: string;
    county?: string;
    city?: string;
    district?: string;
    page?: string;
    crypto?: string;
    catalog?: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const t = await getTranslations({ locale, namespace: "ListingSearch" });

  return buildPageMetadata({
    locale: loc,
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/cauta",
  });
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const filters = parsePublicListingSearchParams({
    q: raw.q,
    country: raw.country,
    county: raw.county,
    city: raw.city,
    district: raw.district,
    page: raw.page,
    crypto: raw.crypto,
    catalog: raw.catalog,
  });
  const t = await getTranslations("ListingSearch");
  const numberLocale = getNumberLocale(locale);
  const { listings, total, page, pageSize } = await fetchPublicSearchListings(supabase, filters);
  const hasFilters = Boolean(
    filters.q || filters.country || filters.county || filters.city || filters.district || filters.crypto || filters.catalog || filters.locationInvalid,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const showPrev = page > 1;
  const showNext = page < totalPages && page < PUBLIC_SEARCH_MAX_PAGE;

  return (
    <div className="min-h-screen bg-white font-sans text-black">
      <section className="border-b border-gray-100 bg-white px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-6 text-3xl font-black uppercase italic tracking-tight md:text-4xl">
            {t("title")}
          </h1>
          <HeroSearchBar
            key={`${filters.q}|${filters.country}|${filters.county}|${filters.city}|${filters.district}`}
            initialQuery={filters.q}
            initialCountry={filters.country}
            initialCounty={filters.county}
            initialCity={filters.city}
            initialDistrict={filters.district}
            source="search_page"
          />
        </div>
      </section>

      <section className="px-4 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-neutral-600">
              {t("resultsCount", { count: total })}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={buildPublicSearchPath({ ...filters, crypto: !filters.crypto }, 1)}
                className={`rounded-xl border-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest ${
                  filters.crypto
                    ? "border-black bg-black text-[#FFD100]"
                    : "border-black bg-white text-black"
                }`}
              >
                {filters.crypto ? t("cryptoFilterOn") : t("cryptoFilter")}
              </Link>
              <Link
                href={buildPublicSearchPath({ ...filters, catalog: !filters.catalog }, 1)}
                className={`rounded-xl border-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest ${
                  filters.catalog
                    ? "border-black bg-black text-[#FFD100]"
                    : "border-black bg-white text-black"
                }`}
              >
                {filters.catalog ? t("catalogFilterOn") : t("catalogFilter")}
              </Link>
            {hasFilters ? (
              <Link
                href="/cauta"
                className="border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black md:text-xs"
              >
                {t("reset")}
              </Link>
            ) : null}
            </div>
          </div>

          {listings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3 lg:gap-10">
                {listings.map((item) => (
                  <AdCard
                    key={item.id}
                    cryptoAccepted={listingAcceptsCrypto(item)}
                    catalogOffer={isCatalogOffer(item.listing_kind)}
                    id={item.id}
                    title={item.title || ""}
                    image={item.images?.[0] || FALLBACK_IMAGE}
                    {...adCardPricingProps(item, numberLocale)}
                    type={normalizeSaleType(item.sale_strategy)}
                    location={listingLocationLabelFromUnknown(item.details)}
                    offerCount={typeof item.offer_count === "number" ? item.offer_count : null}
                    highestOffer={
                      typeof item.highest_offer === "number" || typeof item.highest_offer === "string"
                        ? item.highest_offer
                        : null
                    }
                    expiresAt={item.expires_at}
                  />
                ))}
              </div>
              {totalPages > 1 ? (
                <div className="mt-10 flex items-center justify-between gap-4">
                  {showPrev ? (
                    <Link
                      href={buildPublicSearchPath(filters, page - 1)}
                      className="border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black md:text-xs"
                    >
                      {t("prevPage")}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <p className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
                    {t("pageStatus", { page, totalPages })}
                  </p>
                  {showNext ? (
                    <Link
                      href={buildPublicSearchPath(filters, page + 1)}
                      className="border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black md:text-xs"
                    >
                      {t("nextPage")}
                    </Link>
                  ) : (
                    <span />
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border-[3px] border-dashed border-black bg-[#FDFCF8] py-20 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <p className="text-sm font-bold text-neutral-600">{t("empty")}</p>
              {hasFilters ? (
                <Link
                  href="/cauta"
                  className="mt-6 inline-flex items-center justify-center rounded-2xl border-[3px] border-black bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#FFD100]"
                >
                  {t("reset")}
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
