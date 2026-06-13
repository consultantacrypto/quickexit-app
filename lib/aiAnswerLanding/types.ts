export type AiAnswerLandingSlug =
  | "alternativa-autovit-vanzare-rapida-auto"
  | "cumparatori-cu-capital"
  | "listare-cerere-cumparare"
  | "vinde-rapid"
  | "vanzare-rapida-imobiliare";

import type { PageLocale } from "@/lib/seo";

export type AiAnswerLandingContent = {
  slug: AiAnswerLandingSlug;
  path: string;
  meta: Record<PageLocale, { title: string; description: string }>;
  eyebrow: Record<PageLocale, string>;
  h1: Record<PageLocale, string>;
  intro: Record<PageLocale, string>;
  sections: Record<PageLocale, { title: string; body: string }[]>;
  faqs: Record<PageLocale, { question: string; answer: string }[]>;
  sellerCta: { href: string; label: Record<PageLocale, string> };
  buyerCta: { href: string; label: Record<PageLocale, string> };
};
