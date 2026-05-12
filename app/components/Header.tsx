"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthModal from "./AuthModal";
import { supabase } from "@/lib/supabase"; // Importăm motorul de Auth

export default function Header() {
  const [isOpen, setIsOpen] = useState(false); 
  const [isAuthOpen, setIsAuthOpen] = useState(false); 

  // Starea pentru utilizator (dacă este logat sau nu)
  const [user, setUser] = useState<any>(null);

  // Verificăm sesiunea imediat ce se încarcă Header-ul
  useEffect(() => {
    // Luăm sesiunea curentă
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Ascultăm schimbările de stare (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsAuthOpen(false); // Dacă s-a logat, închidem pop-up-ul automat
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Funcția pentru Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F4EC]/95 backdrop-blur-md border-b border-black/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] h-20 md:h-28 flex items-center">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 w-full flex items-center justify-between">
          
          {/* LOGO */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="relative h-10 w-36 sm:h-12 sm:w-44 md:h-16 md:w-60 lg:h-20 lg:w-72 block transition-transform hover:scale-105">
              <Image 
                src="/logo.png?v=2" 
                alt="QuickExit Logo" 
                fill
                className="object-contain object-left"
                priority
                unoptimized
              />
            </Link>
          </div>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-7">
            <Link
              href="/"
              className="rounded-xl border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-px hover:border-[#FFD100] xl:px-4 xl:py-2.5"
            >
              Acasă
            </Link>

            <Link
              href="/categorii/auto"
              className="text-[10px] font-black uppercase tracking-widest text-black italic transition-colors hover:text-[#FFD100]"
            >
              Anunțuri auto
            </Link>

            <Link href="/capital-disponibil" className="text-[10px] font-black uppercase tracking-widest text-black italic transition-colors hover:text-[#FFD100]">
              Capital disponibil
            </Link>

            <Link href="/cum-functioneaza" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors italic">
              Cum funcționează
            </Link>

            {/* LOGICĂ DINAMICĂ CONT/DASHBOARD (DESKTOP) */}
            {user ? (
              <div className="flex max-w-[min(100%,22rem)] flex-col gap-1.5 rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.1)] sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                  <Link href="/dashboard" className="flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-widest text-black italic transition-colors hover:text-[#FFD100]">
                    <span className="text-sm" aria-hidden>
                      ⚡
                    </span>
                    Contul meu
                  </Link>
                  {user.email ? (
                    <span
                      className="truncate text-[9px] font-semibold normal-case tracking-normal text-neutral-600"
                      title={user.email}
                    >
                      {user.email}
                    </span>
                  ) : null}
                </div>
                <div className="hidden h-4 w-[2px] bg-gray-200 sm:block" aria-hidden />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="shrink-0 text-left text-[9px] font-black uppercase tracking-widest text-gray-500 italic transition-colors hover:text-red-600 sm:text-right"
                >
                  Ieși din cont
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="mx-2 rounded-xl border-2 border-black bg-[#FFD100] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-px hover:brightness-105"
              >
                Intră în cont
              </button>
            )}

            <Link
              href="/evaluare"
              className="text-[10px] font-black uppercase tracking-widest text-neutral-600 underline decoration-[#FFD100] decoration-2 underline-offset-4 transition hover:text-black"
            >
              Evaluare rapidă
            </Link>

            <Link href="/posteaza-cerere">
              <button
                type="button"
                className="rounded-2xl border-2 border-black bg-[#FFD100] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black italic shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:bg-black hover:text-[#FFD100] xl:px-5 xl:py-3"
              >
                Publică cerere
              </button>
            </Link>

            <Link
              href="/pune-anunt"
              className="rounded-2xl border-2 border-black bg-white px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-black italic shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:bg-neutral-50 xl:px-6 xl:py-3"
            >
              Pune anunț
            </Link>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button onClick={() => setIsOpen(true)} className="lg:hidden p-2 text-black">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      <div className={`fixed inset-0 z-[60] bg-[#F7F4EC] transition-transform duration-500 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 h-20 border-b border-black/10">
            <div className="h-8 w-32 relative font-black text-xl italic text-black">QUICKEXIT</div>
            <button onClick={() => setIsOpen(false)} className="p-2 text-black bg-gray-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center flex-grow gap-6 px-6 overflow-y-auto py-8">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-[2rem] border-4 border-black bg-white py-4 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              Acasă
            </Link>

            {/* LOGICĂ DINAMICĂ CONT/DASHBOARD (MOBIL) */}
            {user ? (
              <div className="flex w-full flex-col items-center gap-3 rounded-[2rem] border-2 border-gray-100 bg-gray-50 p-5">
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 text-xl font-black uppercase tracking-widest italic text-black"
                >
                  <span className="text-2xl" aria-hidden>
                    ⚡
                  </span>
                  Contul meu
                </Link>
                {user.email ? (
                  <p className="max-w-full truncate px-2 text-center text-xs font-semibold normal-case text-neutral-600" title={user.email}>
                    {user.email}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    void handleLogout();
                    setIsOpen(false);
                  }}
                  className="mt-1 text-sm font-black uppercase tracking-widest text-red-600 transition-colors hover:text-red-800 italic"
                >
                  Ieși din cont
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsAuthOpen(true);
                }}
                className="w-full rounded-[2rem] border-4 border-black bg-[#FFD100] py-5 text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
              >
                Intră în cont
              </button>
            )}

            <Link
              href="/categorii/auto"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-2xl border-2 border-black bg-white py-4 text-center text-sm font-black uppercase tracking-widest italic shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            >
              Anunțuri auto
            </Link>

            <Link
              href="/capital-disponibil"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-2xl border-2 border-black bg-[#FDFCF8] py-4 text-center text-sm font-black uppercase tracking-widest italic shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            >
              Capital disponibil
            </Link>

            <Link href="/cum-functioneaza" onClick={() => setIsOpen(false)} className="text-base font-black uppercase tracking-widest italic text-gray-500">
              Cum funcționează
            </Link>

            <Link
              href="/evaluare"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-2xl border-2 border-neutral-300 bg-white py-4 text-center text-sm font-black uppercase tracking-widest text-neutral-700"
            >
              Evaluare rapidă
            </Link>

            <Link
              href="/posteaza-cerere"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-[2rem] border-4 border-black bg-[#FFD100] py-5 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              Publică cerere
            </Link>

            <Link
              href="/pune-anunt"
              onClick={() => setIsOpen(false)}
              className="w-full rounded-[2rem] border-4 border-black bg-white py-5 text-center text-lg font-black uppercase tracking-widest italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
            >
              Pune anunț
            </Link>
          </div>
        </div>
      </div>

      {/* MODALUL DE AUTH */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}