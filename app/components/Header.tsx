"use client";
import Link from "next/link";
import Image from "next/image";
import { ro } from "../../locales/ro";

export default function Header() {
  const { header } = ro;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* LOGO - Duce mereu la Home */}
        <Link href="/" className="relative h-10 w-40 hover:opacity-80 transition-opacity">
          <Image 
            src="/quickexit_black_transparent_clean.jpg" 
            alt="QuickExit Logo" 
            fill 
            className="object-contain"
          />
        </Link>

        {/* NAVIGARE CENTRU */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/evaluare" className="text-sm font-black uppercase tracking-widest text-black hover:text-[#FFD100] transition-colors">
            {header.aiAdvisor}
          </Link>
          <Link href="#categorii" className="text-sm font-black uppercase tracking-widest text-black hover:text-[#FFD100] transition-colors">
            {header.categories}
          </Link>
          <Link href="#how-it-works" className="text-sm font-black uppercase tracking-widest text-black hover:text-[#FFD100] transition-colors">
            {header.howItWorks}
          </Link>
        </nav>

        {/* BUTOANE ACȚIUNE DREAPTA */}
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="hidden sm:block text-xs font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors">
            {header.login}
          </Link>
          <Link 
            href="/evaluare" 
            className="bg-black text-[#FFD100] px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#FFD100] hover:text-black transition-all shadow-lg"
          >
            {header.postAd}
          </Link>
        </div>

      </div>
    </header>
  );
}