"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { ShieldCheck } from "lucide-react";
import { companyInfo } from "@/lib/company";

const footerLink = "text-xs font-bold uppercase italic text-neutral-400 transition-colors hover:text-[#FFD100]";

function DiditKycTrustBadge({ className = "" }: { className?: string }) {
  const t = useTranslations("Didit");

  return (
    <a
      href="https://www.didit.me/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("trustBadgeAriaLabel")}
      className={`group inline-flex items-center gap-2.5 rounded-xl border-[3px] border-black bg-[#FDFCF8] px-3.5 py-2.5 text-black shadow-[4px_4px_0_0_#FFD100] transition duration-200 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#FFD100] dark:border-neutral-600 dark:bg-neutral-900 dark:text-white dark:shadow-[4px_4px_0_0_rgba(255,209,0,0.85)] ${className}`.trim()}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-[#FFD100] text-black dark:border-[#FFD100]">
        <ShieldCheck size={16} strokeWidth={2.5} aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
          {t("securedBy")}
        </span>
        <span className="text-[11px] font-black uppercase italic tracking-tight text-black dark:text-[#FFD100]">
          {t("brandName")}
        </span>
      </span>
    </a>
  );
}

export default function Footer() {
  const t = useTranslations("Footer");
  const tCat = useTranslations("Categories");

  return (
    <footer className="border-t-8 border-[#FFD100] bg-neutral-950 pb-10 pt-20 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          <div className="space-y-6 lg:col-span-1">
            <div className="text-3xl font-black italic tracking-tighter text-[#FFD100]">{t("brandName")}</div>
            <p className="text-sm font-bold italic leading-relaxed text-neutral-400">{t("tagline")}</p>
            <p className="text-[11px] font-semibold leading-relaxed text-neutral-500">{t("accountHint")}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{companyInfo.legalName}</p>
            <div className="flex w-fit items-center gap-2 rounded-lg border border-neutral-800 px-4 py-2 text-[10px] font-black uppercase tracking-widest">
              <span>{t("madeInRomania")}</span>
              <span className="text-base">🇷🇴</span>
            </div>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-[#FFD100]">{t("platform.title")}</h4>
            <ul className="mb-8 space-y-4">
              <li>
                <Link href="/cum-functioneaza" className={footerLink}>
                  {t("platform.howItWorks")}
                </Link>
              </li>
              <li>
                <Link href="/tarife" className={footerLink}>
                  {t("platform.pricing")}
                </Link>
              </li>
              <li>
                <Link href="/evaluare" className={footerLink}>
                  {t("platform.evaluation")}
                </Link>
              </li>
              <li>
                <Link href="/capital-disponibil" className={footerLink}>
                  {t("platform.capitalAvailable")}
                </Link>
              </li>
            </ul>

            <Link href="/tarife">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD100] py-4 text-[10px] font-black italic uppercase tracking-widest text-black shadow-[4px_4px_0_0_rgba(255,255,255,0.15)] transition-all hover:translate-y-1 hover:shadow-none"
              >
                <span>{t("platform.specialOffersCta")}</span>
                <span>→</span>
              </button>
            </Link>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-[#FFD100]">
              {t("legal.title")}
            </h4>
            <ul className="space-y-4">
              <li>
                <Link href="/termeni" className={footerLink}>
                  {t("legal.terms")}
                </Link>
              </li>
              <li>
                <Link href="/confidentialitate" className={footerLink}>
                  {t("legal.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className={footerLink}>
                  {t("legal.cookies")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className={footerLink}>
                  {t("legal.contact")}
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${companyInfo.publicEmail}?subject=${encodeURIComponent(t("legal.feedbackSubject"))}`}
                  className={footerLink}
                >
                  {t("legal.feedback")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-[#FFD100]">{t("categoriesTitle")}</h4>
            <ul className="space-y-4 text-[10px] font-black uppercase italic text-neutral-500">
              <li>
                <Link href="/categorii/auto" className="transition-colors hover:text-[#FFD100]">
                  {tCat("auto")}
                </Link>
              </li>
              <li>
                <Link href="/categorii/imobiliare" className="transition-colors hover:text-[#FFD100]">
                  {tCat("realEstate")}
                </Link>
              </li>
              <li>
                <Link href="/categorii/lux" className="transition-colors hover:text-[#FFD100]">
                  {tCat("luxury")}
                </Link>
              </li>
              <li>
                <Link href="/categorii/business" className="transition-colors hover:text-[#FFD100]">
                  {tCat("business")}
                </Link>
              </li>
              <li>
                <Link href="/categorii/gadgets" className="transition-colors hover:text-[#FFD100]">
                  {tCat("gadgetsTech")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-[#FFD100]">{t("protection.title")}</h4>
            <div className="space-y-4">
              <a
                href="https://anpc.ro/"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-neutral-800 p-4 transition-colors hover:border-[#FFD100]"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-colors group-hover:text-[#FFD100]">
                  {t("protection.anpc")}
                </span>
                <p className="mt-1 text-[9px] uppercase text-neutral-600">{t("protection.anpcDescription")}</p>
              </a>
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-neutral-800 p-4 transition-colors hover:border-[#FFD100]"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-colors group-hover:text-[#FFD100]">
                  {t("protection.odr")}
                </span>
                <p className="mt-1 text-[9px] uppercase text-neutral-600">{t("protection.odrDescription")}</p>
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-8 border-t border-neutral-900 pt-10 md:flex-row md:items-end">
          <p className="text-center text-[10px] font-medium italic leading-relaxed text-neutral-400 md:text-left">
            {companyInfo.copyright}
          </p>

          <div className="flex flex-col items-center gap-5 sm:flex-row sm:flex-wrap sm:justify-end">
            <DiditKycTrustBadge />
            <div className="flex items-center gap-8 opacity-30 grayscale transition-all hover:grayscale-0 hover:opacity-100">
              <div className="text-[10px] font-black italic tracking-tighter text-white underline decoration-[#FFD100] decoration-2">
                {t("securePayments")}
              </div>
              <div className="flex gap-4">
                <span className="text-[10px] font-black italic text-white">{t("visa")}</span>
                <span className="text-[10px] font-black italic text-white">{t("mastercard")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
