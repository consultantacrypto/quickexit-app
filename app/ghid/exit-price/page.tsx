import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Ce este prețul de exit | Ghid Quick Exit",
  description:
    "Prețul de exit este un preț orientat spre vânzare rapidă, folosit când proprietarul acceptă un discount față de piață pentru lichiditate mai rapidă.",
  path: "/ghid/exit-price",
});

export default function ExitPriceGuidePage() {
  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-24 pt-20 font-sans text-black antialiased md:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
            Ghid answer-first
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            Ce este prețul de exit?
          </h1>
          <p className="mt-6 max-w-4xl text-sm font-medium leading-relaxed text-neutral-200 md:text-base">
            Prețul de exit este prețul la care un vânzător este dispus să listeze un activ pentru o vânzare mai rapidă.
            De obicei, este sub o estimare orientativă de piață, dar nu garantează vânzarea și nu garantează profit
            pentru cumpărător.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Preț de exit vs preț de piață</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>
              <strong>Prețul de piață</strong> este o estimare orientativă bazată pe comparabile și context (nu o garanție
              de vânzare).
            </li>
            <li>
              <strong>Prețul de exit</strong> este o alegere de strategie: un preț mai “agresiv” pentru lichiditate mai
              rapidă.
            </li>
            <li>Diferența dintre ele poate reflecta timpul, urgența, riscul și costurile pe care le acceptă vânzătorul.</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">De ce aleg vânzătorii un preț de exit</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Au nevoie de lichiditate într-un interval scurt.</li>
            <li>Vor să reducă timpul de expunere și negociere.</li>
            <li>Preferă certitudinea procesului (mai multe oferte) în locul unui preț maxim teoretic.</li>
            <li>Activele pot avea costuri de deținere (taxe, rate, întreținere) care fac timpul scump.</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Cum se calculează orientativ</h2>
          <p className="mt-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            Nu există o formulă universală. În practică, vânzătorii pornesc de la o estimare orientativă de piață și
            ajustează în funcție de viteză, cerere, starea activului și riscuri. În Quick Exit, evaluările și scorurile
            sunt orientative și nu înlocuiesc analiza ta sau consultanța profesională, unde este cazul.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Ce trebuie să verifice cumpărătorii</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Starea reală a activului (tehnic/juridic), nu doar prețul.</li>
            <li>Documente, istorice, costuri viitoare și timpul de tranzacționare.</li>
            <li>De ce există discount față de piață (urgență vs defecte vs risc).</li>
            <li>Comparații independente cu oferte similare (comparabile).</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Cum folosește Quick Exit acest concept</h2>
          <p className="mt-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            Quick Exit organizează anunțurile în jurul ideii de lichiditate: preț de exit, context de piață și pași clari
            pentru a trimite o ofertă. Platforma facilitează contactul prin mecanisme de ofertare și poate folosi
            verificări/KYC acolo unde fluxurile sunt disponibile.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight md:text-3xl">Următorii pași</h2>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/evaluare"
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-black bg-[#FFD100] px-6 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#fff] transition hover:brightness-105"
            >
              Evaluează un activ
            </Link>
            <Link
              href="/pune-anunt"
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-white bg-transparent px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
            >
              Publică anunț
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-white bg-transparent px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
            >
              Vezi active disponibile
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

