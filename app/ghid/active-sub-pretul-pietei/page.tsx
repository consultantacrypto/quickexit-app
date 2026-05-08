import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Active sub prețul pieței | Ghid pentru cumpărători",
  description:
    "Activele sub prețul pieței pot apărea când vânzătorii caută lichiditate rapidă. Află cum să le analizezi prudent pe Quick Exit.",
  path: "/ghid/active-sub-pretul-pietei",
});

export default function ActiveSubPretGuidePage() {
  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-24 pt-20 font-sans text-black antialiased md:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
            Ghid answer-first
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            Active sub prețul pieței: ce înseamnă și cum le analizezi
          </h1>
          <p className="mt-6 max-w-4xl text-sm font-medium leading-relaxed text-neutral-200 md:text-base">
            Un activ sub prețul pieței este un activ listat la un preț mai mic decât o estimare orientativă de piață.
            Diferența poate reflecta nevoia de lichiditate rapidă, urgența vânzătorului, starea activului sau alți
            factori care trebuie verificați înainte de cumpărare.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Ce înseamnă “sub prețul pieței”</h2>
          <p className="mt-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            În practică, “prețul pieței” este o estimare orientativă bazată pe comparabile și context. Un preț sub această
            estimare nu înseamnă automat “oportunitate garantată”. Este un semnal care trebuie analizat împreună cu
            riscurile, costurile și timpul necesar pentru tranzacție.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">De ce apar astfel de oportunități</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Vânzătorul prioritizează timpul (lichiditate) în locul prețului maxim.</li>
            <li>Există costuri de deținere care cresc presiunea (rate, taxe, întreținere).</li>
            <li>Activul are particularități (stare, documente, istorice) care reduc cererea.</li>
            <li>Contextul pieței s-a schimbat (sezonalitate, cerere, condiții macro).</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Ce riscuri trebuie verificate</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Starea activului și costurile de remediere (tehnic/funcțional).</li>
            <li>Documente, drepturi, istorice și risc juridic (unde este relevant).</li>
            <li>Costuri totale: taxe, transfer, reparații, timp, finanțare.</li>
            <li>Comparabile independente și scenarii (optimist/realist/pesimist).</li>
          </ul>
          <p className="mt-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            Quick Exit poate ajuta cu contextul de preț și fluxul de ofertare, dar verificarea independentă rămâne
            responsabilitatea cumpărătorului.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Exemple de categorii</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Auto: kilometraj, istoric, mentenanță, piață locală.</li>
            <li>Imobiliare: acte, status juridic, necesar de renovare, lichiditate zonă.</li>
            <li>Business: venituri, costuri, contracte, dependență de fondator.</li>
            <li>Lux: autenticitate, proveniență, piață de revânzare.</li>
            <li>Gadgets/echipamente: uzură, garanție, compatibilitate, cost de service.</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">
            Cum folosești Quick Exit ca buyer/investitor
          </h2>
          <ol className="mt-6 list-decimal space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Explorezi anunțurile active și compari prețul de exit cu estimarea orientativă.</li>
            <li>Îți alegi un prag de risc și criterii (timp, buget, costuri totale).</li>
            <li>Trimiți ofertă și discuți detaliile relevante înainte de a decide.</li>
            <li>Folosești fluxurile de verificare/KYC unde sunt disponibile.</li>
          </ol>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">
            Întrebări frecvente despre active sub prețul pieței
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Ce înseamnă activ sub prețul pieței?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Înseamnă un activ listat la un preț mai mic decât o estimare orientativă de piață. Diferența poate
                reflecta nevoia de lichiditate, starea activului sau alte condiții care trebuie verificate.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">De ce ar vinde cineva sub prețul pieței?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Unii vânzători acceptă un discount pentru viteză, lichiditate rapidă, simplificarea procesului sau pentru
                a atrage mai repede cumpărători serioși.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">
                Este orice activ cu discount o oportunitate bună?
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Nu. Un discount poate fi atractiv, dar trebuie analizate documentele, starea activului, costurile
                ascunse, cererea reală și riscurile tranzacției.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Ce ar trebui să verific înainte să cumpăr?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Verifică proprietatea, documentele, starea tehnică sau juridică, costurile suplimentare, istoricul
                activului și prețuri comparabile din piață.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Quick Exit garantează calitatea activelor?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Nu trebuie presupusă o garanție completă. Quick Exit ajută la listare, descoperire și structurarea
                informației, dar cumpărătorii trebuie să facă propriul proces de verificare.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight md:text-3xl">Următorii pași</h2>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/pentru-investitori"
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-black bg-[#FFD100] px-6 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#fff] transition hover:brightness-105"
            >
              Pentru investitori
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-white bg-transparent px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
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

