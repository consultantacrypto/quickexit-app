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

export const revalidate = 60;
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
    .select(
      'id,title,images,market_price,exit_price,discount,deal_score,sale_strategy,offer_count,highest_offer,expires_at,status,is_seed,created_at'
    )
    .eq('status', 'active')
    .eq('is_seed', false)
    .order('created_at', { ascending: false })
    .limit(48);

  const { data: realDemands } = await supabase
    .from('demands')
    .select('id,target_asset,category,budget,description,status,created_at')
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
    <div className="flex w-full flex-col bg-canvas font-sans text-ink selection:bg-gold selection:text-ink">
      {itemListJsonLd && (
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
          type="application/ld+json"
        />
      )}

      {/* HERO */}
      <section className="bg-canvas px-4 pb-14 pt-16 text-center md:pb-20 md:pt-24">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-black tracking-tighter text-ink">
            <span className="block text-5xl leading-[0.95] sm:text-6xl md:text-7xl lg:text-8xl">
              Vinde <span className="text-gold-deep">acum</span>.
            </span>
            <span className="mt-1 block text-5xl leading-[0.95] sm:text-6xl md:text-7xl lg:text-8xl">
              Banii <span className="text-gold-deep">azi</span>.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base font-medium leading-relaxed text-muted md:mt-8 md:text-lg">
            Quick Exit conectează vânzători care vor să vândă rapid cu cumpărători care au buget și
            caută oportunități sub prețul pieței.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4 md:mt-10">
            <TrackedLink
              href="/evaluare"
              eventName="click_evaluate"
              eventParams={{ source: "home_hero" }}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-ink px-10 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-all duration-300 hover:bg-ink-soft hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)] md:px-12 md:py-5 md:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              Cât valorează ce vinzi?
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </TrackedLink>
            <TrackedLink
              href="/capital-disponibil"
              eventName="click_capital_available"
              eventParams={{ source: "home_hero" }}
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted underline-offset-4 transition hover:text-ink hover:underline"
            >
              Vezi cereri de cumpărare
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* RITM DE VÂNZARE */}
      <section className="border-t border-line/60 bg-surface px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight text-ink md:mb-12 md:text-3xl">
            Alege ritmul de vânzare
          </h2>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                className="flex flex-col rounded-2xl border border-line/70 bg-surface p-6 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-neutral-300/80 hover:shadow-[0_22px_44px_-20px_rgba(0,0,0,0.2)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{item.time}</p>
                <p className="mt-3 flex-1 text-sm font-medium leading-relaxed text-muted">
                  {item.desc}
                </p>
                <p className="mt-5 text-sm font-semibold tracking-tight text-gold-deep">
                  {item.price}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORII */}
      <section className="border-t border-line/60 bg-canvas px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-2xl font-semibold tracking-tight text-ink md:mb-12 md:text-3xl">
            Alege categoria
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categorii/${cat.slug}`}
                className="group flex flex-col items-center justify-center gap-4 rounded-2xl border border-line/70 bg-surface p-8 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-neutral-300/80 hover:shadow-[0_22px_44px_-20px_rgba(0,0,0,0.2)]"
              >
                <div className="text-ink transition-transform duration-300 group-hover:scale-110 group-hover:text-gold-deep">
                  {cat.icon}
                </div>
                <span className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ANUNȚURI VÂNZĂRI ACTIVE */}
      <section className="border-t border-line/60 bg-surface px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
            <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Anunțuri <span className="text-gold-deep">vânzări active</span>
            </h2>
            <div className="flex flex-wrap items-center gap-5">
              <TrackedLink
                href="/pune-anunt"
                eventName="click_post_listing"
                eventParams={{ source: "home_listings_section" }}
                className="rounded-full bg-ink px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:bg-gold hover:text-ink md:text-xs"
              >
                Pune anunț
              </TrackedLink>
              <Link
                href="/categorii/auto"
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted underline-offset-4 transition hover:text-ink hover:underline md:text-xs"
              >
                Vezi toate anunțurile →
              </Link>
            </div>
          </div>
          <p className="mb-12 max-w-2xl text-sm font-medium leading-relaxed text-muted">
            Poți naviga fără cont. Pentru publicare, trimitere oferte și Camera de Negociere ai nevoie
            de un cont simplu.
          </p>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {standardListings && standardListings.length > 0 ? (
              standardListings.slice(0, 9).map((item) => (
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
                  score={item.deal_score ? item.deal_score / 10 : 9.0}
                  type={normalizeSaleType(item.sale_strategy)}
                />
              ))
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-line py-20 text-center">
                <p className="text-sm font-medium text-muted">
                  Momentan terminalul scanează noi active...
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CAPITAL DISPONIBIL */}
      <section className="border-t border-line/60 bg-canvas px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <div className="mb-4 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
              <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
                Capital <span className="text-gold-deep">disponibil</span>
              </h2>
              <TrackedLink
                href="/capital-disponibil"
                eventName="click_capital_available"
                eventParams={{ source: "home_capital_section" }}
                className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-muted underline-offset-4 transition hover:text-ink hover:underline md:text-xs"
              >
                Vezi toate cererile →
              </TrackedLink>
            </div>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-muted">
              Cereri publicate de cumpărători cu buget comunicat în anunț — verifică detaliile direct
              cu fiecare ofertant.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {realDemands && realDemands.length > 0 ? (
              realDemands.slice(0, 9).map((demand) => (
                <DemandCard
                  key={demand.id}
                  id={demand.id}
                  targetAsset={demand.target_asset}
                  category={demand.category}
                  budget={demand.budget?.toLocaleString("ro-RO")}
                  description={demand.description}
                />
              ))
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-line py-16 text-center">
                <p className="text-sm font-medium text-muted">
                  Nicio cerere de capital înregistrată momentan.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* LICITAȚII */}
      <section className="border-t border-line/60 bg-surface px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <h2 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Licitații <span className="text-gold-deep">deschise</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-muted">
              Active cu fereastră de ofertare până la 30 de zile. Vânzătorul alege manual oferta
              potrivită.
            </p>
            <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-muted">
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
            <div className="mx-auto max-w-xl rounded-3xl border border-line/70 bg-surface p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold tracking-tight text-ink">
                Momentan nu există licitații active
              </h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-muted">
                Licitațiile deschise permit vânzătorilor să primească oferte timp de până la 30 de
                zile și să aleagă manual oferta potrivită.
              </p>
              <p className="mt-2 text-xs font-medium leading-relaxed text-muted">
                Nu există câștigător automat. Plata și predarea se stabilesc direct între părți.
              </p>
              <Link
                href="/pune-anunt"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:bg-gold hover:text-ink md:text-xs"
              >
                Publică o licitație
              </Link>
            </div>
          )}
        </div>
      </section>

      <GlobalStats />

      {/* RECOMANDĂRI TRANZACȚII SIGURE */}
      <section className="bg-ink px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold md:text-xs">
            Recomandări pentru tranzacții sigure
          </h3>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300">
            Quick Exit nu procesează plata și nu ține fonduri în custodie. Înainte de plată sau
            predare, verifică activul, actele și identitatea celeilalte părți.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            <li className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-medium leading-relaxed text-neutral-300">
              Nu plăti avans fără verificări.
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-medium leading-relaxed text-neutral-300">
              Pentru sume mari, folosește contract și consultanță de specialitate.
            </li>
            <li className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-medium leading-relaxed text-neutral-300">
              Nu introduce datele cardului în linkuri primite de la alți utilizatori.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}