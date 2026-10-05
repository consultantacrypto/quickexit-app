import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { companyInfo } from "@/lib/company";
import {
  MEDIA_FAQ_IDS,
  MEDIA_HOW_STEPS,
  MEDIA_PACKAGE_ORDER,
  MEDIA_TIER_ORDER,
} from "@/lib/mediaContent";
import { resolveInitialMediaCategory } from "@/lib/mediaExamples";
import {
  formatMediaPriceRon,
  MEDIA_DISPLAY_PRICES_RON,
  MEDIA_PACKAGE_IDS,
  resolveMediaDisplayPricing,
  type MediaPackageId,
} from "@/lib/mediaPricing";
import { fetchPublicListingDetail } from "@/lib/listingSeo";
import { PAGE_METADATA_COPY } from "@/lib/pageMetadataCopy";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";
import MediaExamplesGallery from "./MediaExamplesGallery";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ listingId?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const copy = PAGE_METADATA_COPY.media[loc];

  return buildPageMetadata({
    locale: loc,
    title: copy.title,
    description: copy.description,
    path: "/media",
  });
}

function PackageCard({
  packageId,
  title,
  blurb,
  features,
  priceLabel,
  ctaLabel,
  ctaHref,
  featured,
}: {
  packageId: MediaPackageId;
  title: string;
  blurb: string;
  features: string[];
  priceLabel: string;
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
}) {
  const className = `mt-8 inline-flex items-center justify-center rounded-2xl border-[3px] px-5 py-3.5 text-center text-[11px] font-black uppercase tracking-widest transition ${
    featured
      ? "border-black bg-[#FFD100] text-black shadow-[4px_4px_0_0_#000] hover:brightness-105"
      : "border-black bg-black text-[#FFD100] hover:bg-[#FFD100] hover:text-black"
  }`;

  return (
    <article
      id={`package-${packageId}`}
      className={`flex h-full flex-col rounded-[2rem] border-[3px] border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.08)] md:p-8 ${
        featured
          ? "bg-black text-white shadow-[8px_8px_0_0_#FFD100]"
          : "bg-white text-black"
      }`}
    >
      <p
        className={`text-[10px] font-black uppercase tracking-[0.22em] ${
          featured ? "text-[#FFD100]" : "text-neutral-500"
        }`}
      >
        {title}
      </p>
      <p
        className={`mt-3 text-sm font-medium leading-relaxed ${
          featured ? "text-neutral-300" : "text-neutral-600"
        }`}
      >
        {blurb}
      </p>
      <p
        className={`mt-6 text-2xl font-black italic tracking-tight ${
          featured ? "text-[#FFD100]" : "text-black"
        }`}
      >
        {priceLabel}
      </p>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm font-medium leading-relaxed">
            <span
              aria-hidden
              className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                featured ? "bg-[#FFD100]" : "bg-black"
              }`}
            />
            <span className={featured ? "text-neutral-200" : "text-neutral-700"}>{feature}</span>
          </li>
        ))}
      </ul>
      {ctaHref.startsWith("mailto:") ? (
        <a href={ctaHref} className={className}>
          {ctaLabel}
        </a>
      ) : (
        <Link href={ctaHref} className={className}>
          {ctaLabel}
        </Link>
      )}
    </article>
  );
}

export default async function MediaPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  setRequestLocale(locale);

  const sp = await searchParams;
  const rawListingId = Array.isArray(sp.listingId) ? sp.listingId[0] : sp.listingId;
  const listingId = typeof rawListingId === "string" ? rawListingId.trim() : "";

  const listing = listingId ? await fetchPublicListingDetail(listingId) : null;
  const displayPricing = resolveMediaDisplayPricing(listing);
  const initialCategory = resolveInitialMediaCategory(listing?.category);

  const t = await getTranslations("Media");
  const siteUrl = getSiteUrl();
  const canonicalAbs = `${siteUrl}/${loc}/media`;

  const requestSubject =
    loc === "en" ? "QuickExit Media inquiry" : "Solicitare QuickExit Media";
  const mailtoBase = `mailto:${companyInfo.publicEmail}?subject=${encodeURIComponent(requestSubject)}`;
  const mailtoWithListing = listingId
    ? `${mailtoBase}&body=${encodeURIComponent(
        loc === "en"
          ? `Listing ID: ${listingId}\nI want QuickExit Media for this listing.`
          : `ID anunț: ${listingId}\nVreau QuickExit Media pentru acest anunț.`,
      )}`
    : mailtoBase;

  const packageCtaHref = mailtoWithListing;
  const packageCtaLabel = displayPricing.eligible
    ? t("cta.requestOffer")
    : listingId
      ? t("cta.requestMediaOffer")
      : t("cta.wantMedia");

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: loc === "en" ? "Home" : "Acasă",
        item: `${siteUrl}/${loc}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "QuickExit Media",
        item: canonicalAbs,
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: MEDIA_FAQ_IDS.map((id) => ({
      "@type": "Question",
      name: t(`faq.items.${id}.q`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`faq.items.${id}.a`),
      },
    })),
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-7xl space-y-14 md:space-y-20">
        <nav
          aria-label="Breadcrumb"
          className="text-[11px] font-bold uppercase tracking-widest text-neutral-500"
        >
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition hover:text-black">
                {loc === "en" ? "Home" : "Acasă"}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-black">QuickExit Media</li>
          </ol>
        </nav>

        <header className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12 lg:p-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
              QuickExit Media
            </p>
            <h1 className="mt-5 text-3xl font-black uppercase italic leading-[1.05] tracking-tight md:text-5xl lg:text-[3.35rem]">
              {t("hero.title")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300 md:text-base">
              {t("hero.subtitle")}
            </p>
          </div>
          <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="#cum-functioneaza"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border-[3px] border-black bg-[#FFD100] px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_#000] transition hover:brightness-105 sm:flex-initial"
            >
              {t("hero.ctaHow")}
            </a>
            <a
              href="#pachete"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border-[3px] border-white bg-transparent px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black sm:flex-initial"
            >
              {t("hero.ctaPackages")}
            </a>
          </div>
        </header>

        <MediaExamplesGallery
          key={initialCategory}
          initialCategory={initialCategory}
          labels={{
            sectionTitle: t("examples.title"),
            sectionBody: t("examples.body"),
            playYoutube: t("examples.playYoutube"),
            openTiktok: t("examples.openTiktok"),
            openYoutube: t("examples.openYoutube"),
            consentNeeded: t("examples.consentNeeded"),
            openCookieSettings: t("examples.openCookieSettings"),
            closePlayer: t("examples.closePlayer"),
            proofNote: t("examples.proofNote"),
            platformTiktok: t("examples.platformTiktok"),
            platformYoutube: t("examples.platformYoutube"),
            categories: {
              real_estate: t("examples.categories.real_estate"),
              automotive: t("examples.categories.automotive"),
              watches_luxury: t("examples.categories.watches_luxury"),
              businesses: t("examples.categories.businesses"),
            },
            titles: {
              realEstate: t("examples.titles.realEstate"),
              automotive: t("examples.titles.automotive"),
              watchesLuxury: t("examples.titles.watchesLuxury"),
              businesses: t("examples.titles.businesses"),
            },
          }}
        />

        <section id="cum-functioneaza" aria-labelledby="media-how-heading" className="scroll-mt-28">
          <h2
            id="media-how-heading"
            className="text-2xl font-black uppercase italic tracking-tighter text-black md:text-3xl"
          >
            {t("how.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-medium text-neutral-600 md:text-base">
            {t("how.body")}
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
            {MEDIA_HOW_STEPS.map((step, index) => (
              <li
                key={step}
                className="rounded-[1.5rem] border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.06)] md:p-6"
              >
                <span className="text-3xl font-black italic leading-none text-[#FFD100]">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-black uppercase italic tracking-tight text-black">
                  {t(`how.steps.${step}`)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section id="pachete" aria-labelledby="media-packages-heading" className="scroll-mt-28">
          <div className="mb-8 max-w-2xl">
            <h2
              id="media-packages-heading"
              className="text-2xl font-black uppercase italic tracking-tighter text-black md:text-3xl"
            >
              {t("packages.title")}
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-600 md:text-base">
              {t("packages.body")}
            </p>
            {listingId ? (
              <p className="mt-4 rounded-2xl border-2 border-black/15 bg-white px-4 py-3 text-xs font-bold text-neutral-700">
                {displayPricing.eligible
                  ? t("packages.contextualReady", {
                      tier: t(`pricing.tiers.${displayPricing.tier}.label`),
                    })
                  : t("packages.contextualFallback")}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
            {MEDIA_PACKAGE_ORDER.map((packageId) => {
              const features = t.raw(`packages.items.${packageId}.features`) as string[];
              const priceLabel =
                displayPricing.eligible && displayPricing.tier
                  ? formatMediaPriceRon(
                      MEDIA_DISPLAY_PRICES_RON[displayPricing.tier][packageId],
                      loc,
                    )
                  : listingId
                    ? t("packages.requestPrice")
                    : t(`packages.items.${packageId}.fromPrice`);

              return (
                <PackageCard
                  key={packageId}
                  packageId={packageId}
                  title={t(`packages.items.${packageId}.title`)}
                  blurb={t(`packages.items.${packageId}.blurb`)}
                  features={Array.isArray(features) ? features : []}
                  priceLabel={priceLabel}
                  ctaLabel={packageCtaLabel}
                  ctaHref={packageCtaHref}
                  featured={packageId === "featured"}
                />
              );
            })}
          </div>
          <p className="mt-6 max-w-3xl text-xs font-medium leading-relaxed text-neutral-500">
            {t("packages.disclaimer")}
          </p>
        </section>

        <section id="preturi" aria-labelledby="media-pricing-heading" className="scroll-mt-28">
          <h2
            id="media-pricing-heading"
            className="text-2xl font-black uppercase italic tracking-tighter text-black md:text-3xl"
          >
            {t("pricing.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-medium text-neutral-600 md:text-base">
            {t("pricing.body")}
          </p>

          <div className="mt-8 overflow-x-auto rounded-[1.5rem] border-[3px] border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,0.06)]">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-[3px] border-black bg-black text-white">
                  <th
                    scope="col"
                    className="px-4 py-4 text-[10px] font-black uppercase tracking-widest md:px-6"
                  >
                    {t("pricing.columns.value")}
                  </th>
                  {MEDIA_PACKAGE_IDS.map((packageId) => (
                    <th
                      key={packageId}
                      scope="col"
                      className="px-4 py-4 text-[10px] font-black uppercase tracking-widest md:px-6"
                    >
                      {t(`packages.items.${packageId}.title`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEDIA_TIER_ORDER.map((tier) => {
                  const highlighted =
                    displayPricing.eligible && displayPricing.tier === tier;
                  return (
                    <tr
                      key={tier}
                      className={`border-b border-black/10 last:border-b-0 ${
                        highlighted ? "bg-[#FFD100]/35" : ""
                      }`}
                    >
                      <th
                        scope="row"
                        className="px-4 py-4 text-xs font-black uppercase tracking-wide text-black md:px-6 md:text-sm"
                      >
                        {t(`pricing.tiers.${tier}.label`)}
                        {highlighted ? (
                          <span className="mt-1 block text-[10px] font-bold normal-case tracking-normal text-neutral-700">
                            {t("pricing.yourTier")}
                          </span>
                        ) : null}
                      </th>
                      {MEDIA_PACKAGE_IDS.map((packageId) => (
                        <td
                          key={packageId}
                          className="px-4 py-4 font-black tabular-nums text-black md:px-6"
                        >
                          {formatMediaPriceRon(MEDIA_DISPLAY_PRICES_RON[tier][packageId], loc)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section
          id="weekly"
          aria-labelledby="media-weekly-heading"
          className="scroll-mt-28 rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[10px_10px_0_0_rgba(0,0,0,0.06)] md:p-12"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">
            Editorial
          </p>
          <h2
            id="media-weekly-heading"
            className="mt-3 text-2xl font-black uppercase italic tracking-tighter text-black md:text-3xl"
          >
            {t("weekly.title")}
          </h2>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            {t("weekly.body")}
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                "newListings",
                "interesting",
                "opportunities",
                "crypto",
                "auctions",
                "capital",
              ] as const
            ).map((item) => (
              <li
                key={item}
                className="rounded-2xl border-2 border-black/15 bg-[#F7F4EC]/70 px-4 py-3 text-sm font-bold text-neutral-800"
              >
                {t(`weekly.items.${item}`)}
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-3xl text-xs font-medium leading-relaxed text-neutral-500">
            {t("weekly.disclaimer")}
          </p>
        </section>

        <section id="faq" aria-labelledby="media-faq-heading" className="scroll-mt-28">
          <h2
            id="media-faq-heading"
            className="text-2xl font-black uppercase italic tracking-tighter text-black md:text-3xl"
          >
            {t("faq.title")}
          </h2>
          <div className="mt-8 space-y-4">
            {MEDIA_FAQ_IDS.map((id) => (
              <details
                key={id}
                className="group rounded-2xl border-[3px] border-black bg-white px-5 py-4 open:shadow-[6px_6px_0_0_rgba(0,0,0,0.08)] md:px-6"
              >
                <summary className="cursor-pointer list-none text-sm font-black uppercase italic tracking-tight text-black marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {t(`faq.items.${id}.q`)}
                    <span className="text-[#FFD100] transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-700">
                  {t(`faq.items.${id}.a`)}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
            {t("finalCta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-medium text-neutral-300 md:text-base">
            {t("finalCta.body")}
          </p>
          <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={mailtoWithListing}
              className="inline-flex items-center justify-center rounded-2xl border-[3px] border-black bg-[#FFD100] px-6 py-4 text-xs font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_#000] transition hover:brightness-105"
            >
              {t("cta.requestOffer")}
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-2xl border-[3px] border-white px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
            >
              {t("cta.dashboard")}
            </Link>
          </div>
          <p className="mx-auto mt-6 max-w-xl text-[11px] font-medium text-neutral-500">
            {t("finalCta.note")}
          </p>
        </section>
      </div>
    </div>
  );
}
