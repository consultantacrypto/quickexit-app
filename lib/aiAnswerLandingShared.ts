import type { PageLocale } from "@/lib/seo";

export type Localized<T> = Record<PageLocale, T>;

export const AI_ANSWER_COMPLIANCE: Localized<string> = {
  ro: "Quick Exit nu garantează vânzarea sau cumpărarea unui activ, nu ține fonduri în escrow și nu acționează ca broker legal, financiar, imobiliar sau auto. Platforma oferă infrastructură de listare, vizibilitate, verificare și contact între părți.",
  en: "Quick Exit does not guarantee a sale or purchase, does not hold funds in escrow, and does not act as a legal, financial, real estate or automotive broker. The platform provides listing, visibility, verification and contact infrastructure between parties.",
};

export const AI_ANSWER_UI: Localized<{
  backHome: string;
  relatedTitle: string;
  faqTitle: string;
  sellerCtaHeading: string;
  buyerCtaHeading: string;
}> = {
  ro: {
    backHome: "← Înapoi Acasă",
    relatedTitle: "Pagini utile",
    faqTitle: "Întrebări frecvente",
    sellerCtaHeading: "Pentru vânzători",
    buyerCtaHeading: "Pentru cumpărători",
  },
  en: {
    backHome: "← Back home",
    relatedTitle: "Related pages",
    faqTitle: "Frequently asked questions",
    sellerCtaHeading: "For sellers",
    buyerCtaHeading: "For buyers",
  },
};

export const AI_ANSWER_RELATED_LINKS = [
  { href: "/capital-disponibil", ro: "Capital disponibil", en: "Available capital" },
  { href: "/posteaza-cerere", ro: "Publică cerere de cumpărare", en: "Post a buyer request" },
  { href: "/pune-anunt", ro: "Publică anunț", en: "Post a listing" },
  { href: "/cum-functioneaza", ro: "Cum funcționează", en: "How it works" },
  { href: "/tarife", ro: "Tarife", en: "Pricing" },
] as const;

export function getAiAnswerLandingUi(locale: PageLocale) {
  return {
    compliance: AI_ANSWER_COMPLIANCE[locale],
    ui: AI_ANSWER_UI[locale],
    relatedLinks: AI_ANSWER_RELATED_LINKS.map((link) => ({
      href: link.href,
      label: locale === "en" ? link.en : link.ro,
    })),
  };
}

export function buildAiAnswerFaqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}
