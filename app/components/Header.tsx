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
          <div className="hidden md:flex items-center gap-6 lg:gap-10">
            <Link href="/#how-it-works" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors italic">
              {header?.howItWorks}
            </Link>
            
            {/* NOUL BUTON "CÂT VALOREAZĂ CE VINZI?" - MINI VERSION */}
            <Link href="/evaluare">
              <button className="relative bg-black text-[#FFD100] px-6 py-3 md:px-8 md:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] italic transition-all hover:scale-105 border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 shadow-lg overflow-hidden group">
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-white/10 skew-x-[-25deg] group-hover:left-[150%] transition-all duration-700" />
                {header?.aiAdvisor}
              </button>
            </Link>

            <Link href="/vinde" className="bg-white border-2 border-black text-black px-6 py-3 md:px-8 md:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] italic hover:bg-gray-50 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5">
              {header?.postAd}
            </Link>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button onClick={() => setIsOpen(true)} className="md:hidden p-2 text-black">
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
            <div className="h-8 w-32 relative font-black text-xl italic">QUICKEXIT</div>
            <button onClick={() => setIsOpen(false)} className="p-2 text-black bg-gray-100 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col items-center justify-center flex-grow gap-10 px-6">
            <Link href="/evaluare" onClick={() => setIsOpen(false)} className="w-full bg-black text-[#FFD100] py-8 rounded-[2rem] text-xl font-black uppercase tracking-widest italic text-center border-b-8 border-yellow-700 shadow-2xl">
              {header?.aiAdvisor}
            </Link>
            <Link href="/vinde" onClick={() => setIsOpen(false)} className="w-full border-4 border-black py-6 rounded-[2rem] text-lg font-black uppercase tracking-widest italic text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              {header?.postAd}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}