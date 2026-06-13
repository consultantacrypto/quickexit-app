import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AiAnswerLandingPage from "@/app/components/AiAnswerLandingPage";
import {
  getAiAnswerLandingContent,
  type AiAnswerLandingSlug,
} from "@/lib/aiAnswerLanding";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export function createAiAnswerLandingPage(slug: AiAnswerLandingSlug) {
  const content = getAiAnswerLandingContent(slug);

  async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const loc = resolvePageLocale(locale);
    const meta = content.meta[loc];

    return buildPageMetadata({
      locale: loc,
      title: meta.title,
      description: meta.description,
      path: content.path,
    });
  }

  async function Page({ params }: PageProps) {
    const { locale } = await params;
    const loc = resolvePageLocale(locale);
    setRequestLocale(loc);

    return <AiAnswerLandingPage slug={slug} locale={loc} />;
  }

  return { generateMetadata, Page };
}
