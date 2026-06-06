import Link from "next/link";
import type { Metadata } from "next";
import { companyInfo } from "@/lib/company";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Politica cookies",
  description:
    "Politica cookies Quick Exit: ce module cookie folosim, scopul lor si cum le poti controla.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-10 inline-block border-b-2 border-black pb-1 text-xs font-black uppercase tracking-widest italic transition hover:border-[#FFD100]"
        >
          ← Înapoi la pagina principală
        </Link>

        <div className="mb-10 rounded-[2rem] border-[3px] border-black bg-black p-8 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90">Transparență</p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            Politică <span className="text-[#FFD100]">Cookies</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-medium text-neutral-300">{companyInfo.legalName}</p>
        </div>

        <div className="space-y-8 rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.1)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              Ce sunt modulele cookie?
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Fișierele cookie sunt fragmente minore de informație stocate pe dispozitiv prin browser. În {companyInfo.brandName}{" "}
              le folosim pentru funcționalități esențiale (sesiune, securitate), pentru memorarea preferințelor unde este
              cazul, pentru eventuala analiză a utilizării platformei și pentru alte funcții similare (ex.: listă urmărite,
              alerte dacă sunt activate în produs).
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">Operator</h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Operatorul pentru cookies în legătură cu această platformă este{" "}
              <strong>{companyInfo.legalName}</strong>.
            </p>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Pentru întrebări privind cookies și preferințe:{" "}
              <a
                href={`mailto:${companyInfo.publicEmail}`}
                className="font-bold text-black underline decoration-[#FFD100] decoration-2 underline-offset-2"
              >
                {companyInfo.publicEmail}
              </a>
              .
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">Control</h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Poți șterge sau bloca cookie-uri din setările browserului tău. Limitarea lor poate împiedica unele funcții ale
              site-ului sau autentificarea corectă.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
