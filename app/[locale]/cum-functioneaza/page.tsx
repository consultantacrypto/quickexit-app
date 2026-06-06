import { Link } from "@/src/i18n/navigation";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Cum functioneaza",
  description:
    "Vezi pas cu pas cum functioneaza Quick Exit pentru vanzatori si cumparatori, de la evaluare la tranzactie.",
  path: "/cum-functioneaza",
});

function StepCard({
  index,
  title,
  body,
}: {
  index: number;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.08)] transition hover:border-[#FFD100] hover:shadow-[8px_8px_0_0_rgba(255,209,0,0.75)] md:p-8 md:shadow-[10px_10px_0_0_#FFD100]/40">
      <span className="text-4xl font-black italic leading-none text-[#FFD100] md:text-5xl">{index}</span>
      <h3 className="mt-4 text-base font-black uppercase italic tracking-tight text-black md:text-lg">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-700">{body}</p>
    </div>
  );
}

function WhyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC]/60 p-6 md:rounded-[2rem] md:p-8">
      <h3 className="text-sm font-black uppercase italic tracking-tight text-black md:text-base">{title}</h3>
      <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-700">{body}</p>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <div className="mx-auto max-w-7xl space-y-12 md:space-y-16">
        {/* Hero */}
        <div className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
              Cum funcționează
            </p>
            <h1 className="mt-5 text-3xl font-black uppercase italic leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              Transformi un activ în lichiditate{" "}
              <span className="text-[#FFD100]">mai rapid</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300 md:text-base">
              Quick Exit combină evaluarea de piață, listarea rapidă și cumpărătorii cu capital disponibil într-un singur
              flux.
            </p>
          </div>
          <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/evaluare"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border-[3px] border-black bg-[#FFD100] px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_#000] transition hover:brightness-105 sm:flex-initial"
            >
              Evaluează ce vinzi
            </Link>
            <Link
              href="/pune-anunt"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border-[3px] border-white bg-transparent px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black sm:flex-initial"
            >
              Publică anunț
            </Link>
          </div>
        </div>

        {/* Flux vânzători */}
        <section>
          <h2 className="mb-2 text-2xl font-black uppercase italic tracking-tighter text-black md:text-3xl">
            Fluxul pentru <span className="text-[#FFD100]">vânzători</span>
          </h2>
          <p className="mb-8 max-w-2xl text-sm font-medium text-neutral-600 md:text-base">
            De la estimare la oferte: pași clari, fără pași ascunși.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <StepCard
              index={1}
              title="Evaluezi activul"
              body="Introduci datele esențiale și primești o estimare orientativă de piață."
            />
            <StepCard
              index={2}
              title="Alegi viteza de vânzare"
              body="Selectezi pachetul potrivit: expunere, vânzare rapidă, urgență sau licitație deschisă 30 zile."
            />
            <StepCard
              index={3}
              title="Publici anunțul"
              body="După plată, anunțul devine vizibil pentru cumpărători."
            />
            <StepCard
              index={4}
              title="Primești oferte"
              body="Cumpărătorii interesați trimit oferte, iar tu decizi cu cine continui."
            />
          </div>
        </section>

        {/* Flux cumpărători */}
        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.1)] md:p-12 md:shadow-[14px_14px_0_0_#FFD100]">
          <h2 className="mb-2 text-2xl font-black uppercase italic tracking-tighter text-black md:text-3xl">
            Fluxul pentru <span className="text-[#FFD100]">cumpărători</span>
          </h2>
          <p className="mb-8 max-w-2xl text-sm font-medium text-neutral-600 md:text-base">
            Semnalezi ce cauți și bugetul maxim; vânzătorii te pot găsi în fluxul platformei.
          </p>
          <div className="grid gap-5 md:grid-cols-3 md:gap-6">
            <StepCard
              index={1}
              title="Publici cererea"
              body="Spui ce cauți și care este bugetul maxim."
            />
            <StepCard
              index={2}
              title="Devii vizibil pentru vânzători"
              body="Cererea ta apare în zona Capital disponibil."
            />
            <StepCard
              index={3}
              title="Primești propuneri"
              body="Vânzătorii cu active compatibile îți pot trimite oferte."
            />
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/posteaza-cerere"
              className="inline-flex w-full max-w-md items-center justify-center rounded-2xl border-[3px] border-black bg-[#FFD100] px-8 py-4 text-center text-xs font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_#000] transition hover:brightness-105"
            >
              Publică cerere de cumpărare
            </Link>
          </div>
        </section>

        {/* De ce diferit */}
        <section>
          <h2 className="mb-8 text-2xl font-black uppercase italic tracking-tighter text-black md:text-3xl">
            De ce Quick Exit este <span className="text-[#FFD100]">diferit</span>
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <WhyCard
              title="Nu este un simplu site de anunțuri"
              body="Platforma este gândită în jurul lichidității și al vitezei de tranzacție, nu doar al listării."
            />
            <WhyCard
              title="Prețurile sunt orientate spre lichiditate"
              body="Estimările și prețurile de vânzare rapidă reflectă o logică de exit, nu doar o listă statică."
            />
            <WhyCard
              title="Cumpărătorii pot semnala capital disponibil"
              body="Cererile de cumpărare ajută vânzătorii să vadă cerere reală pentru tipul de activ căutat."
            />
            <WhyCard
              title="Datele sensibile rămân protejate"
              body="Contactul se desfășoară prin mecanismele platformei, nu prin expunere publică necontrolată."
            />
          </div>
        </section>

        {/* Evaluare — discret juridic */}
        <section className="rounded-[2rem] border-2 border-black/20 bg-white/90 p-6 md:p-10">
          <h2 className="text-lg font-black uppercase italic tracking-tight text-neutral-800 md:text-xl">
            Ce înseamnă evaluarea
          </h2>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-neutral-600 md:text-[15px]">
            Estimarea este orientativă, bazată pe comparabile și semnale de piață. Nu este evaluare autorizată și nu
            garantează vânzarea. Rezultatul servește ca punct de plecare pentru decizia ta de listare sau negociere.
          </p>
        </section>

        {/* CTA final */}
        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-center text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <h2 className="text-2xl font-black uppercase italic tracking-tight md:text-3xl">Ai un activ de vândut?</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm font-medium text-neutral-300 md:text-base">
            Începe cu o evaluare. Apoi alegi dacă îl publici.
          </p>
          <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/evaluare"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border-[3px] border-black bg-[#FFD100] px-6 py-4 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#fff] transition hover:brightness-105"
            >
              Evaluează acum
            </Link>
            <Link
              href="/pune-anunt"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border-[3px] border-white bg-transparent px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
            >
              Publică anunț
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
