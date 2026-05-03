import { ro } from "../locales/ro";
import AdCard from "./components/AdCard";
import DemandCard from "./components/DemandCard"; // Am adus componenta Tanc pentru investitori
import Link from "next/link";
import GlobalStats from "./components/GlobalStats";
import { supabase } from "@/lib/supabase"; 
// IMPORT GLOBAL NOU
import { normalizeSaleType } from "@/utils/normalizeSaleType";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const { hero, types, home } = ro;

  // FETCH DATE REALE - FILTRARE SEED ACTIVATĂ + LIMITA 9
  const { data: realListings } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('is_seed', false) // Asigurăm izolarea datelor de index de interfața publică
    .order('created_at', { ascending: false })
    .limit(9); // Modificat la 9

  const { data: realDemands } = await supabase
    .from('demands')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(9);

  // Separăm licitațiile de anunțurile normale folosind funcția globală
  const auctions = realListings?.filter(item => normalizeSaleType(item.sale_strategy) === 'auction') || [];
  const standardListings = realListings?.filter(item => normalizeSaleType(item.sale_strategy) !== 'auction') || [];

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
      
      {/* HERO SECTION */}
      <section className="relative pt-20 pb-16 overflow-hidden bg-white text-center">
        <div className="mx-auto max-w-7xl px-4">
          
          <h1 className="text-7xl md:text-9xl font-black text-black tracking-tightest uppercase italic leading-[0.8] mb-10">
            Vinde <span className="text-[#FFD100]">Acum</span>.<br />
            Banii <span className="text-gray-200">Azi</span>.
          </h1>

          <div className="mx-auto max-w-2xl mb-16 px-4">
            <p className="text-sm md:text-base font-bold tracking-wide leading-loose">
              <span className="bg-[#FFD100] text-black px-2 py-1 box-decoration-clone">
                Singura platformă de lichiditate din România dedicată vânzărilor rapide. Conectăm direct bunurile tale cu investitori pregătiți pentru achiziții cash.
              </span>
            </p>
            <p className="mt-4 text-black font-black uppercase tracking-widest text-[10px]">
              Fără agenți. Fără negocieri infinite. Fără timp pierdut.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
            {[
              { label: 'Expunere maximă', desc: 'Mai mult timp pentru oferte', time: '30 zile', price: '99 RON' },
              { label: 'Vânzare rapidă', desc: 'Echilibru viteză / preț', time: '14 zile', price: '79 RON' },
              { label: 'Vânzare urgentă', desc: 'Cumpărători în termen scurt', time: '48 ore', price: '48 RON' },
              { label: 'Licitație rapidă', desc: 'Oferte competitive', time: 'Licitație', price: '111 RON' }
            ].map((item) => (
              <div key={item.label} className="p-6 border-[3px] border-black rounded-2xl bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{item.label}</p>
                <p className="text-xl font-black uppercase italic leading-none">{item.time}</p>
                <p className="text-[11px] font-black text-[#FFD100] mt-2 uppercase tracking-tighter bg-black px-2 py-0.5 inline-block rounded">{item.price}</p>
                <p className="text-[9px] font-bold uppercase mt-2 opacity-60 tracking-tighter block">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center mb-24 group">
            <Link href="/evaluare">
              <button className="bg-black text-[#FFD100] px-16 py-10 rounded-[2.5rem] font-black uppercase tracking-widest transition-all border-b-8 border-yellow-700 active:border-b-0 active:translate-y-2 hover:scale-[1.02] shadow-[0_15px_40px_rgba(255,209,0,0.2)] hover:shadow-[0_25px_50px_rgba(255,209,0,0.4)] relative overflow-hidden">
                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-white/10 skew-x-[-25deg] group-hover:left-[150%] transition-all duration-1000 ease-in-out" />
                <span className="text-3xl md:text-4xl italic uppercase leading-none block relative z-10">Cât valorează ce vinzi?</span>
              </button>
            </Link>
          </div>

          <div className="max-w-6xl mx-auto mb-10 pt-16 border-t border-gray-100">
            <h3 className="text-sm md:text-lg font-black uppercase tracking-[0.4em] text-black mb-12 italic border-b-[6px] border-[#FFD100] pb-4 inline-block">
              Alege Categoria
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {categories.map((cat) => (
                <Link key={cat.slug} href={`/categorii/${cat.slug}`} className="group bg-white border-[3px] border-black p-6 md:p-8 rounded-[2rem] flex flex-col items-center justify-center hover:bg-[#FFD100] transition-all hover:-translate-y-2 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                  <div className="mb-4 text-black group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </div>
                  <span className="text-[10px] md:text-[11px] font-black uppercase tracking-tight text-black text-center w-full">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRARE LICITAȚII */}
      {auctions.length > 0 && (
        <section className="py-20 bg-black border-y-[8px] border-black relative overflow-hidden shadow-[0_0_50px_rgba(255,0,0,0.15)]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-600/20 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="mx-auto max-w-7xl px-4 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-gray-800 pb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                  <span className="text-red-500 font-black uppercase tracking-widest text-[10px]">Competiție Live</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none text-white">
                  Licitații <span className="text-[#FFD100]">rapide</span>
                </h2>
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] md:max-w-xs mt-4 md:mt-0 text-left md:text-right">
                Active lichidate urgent. Prima ofertă la prețul de exit închide licitația.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
              {auctions.map((item) => (
                <div key={item.id} className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-red-600 to-[#FFD100] rounded-[2.5rem] blur opacity-30 group-hover:opacity-100 transition duration-500"></div>
                  <div className="relative h-full">
                    <AdCard 
                      id={item.id}
                      title={item.title}
                      image={item.images?.[0] || "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"}
                      marketPrice={`€${item.market_price.toLocaleString('ro-RO')}`}
                      exitPrice={`€${item.exit_price.toLocaleString('ro-RO')}`}
                      discount={item.discount?.toString() || "0"}
                      score={item.deal_score ? item.deal_score / 10 : 9.5} 
                      type="auction"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ANUNȚURI VÂNZĂRI ACTIVE */}
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 border-b-[3px] border-black pb-8 gap-4">
                <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
                  Anunțuri <span className="text-[#FFD100]">Vânzări Active</span>
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <Link href="/pune-anunt" className="bg-black text-[#FFD100] px-5 py-2.5 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest italic hover:bg-[#FFD100] hover:text-black transition-colors border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
                    + Pune Anunț
                  </Link>
                  <Link href="/categorii/auto" className="text-[10px] md:text-xs font-black uppercase tracking-widest italic hover:text-[#FFD100] transition-colors border-b-2 border-transparent hover:border-[#FFD100] py-2">
                    Vezi toate anunțurile →
                  </Link>
                </div>
            </div>
    
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
                  <Link href="/capital-disponibil" className="text-[10px] md:text-xs font-black uppercase tracking-widest italic hover:text-[#FFD100] transition-colors border-b-2 border-transparent hover:border-[#FFD100] py-2 whitespace-nowrap">
                    Vezi toate cererile →
                  </Link>
              </div>
              <p className="text-sm md:text-base font-bold text-gray-500 uppercase italic">Clienți cu fonduri verificate caută să cumpere urgent aceste active.</p>
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

      <GlobalStats />

    </div>
  );
}