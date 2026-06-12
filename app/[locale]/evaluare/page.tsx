import type { Metadata } from "next";
import { PAGE_METADATA_COPY } from "@/lib/pageMetadataCopy";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import EvaluareClient from "./EvaluareClient";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const copy = PAGE_METADATA_COPY.evaluare[loc];

  return buildPageMetadata({
    locale: loc,
    title: copy.title,
    description: copy.description,
    path: "/evaluare",
  });
}

export default function EvaluationPage() {
  return <EvaluareClient />;
}
