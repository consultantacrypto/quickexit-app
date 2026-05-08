import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Pentru investitori | Active sub prețul pieței pe Quick Exit",
  description:
    "Descoperă active listate cu preț de exit pe Quick Exit: mașini, business-uri, imobiliare, bunuri de lux și oportunități pentru cumpărători cu capital disponibil.",
  path: "/pentru-investitori",
});

export default function PentruInvestitoriPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-24 pt-20 font-sans text-black antialiased md:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
            Ghid pentru cumpărători
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            Pentru investitori și cumpărători cu capital disponibil
          </h1>
          <p className="mt-6 max-w-4xl text-sm font-medium leading-relaxed text-neutral-200 md:text-base">
            Quick Exit ajută cumpărătorii și investitorii să descopere active listate pentru vânzare rapidă, cu
            preț de exit și informații clare pentru luarea unei decizii.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Ce găsești pe Quick Exit</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Active auto listate pentru exit rapid.</li>
            <li>Imobiliare și proprietăți cu vânzare accelerată.</li>
            <li>Business-uri aflate în proces de exit.</li>
            <li>Bunuri de lux și active cu piață de nișă.</li>
            <li>Gadgets și echipamente cu preț orientat spre lichiditate.</li>
            <li>Oportunități unde vânzătorul caută capital într-un interval scurt.</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Cum funcționează pentru cumpărători</h2>
          <ol className="mt-6 list-decimal space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Explorezi anunțuri active din categoriile relevante.</li>
            <li>Compari prețul de exit cu estimarea de piață afișată în contextul anunțului.</li>
            <li>Trimiți ofertă direct prin platformă.</li>
            <li>Discuți cu vânzătorul după ce există interes real de tranzacție.</li>
            <li>Folosești fluxurile de verificare/KYC unde acestea sunt disponibile în proces.</li>
          </ol>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Ce înseamnă preț de exit</h2>
          <p className="mt-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            Prețul de exit este un preț orientat spre vânzare rapidă, setat pentru a crește șansa de închidere într-un
            timp mai scurt. Nu reprezintă garanție de profit pentru cumpărător și trebuie analizat independent, în
            funcție de riscul, costurile și contextul fiecărei tranzacții.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Pentru cine este util</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Investitori care caută deal flow relevant.</li>
            <li>Cumpărători orientați spre oportunități de preț.</li>
            <li>Deal hunters care compară activ mai multe opțiuni.</li>
            <li>Antreprenori interesați de achiziții strategice rapide.</li>
            <li>Persoane sau companii cu capital disponibil pentru tranzacții.</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight md:text-3xl">Următorii pași</h2>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/capital-disponibil"
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-black bg-[#FFD100] px-6 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#fff] transition hover:brightness-105"
            >
              Vezi active disponibile
            </Link>
            <Link
              href="/posteaza-cerere"
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-white bg-transparent px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
            >
              Publică o cerere de cumpărare
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
