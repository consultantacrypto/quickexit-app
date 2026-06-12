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
    title: loc === "en" ? "Terms and conditions | Quick Exit" : "Termeni si conditii",
    description:
      loc === "en"
        ? "Quick Exit terms and conditions for using the platform, valuations, payments, and the role of the service."
        : "Termenii si conditiile Quick Exit pentru utilizarea platformei, evaluari, plati si rolul serviciului.",
    path: "/termeni",
  });
}

export default function TermeniSiConditii() {
  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-10 inline-block border-b-2 border-black pb-1 text-xs font-black uppercase tracking-widest italic transition hover:border-[#FFD100] hover:text-[#FFD100]"
        >
          ← Înapoi la pagina principală
        </Link>

        <div className="mb-10 rounded-[2rem] border-[3px] border-black bg-black p-8 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90">Document legal</p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            Termeni și <span className="text-[#FFD100]">Condiții</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[11px] font-semibold uppercase tracking-wider text-neutral-300 md:text-xs">
            Ultima actualizare: {new Date().toLocaleDateString("ro-RO")} • {companyInfo.legalName}
          </p>
        </div>

        <div className="space-y-6 rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.1)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              Operatorul platformei
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Platforma {companyInfo.brandName} este operată de {companyInfo.legalName}, o societate de tip Delaware
              Limited Liability Company, cu registered office la {formatRegisteredOfficeFull()}, având registered
              agent {companyInfo.registeredAgent}.
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              Rolul platformei
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              {companyInfo.brandName} este o platformă tehnologică pentru evaluare orientativă, publicare de active și
              conectarea utilizatorilor interesați de vânzare rapidă sau capital disponibil.{" "}
              <strong>{companyInfo.legalName}</strong> nu garantează vânzarea unui activ și nu acționează ca
              evaluator autorizat, broker, notar, instituție financiară sau escrow, cu excepția cazurilor în care un
              astfel de serviciu este explicit menționat și reglementat separat.
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">Evaluări</h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Estimările afișate sunt orientative și bazate pe date disponibile, comparabile, semnale de piață și
              informații introduse de utilizator. Aceste estimări nu reprezintă evaluare autorizată și nu constituie
              garanție de preț sau garanție de vânzare.
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">Plăți</h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Taxele de listare sau publicare activează expunerea în platformă conform pachetului ales. Plata nu
              garantează vânzarea activului sau primirea unei oferte.
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              Date de contact
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Pentru notificări generale și suport utilizator poți folosi:{" "}
              <a
                href={`mailto:${companyInfo.publicEmail}`}
                className="font-bold text-black underline decoration-[#FFD100] decoration-2 underline-offset-2 hover:text-neutral-700"
              >
                {companyInfo.publicEmail}
              </a>
            </p>
            <p className="mt-6 text-[11px] font-medium italic leading-relaxed text-neutral-500">
              Pentru întrebări juridice specifice recomandăm consultarea unui avocat. Acest rezumat înlocuiește variante
              provizorii anterioare și poate fi extins oficial separat.
            </p>
          </section>

          <p className="border-t border-black/10 pt-8 text-center text-xs font-semibold uppercase tracking-wide text-neutral-600">
            {companyInfo.filing.document} ({companyInfo.filing.state}) • nr. fișier {companyInfo.filing.fileNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
