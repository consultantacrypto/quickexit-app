import AdCard from "./components/AdCard";
import DemandCard from "./components/DemandCard"; // Am adus componenta Tanc pentru investitori
import Link from "next/link";
import type { Metadata } from "next";
import TrackedLink from "./components/TrackedLink";
import GlobalStats from "./components/GlobalStats";
import { supabase } from "@/lib/supabase"; 
import { buildPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";
// IMPORT GLOBAL NOU
import { normalizeSaleType } from "@/utils/normalizeSaleType";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = buildPageMetadata({
  title: "Quick Exit | Platformă de lichiditate rapidă pentru active",
  description:
    "Quick Exit conectează vânzătorii care vor lichiditate rapidă cu cumpărători și investitori pregătiți pentru achiziții.",
  path: "/",
});

export default async function Home() {
  const siteUrl = getSiteUrl();

  // FETCH DATE REALE - FILTRARE SEED ACTIVATĂ + LIMITA 9
  const { data: realListings } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('is_seed', false)
    .order('created_at', { ascending: false })
    .limit(48);

  const { data: realDemands } = await supabase
    .from('demands')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(9);

  // Anunțuri cu strategie auction (licitație deschisă) vs. celelalte
  const auctionsHome = (
    realListings?.filter((item) => normalizeSaleType(item.sale_strategy) === "auction") ?? []
  ).slice(0, 4);
  const standardListings = (
    realListings?.filter((item) => normalizeSaleType(item.sale_strategy) !== "auction") ?? []
  ).slice(0, 9);
  const itemListElements = standardListings
    .filter((item) => {
      const id = typeof item?.id === "string" ? item.id.trim() : "";
      const title = typeof item?.title === "string" ? item.title.trim() : "";
      const statusOk = item?.status == null || item.status === "active";
      const seedOk = item?.is_seed == null || item.is_seed === false;
      return Boolean(id) && Boolean(title) && statusOk && seedOk;
    })
    .slice(0, 20)
    .map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteUrl}/anunt/${String(item.id).trim()}`,
      name: String(item.title).trim(),
    }));
  const itemListJsonLd =
    itemListElements.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: itemListElements,
        }
      : null;

  const categories = [
    { 
      name: "Auto & Moto", 
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>
      ), 
      slug: 'auto' 
    },
    { 
      name: "Imobiliare", 
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14"><path d="M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2z"/></svg>
      ), 
      slug: 'imobiliare' 
    },
    { 
      name: "Lux & Ceasuri", 
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8z" /><path d="M12.5 7H11v6l5.25 3.15l.75-1.23l-4.5-2.67z" /></svg>
      ), 
      slug: 'lux' 
    },
    { 
      name: "Afaceri de vânzare", 
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" /></svg>
      ), 
      slug: 'business' 
    },
    { 
      name: "Gadgets", 
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14"><path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-5 21c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2zm5-5H7V5h10v12z" /></svg>
      ), 
      slug: 'gadgets' 
    },
    { 
      name: "Foto & Audio", 
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 md:w-14 md:h-14"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5z" /><path d="M12 17c1.65 0 3-1.35 3-3s-1.35-3-3-3s-3 1.35-3 3s1.35 3 3 3z" /></svg>
      ), 
      slug: 'foto' 
    },
  ];

  return (
    <div className="flex flex-col w-full bg-white selection:bg-[#FFD100] selection:text-black font-sans">
      {itemListJsonLd && (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
          type="application/ld+json"
        />
      )}
      
      {/* HERO + pachete (primul ecran) */}
      <section className="relative overflow-hidden bg-white pb-10 pt-16 text-center md:pb-14 md:pt-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-8 font-black uppercase italic tracking-tighter text-black md:mb-10">
              <span className="block text-6xl leading-[0.9] sm:text-7xl md:text-8xl md:leading-[0.85] lg:text-9xl">
                Vinde <span className="text-[#FFD100]">Acum</span>.
              </span>
              <span className="mt-1 block text-6xl leading-[0.9] sm:mt-0 sm:text-7xl md:text-8xl md:leading-[0.85] lg:text-9xl">
                Banii <span className="text-gray-200">Azi</span>.
              </span>
            </h1>

            <div className="mx-auto mb-8 max-w-2xl px-1 md:mb-10">
              <p className="text-sm font-bold leading-relaxed md:text-base lg:text-lg">
                <span className="bg-[#FFD100] px-2 py-1 text-black box-decoration-clone">
                  Quick Exit conectează vânzători care vor să vândă rapid cu cumpărători care au buget și caută
                  oportunități sub prețul pieței.
                </span>
              </p>
            </div>

            <div className="mb-6 flex flex-col items-center md:mb-8">
              <TrackedLink
                href="/evaluare"
                eventName="click_evaluate"
                eventParams={{ source: "home_hero" }}
                className="group relative bg-black px-10 py-8 text-[#FFD100] rounded-[2.5rem] font-black uppercase tracking-widest transition-all border-b-8 border-yellow-700 active:border-b-0 active:translate-y-2 hover:scale-[1.02] shadow-[0_15px_40px_rgba(255,209,0,0.2)] hover:shadow-[0_25px_50px_rgba(255,209,0,0.35)] overflow-hidden md:px-16 md:py-10 max-w-[min(100vw-2rem,36rem)] inline-flex flex-col items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD100]"
              >
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-white/10 skew-x-[-25deg] group-hover:left-[150%] transition-all duration-1000 ease-in-out" />
                <span className="relative z-10 block text-center text-2xl md:text-3xl lg:text-4xl italic uppercase leading-none">
                  Cât valorează ce vinzi?
                </span>
              </TrackedLink>
              <TrackedLink
                href="/capital-disponibil"
                eventName="click_capital_available"
                eventParams={{ source: "home_hero" }}
                className="mt-4 inline-block border-b-2 border-transparent text-[10px] font-black uppercase tracking-widest text-neutral-600 underline-offset-4 transition hover:border-black hover:text-black md:text-[11px]"
              >
                Vezi cereri de cumpărare
              </TrackedLink>
            </div>
          </div>

          <div className="mt-2 md:mt-4">
            <div className="mb-6 text-center md:mb-8">
              <h2 className="text-lg font-black uppercase italic tracking-tight text-black md:text-2xl">
                Alege ritmul de vânzare
              </h2>
            </div>

            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 lg:gap-5">
              {(
                [
                  {
                    label: "Licitație deschisă 30 zile",
                    desc: "Pentru vânzări unde vrei să strângi mai multe oferte și să alegi manual varianta potrivită.",
                    time: "30 zile",
                    price: "111 RON",
                  },
                  {
                    label: "Expunere maximă",
                    desc: "Pentru anunțuri care au nevoie de mai mult timp la vedere.",
                    time: "30 zile",
                    price: "99 RON",
                  },
                  {
                    label: "Vânzare rapidă",
                    desc: "Pentru listări echilibrate între timp, cost și vizibilitate.",
                    time: "14 zile",
                    price: "79 RON",
                  },
                  {
                    label: "Vânzare urgentă",
                    desc: "Pentru situații în care vrei răspuns rapid.",
                    time: "48 ore",
                    price: "48 RON",
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-0.5 md:p-5"
                >
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-500 md:text-[11px]">
                    {item.label}
                  </p>
                  <p className="text-base font-black uppercase italic leading-none md:text-lg lg:text-xl">
                    {item.time}
                  </p>
                  <p className="mt-2 inline-block rounded bg-black px-2 py-0.5 text-[11px] font-black uppercase tracking-tighter text-[#FFD100] md:text-[11px]">
                    {item.price}
                  </p>
                  <p className="mt-2 block text-[10px] font-bold uppercase tracking-tighter text-neutral-500 opacity-90 md:text-[11px]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white py-12 md:py-14">
        <div className="mx-auto max-w-6xl px-4 text-center md:text-left">
          <h2 className="mb-10 inline-block border-b-[6px] border-[#FFD100] pb-3 text-sm font-black uppercase italic tracking-[0.35em] text-black md:mb-12 md:text-lg">
            Alege Categoria
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categorii/${cat.slug}`}
                className="group flex flex-col items-center justify-center rounded-[2rem] border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:-translate-y-1 hover:bg-[#FFD100] md:p-8"
              >
                <div className="mb-3 text-black transition-transform group-hover:scale-110 md:mb-4">{cat.icon}</div>
                <span className="text-center text-[10px] font-black uppercase tracking-tight text-black md:text-[11px]">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ANUNȚURI VÂNZĂRI ACTIVE */}
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b-[3px] border-black pb-8 gap-4">
                <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
                  Anunțuri <span className="text-[#FFD100]">Vânzări Active</span>
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <TrackedLink href="/pune-anunt" eventName="click_post_listing" eventParams={{ source: "home_listings_section" }} className="bg-black text-[#FFD100] px-5 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest italic hover:bg-[#FFD100] hover:text-black transition-colors border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                    + Pune Anunț
                  </TrackedLink>
                  <Link href="/categorii/auto" className="text-[10px] md:text-xs font-black uppercase tracking-widest italic hover:text-[#FFD100] transition-colors border-b-2 border-transparent hover:border-[#FFD100] py-2">
                    Vezi toate anunțurile →
                  </Link>
                </div>
            </div>
            <p className="-mt-10 mb-10 max-w-2xl text-[10px] font-semibold leading-relaxed text-neutral-600 md:-mt-12 md:mb-12 md:text-[11px]">
              Poți naviga fără cont. Pentru publicare, trimitere oferte și Camera de Negociere ai nevoie de un cont
              simplu.
            </p>
    
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                {standardListings && standardListings.length > 0 ? (
                  standardListings.slice(0, 9).map((item) => (
                    <AdCard 
                      key={item.id}
                      id={item.id}
                      title={item.title}
                      image={item.images?.[0] || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"}
                      marketPrice={`€${item.market_price.toLocaleString('ro-RO')}`}
                      exitPrice={`€${item.exit_price.toLocaleString('ro-RO')}`}
                      discount={item.discount?.toString() || "0"}
                      score={item.deal_score ? item.deal_score / 10 : 9.0} 
                      type={normalizeSaleType(item.sale_strategy)}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center border-[3px] border-dashed border-gray-300 rounded-[2rem] bg-white">
                    <p className="font-black uppercase italic text-gray-400">Momentan terminalul scanează noi active...</p>
                  </div>
                )}
            </div>
        </div>
      </section>

      {/* CAPITAL DISPONIBIL */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 border-b-[3px] border-black pb-8">
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-4">
                  <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
                    Capital <span className="text-black underline decoration-[#FFD100] decoration-[6px]">Disponibil</span>
                  </h2>
                  {/* Butonul tău de oferte cumpărare din Home */}
                  <TrackedLink href="/capital-disponibil" eventName="click_capital_available" eventParams={{ source: "home_capital_section" }} className="text-[10px] md:text-xs font-black uppercase tracking-widest italic hover:text-[#FFD100] transition-colors border-b-2 border-transparent hover:border-[#FFD100] py-2 whitespace-nowrap">
                    Vezi toate cererile →
                  </TrackedLink>
              </div>
              <p className="text-sm md:text-base font-bold text-gray-500 uppercase italic">
                Cereri publicate de cumpărători cu buget comunicat în anunț — verifică detaliile direct cu fiecare
                ofertant.
              </p>
            </div>
    
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                {realDemands && realDemands.length > 0 ? (
                  realDemands.slice(0, 9).map((demand) => (
                    <DemandCard 
                      key={demand.id}
                      id={demand.id}
                      targetAsset={demand.target_asset}
                      category={demand.category}
                      budget={demand.budget?.toLocaleString('ro-RO')}
                      description={demand.description}
                    />
                  ))
                ) : (
                  <div className="col-span-full py-16 text-center bg-gray-50 border-[3px] border-dashed border-gray-300 rounded-[2rem]">
                    <p className="font-black uppercase italic text-gray-400">Nicio cerere de capital înregistrată momentan.</p>
                  </div>
                )}
            </div>
        </div>
      </section>

      <section className="border-t-[3px] border-black bg-[#fafafa] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 border-b-[3px] border-black pb-6 md:mb-10 md:pb-8">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter md:text-4xl">
              Licitații <span className="text-[#FFD100] underline decoration-black decoration-[5px]">deschise</span>
            </h2>
            <p className="mt-3 max-w-2xl text-xs font-semibold uppercase tracking-widest text-neutral-700 md:text-[11px]">
              Active cu fereastră de ofertare până la 30 de zile. Vânzătorul alege manual oferta potrivită.
            </p>
            <p className="mt-2 max-w-2xl text-[10px] font-bold uppercase tracking-wide text-neutral-500 md:text-[10px]">
              Nu există câștigător automat. Plata și predarea se stabilesc direct între părți.
            </p>
          </div>

          {auctionsHome.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {auctionsHome.map((item) => (
                <AdCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  image={
                    item.images?.[0] ||
                    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                  }
                  marketPrice={`€${item.market_price.toLocaleString("ro-RO")}`}
                  exitPrice={`€${item.exit_price.toLocaleString("ro-RO")}`}
                  discount={item.discount?.toString() || "0"}
                  score={item.deal_score ? item.deal_score / 10 : 9.5}
                  type="auction"
                  offerCount={item.offer_count}
                  highestOffer={item.highest_offer}
                  expiresAt={item.expires_at}
                />
              ))}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)] md:p-6">
              <h3 className="text-base font-black uppercase italic tracking-tight text-black md:text-lg">
                Momentan nu există licitații active
              </h3>
              <p className="mt-3 text-xs font-medium leading-relaxed text-neutral-700 md:text-sm">
                Licitațiile deschise permit vânzătorilor să primească oferte timp de până la 30 de zile și să aleagă
                manual oferta potrivită.
              </p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-neutral-600">
                Nu există câștigător automat. Plata și predarea se stabilesc direct între părți.
              </p>
              <Link
                href="/pune-anunt"
                className="mt-4 inline-flex items-center justify-center border-[3px] border-black bg-[#FFD100] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-black hover:text-[#FFD100] md:text-xs"
              >
                Publică o licitație
              </Link>
            </div>
          )}
        </div>
      </section>

      <GlobalStats />

      <section className="bg-black pb-8 pt-2 md:pb-10 md:pt-3">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-5xl rounded-2xl border border-[#FFD100]/35 bg-neutral-950 px-4 py-4 text-left shadow-[0_0_0_1px_rgba(255,209,0,0.08)] md:px-6 md:py-5">
            <h3 className="text-[11px] font-black uppercase tracking-wide text-[#FFD100] md:text-xs">
              Recomandări pentru tranzacții sigure
            </h3>
            <p className="mt-2 text-[10px] font-medium leading-relaxed text-neutral-200 md:text-[11px]">
              Quick Exit nu procesează plata și nu ține fonduri în custodie. Înainte de plată sau predare, verifică
              activul, actele și identitatea celeilalte părți.
            </p>
            <ul className="mt-3 grid gap-2 text-[10px] font-medium leading-relaxed text-neutral-300 md:grid-cols-3 md:gap-3 md:text-[11px]">
              <li className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                Nu plăti avans fără verificări.
              </li>
              <li className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                Pentru sume mari, folosește contract și consultanță de specialitate.
              </li>
              <li className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
                Nu introduce datele cardului în linkuri primite de la alți utilizatori.
              </li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}