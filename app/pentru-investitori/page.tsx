import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import TrackedLink from "@/app/components/TrackedLink";

export const metadata: Metadata = buildPageMetadata({
  title: "Pentru investitori | Active sub prețul pieței pe Quick Exit",
  description:
    "Descoperă active listate cu preț de exit pe Quick Exit: mașini, business-uri, imobiliare, bunuri de lux și oportunități pentru cumpărători cu capital disponibil.",
  path: "/pentru-investitori",
});

export default function PentruInvestitoriPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Pentru ce tip de cumpărători este Quick Exit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Quick Exit este util pentru cumpărători, investitori și antreprenori care caută active listate pentru vânzare rapidă, cu informații clare și preț de exit.",
        },
      },
      {
        "@type": "Question",
        name: "Pot găsi active sub prețul pieței?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Da, unele active pot fi listate cu discount față de o estimare orientativă de piață, dar discountul nu garantează profit sau calitatea activului.",
        },
      },
      {
        "@type": "Question",
        name: "Cum trimit o ofertă?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Poți explora anunțurile active, analiza informațiile disponibile și trimite o ofertă prin pagina anunțului sau prin fluxurile disponibile în platformă.",
        },
      },
      {
        "@type": "Question",
        name: "Pot publica o cerere de cumpărare?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Da. Dacă ai capital disponibil sau cauți un anumit tip de activ, poți publica o cerere de cumpărare prin pagina dedicată.",
        },
      },
      {
        "@type": "Question",
        name: "Trebuie să fac verificări independente?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Da. Înainte de orice tranzacție, cumpărătorii ar trebui să verifice documentele, starea activului, riscurile și costurile suplimentare.",
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
            <li>Active auto listate pentru vânzare rapidă.</li>
            <li>Imobiliare și proprietăți cu vânzare accelerată.</li>
            <li>Business-uri aflate în proces de vânzare urgentă.</li>
            <li>Bunuri de lux și active cu piață de nișă.</li>
            <li>Electronice și gadgeturi cu preț orientat spre lichiditate.</li>
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

        <section className="rounded-[2rem] border-[3px] border-black bg-[#FFF8E7] p-8 shadow-[6px_6px_0_0_rgba(0,0,0,0.85)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Tranzacții între părți</h2>
          <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-neutral-900 md:text-base">
            Quick Exit te ajută să descoperi active și cereri relevante. Verificarea finală și plata se stabilesc
            direct între părți; platforma nu reține sume între utilizatori pentru finalizarea tranzacției.
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Ce înseamnă preț de exit</h2>
          <p className="mt-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            Prețul de exit este un preț orientat spre vânzare rapidă, setat pentru a crește șansa de închidere într-un
            timp mai scurt. Nu reprezintă garanție de profit pentru cumpărător și trebuie analizat independent, în
            funcție de riscul, costurile și contextul fiecărei tranzacții.
          </p>
          <p className="mt-4 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            Dacă vrei o explicație mai detaliată, vezi ghidul{" "}
            <TrackedLink
              href="/ghid/active-sub-pretul-pietei"
              eventName="click_investor_below_market_guide"
              eventParams={{ source: "pentru-investitori", destination: "/ghid/active-sub-pretul-pietei" }}
              className="font-bold text-black underline decoration-[#FFD100] decoration-2 underline-offset-2 hover:text-neutral-700"
            >
              Active sub prețul pieței
            </TrackedLink>
            .
          </p>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">Pentru cine este util</h2>
          <ul className="mt-6 list-disc space-y-3 pl-6 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            <li>Investitori care caută un flux relevant de oportunități.</li>
            <li>Cumpărători orientați spre oportunități de preț.</li>
            <li>Cumpărători care compară mai multe opțiuni.</li>
            <li>Antreprenori interesați de achiziții strategice rapide.</li>
            <li>Persoane sau companii cu capital disponibil pentru tranzacții.</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight">
            Întrebări frecvente pentru investitori și cumpărători
          </h2>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">
                Pentru ce tip de cumpărători este Quick Exit?
              </h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Quick Exit este util pentru cumpărători, investitori și antreprenori care caută active listate pentru
                vânzare rapidă, cu informații clare și preț de exit.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Pot găsi active sub prețul pieței?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Da, unele active pot fi listate cu discount față de o estimare orientativă de piață, dar discountul nu
                garantează profit sau calitatea activului.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Cum trimit o ofertă?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Poți explora anunțurile active, analiza informațiile disponibile și trimite o ofertă prin pagina anunțului
                sau prin fluxurile disponibile în platformă.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Pot publica o cerere de cumpărare?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Da. Dacă ai capital disponibil sau cauți un anumit tip de activ, poți publica o cerere de cumpărare prin
                pagina dedicată.
              </p>
            </div>

            <div>
              <h3 className="text-base font-black tracking-tight md:text-lg">Trebuie să fac verificări independente?</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
                Da. Înainte de orice tranzacție, cumpărătorii ar trebui să verifice documentele, starea activului,
                riscurile și costurile suplimentare.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-10">
          <h2 className="text-2xl font-black uppercase italic tracking-tight md:text-3xl">Următorii pași</h2>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <TrackedLink
              href="/capital-disponibil"
              eventName="click_investor_view_assets"
              eventParams={{ source: "pentru-investitori", destination: "/capital-disponibil" }}
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-black bg-[#FFD100] px-6 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#fff] transition hover:brightness-105"
            >
              Vezi active disponibile
            </TrackedLink>
            <TrackedLink
              href="/posteaza-cerere"
              eventName="click_investor_post_demand"
              eventParams={{ source: "pentru-investitori", destination: "/posteaza-cerere" }}
              className="inline-flex items-center justify-center rounded-xl border-[3px] border-white bg-transparent px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
            >
              Publică o cerere de cumpărare
            </TrackedLink>
          </div>
        </section>
      </div>
    </div>
  );
}
