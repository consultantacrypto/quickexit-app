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

const navLinkClass =
  "text-[11px] font-black uppercase tracking-widest text-neutral-700 transition-colors hover:text-black xl:text-xs";

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
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center border-b border-black/10 bg-[#F7F4EC]/95 shadow-[0_4px_20px_rgba(0,0,0,0.04)] backdrop-blur-md md:h-28">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 md:px-8">
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/"
              className="relative block h-11 w-40 transition-transform hover:scale-105 sm:h-12 sm:w-44 md:h-16 md:w-60 lg:h-20 lg:w-72"
            >
              <Image
                src="/logo.webp"
                alt={t("logoAlt")}
                fill
                sizes="(max-width: 768px) 160px, (max-width: 1024px) 240px, 288px"
                className="object-contain object-left"
                priority
              />
            </Link>
          </div>

          <div className="hidden items-center gap-5 lg:flex xl:gap-6">
            <nav className="flex items-center gap-4 xl:gap-5" aria-label={t("mainMenu")}>
              <Link href="/" className={navLinkClass}>
                {t("home")}
              </Link>
              <Link href="/cum-functioneaza" className={navLinkClass}>
                {t("howItWorks")}
              </Link>
              <Link
                href="/capital-disponibil"
                className="group flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-neutral-700 italic transition-colors hover:text-black xl:text-xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFD100] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
                </span>
                <span className="border-b-2 border-transparent pb-0.5 transition-colors group-hover:border-[#FFD100]">
                  {t("buyerOffers")}
                </span>
              </Link>
            </nav>

            <div className="h-6 w-px bg-black/15" aria-hidden />

            <HeaderAuthDesktop
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onLogout={logout}
            />

            <Link
              href="/posteaza-cerere"
              className="rounded-xl border-2 border-black bg-white px-3.5 py-2.5 text-[11px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-px hover:border-[#FFD100] xl:px-4 xl:text-xs"
            >
              {t("buyWithCash")}
            </Link>

            <Link
              href="/pune-anunt"
              className="rounded-2xl border-2 border-black bg-[#FFD100] px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-black italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-px hover:bg-black hover:text-[#FFD100] xl:px-5 xl:py-3 xl:text-xs"
            >
              {t("postListing")}
            </Link>

            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center text-black"
              aria-label={t("openMenu")}
              aria-expanded={isOpen}
              aria-controls="mobile-main-menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="h-7 w-7"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 9h16.5m-16.5 6.75h16.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-main-menu"
        className={`fixed inset-0 z-[60] bg-[#F7F4EC] transition-transform duration-500 ${
          isOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
        inert={!isOpen}
        aria-hidden={!isOpen}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? true : undefined}
        aria-label={isOpen ? t("mainMenu") : undefined}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-black/10 px-4 md:px-6">
            <div className="relative h-8 w-32 font-black text-xl italic text-black">
              {tFooter("brandName")}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-black"
              aria-label={t("closeMenu")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="h-6 w-6"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-grow flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-8">
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
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFD100] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-500" />
              </span>
              {t("buyerOffers")}
            </Link>

            <Link
              href="/posteaza-cerere"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-[2rem] border-4 border-black bg-white py-5 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              {t("buyWithCash")}
            </Link>

            <Link
              href="/pune-anunt"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-[2rem] border-4 border-black bg-[#FFD100] py-5 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
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
