import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import PuneAnuntClient from "./PuneAnuntClient";

export const metadata: Metadata = buildPageMetadata({
  title: "Publică anunț de vânzare rapidă | Quick Exit",
  description:
    "Listează un activ pentru vânzare rapidă și conectează-te cu cumpărători pregătiți.",
  path: "/pune-anunt",
});

type PageProps = {
  searchParams: Promise<{ package?: string }>;
};

export default async function PostAdPage({ searchParams }: PageProps) {
  const { package: pkg } = await searchParams;
  return <PuneAnuntClient initialPackage={pkg} />;
}