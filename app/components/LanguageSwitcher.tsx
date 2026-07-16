"use client";

import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { routing, type AppLocale } from "@/src/i18n/routing";

type LanguageSwitcherProps = {
  className?: string;
};

export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const t = useTranslations("Navigation");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (nextLocale: AppLocale) => {
    if (nextLocale === locale) return;
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div
      role="group"
      aria-label={t("languageSwitcher")}
      className={`inline-flex min-h-10 items-center rounded-lg border-2 border-black bg-white p-0.5 shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${className}`.trim()}
    >
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          aria-current={locale === loc ? "true" : undefined}
          className={`min-h-9 rounded-md px-2.5 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${
            locale === loc
              ? "bg-[#FFD100] text-black"
              : "text-neutral-500 hover:text-black"
          }`}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
