import { Link } from "@/src/i18n/navigation";
import {
  buildAiAnswerFaqJsonLd,
  getAiAnswerLandingUi,
} from "@/lib/aiAnswerLandingShared";
import {
  getAiAnswerLandingContent,
  type AiAnswerLandingSlug,
} from "@/lib/aiAnswerLanding";
import type { PageLocale } from "@/lib/seo";

type AiAnswerLandingPageProps = {
  slug: AiAnswerLandingSlug;
  locale: PageLocale;
};

export default function AiAnswerLandingPage({ slug, locale }: AiAnswerLandingPageProps) {
  const content = getAiAnswerLandingContent(slug);
  const { compliance, ui, relatedLinks } = getAiAnswerLandingUi(locale);
  const faqJsonLd = buildAiAnswerFaqJsonLd(content.faqs[locale]);

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-black antialiased md:px-8">
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        type="application/ld+json"
      />

      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-10 inline-block border-b-2 border-black pb-1 text-xs font-black uppercase tracking-widest italic transition hover:border-[#FFD100] hover:text-[#FFD100]"
        >
          {ui.backHome}
        </Link>

        <header className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
            {content.eyebrow[locale]}
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            {content.h1[locale]}
          </h1>
          <p className="mt-6 max-w-3xl text-sm font-medium leading-relaxed text-neutral-200 md:text-base">
            {content.intro[locale]}
          </p>
        </header>

        <div className="mt-10 space-y-6">
          {content.sections[locale].map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.08)] md:p-8"
            >
              <h2 className="text-lg font-black uppercase italic tracking-tight text-black md:text-xl">
                {section.title}
              </h2>
              <p className="mt-4 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border-[3px] border-black bg-[#FFD100] p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] md:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/70">
              {ui.sellerCtaHeading}
            </p>
            <Link
              href={content.sellerCta.href}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border-[3px] border-black bg-white px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-black transition hover:bg-black hover:text-[#FFD100]"
            >
              {content.sellerCta.label[locale]}
            </Link>
          </div>
          <div className="rounded-2xl border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)] md:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">
              {ui.buyerCtaHeading}
            </p>
            <Link
              href={content.buyerCta.href}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl border-[3px] border-black bg-black px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-[#FFD100] transition hover:bg-[#FFD100] hover:text-black"
            >
              {content.buyerCta.label[locale]}
            </Link>
          </div>
        </div>

        <p className="mt-10 max-w-4xl rounded-2xl border-2 border-black/20 bg-[#FFF8E7] p-5 text-sm font-medium leading-relaxed text-neutral-900 md:text-[15px]">
          {compliance}
        </p>

        <nav
          aria-label={ui.relatedTitle}
          className="mt-8 rounded-2xl border-[3px] border-black bg-[#FFFCF4] p-6 md:p-7"
        >
          <h2 className="text-sm font-black uppercase italic tracking-tight text-black md:text-base">
            {ui.relatedTitle}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {relatedLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-block rounded-xl border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-[#FFD100]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="mt-10 rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
            {ui.faqTitle}
          </h2>
          <div className="mt-8 space-y-6">
            {content.faqs[locale].map((faq) => (
              <div key={faq.question}>
                <h3 className="text-base font-black tracking-tight text-black md:text-lg">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
