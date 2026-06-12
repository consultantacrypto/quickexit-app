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
    title: loc === "en" ? "Privacy policy | Quick Exit" : "Confidentialitate",
    description:
      loc === "en"
        ? "Quick Exit privacy policy: what data is processed, for what purpose, and how you can exercise your rights."
        : "Politica de confidentialitate Quick Exit: ce date sunt prelucrate, in ce scop si cum iti poti exercita drepturile.",
    path: "/confidentialitate",
  });
}

export default function Confidentialitate() {
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
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90">Protecția datelor</p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            Politica de <span className="text-[#FFD100]">Confidențialitate</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm font-medium text-neutral-300 md:text-base">
            Operator în sensul RGPD pentru serviciile oferite prin această platformă:{" "}
            <strong>{companyInfo.legalName}</strong>.
          </p>
        </div>

        <div className="space-y-8 rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.1)] md:p-14 md:shadow-[14px_14px_0_0_#FFD100]">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              Identitate și contact
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              <strong>{companyInfo.legalName}</strong> ({companyInfo.entityType}), sediu înregistrat:{" "}
              {formatRegisteredOfficeFull()}, prin agent înregistrat {companyInfo.registeredAgent}.
            </p>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Pentru exercitarea drepturilor tale legate de date personale și întrebări despre această politică poți
              contacta operatorul la:{" "}
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
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              Ce categorii de date putem procesa
            </h2>
            <ul className="list-inside list-disc space-y-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              <li>Date de cont și autentificare (email, identificatori tehnici de sesiune).</li>
              <li>
                Date incluse în anunțuri sau cereri publice conform câmpurilor completate în platformă (descrieri,
                prețuri orientative, fotografii etc.).
              </li>
              <li>
                Date legate de oferte (cum ar fi mesaje, identificatori de utilizatori implicați, în limitele
                funcționalităților disponibile).
              </li>
              <li>
                Date necesare pentru verificarea conformității (KYC) prin furnizori terți autorizați, când utilizatorii
                trec prin aceste fluxuri.
              </li>
              <li>Date tehnice și de utilizare — inclusiv cookie-uri conform politicii dedicate de cookies.</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              Temeiuri și drepturi
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Prelucrarea are ca temei în principal încheierea și executarea relației contractuale cu utilizatorii,
              interes legitim în securitatea platformei și, unde este relevant, consimțământul pentru cookie-uri /
              comunicări, în funcție de caz și de configurarea în vigoare la momentul respectiv.
            </p>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              Ai dreptul să soliciți acces, rectificare, ștergere acolo unde aplicabil, restricționarea prelucrării și
              portabilitate unde este tehnic și legal posibil, precum și să te plângi la autoritatea de supraveghere
              competență (în UE, inclusiv pentru utilizatorii UE/SEE).
            </p>
          </section>

          <section className="space-y-3 border-t border-black/10 pt-8">
            <h2 className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl">
              Transferuri și terți
            </h2>
            <p className="text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
              O parte din infrastructură (găzduire, plată electronică, procesare comunicări) poate opera în afara spațiului
              economic european. În astfel de cazuri, operatorul aplică mijloace adecvate de protecție (inclusiv
              clauze contractuale standard acolo unde se aplică legea aplicabilă).
            </p>
          </section>

          <section className="rounded-2xl border-2 border-amber-200/80 bg-amber-50/50 p-5">
            <p className="text-xs font-medium leading-relaxed text-neutral-800 md:text-sm">
              Acest rezumat este informativ. Pentru formulare GDPR complete conform jurisdicției și practicii dumneavoastră
              recomandăm revizuire profesională. Nu declarăm aici rol de DPO desemnat dacă nu există oficial.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
