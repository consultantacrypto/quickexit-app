import type { Metadata } from "next";
import AnuntClient from "./AnuntClient";
import { getSiteUrl } from "@/lib/siteUrl";
import { fetchPublicListingSeoRow, type ListingSeoRow } from "@/lib/listingSeo";

type PageProps = {
  params: Promise<{ id?: string }>;
};

function formatEurPrice(value: number | null | undefined): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `€${n.toLocaleString("ro-RO")}`;
}

function pickLocation(listing: ListingSeoRow): string | null {
  if (listing.location && listing.location.trim()) return listing.location.trim();
  const d = listing.details;
  if (d && typeof d === "object") {
    const raw =
      (d.location as string | undefined) ||
      (d.locatie as string | undefined) ||
      (d.zona as string | undefined);
    if (raw && raw.trim()) return raw.trim();
  }
  return null;
}

function toAbsoluteUrl(siteUrl: string, pathOrUrl: string): string {
  const trimmed = String(pathOrUrl || "").trim();
  if (!trimmed) return siteUrl;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${siteUrl}${trimmed}`;
  return `${siteUrl}/${trimmed}`;
}

function buildListingDescription(listing: ListingSeoRow): string {
  const title = (listing.title || "Acest activ").trim();
  const category = listing.category?.trim();
  const location = pickLocation(listing);
  const exitPrice = formatEurPrice(listing.exit_price);

  const parts: string[] = [];
  if (category) {
    parts.push(
      `${title} este listat pe Quick Exit pentru vânzare rapidă în categoria ${category}.`
    );
  } else {
    parts.push(`${title} este listat pe Quick Exit pentru vânzare rapidă.`);
  }
  if (location) parts.push(`Disponibil în ${location}.`);
  parts.push("Vezi prețul de exit, detalii și oportunitatea.");
  if (exitPrice) parts.push(`Preț exit: ${exitPrice}.`);
  return parts.join(" ");
}

function normalizeId(raw: string | undefined): string | null {
  const id = typeof raw === "string" ? raw.trim() : "";
  return id ? id : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = normalizeId(rawId);
  const siteUrl = getSiteUrl();
  const canonicalPath = id ? `/anunt/${id}` : "/anunt";
  const canonicalAbs = `${siteUrl}${canonicalPath}`;

  const listing = id ? await fetchPublicListingSeoRow(id) : null;
  if (!listing) {
    return {
      title: { absolute: "Anunț indisponibil | Quick Exit" },
      description: "Acest anunț nu este disponibil public momentan.",
      alternates: { canonical: canonicalPath },
      robots: { index: false, follow: false },
      openGraph: {
        title: "Anunț indisponibil | Quick Exit",
        description: "Acest anunț nu este disponibil public momentan.",
        url: canonicalAbs,
        type: "website",
        siteName: "Quick Exit",
        locale: "ro_RO",
        images: [{ url: toAbsoluteUrl(siteUrl, "/logo.png") }],
      },
    };
  }

  const titleRaw = (listing.title || "Anunț").trim();
  const title = `${titleRaw} | Quick Exit`;
  const description = buildListingDescription(listing);

  const firstImage =
    Array.isArray(listing.images) && listing.images.length > 0
      ? String(listing.images[0] || "").trim()
      : "";
  const ogImage = firstImage ? toAbsoluteUrl(siteUrl, firstImage) : toAbsoluteUrl(siteUrl, "/logo.png");

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalAbs,
      type: "website",
      siteName: "Quick Exit",
      locale: "ro_RO",
      images: [{ url: ogImage }],
    },
  };
}

export default async function ListingPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = normalizeId(rawId);
  const siteUrl = getSiteUrl();
  const canonicalPath = id ? `/anunt/${id}` : "/anunt";
  const canonicalAbs = `${siteUrl}${canonicalPath}`;

  const listing = id ? await fetchPublicListingSeoRow(id) : null;

  const hasValidExitPrice =
    typeof listing?.exit_price === "number" &&
    Number.isFinite(listing.exit_price) &&
    listing.exit_price > 0;

  const jsonLd =
    listing
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: listing.title || "Anunț Quick Exit",
          description:
            (typeof listing.description === "string" && listing.description.trim()) ||
            buildListingDescription(listing),
          ...(listing.category ? { category: listing.category } : {}),
          url: canonicalAbs,
          ...(Array.isArray(listing.images) && listing.images.length > 0
            ? {
                image: listing.images
                  .map((img) => String(img || "").trim())
                  .filter(Boolean)
                  .map((img) => toAbsoluteUrl(siteUrl, img)),
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

  return (
    <>
      {jsonLd && (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          type="application/ld+json"
        />
      )}
      <AnuntClient />
    </>
  );
}
