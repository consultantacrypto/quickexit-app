import Link from "next/link";
import type { Metadata } from "next";
import { PAGE_METADATA_COPY } from "@/lib/pageMetadataCopy";
import { buildPageMetadata, resolvePageLocale } from "@/lib/seo";
import TrackedLink from "@/app/components/TrackedLink";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const loc = resolvePageLocale(locale);
  const copy = PAGE_METADATA_COPY.pentruVanzatori[loc];

  return buildPageMetadata({
    locale: loc,
    title: copy.title,
    description: copy.description,
    path: "/pentru-vanzatori",
  });
}

export default function PentruVanzatoriPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Pentru ce tip de vânzători este Quick Exit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Quick Exit este pentru proprietari care vor să listeze rapid active precum mașini, imobiliare, business-uri, bunuri de lux sau echipamente și să atragă cumpărători interesați.",
        },
      },
      {
        "@type": "Question",
        name: "Trebuie să vând sub prețul pieței?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nu obligatoriu. Totuși, un preț de exit este de obicei ales pentru a crește viteza de vânzare și poate fi sub o estimare orientativă de piață.",
        },
      },
      {
        "@type": "Question",
        name: "Quick Exit garantează că voi vinde activul?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Nu. Platforma poate ajuta la listare, vizibilitate și structurarea informației, dar vânzarea depinde de cerere, preț, calitatea activului și negociere.",
        },
      },
      {
        "@type": "Question",
        name: "Cum încep?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Poți începe cu o evaluare orientativă, apoi alegi un preț de exit și publici un anunț prin fluxul de listare.",
        },
      },
      {
        "@type": "Question",
        name: "Pot primi oferte de la cumpărători?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Da, după publicarea și activarea anunțului, cumpărătorii interesați pot trimite oferte prin platformă.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-24 pt-20 font-sans text-black antialiased md:px-8">
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        type="application/ld+json"
      />
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">
            Ghid pentru vânzători
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-tight md:text-5xl">
            Pentru vânzători care vor lichiditate rapidă
          </h1>
          <p className="mt-6 max-w-4xl text-sm font-medium leading-relaxed text-neutral-200 md:text-base">
            Quick Exit ajută proprietarii să listeze active pentru vânzare rapidă, cu preț de exit, prezentare clară și
            acces la cumpărători interesați.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Când are sens Quick Exit</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Ai nevoie de lichiditate într-un interval de timp mai scurt.</li>
            <li>Vrei să vinzi sub prețul pieței pentru viteză de execuție.</li>
            <li>Ai un activ dificil de vândut pe canale clasice.</li>
            <li>Vrei să testezi interesul cumpărătorilor în condiții reale de piață.</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Ce poți lista</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Mașini și alte active auto.</li>
            <li>Imobiliare și proprietăți.</li>
            <li>Business-uri și active comerciale.</li>
            <li>Bunuri de lux.</li>
            <li>Echipamente și gadgets.</li>
            <li>Alte active cu valoare clară și interes comercial.</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Cum funcționează pentru vânzători</h2>
          <ol className="mt-6 list-decimal space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Obții o evaluare orientativă pentru activ.</li>
            <li>Alegi prețul de exit potrivit obiectivului tău.</li>
            <li>Publici anunțul cu detalii și imagini relevante.</li>
            <li>Activezi listarea prin pachetul selectat.</li>
            <li>Primești oferte și analizezi opțiunile.</li>
            <li>Gestionezi discuțiile și pașii următori din dashboard.</li>
          </ol>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-[#FFF8E7] p-8 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Tranzacții între părți</h2>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-neutral-900 md:text-base">
            Quick Exit te ajută să primești oferte și să negociezi mai rapid. Finalizarea tranzacției se face direct
            între părți; platforma nu intermediază plata și nu reține fonduri pentru cumpărător sau vânzător.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Ce înseamnă preț de exit</h2>
          <p className="mt-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            Prețul de exit este un preț setat pentru vânzare mai rapidă și poate fi sub estimarea de piață. Este decizia
            vânzătorului, în funcție de obiectivul de timp și lichiditate, și nu reprezintă o garanție de vânzare.
          </p>
          <p className="mt-4 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            Pentru explicația completă, vezi ghidul{" "}
            <TrackedLink
              href="/ghid/exit-price"
              eventName="click_seller_exit_price_guide"
              eventParams={{ source: "pentru-vanzatori", destination: "/ghid/exit-price" }}
              className="font-bold text-black underline decoration-[#FFD100] decoration-2 underline-offset-2 hover:text-neutral-700"
            >
              Ce este prețul de exit
            </TrackedLink>
            .
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Întrebări frecvente pentru vânzători</h2>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Pentru ce tip de vânzători este Quick Exit?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Quick Exit este pentru proprietari care vor să listeze rapid active precum mașini, imobiliare,
                business-uri, bunuri de lux sau echipamente și să atragă cumpărători interesați.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Trebuie să vând sub prețul pieței?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Nu obligatoriu. Totuși, un preț de exit este de obicei ales pentru a crește viteza de vânzare și poate fi
                sub o estimare orientativă de piață.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">
                Quick Exit garantează că voi vinde activul?
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Nu. Platforma poate ajuta la listare, vizibilitate și structurarea informației, dar vânzarea depinde de
                cerere, preț, calitatea activului și negociere.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Cum încep?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Poți începe cu o evaluare orientativă, apoi alegi un preț de exit și publici un anunț prin fluxul de
                listare.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Pot primi oferte de la cumpărători?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Da, după publicarea și activarea anunțului, cumpărătorii interesați pot trimite oferte prin platformă.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight md:text-3xl">Începe acum</h2>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink
              href="/evaluare"
              eventName="click_seller_evaluate_asset"
              eventParams={{ source: "pentru-vanzatori", destination: "/evaluare" }}
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-black bg-[#FFD100] px-6 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#fff] transition hover:brightness-105"
            >
              Evaluează un activ
            </TrackedLink>
            <TrackedLink
              href="/pune-anunt"
              eventName="click_seller_post_listing"
              eventParams={{ source: "pentru-vanzatori", destination: "/pune-anunt" }}
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-white bg-transparent px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
            >
              Publică anunț
            </TrackedLink>
            <TrackedLink
              href="/tarife"
              eventName="click_seller_view_pricing"
              eventParams={{ source: "pentru-vanzatori", destination: "/tarife" }}
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-white bg-transparent px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
            >
              Vezi tarife
            </TrackedLink>
          </div>
        </section>
      </div>
    </div>
  );
}
