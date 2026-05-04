"use client";

import Link from "next/link";
import { companyInfo } from "@/lib/company";

const footerLink = "text-xs font-bold uppercase italic text-neutral-400 transition-colors hover:text-[#FFD100]";

export default function Footer() {
  return (
    <footer className="border-t-8 border-[#FFD100] bg-neutral-950 pb-10 pt-20 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5 lg:gap-10">
          {/* Brand */}
          <div className="space-y-6 lg:col-span-1">
            <div className="text-3xl font-black italic tracking-tighter text-[#FFD100]">QUICK EXIT</div>
            <p className="text-sm font-bold italic leading-relaxed text-neutral-400">
              Prima platformă de lichiditate ultra-rapidă din România. Transformăm activele complexe în capital imediat
              prin tehnologie și rețele de investitori verificați.
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{companyInfo.legalName}</p>
            <div className="flex w-fit items-center gap-2 rounded-lg border border-neutral-800 px-4 py-2 text-[10px] font-black uppercase tracking-widest">
              <span>Made in Romania</span>
              <span className="text-base">🇷🇴</span>
            </div>
          </div>

          {/* Platformă */}
          <div>
            <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-[#FFD100]">Platformă</h4>
            <ul className="mb-8 space-y-4">
              <li>
                <Link href="/cum-functioneaza" className={footerLink}>
                  Cum funcționează
                </Link>
              </li>
              <li>
                <Link href="/tarife" className={footerLink}>
                  Tarife
                </Link>
              </li>
              <li>
                <Link href="/evaluare" className={footerLink}>
                  Evaluare
                </Link>
              </li>
              <li>
                <Link href="/capital-disponibil" className={footerLink}>
                  Capital disponibil
                </Link>
              </li>
            </ul>

            <Link href="/tarife">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFD100] py-4 text-[10px] font-black italic uppercase tracking-widest text-black shadow-[4px_4px_0_0_rgba(255,255,255,0.15)] transition-all hover:translate-y-1 hover:shadow-none"
              >
                <span>OFERTE SPECIALE & TARIFE</span>
                <span>→</span>
              </button>
            </Link>
          </div>

          {/* Legal & Informații */}
          <div>
            <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-[#FFD100]">
              Legal &amp; Informații
            </h4>
            <ul className="space-y-4">
              <li>
                <Link href="/termeni" className={footerLink}>
                  Termeni
                </Link>
              </li>
              <li>
                <Link href="/confidentialitate" className={footerLink}>
                  Confidențialitate
                </Link>
              </li>
              <li>
                <Link href="/cookies" className={footerLink}>
                  Cookies
                </Link>
              </li>
              <li>
                <Link href="/contact" className={footerLink}>
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Categorii */}
          <div>
            <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-[#FFD100]">Categorii</h4>
            <ul className="space-y-4 text-[10px] font-black uppercase italic text-neutral-500">
              <li>
                <Link href="/categorii/auto" className="transition-colors hover:text-[#FFD100]">
                  Auto &amp; Moto
                </Link>
              </li>
              <li>
                <Link href="/categorii/imobiliare" className="transition-colors hover:text-[#FFD100]">
                  Imobiliare
                </Link>
              </li>
              <li>
                <Link href="/categorii/lux" className="transition-colors hover:text-[#FFD100]">
                  Lux &amp; Ceasuri
                </Link>
              </li>
              <li>
                <Link href="/categorii/business" className="transition-colors hover:text-[#FFD100]">
                  Afaceri de vânzare
                </Link>
              </li>
              <li>
                <Link href="/categorii/gadgets" className="transition-colors hover:text-[#FFD100]">
                  Gadgets &amp; Tech
                </Link>
              </li>
            </ul>
          </div>

          {/* Protecție */}
          <div>
            <h4 className="mb-6 text-sm font-black uppercase tracking-widest text-[#FFD100]">Protecție</h4>
            <div className="space-y-4">
              <a
                href="https://anpc.ro/"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-neutral-800 p-4 transition-colors hover:border-[#FFD100]"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-colors group-hover:text-[#FFD100]">
                  A.N.P.C.
                </span>
                <p className="mt-1 text-[9px] uppercase text-neutral-600">Protecția Consumatorilor</p>
              </a>
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-neutral-800 p-4 transition-colors hover:border-[#FFD100]"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 transition-colors group-hover:text-[#FFD100]">
                  S.O.L.
                </span>
                <p className="mt-1 text-[9px] uppercase text-neutral-600">Soluționarea Online a Litigiilor</p>
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-neutral-900 pt-10 md:flex-row">
          <p className="text-center text-[10px] font-medium italic leading-relaxed text-neutral-400 md:text-left">
            {companyInfo.copyright}
          </p>

          <div className="flex items-center gap-8 opacity-30 grayscale transition-all hover:grayscale-0 hover:opacity-100">
            <div className="text-[10px] font-black italic tracking-tighter text-white underline decoration-[#FFD100] decoration-2">
              SECURE PAYMENTS BY STRIPE
            </div>
            <div className="flex gap-4">
              <span className="text-[10px] font-black italic text-white">VISA</span>
              <span className="text-[10px] font-black italic text-white">MASTERCARD</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
