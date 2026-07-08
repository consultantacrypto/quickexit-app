import AdCard from "@/app/components/AdCard";
import DemandCard from "@/app/components/DemandCard";
import type { Metadata } from "next";
import TrackedLink from "@/app/components/TrackedLink";
import GlobalStats from "@/app/components/GlobalStats";
import { supabase } from "@/lib/supabase";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";
import { normalizeSaleType } from "@/utils/normalizeSaleType";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { categoryPath } from "@/src/i18n/paths";
import { getNumberLocale } from "@/lib/i18n/format";
import { adCardPricingProps } from "@/lib/listingPrice";

export const revalidate = 60;

const PACKAGE_IDS = ["auction", "economy", "standard", "urgent"] as const;

const CATEGORY_DEFS = [
  {
    slug: "auto",
    labelKey: "auto",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
        <circle cx="7.5" cy="14.5" r="1.5" />
        <circle cx="16.5" cy="14.5" r="1.5" />
      </svg>
    ),
  },
  {
    slug: "imobiliare",
    labelKey: "realEstate",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14">
        <path d="M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2z" />
      </svg>
    ),
  },
  {
    slug: "lux",
    labelKey: "luxury",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8z" />
        <path d="M12.5 7H11v6l5.25 3.15l.75-1.23l-4.5-2.67z" />
      </svg>
    ),
  },
  {
    slug: "business",
    labelKey: "business",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14">
        <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
      </svg>
    ),
  },
  {
    slug: "gadgets",
    labelKey: "gadgets",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14">
        <path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 21c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2zm5-5H7V5h10v12z" />
      </svg>
    ),
  },
  {
    slug: "foto",
    labelKey: "photoAudio",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14">
        <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5z" />
        <path d="M12 17c1.65 0 3-1.35 3-3s-1.35-3-3-3s-3 1.35-3 3s1.35 3 3 3z" />
      </svg>
    ),
  },
] as const;

function splitHighlightedPhrase(full: string, highlight: string) {
  const index = full.indexOf(highlight);
  if (index === -1) {
    return { before: full, highlight: "", after: "" };
  }
  return {
    before: full.slice(0, index),
    highlight,
    after: full.slice(index + highlight.length),
  };
}

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const tHome = await getTranslations({ locale, namespace: "Home" });

  return buildPageMetadata({
    locale: resolvePageLocale(locale),
    title: tHome("metaTitle"),
    description: tHome("metaDescription"),
    path: "/",
  });
}

export default async function Home({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tHero = await getTranslations("Hero");
  const tPackages = await getTranslations("Packages");
  const tHome = await getTranslations("Home");
  const tCat = await getTranslations("Categories");

  const siteUrl = getSiteUrl();
  const numberLocale = getNumberLocale(locale);
  const heroLine1 = splitHighlightedPhrase(tHero("titleLine1"), tHero("titleLine1Highlight"));
  const heroLine2 = splitHighlightedPhrase(tHero("titleLine2"), tHero("titleLine2Highlight"));
  const evaluateCta = tHero("evaluateCta");
  const evaluateCtaText = evaluateCta.endsWith("?") ? evaluateCta.slice(0, -1) : evaluateCta;

  const listingsTitle = splitHighlightedPhrase(
    tHome("listings.title"),
    tHome("listings.titleHighlight"),
  );
  const capitalTitle = splitHighlightedPhrase(
    tHome("capital.title"),
    tHome("capital.titleHighlight"),
  );
  const auctionsTitle = splitHighlightedPhrase(
    tHome("auctions.title"),
    tHome("auctions.titleHighlight"),
  );
  const safetyTips = tHome.raw("safety.tips") as string[];

  const { data: realListings } = await supabase
    .from("listings")
    .select(
      "id,title,images,market_price,exit_price,discount,deal_score,sale_strategy,offer_count,highest_offer,expires_at,status,is_seed,created_at",
    )
    .eq("status", "active")
    .eq("is_seed", false)
    .order("created_at", { ascending: false })
    .limit(48);

  const { data: realDemands } = await supabase
    .from("demands")
    .select("id,target_asset,category,budget,description,status,created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(9);

  const auctionsHome = (
    realListings?.filter((item) => normalizeSaleType(item.sale_strategy) === "auction") ?? []
  ).slice(0, 4);
  const standardListings = (
    realListings?.filter((item) => normalizeSaleType(item.sale_strategy) !== "auction") ?? []
  ).slice(0, 9);
  const itemListElements = standardListings
    .filter((item) => {
      const id = typeof item?.id === "string" ? item.id.trim() : "";
      const title = typeof item?.title === "string" ? item.title.trim() : "";
      const statusOk = item?.status == null || item.status === "active";
      const seedOk = item?.is_seed == null || item.is_seed === false;
      return Boolean(id) && Boolean(title) && statusOk && seedOk;
    })
    .slice(0, 20)
    .map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/${locale}/anunt/${String(item.id).trim()}`,
      name: String(item.title).trim(),
    }));
  const itemListJsonLd =
    itemListElements.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: itemListElements,
        }
      : null;

  return (
    <div className="flex w-full flex-col bg-white font-sans selection:bg-[#FFD100] selection:text-black">
      {itemListJsonLd && (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
          type="application/ld+json"
        />
      )}

      <section className="relative overflow-hidden bg-white pb-8 pt-12 text-center md:pb-10 md:pt-14 lg:pb-11 lg:pt-12 xl:pt-10 2xl:pt-9">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-5 font-black italic tracking-tighter text-black md:mb-6 lg:mb-7">
              <span className="block text-6xl normal-case leading-[0.9] sm:text-7xl md:text-8xl md:leading-[0.85] lg:text-9xl">
                {heroLine1.before}
                <span className="quickexit-acum-pulse text-[#FFD100]">{heroLine1.highlight}</span>
                {heroLine1.after}
              </span>
              <span className="mt-1 block text-6xl normal-case leading-[0.9] sm:mt-0 sm:text-7xl md:text-8xl md:leading-[0.85] lg:text-9xl">
                {heroLine2.before}
                <span className="quickexit-hero-sweep inline-block bg-[length:240%_100%] bg-clip-text text-transparent [background-image:linear-gradient(110deg,#E5E7EB_0%,#E5E7EB_42%,#FFF3A3_47%,#FFD100_50%,#FFF3A3_53%,#E5E7EB_58%,#E5E7EB_100%)]">
                  {heroLine2.highlight}
                </span>
                {heroLine2.after}
              </span>
            </h1>

            <div className="mx-auto mb-5 max-w-[23rem] px-1.5 sm:max-w-3xl sm:px-2 md:mb-6 lg:mb-6 lg:max-w-[54rem]">
              <p className="text-[13px] font-bold leading-[1.56] sm:text-[14px] sm:leading-[1.6] md:text-[17px] md:leading-[1.62] lg:text-[20px] lg:leading-[1.65]">
                <span className="bg-[#FFD100] px-2.5 py-1.5 text-black box-decoration-clone sm:px-3 md:px-3.5 md:py-2">
                  {tHero("subtitle")}
                </span>
              </p>
            </div>

            <div className="mb-3 flex flex-col items-center md:mb-4 lg:mb-4">
              <TrackedLink
                href="/evaluare"
                eventName="click_evaluate"
                eventParams={{ source: "home_hero" }}
                className="group relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-black/[0.12] bg-black/90 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-[#FFD100] shadow-[0_14px_36px_-10px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-300 hover:border-[#FFD100]/35 hover:bg-black hover:shadow-[0_22px_48px_-14px_rgba(0,0,0,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100] md:px-10 md:py-4 md:text-[15px]"
              >
                <span className="relative z-10 whitespace-nowrap">
                  {evaluateCtaText}
                  <span className="quickexit-question-pulse inline-block">?</span>
                </span>
              </TrackedLink>
              <TrackedLink
                href="/capital-disponibil"
                eventName="click_capital_available"
                eventParams={{ source: "home_hero" }}
                className="mt-2.5 inline-block border-b-2 border-transparent py-2 text-[10px] font-black uppercase tracking-widest text-neutral-600 underline-offset-4 transition hover:border-black hover:text-black md:mt-3 md:text-[11px]"
              >
                {tHero("viewBuyerRequests")}
              </TrackedLink>
            </div>
          </div>

          <div className="mt-0.5 md:mt-1">
            <div className="mb-2.5 text-center md:mb-3 lg:mb-4">
              <h2 className="text-lg font-black uppercase italic tracking-tight text-black md:text-2xl">
                {tHero("packagesSectionTitle")}
              </h2>
            </div>

            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:gap-5">
              {PACKAGE_IDS.map((packageId) => (
                <Link
                  key={packageId}
                  href={`/pune-anunt?package=${packageId}`}
                  className="block rounded-2xl border-[3px] border-black bg-white p-3 text-left shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 md:p-3.5 lg:p-4"
                >
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500 md:text-[11px]">
                    {tPackages(`${packageId}.title`)}
                  </p>
                  <p className="text-base font-black uppercase italic leading-none md:text-lg lg:text-xl">
                    {tPackages(`${packageId}.duration`)}
                  </p>
                  <p className="mt-2 inline-block rounded bg-black px-2 py-0.5 text-[11px] font-black uppercase tracking-tighter text-[#FFD100] md:text-[11px]">
                    {tPackages(`${packageId}.price`)}
                  </p>
                  <p className="mt-2 block text-[10px] font-bold uppercase tracking-tighter text-neutral-500 opacity-90 md:text-[11px]">
                    {tPackages(`${packageId}.description`)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-[#FDFCF8] px-4 py-10 md:py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-black uppercase italic tracking-tight text-black md:text-3xl">
              ⚡ {tHome("futureMobility.title")}
            </h2>
            <p className="mt-3 text-sm font-bold leading-relaxed text-neutral-700">
              {tHome("futureMobility.line1")}
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-neutral-600">
              {tHome("futureMobility.line2")}
            </p>
          </div>
          <Link
            href="/future-mobility"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl border-[3px] border-black bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#FFD100] md:text-xs"
          >
            {tHome("futureMobility.cta")}
          </Link>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white py-12 pb-16 md:py-14 md:pb-20">
        <div className="mx-auto max-w-6xl px-4 text-center md:text-left">
          <h2 className="mb-10 inline-block border-b-[6px] border-[#FFD100] pb-3 text-sm font-black uppercase italic tracking-[0.35em] text-black md:mb-12 md:text-lg">
            {tHome("categoriesTitle")}
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-6">
            {CATEGORY_DEFS.map((cat) => (
              <Link
                key={cat.slug}
                href={categoryPath(cat.slug)}
                className="group flex flex-col items-center justify-center rounded-2xl border-[3px] border-black bg-[#FDFCF8] p-5 text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[6px_6px_0_0_#FFD100] md:p-8"
              >
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border-[3px] border-black bg-[#FFD100] text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-transform group-hover:scale-110 md:mb-4 md:h-16 md:w-16 [&_svg]:!h-8 [&_svg]:!w-8 md:[&_svg]:!h-9 md:[&_svg]:!w-9">
                  {cat.icon}
                </div>
                <span className="text-center text-[10px] font-black uppercase tracking-tight text-black md:text-[11px]">
                  {tCat(cat.labelKey)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white px-4 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
            <h2 className="text-3xl font-black uppercase italic tracking-tight text-black md:text-4xl">
              {listingsTitle.before}
              <span className="text-[#FFD100]">{listingsTitle.highlight}</span>
              {listingsTitle.after}
            </h2>
            <div className="flex flex-wrap items-center gap-5">
              <TrackedLink
                href="/pune-anunt"
                eventName="click_post_listing"
                eventParams={{ source: "home_listings_section" }}
                className="inline-flex items-center justify-center rounded-2xl border-[3px] border-black bg-[#FDFCF8] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[6px_6px_0_0_#FFD100] md:text-xs"
              >
                {tHome("listings.postListing")}
              </TrackedLink>
              <Link
                href={categoryPath("auto")}
                className="border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 underline-offset-4 transition hover:border-black hover:text-black md:text-xs"
              >
                {tHome("listings.viewAll")}
              </Link>
            </div>
          </div>
          <p className="mb-12 max-w-2xl text-sm font-bold leading-relaxed text-neutral-600">
            {tHome("listings.accountHint")}
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {standardListings && standardListings.length > 0 ? (
              standardListings.slice(0, 9).map((item) => (
                <AdCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={
                    item.images?.[0] ||
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                  }
                  {...adCardPricingProps(item, numberLocale)}
                  type={normalizeSaleType(item.sale_strategy)}
                />
              ))
            ) : (
              <div className="col-span-full rounded-2xl border-[3px] border-dashed border-black bg-[#FDFCF8] py-20 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <p className="text-sm font-bold text-neutral-600">{tHome("listings.empty")}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-[#FDFCF8] px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <div className="mb-4 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
              <h2 className="text-3xl font-black uppercase italic tracking-tight text-black md:text-4xl">
                {capitalTitle.before}
                <span className="text-[#FFD100]">{capitalTitle.highlight}</span>
                {capitalTitle.after}
              </h2>
              <TrackedLink
                href="/capital-disponibil"
                eventName="click_capital_available"
                eventParams={{ source: "home_capital_section" }}
                className="whitespace-nowrap border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 underline-offset-4 transition hover:border-black hover:text-black md:text-xs"
              >
                {tHome("capital.viewAll")}
              </TrackedLink>
            </div>
            <p className="max-w-2xl text-sm font-bold leading-relaxed text-neutral-600">
              {tHome("capital.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {realDemands && realDemands.length > 0 ? (
              realDemands.slice(0, 9).map((demand) => (
                <DemandCard
                  key={demand.id}
                  id={demand.id}
                  targetAsset={demand.target_asset}
                  category={demand.category}
                  budget={demand.budget?.toLocaleString("ro-RO")}
                  description={demand.description}
                />
              ))
            ) : (
              <div className="col-span-full rounded-2xl border-[3px] border-dashed border-black bg-white py-16 text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                <p className="text-sm font-bold text-neutral-600">{tHome("capital.empty")}</p>
              </div>
            )}
          </div>

          <div className="mt-12 flex flex-col gap-5 sm:mt-14 sm:flex-row sm:items-center sm:justify-between md:gap-6">
            <TrackedLink
              href="/capital-disponibil"
              eventName="click_capital_available"
              eventParams={{ source: "home_capital_section_footer" }}
              className="group inline-flex items-center gap-1.5 border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black md:text-xs"
            >
              {tHome("capital.viewAllFooter")}
              <span
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              >
                →
              </span>
            </TrackedLink>
            <Link
              href="/posteaza-cerere"
              className="inline-flex items-center justify-center rounded-2xl border-[3px] border-black bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#FFD100] md:text-xs"
            >
              {tHome("capital.addOffer")}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <h2 className="text-3xl font-black uppercase italic tracking-tight text-black md:text-4xl">
              {auctionsTitle.before}
              <span className="text-[#FFD100]">{auctionsTitle.highlight}</span>
              {auctionsTitle.after}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-neutral-600">
              {tHome("auctions.description")}
            </p>
            <p className="mt-2 max-w-2xl text-xs font-bold leading-relaxed text-neutral-500">
              {tHome("auctions.disclaimer")}
            </p>
          </div>

          {auctionsHome.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {auctionsHome.map((item) => (
                <AdCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={
                    item.images?.[0] ||
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                  }
                  {...adCardPricingProps(item, numberLocale)}
                  type="auction"
                  offerCount={item.offer_count}
                  highestOffer={item.highest_offer}
                  expiresAt={item.expires_at}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl border-[3px] border-black bg-[#FDFCF8] p-8 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
              <h3 className="text-lg font-black uppercase italic tracking-tight text-black">
                {tHome("auctions.emptyTitle")}
              </h3>
              <p className="mt-3 text-sm font-bold leading-relaxed text-neutral-600">
                {tHome("auctions.emptyDescription")}
              </p>
              <p className="mt-2 text-xs font-bold leading-relaxed text-neutral-500">
                {tHome("auctions.disclaimer")}
              </p>
              <Link
                href="/pune-anunt?package=auction"
                className="mt-6 inline-flex items-center justify-center rounded-2xl border-[3px] border-black bg-white px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#FFD100] md:text-xs"
              >
                {tHome("auctions.publishAuction")}
              </Link>
            </div>
          )}

          <div className="mt-12 flex flex-col gap-5 sm:mt-14 sm:flex-row sm:items-center sm:justify-between md:gap-6">
            <Link
              href="/licitatii"
              className="group inline-flex items-center gap-1.5 border-b-2 border-transparent text-[11px] font-black uppercase tracking-widest text-neutral-600 transition hover:border-black hover:text-black md:text-xs"
            >
              {tHome("auctions.viewAll")}
              <span
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              >
                →
              </span>
            </Link>
            <Link
              href="/pune-anunt"
              className="inline-flex items-center justify-center rounded-2xl border-[3px] border-black bg-[#FDFCF8] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[6px_6px_0_0_#FFD100] md:text-xs"
            >
              {tHome("auctions.addAuction")}
            </Link>
          </div>
        </div>
      </section>

      <GlobalStats />

      <section className="bg-ink px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold md:text-xs">
            {tHome("safety.title")}
          </h3>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300">
            {tHome("safety.description")}
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {safetyTips.map((tip) => (
              <li
                key={tip}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-medium leading-relaxed text-neutral-300"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <style>{`
        @keyframes quickexit-hero-sweep {
          0% { background-position: 160% 50%; }
          45% { background-position: 160% 50%; }
          70% { background-position: -60% 50%; }
          100% { background-position: -60% 50%; }
        }
        .quickexit-hero-sweep {
          animation: quickexit-hero-sweep 7.5s ease-in-out infinite;
        }
        @keyframes quickexit-acum-pulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .quickexit-acum-pulse {
          position: relative;
          display: inline-block;
          color: #ffd100;
          isolation: isolate;
        }
        .quickexit-acum-pulse::after {
          content: "";
          position: absolute;
          inset: -12% -8%;
          z-index: -1;
          border-radius: 0.35em;
          background: radial-gradient(60% 60% at 50% 50%, rgba(255, 209, 0, 0.45), rgba(255, 209, 0, 0) 70%);
          opacity: 0;
          will-change: opacity;
          animation: quickexit-acum-pulse 6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes quickexit-question-pulse {
          0%, 70%, 100% {
            color: #ffd100;
            text-shadow: 0 0 0 rgba(255, 209, 0, 0);
            transform: translateY(0);
          }
          78% {
            color: #f3f4f6;
            text-shadow: 0 0 8px rgba(255, 243, 163, 0.28);
            transform: translateY(-0.5px);
          }
          85% {
            color: #ffd100;
            text-shadow: 0 0 4px rgba(255, 209, 0, 0.2);
            transform: translateY(0);
          }
        }
        .quickexit-question-pulse {
          animation: quickexit-question-pulse 5.2s ease-in-out infinite;
          will-change: color, text-shadow, transform;
        }
        @media (max-width: 768px) {
          .quickexit-hero-sweep {
            animation: none;
            background-image: none !important;
            -webkit-text-fill-color: #ffd100;
            color: #ffd100;
          }
          .quickexit-acum-pulse::after {
            display: none;
            animation: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .quickexit-hero-sweep {
            animation: none;
            background-image: none !important;
            -webkit-text-fill-color: #ffd100;
            color: #ffd100;
          }
          .quickexit-question-pulse {
            animation: none;
            color: #ffd100;
            text-shadow: none;
            transform: none;
          }
          .quickexit-acum-pulse::after {
            display: none;
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
