import Link from "next/link";
import type { Metadata } from "next";
import { companyInfo, formatRegisteredOfficeFull } from "@/lib/company";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);

  return buildPageMetadata({
    locale: loc,
    title: loc === "en" ? "Contact | Quick Exit" : "Contact",
    description:
      loc === "en"
        ? "Contact Quick Exit for user support, partnerships, and legal company information."
        : "Contact Quick Exit pentru suport utilizatori, parteneriate si informatii legale ale companiei.",
    path: "/contact",
  });
}

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-10 inline-block border-b-2 border-black pb-1 text-xs font-black uppercase tracking-widest italic transition hover:border-[#FFD100] hover:text-[#FFD100]"
        >
          ← Înapoi la pagina principală
        </Link>

        <div className="mb-10 rounded-[2rem] border-[3px] border-black bg-black p-8 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:p-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90">Contact</p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-4xl">
            {companyInfo.brandName}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm font-medium text-neutral-300">
            Suport utilizatori • investitori • parteneriate
          </p>
        </div>

        <div className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.1)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          <div className="mb-10 border-b-2 border-black/10 pb-10">
            <h2 className="text-lg font-black uppercase italic text-black md:text-xl">Scrie-ne</h2>
            <a
              href={`mailto:${companyInfo.publicEmail}`}
              className="mt-3 inline-block text-2xl font-black italic tracking-tight text-black underline decoration-[#FFD100] decoration-4 underline-offset-4 hover:text-neutral-700"
            >
              {companyInfo.publicEmail}
            </a>
            <p className="mt-6 text-sm font-medium text-neutral-600">
              Pentru întrebări operaționale, folosește adresa de mai sus.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-black/15 bg-[#F7F4EC]/60 p-6 md:p-8">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-500">
              Informații legale (discret)
            </h3>
            <dl className="mt-4 space-y-3 text-sm font-medium leading-relaxed text-neutral-800">
              <div>
                <dt className="font-black uppercase text-[10px] tracking-wider text-neutral-500">
                  Denumire legală
                </dt>
                <dd className="mt-1">{companyInfo.legalName}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-[10px] tracking-wider text-neutral-500">Entitate</dt>
                <dd className="mt-1">{companyInfo.entityType}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-[10px] tracking-wider text-neutral-500">Registered Office</dt>
                <dd className="mt-1">{formatRegisteredOfficeFull()}</dd>
              </div>
              <div>
                <dt className="font-black uppercase text-[10px] tracking-wider text-neutral-500">
                  Registered Agent
                </dt>
                <dd className="mt-1">{companyInfo.registeredAgent}</dd>
              </div>
            </dl>
          </div>

          <p className="mt-8 text-center text-[10px] font-medium uppercase tracking-widest text-neutral-400">
            {companyInfo.brandName} • {companyInfo.jurisdiction}
          </p>
        </div>
      </div>
    </div>
  );
}
