"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ro } from "../../locales/ro";
import AuthModal from "./AuthModal"; 
import { supabase } from "@/lib/supabase"; // Importăm motorul de Auth

export default function Header() {
  const header = ro?.header;
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

            <Link href="/cum-functioneaza" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors italic">
              Cum Funcționează
            </Link>
            
            <Link href="/capital-disponibil" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black hover:text-gray-600 transition-colors italic">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD100] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
              <span className="border-b-[3px] border-transparent group-hover:border-[#FFD100] transition-colors pb-0.5">
                Oferte Cumpărători
              </span>
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

            <Link href="/posteaza-cerere">
              <button className="bg-[#FFD100] text-black px-5 py-3 xl:px-6 xl:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] xl:text-[11px] italic border-2 border-black hover:bg-black hover:text-[#FFD100] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5">
                Cumpăr cu Cash
              </button>
            </Link>
            
            <Link href="/evaluare">
              <button className="relative bg-black text-[#FFD100] px-6 py-3 xl:px-8 xl:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] xl:text-[11px] italic transition-all hover:scale-105 border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 shadow-lg overflow-hidden group">
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-white/10 skew-x-[-25deg] group-hover:left-[150%] transition-all duration-700" />
                {header?.aiAdvisor || "Evaluare AI"}
              </button>
            </Link>

            <Link href="/pune-anunt" className="bg-white border-2 border-black text-black px-6 py-3 xl:px-8 xl:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] xl:text-[11px] italic hover:bg-gray-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5">
              {header?.postAd || "Vinde Urgent"}
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

            <Link href="/cum-functioneaza" onClick={() => setIsOpen(false)} className="text-lg font-black uppercase tracking-widest italic text-gray-500">
              Cum Funcționează
            </Link>

            <Link href="/capital-disponibil" onClick={() => setIsOpen(false)} className="flex items-center justify-center gap-3 text-xl font-black uppercase tracking-widest italic text-black">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD100] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
              Oferte Cumpărători
            </Link>

            <Link href="/posteaza-cerere" onClick={() => setIsOpen(false)} className="w-full bg-[#FFD100] border-4 border-black text-black py-5 rounded-[2rem] text-lg font-black uppercase tracking-widest italic text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              Cumpăr cu Cash
            </Link>
            
            <Link href="/evaluare" onClick={() => setIsOpen(false)} className="w-full bg-black text-[#FFD100] py-6 rounded-[2rem] text-lg font-black uppercase tracking-widest italic text-center border-b-8 border-yellow-700 shadow-xl">
              {header?.aiAdvisor || "Evaluare AI"}
            </Link>
            
            <Link href="/pune-anunt" onClick={() => setIsOpen(false)} className="w-full border-4 border-black py-5 rounded-[2rem] text-lg font-black uppercase tracking-widest italic text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              {header?.postAd || "Vinde Urgent"}
            </Link>
          </div>
        </div>
      </div>

      {/* MODALUL DE AUTH */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}