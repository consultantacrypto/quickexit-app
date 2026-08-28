"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { companyInfo } from "@/lib/company";

const footerLink =
  "text-sm font-medium text-neutral-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100]";

export default function Footer() {
  const t = useTranslations("Footer");
  const tCat = useTranslations("Categories");
  const tNav = useTranslations("Navigation");

  return (
    <footer className="border-t border-white/10 bg-neutral-950 pb-10 pt-16 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-14 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          <div className="space-y-5 lg:col-span-1">
            <div className="text-2xl font-semibold tracking-tight text-white">{t("brandName")}</div>
            <p className="text-sm font-medium leading-relaxed text-neutral-400">{t("tagline")}</p>
            <p className="text-[12px] font-medium leading-relaxed text-neutral-500">{t("accountHint")}</p>
            <p className="text-[12px] font-medium leading-relaxed text-neutral-500">{t("stripeFees")}</p>
            <p className="text-[12px] font-medium leading-relaxed text-neutral-500">{t("identityOptional")}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">{companyInfo.legalName}</p>
            <div className="flex w-fit items-center gap-2 rounded-md border border-neutral-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest">
              <span>{t("madeInRomania")}</span>
              <span className="text-base" aria-hidden>
                🇷🇴
              </span>
            </div>
          </div>

          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {t("platform.title")}
            </p>
            <ul className="space-y-3">
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
              <li>
                <Link href="/posteaza-cerere" className={footerLink}>
                  {tNav("buyWithCash")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {t("legal.title")}
            </p>
            <ul className="space-y-3">
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
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {t("categoriesTitle")}
            </p>
            <ul className="space-y-3">
              <li>
                <Link href="/categorii/auto" className={footerLink}>
                  {tCat("auto")}
                </Link>
              </li>
              <li>
                <Link href="/categorii/imobiliare" className={footerLink}>
                  {tCat("realEstate")}
                </Link>
              </li>
              <li>
                <Link href="/categorii/lux" className={footerLink}>
                  {tCat("luxury")}
                </Link>
              </li>
              <li>
                <Link href="/categorii/business" className={footerLink}>
                  {tCat("business")}
                </Link>
              </li>
              <li>
                <Link href="/categorii/gadgets" className={footerLink}>
                  {tCat("gadgetsTech")}
                </Link>
              </li>
              <li>
                <Link href="/categorii/foto" className={footerLink}>
                  {tCat("photoAudio")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
              {t("protection.title")}
            </p>
            <div className="space-y-4">
              <a
                href="https://anpc.ro/"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg border border-neutral-800 p-4 transition-colors hover:border-neutral-500"
              >
                <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 transition-colors group-hover:text-white">
                  {t("protection.anpc")}
                </span>
                <p className="mt-1 text-[11px] text-neutral-600">{t("protection.anpcDescription")}</p>
              </a>
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg border border-neutral-800 p-4 transition-colors hover:border-neutral-500"
              >
                <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 transition-colors group-hover:text-white">
                  {t("protection.odr")}
                </span>
                <p className="mt-1 text-[11px] text-neutral-600">{t("protection.odrDescription")}</p>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-900 pt-8">
          <p className="text-center text-[11px] font-medium leading-relaxed text-neutral-500 md:text-left">
            {companyInfo.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
