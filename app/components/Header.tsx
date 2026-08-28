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
  "text-[13px] font-medium tracking-wide text-neutral-700 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100]";

export default function Header() {
  const t = useTranslations("Navigation");
  const tFooter = useTranslations("Footer");
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { user, logout } = useHeaderAuth();

  useEffect(() => {
    if (user) {
      // Close the auth modal after a successful session. Pre-existing header behavior.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- session-driven modal close
      setIsAuthOpen(false);
    }
  }, [user]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center border-b border-black/8 bg-[#F7F4EC]/95 backdrop-blur-md md:h-20">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex shrink-0 items-center">
            <Link
              href="/"
              className="relative block h-9 w-36 sm:h-10 sm:w-44 md:h-11 md:w-52"
            >
              <Image
                src="/logo.webp"
                alt={t("logoAlt")}
                fill
                sizes="(max-width: 768px) 176px, 208px"
                className="object-contain object-left"
                priority
              />
            </Link>
          </div>

          <div className="hidden min-w-0 items-center gap-5 lg:flex xl:gap-6">
            <nav className="flex items-center gap-5 xl:gap-6" aria-label={t("mainMenu")}>
              <Link href="/#active-assets" className={navLinkClass}>
                {t("explore")}
              </Link>
              <Link href="/cum-functioneaza" className={navLinkClass}>
                {t("howItWorks")}
              </Link>
            </nav>

            <div className="h-5 w-px bg-black/10" aria-hidden />

            <HeaderAuthDesktop
              user={user}
              onOpenAuth={() => setIsAuthOpen(true)}
              onLogout={logout}
            />

            <Link
              href="/pune-anunt"
              className="inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-[12px] font-semibold tracking-wide text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100] xl:px-5"
            >
              {t("listAsset")}
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
                strokeWidth={2}
                stroke="currentColor"
                className="h-6 w-6"
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
        className={`fixed inset-0 z-[60] bg-[#F7F4EC] transition-transform duration-300 motion-reduce:transition-none ${
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
            <div className="text-lg font-semibold tracking-tight text-ink">
              {tFooter("brandName")}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-black"
              aria-label={t("closeMenu")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
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

          <nav
            className="flex flex-grow flex-col items-stretch gap-3 overflow-y-auto px-6 py-8"
            aria-label={t("mainMenu")}
          >
            <Link
              href="/#active-assets"
              onClick={() => setIsOpen(false)}
              className="rounded-xl border border-[#E7E3DA] bg-white px-4 py-4 text-center text-base font-medium text-ink"
            >
              {t("explore")}
            </Link>

            <Link
              href="/cum-functioneaza"
              onClick={() => setIsOpen(false)}
              className="rounded-xl border border-[#E7E3DA] bg-white px-4 py-4 text-center text-base font-medium text-ink"
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
              href="/pune-anunt"
              onClick={() => setIsOpen(false)}
              className="rounded-xl bg-ink px-4 py-4 text-center text-base font-semibold text-white"
            >
              {t("listAsset")}
            </Link>
          </nav>
        </div>
      </div>

      {isAuthOpen ? (
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      ) : null}
    </>
  );
}
