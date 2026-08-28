import AdCard from "@/app/components/AdCard";
import ListingCoverImage from "@/app/components/home/ListingCoverImage";
import type { Metadata } from "next";
import TrackedLink from "@/app/components/TrackedLink";
import { supabase } from "@/lib/supabase";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";
import { normalizeSaleType } from "@/utils/normalizeSaleType";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { getNumberLocale } from "@/lib/i18n/format";
import { adCardPricingProps } from "@/lib/listingPrice";
import { isPublicAuctionOpen } from "@/lib/auctionOpen";
import {
  firstListingImage,
  HOME_WORLD_DEFS,
  isNormalSaleListing,
  liveHomeWorlds,
  viewAllAssetsHref,
  type HomeListingRow,
} from "@/lib/homeMarketplace";

export const revalidate = 60;

const LISTING_SELECT =
  "id,title,images,market_price,exit_price,discount,deal_score,sale_strategy,offer_count,highest_offer,expires_at,status,is_seed,created_at,details,category";

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
  const tHome = await getTranslations("Home");
  const tCat = await getTranslations("Categories");

  const siteUrl = getSiteUrl();
  const numberLocale = getNumberLocale(locale);
  const safetyTips = tHome.raw("safety.tips") as string[];
  const howItWorksSteps = tHome.raw("howItWorks.steps") as {
    title: string;
    body: string;
  }[];

  const nowIso = new Date().toISOString();

  const [listingsRes, auctionsRes, ...worldResults] = await Promise.all([
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "active")
      .eq("is_seed", false)
      .order("created_at", { ascending: false })
      .limit(48),
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "active")
      .eq("is_seed", false)
      .gt("expires_at", nowIso)
      .in("sale_strategy", ["auction", "licitatie"])
      .order("expires_at", { ascending: true })
      .limit(12),
    ...HOME_WORLD_DEFS.map((world) =>
      supabase
        .from("listings")
        .select(LISTING_SELECT)
        .eq("status", "active")
        .eq("is_seed", false)
        .eq("category", world.category)
        .order("created_at", { ascending: false })
        .limit(12),
    ),
  ]);

  const listingRows = (listingsRes.data ?? []) as HomeListingRow[];
  const auctionRows = (auctionsRes.data ?? []) as HomeListingRow[];
  const worldListings = worldResults.flatMap(
    (res) => ((res.data ?? []) as HomeListingRow[]),
  );

  const standardListings = listingRows.filter(isNormalSaleListing).slice(0, 9);
  const inventoryIds = new Set(
    standardListings.map((item) => String(item.id).trim()).filter(Boolean),
  );

  const auctionsHome = auctionRows
    .filter((item) => isPublicAuctionOpen(item))
    .filter((item) => {
      const id = typeof item.id === "string" ? item.id.trim() : "";
      return Boolean(id) && !inventoryIds.has(id);
    })
    .slice(0, 3);

  const worldSource = [...worldListings, ...auctionRows];
  const worlds = liveHomeWorlds(worldSource);
  const allAssetsHref = viewAllAssetsHref(worldSource);

  const itemListElements = standardListings
    .filter((item) => {
      const id = typeof item?.id === "string" ? item.id.trim() : "";
      const title = typeof item?.title === "string" ? item.title.trim() : "";
      return Boolean(id) && Boolean(title);
    })
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
          name: tHome("listings.title"),
          itemListElement: itemListElements,
        }
      : null;

  const sectionClass = "border-t border-[#E7E3DA] px-4 py-14 md:px-8 md:py-20";
  const wrapClass = "mx-auto w-full max-w-[1440px]";
  const h2Class = "text-2xl font-semibold tracking-tight text-ink md:text-3xl";
  const supportClass = "mt-3 max-w-2xl text-sm font-medium leading-relaxed text-neutral-600";
  const textLinkClass =
    "inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 underline-offset-4 transition hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100]";
  const primaryCtaClass =
    "inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-6 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100]";
  const secondaryCtaClass =
    "inline-flex min-h-11 items-center justify-center rounded-lg border border-black/15 px-6 py-3 text-sm font-semibold tracking-wide text-ink transition hover:border-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100]";

  return (
    <div className="flex w-full flex-col bg-[#F7F4EC] font-sans text-ink selection:bg-[#FFD100] selection:text-black">
      {itemListJsonLd && (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
          type="application/ld+json"
        />
      )}

      <section className="px-4 pb-12 pt-10 md:px-8 md:pb-16 md:pt-14" aria-labelledby="home-hero-heading">
        <div className={`${wrapClass} max-w-3xl`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {tHero("eyebrow")}
          </p>
          <h1
            id="home-hero-heading"
            className="mt-4 text-[2.15rem] font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl md:text-6xl md:leading-[1.08]"
          >
            <span className="block">{tHero("titleLine1")}</span>
            <span className="mt-1 block text-neutral-800">{tHero("titleLine2")}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-neutral-600 md:text-lg">
            {tHero("subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <TrackedLink
              href="#active-assets"
              eventName="click_explore_assets"
              eventParams={{ source: "home_hero" }}
              className={primaryCtaClass}
            >
              {tHero("primaryCta")}
            </TrackedLink>
            <TrackedLink
              href="/pune-anunt"
              eventName="click_post_listing"
              eventParams={{ source: "home_hero" }}
              className={secondaryCtaClass}
            >
              {tHero("secondaryCta")}
            </TrackedLink>
          </div>
          <p className="mt-5 max-w-xl text-xs font-medium leading-relaxed text-neutral-500">
            {tHero("trust")}
          </p>
        </div>
      </section>

      {worlds.length > 0 ? (
        <section
          className={sectionClass}
          aria-labelledby="home-worlds-heading"
        >
          <div className={wrapClass}>
            <h2 id="home-worlds-heading" className={h2Class}>
              {tHome("worlds.title")}
            </h2>
            <nav
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6"
              aria-label={tHome("worlds.ariaLabel")}
            >
              {worlds.map((world) => (
                <TrackedLink
                  key={world.slug}
                  href={world.href}
                  eventName="click_category_world"
                  eventParams={{ source: "home_worlds", category: world.slug }}
                  className="group overflow-hidden rounded-xl border border-[#E7E3DA] bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-18px_rgba(10,10,10,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100]"
                >
                  <div className="relative aspect-[4/3] bg-[#F3EFE6]">
                    {world.image ? (
                      <ListingCoverImage
                        src={world.image}
                        alt={world.title || tCat(world.labelKey)}
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center" aria-hidden>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                          QuickExit
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm font-semibold tracking-tight text-ink">
                      {tCat(world.labelKey)}
                    </p>
                  </div>
                </TrackedLink>
              ))}
            </nav>
          </div>
        </section>
      ) : null}

      <section
        id="active-assets"
        className={`${sectionClass} scroll-mt-20 md:scroll-mt-24`}
        aria-labelledby="home-inventory-heading"
      >
        <div className={wrapClass}>
          <div className="mb-8 flex flex-col items-start justify-between gap-4 md:mb-10 md:flex-row md:items-end">
            <div>
              <h2 id="home-inventory-heading" className={h2Class}>
                {tHome("listings.title")}
              </h2>
              <p className={supportClass}>{tHome("listings.support")}</p>
            </div>
            {allAssetsHref ? (
              <TrackedLink
                href={allAssetsHref}
                eventName="click_view_all_assets"
                eventParams={{ source: "home_inventory" }}
                className={textLinkClass}
              >
                {tHome("listings.viewAll")}
                <span aria-hidden>→</span>
              </TrackedLink>
            ) : null}
          </div>

          {standardListings.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3 xl:gap-8">
              {standardListings.map((item, index) => (
                <AdCard
                  key={String(item.id)}
                  id={String(item.id)}
                  title={String(item.title)}
                  image={firstListingImage(item.images) ?? ""}
                  {...adCardPricingProps(item, numberLocale)}
                  type={normalizeSaleType(item.sale_strategy)}
                  variant="marketplace"
                  priority={index < 2}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#D9D2C5] bg-white py-16 text-center">
              <p className="text-sm font-medium text-neutral-600">{tHome("listings.empty")}</p>
            </div>
          )}
        </div>
      </section>

      {auctionsHome.length > 0 ? (
        <section className={sectionClass} aria-labelledby="home-auctions-heading">
          <div className={wrapClass}>
            <div className="mb-8 flex flex-col items-start justify-between gap-4 md:mb-10 md:flex-row md:items-end">
              <h2 id="home-auctions-heading" className={h2Class}>
                {tHome("auctions.title")}
              </h2>
              <TrackedLink
                href="/licitatii"
                eventName="click_view_all_auctions"
                eventParams={{ source: "home_auctions" }}
                className={textLinkClass}
              >
                {tHome("auctions.viewAll")}
                <span aria-hidden>→</span>
              </TrackedLink>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3 xl:gap-8">
              {auctionsHome.map((item) => (
                <AdCard
                  key={String(item.id)}
                  id={String(item.id)}
                  title={String(item.title)}
                  image={firstListingImage(item.images) ?? ""}
                  {...adCardPricingProps(item, numberLocale)}
                  type="auction"
                  variant="marketplace"
                  offerCount={item.offer_count}
                  highestOffer={item.highest_offer}
                  expiresAt={item.expires_at}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={sectionClass} aria-labelledby="home-how-heading">
        <div className={wrapClass}>
          <h2 id="home-how-heading" className={h2Class}>
            {tHome("howItWorks.title")}
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
            {howItWorksSteps.map((step, index) => (
              <li key={step.title} className="border-t border-[#E7E3DA] pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-600">{step.body}</p>
              </li>
            ))}
          </ol>
          <TrackedLink
            href="/cum-functioneaza"
            eventName="click_how_it_works"
            eventParams={{ source: "home_how_it_works" }}
            className={`${textLinkClass} mt-8`}
          >
            {tHome("howItWorks.readMore")}
            <span aria-hidden>→</span>
          </TrackedLink>
        </div>
      </section>

      <section className={sectionClass} aria-labelledby="home-seller-heading">
        <div className={`${wrapClass} max-w-2xl`}>
          <h2 id="home-seller-heading" className={h2Class}>
            {tHome("seller.title")}
          </h2>
          <p className={supportClass}>{tHome("seller.support")}</p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <TrackedLink
              href="/pune-anunt"
              eventName="click_post_listing"
              eventParams={{ source: "home_seller" }}
              className={primaryCtaClass}
            >
              {tHome("seller.cta")}
            </TrackedLink>
            <Link href="/tarife" className={textLinkClass}>
              {tHome("seller.pricing")}
            </Link>
          </div>
        </div>
      </section>

      <section className={`${sectionClass} bg-white`} aria-labelledby="home-safety-heading">
        <div className={`${wrapClass} max-w-3xl`}>
          <h2 id="home-safety-heading" className="text-lg font-semibold tracking-tight text-ink">
            {tHome("safety.title")}
          </h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-600">
            {tHome("safety.description")}
          </p>
          <ul className="mt-6 space-y-2 text-sm font-medium leading-relaxed text-neutral-600">
            {safetyTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
