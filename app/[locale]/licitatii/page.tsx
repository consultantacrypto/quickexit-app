import type { Metadata } from "next";
import Link from "next/link";
import AdCard from "@/app/components/AdCard";
import { PAGE_METADATA_COPY } from "@/lib/pageMetadataCopy";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import { normalizeSaleType } from "@/utils/normalizeSaleType";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const copy = PAGE_METADATA_COPY.licitatii[loc];

  return buildPageMetadata({
    locale: loc,
    title: copy.title,
    description: copy.description,
    path: "/licitatii",
  });
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80";

export default async function LicitatiiPage() {
  const { data: listings } = await supabase
    .from("listings")
    .select(
      "id,title,images,market_price,exit_price,discount,deal_score,sale_strategy,offer_count,highest_offer,expires_at,status,is_seed,created_at",
    )
    .eq("status", "active")
    .eq("is_seed", false)
    .order("created_at", { ascending: false })
    .limit(100);

  const auctions =
    listings?.filter((item) => normalizeSaleType(item.sale_strategy) === "auction") ?? [];

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink selection:bg-gold selection:text-ink">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6 md:pb-28 md:pt-12">
        <Link
          href="/"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted underline-offset-4 transition hover:text-ink hover:underline"
        >
          ← Înapoi acasă
        </Link>

        <header className="mt-8 max-w-2xl md:mt-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-deep">
            Licitații deschise
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl lg:text-5xl">
            Licitații active
          </h1>
          <p className="mt-4 text-sm font-medium leading-relaxed text-muted md:text-base">
            Active cu fereastră de ofertare până la 30 de zile. Vânzătorul alege manual oferta
            potrivită — nu există câștigător automat.
          </p>
        </header>

        {auctions.length > 0 ? (
          <>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {auctions.length} {auctions.length === 1 ? "licitație activă" : "licitații active"}
            </p>
            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10 xl:grid-cols-4">
              {auctions.map((item, index) => (
                <AdCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={item.images?.[0] || FALLBACK_IMAGE}
                  marketPrice={`€${item.market_price.toLocaleString("ro-RO")}`}
                  exitPrice={`€${item.exit_price.toLocaleString("ro-RO")}`}
                  discount={item.discount?.toString() || "0"}
                  score={item.deal_score ? item.deal_score / 10 : 9.5}
                  type="auction"
                  priority={index < 4}
                  offerCount={item.offer_count}
                  highestOffer={item.highest_offer}
                  expiresAt={item.expires_at}
                />
              ))}
            </div>

            <div className="mt-12 flex flex-col gap-5 sm:mt-14 sm:flex-row sm:items-center sm:justify-between md:gap-6">
              <Link
                href="/"
                className="group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted transition hover:text-ink md:text-xs"
              >
                Înapoi la homepage
                <span
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden
                >
                  →
                </span>
              </Link>
              <Link
                href="/pune-anunt"
                className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition hover:border-neutral-300 hover:bg-canvas md:text-xs"
              >
                Adaugă o licitație
              </Link>
            </div>
          </>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed border-line bg-surface px-8 py-16 text-center md:mt-16 md:py-20">
            <p className="text-lg font-semibold tracking-tight text-ink">
              Momentan nu există licitații active.
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-relaxed text-muted">
              Fii primul care publică o licitație deschisă și strânge oferte timp de până la 30 de
              zile.
            </p>
            <Link
              href="/pune-anunt"
              className="mt-8 inline-flex items-center justify-center rounded-full border border-line bg-surface px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink transition hover:border-neutral-300 hover:bg-canvas md:text-xs"
            >
              Adaugă o licitație
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
