"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ro } from "../../locales/ro";

export default function Header() {
  const header = ro?.header;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 h-20 md:h-28 flex items-center">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 w-full flex items-center justify-between">
          
          {/* LOGO */}
          <div className="flex items-center shrink-0">
            <Link href="/" className="relative h-10 w-36 sm:h-12 sm:w-44 md:h-16 md:w-60 lg:h-20 lg:w-72 block transition-transform hover:scale-105">
              <Image 
                src="/logo.png" 
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
            
            {/* 1. Cum funcționează - Pagina de Pitch */}
            <Link href="/cum-functioneaza" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors italic">
              Cum Funcționează
            </Link>
            
            {/* 2. Oferte Cumpărători - Link cu indicator "Live" */}
            <Link href="/capital-disponibil" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black hover:text-gray-600 transition-colors italic">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD100] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
              <span className="border-b-[3px] border-transparent group-hover:border-[#FFD100] transition-colors pb-0.5">
                Oferte Cumpărători
              </span>
            </Link>

            {/* 3. CUMPĂR CU CASH (Înlocuiește Adaugă Capital) */}
            <Link href="/posteaza-cerere">
              <button className="bg-[#FFD100] text-black px-5 py-3 xl:px-6 xl:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] xl:text-[11px] italic border-2 border-black hover:bg-black hover:text-[#FFD100] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5">
                Cumpăr cu Cash
              </button>
            </Link>
            
            {/* 4. Evaluare AI */}
            <Link href="/evaluare">
              <button className="relative bg-black text-[#FFD100] px-6 py-3 xl:px-8 xl:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] xl:text-[11px] italic transition-all hover:scale-105 border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 shadow-lg overflow-hidden group">
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-white/10 skew-x-[-25deg] group-hover:left-[150%] transition-all duration-700" />
                {header?.aiAdvisor || "Evaluare AI"}
              </button>
            </Link>

            {/* 5. Vinde Urgent */}
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
      <div className={`fixed inset-0 z-[60] bg-white transition-transform duration-500 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 h-20 border-b border-gray-100">
            <div className="h-8 w-32 relative font-black text-xl italic text-black">QUICKEXIT</div>
            <button onClick={() => setIsOpen(false)} className="p-2 text-black bg-gray-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center flex-grow gap-6 px-6 overflow-y-auto py-8">
            
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
    </>
  );
}