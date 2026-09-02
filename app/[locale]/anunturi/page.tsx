import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AnunturiClient from "./AnunturiClient";
import { parseListingsCategoryParam } from "@/lib/listingCategories";
import { PAGE_METADATA_COPY } from "@/lib/pageMetadataCopy";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const copy = PAGE_METADATA_COPY.anunturi[loc];

  return buildPageMetadata({
    locale: loc,
    title: copy.title,
    description: copy.description,
    path: "/anunturi",
  });
}

export default async function AnunturiPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { category } = await searchParams;
  setRequestLocale(locale);
  const activeSlug = parseListingsCategoryParam(category ?? null);

  const { data, error } = await supabase
    .from("listings")
    .select(
      "id,title,images,market_price,exit_price,discount,deal_score,sale_strategy,offer_count,highest_offer,expires_at,status,is_seed,category,created_at,details",
    )
    .eq("status", "active")
    .eq("is_seed", false)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <AnunturiClient listings={[]} fetchError activeSlug={activeSlug} />
    );
  }

  return (
    <AnunturiClient
      listings={data ?? []}
      fetchError={false}
      activeSlug={activeSlug}
    />
  );
}
