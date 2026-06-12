import type { Metadata } from "next";
import { Suspense } from "react";
import { PAGE_METADATA_COPY } from "@/lib/pageMetadataCopy";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import PuneAnuntClient from "./PuneAnuntClient";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ package?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const copy = PAGE_METADATA_COPY.puneAnunt[loc];

  return buildPageMetadata({
    locale: loc,
    title: copy.title,
    description: copy.description,
    path: "/pune-anunt",
  });
}

export default async function PostAdPage({ searchParams }: PageProps) {
  const { package: pkg } = await searchParams;
  return (
    <Suspense fallback={null}>
      <PuneAnuntClient initialPackage={pkg} />
    </Suspense>
  );
}
