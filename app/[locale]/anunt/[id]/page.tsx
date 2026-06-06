import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AnuntClient from "./AnuntClient";
import { getSiteUrl, toAbsoluteSiteUrl } from "@/lib/siteUrl";
import { formatEurAmount } from "@/lib/i18n/format";
import { resolveListingField } from "@/lib/i18n/listingContent";
import {
  fetchPublicListingDetail,
  fetchPublicListingSeoRow,
  fetchListingSellerContext,
  fetchSimilarListings,
  type ListingSeoRow,
} from "@/lib/listingSeo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/src/i18n/routing";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function formatEurPrice(value: number | null | undefined, locale: string): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return formatEurAmount(n, locale);
}

async function buildListingDescription(
  listing: ListingSeoRow,
  locale: string,
): Promise<string> {
  const t = await getTranslations({ locale, namespace: "ListingDetail.meta" });
  const title = resolveListingField(
    listing,
    "title",
    locale,
    t("assetFallback"),
  );
  const category = listing.category?.trim();

  const parts: string[] = [];
  if (category) {
    parts.push(t("seoListedInCategory", { title, category }));
  } else {
    parts.push(t("seoListed", { title }));
  }
  parts.push(t("seoCta"));
  const exitPrice = formatEurPrice(listing.exit_price, locale);
  if (exitPrice) parts.push(t("seoExitPrice", { price: exitPrice }));
  return parts.join(" ");
}

function normalizeId(raw: string | undefined): string | null {
  const id = typeof raw === "string" ? raw.trim() : "";
  return id ? id : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "ListingDetail.meta" });

  const listingId = normalizeId(id);
  const siteUrl = getSiteUrl();
  const canonicalPath = listingId ? `/${locale}/anunt/${listingId}` : `/${locale}/anunt`;
  const canonicalAbs = `${siteUrl}${canonicalPath}`;
  const ogLocale = locale === "en" ? "en_GB" : "ro_RO";

  const listing = listingId ? await fetchPublicListingSeoRow(listingId) : null;
  if (!listing) {
    return {
      metadataBase: new URL(siteUrl),
      title: { absolute: t("unavailableTitle") },
      description: t("unavailableDescription"),
      alternates: { canonical: canonicalAbs },
      robots: { index: false, follow: false },
      openGraph: {
        title: t("unavailableTitle"),
        description: t("unavailableDescription"),
        url: canonicalAbs,
        type: "website",
        siteName: t("siteName"),
        locale: ogLocale,
        images: [{ url: toAbsoluteSiteUrl("/logo.png") }],
      },
    };
  }

  const titleRaw = resolveListingField(listing, "title", locale, t("listingFallback"));
  const title = `${titleRaw} | ${t("siteName")}`;
  const description = await buildListingDescription(listing, locale);

  const firstImage =
    Array.isArray(listing.images) && listing.images.length > 0
      ? String(listing.images[0] || "").trim()
      : "";
  const ogImage = firstImage ? toAbsoluteSiteUrl(firstImage) : toAbsoluteSiteUrl("/logo.png");

  return {
    metadataBase: new URL(siteUrl),
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalAbs },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalAbs,
      type: "website",
      siteName: t("siteName"),
      locale: ogLocale,
      images: [{ url: ogImage }],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ListingPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "ListingDetail.meta" });

  const listingId = normalizeId(id);
  const siteUrl = getSiteUrl();
  const canonicalPath = listingId ? `/${locale}/anunt/${listingId}` : `/${locale}/anunt`;
  const canonicalAbs = `${siteUrl}${canonicalPath}`;

  const listing = listingId ? await fetchPublicListingDetail(listingId) : null;
  if (!listing) notFound();

  const userId = typeof listing.user_id === "string" ? listing.user_id : null;
  const category = typeof listing.category === "string" ? listing.category : null;

  const [initialSeller, initialSimilar] = await Promise.all([
    userId
      ? fetchListingSellerContext(userId, listingId!)
      : Promise.resolve({ profile: null, otherListings: [], activeCount: null }),
    category
      ? fetchSimilarListings(category, listingId!)
      : Promise.resolve([]),
  ]);

  const hasValidExitPrice =
    typeof listing?.exit_price === "number" &&
    Number.isFinite(listing.exit_price) &&
    listing.exit_price > 0;

  const listingTitle = resolveListingField(listing, "title", locale, t("listingFallback"));
  const listingDescription =
    resolveListingField(listing, "description", locale, "") ||
    (await buildListingDescription(listing, locale));

  const jsonLd =
    listing
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: listingTitle,
          description: listingDescription,
          ...(listing.category ? { category: listing.category } : {}),
          url: canonicalAbs,
          ...(Array.isArray(listing.images) && listing.images.length > 0
            ? {
                image: listing.images
                  .map((img) => String(img || "").trim())
                  .filter(Boolean)
                  .map((img) => toAbsoluteSiteUrl(img)),
              }
            : {}),
          ...(hasValidExitPrice
            ? {
                offers: {
                  "@type": "Offer",
                  url: canonicalAbs,
                  price: listing.exit_price,
                  priceCurrency: "EUR",
                  availability: "https://schema.org/InStock",
                },
              }
            : {}),
        }
      : null;
  const breadcrumbJsonLd =
    listing && listingId
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: t("siteName"),
              item: `${siteUrl}/${locale}`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: t("breadcrumbListings"),
              item: `${siteUrl}/${locale}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: listingTitle,
              item: canonicalAbs,
            },
          ],
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          type="application/ld+json"
        />
      )}
      {breadcrumbJsonLd && (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
          type="application/ld+json"
        />
      )}
      <AnuntClient
        key={listingId}
        initialListing={listing}
        initialSeller={initialSeller}
        initialSimilar={initialSimilar}
      />
    </>
  );
}
