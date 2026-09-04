import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { companyInfo } from "@/lib/company";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import { Link } from "@/src/i18n/navigation";
import CookieSettingsButton from "@/app/components/CookieSettingsButton";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);

  return buildPageMetadata({
    locale: loc,
    title: loc === "en" ? "Cookie policy | Quick Exit" : "Politica cookies",
    description:
      loc === "en"
        ? "Quick Exit cookie policy: necessary, analytics and marketing storage, and how to change consent."
        : "Politica cookies Quick Exit: stocare necesară, analiză și marketing, și cum îți schimbi acordul.",
    path: "/cookies",
  });
}

export default async function CookiesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("CookiesPolicy");
  const footerClass =
    "mt-4 inline-flex rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000]";

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-10 inline-block border-b-2 border-black pb-1 text-xs font-black uppercase italic tracking-widest transition hover:border-[#FFD100]"
        >
          ← {t("back")}
        </Link>

        <div className="mb-10 rounded-[2rem] border-[3px] border-black bg-black p-8 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90">
            {t("kicker")}
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            {t("titleLead")} <span className="text-[#FFD100]">{t("titleAccent")}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-medium text-neutral-300">
            {companyInfo.legalName}
          </p>
        </div>

        <div className="space-y-8 rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.1)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              {t("whatTitle")}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              {t("whatBody")}
            </p>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              {t("disclaimer")}
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              {t("necessaryTitle")}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              {t("necessaryBody")}
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              {t("analyticsTitle")}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              {t("analyticsBody")}
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              {t("marketingTitle")}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              {t("marketingBody")}
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              {t("changeTitle")}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              {t("changeBody")}
            </p>
            <CookieSettingsButton className={footerClass}>{t("settingsCta")}</CookieSettingsButton>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              {t("retentionTitle")}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              {t("retentionBody")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
