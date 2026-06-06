"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import {
  HeaderAuthDesktop,
  HeaderAuthMobile,
  useHeaderAuth,
} from "./HeaderAuth";
import LanguageSwitcher from "./LanguageSwitcher";

const AuthModal = dynamic(() => import("./AuthModal"), {
  ssr: false,
  loading: () => null,
});

export default function Header() {
  const t = useTranslations("Navigation");
  const tFooter = useTranslations("Footer");
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { user, logout } = useHeaderAuth();

  useEffect(() => {
    if (user) {
      setIsAuthOpen(false);
    }
  }, [user]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F4EC]/95 backdrop-blur-md border-b border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] h-20 md:h-28 flex items-center">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 w-full flex items-center justify-between">
          <div className="flex items-center shrink-0 gap-3">
            <Link href="/" className="relative h-10 w-36 sm:h-12 sm:w-44 md:h-16 md:w-60 lg:h-20 lg:w-72 block transition-transform hover:scale-105">
              <Image
                src="/logo.webp"
                alt={t("logoAlt")}
                fill
                sizes="(max-width: 768px) 144px, (max-width: 1024px) 240px, 288px"
                className="object-contain object-left"
                priority
              />
            </Link>
            <LanguageSwitcher className="hidden sm:inline-flex lg:hidden" />
          </div>

          <div className="hidden lg:flex items-center gap-4 xl:gap-7">
            <Link
              href="/"
              className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-px hover:border-[#FFD100] xl:px-4 xl:py-2.5"
            >
              {t("home")}
            </Link>

            <Link
              href="/cum-functioneaza"
              className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-px hover:border-[#FFD100] xl:px-4 xl:py-2.5"
            >
              {t("howItWorks")}
            </Link>

            <HeaderAuthDesktop
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onLogout={logout}
            />

            <Link
              href="/capital-disponibil"
              className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black italic transition-colors hover:text-[#FFD100]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFD100] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500"></span>
              </span>
              <span className="border-b-[3px] border-transparent pb-0.5 transition-colors group-hover:border-[#FFD100]">
                {t("buyerOffers")}
              </span>
            </Link>

            <Link
              href="/posteaza-cerere"
              className="rounded-2xl border-2 border-black bg-[#FFD100] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black italic shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:bg-black hover:text-[#FFD100] xl:px-5 xl:py-3"
            >
              {t("buyWithCash")}
            </Link>

            <Link
              href="/pune-anunt"
              className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-px hover:border-[#FFD100] xl:px-4 xl:py-2.5"
            >
              {t("postListing")}
            </Link>

            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher className="sm:hidden" />
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="p-2 text-black"
              aria-label={t("openMenu")}
              aria-expanded={isOpen}
              aria-controls="mobile-main-menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-main-menu"
        className={`fixed inset-0 z-[60] bg-[#F7F4EC] transition-transform duration-500 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        inert={!isOpen}
        aria-hidden={!isOpen}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label={isOpen ? t("mainMenu") : undefined}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 h-20 border-b border-black/10">
            <div className="h-8 w-32 relative font-black text-xl italic text-black">{tFooter("brandName")}</div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 text-black bg-gray-100 rounded-full"
              aria-label={t("closeMenu")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center flex-grow gap-6 px-6 overflow-y-auto py-8">
            <LanguageSwitcher />

            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-[2rem] border-4 border-black bg-white py-4 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              {t("home")}
            </Link>

            <Link
              href="/cum-functioneaza"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-[2rem] border-4 border-black bg-white py-4 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              {t("howItWorks")}
            </Link>

            <HeaderAuthMobile
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onLogout={logout}
              onCloseMenu={() => setIsOpen(false)}
            />

            <Link
              href="/capital-disponibil"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center gap-3 rounded-[2rem] border-4 border-black bg-[#FDFCF8] py-5 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFD100] opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-500"></span>
              </span>
              {t("buyerOffers")}
            </Link>

            <Link
              href="/posteaza-cerere"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-[2rem] border-4 border-black bg-[#FFD100] py-5 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              {t("buyWithCash")}
            </Link>

            <Link
              href="/pune-anunt"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-[2rem] border-4 border-black bg-white py-4 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              {t("postListing")}
            </Link>
          </div>
        </div>
      </div>

      {isAuthOpen ? (
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      ) : null}
    </>
  );
}
