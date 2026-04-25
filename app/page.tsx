import { ro } from "../locales/ro";
import AdCard from "./components/AdCard";
import Link from "next/link";
import GlobalStats from "./components/GlobalStats";

export default function Home() {
  const { hero, types, home } = ro;

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

  const tickerItems = [
    { tag: "PANIC SELL", asset: "PENTHOUSE PANWA BAY", info: "LICHIDARE 24H: €590.000" },
    { tag: "URGENT", asset: "MERCEDES S-CLASS 2022", info: "NECESAR CASH AZI: €72.000" },
    { tag: "EXTREME", asset: "ROLEX DAYTONA", info: "EXIT SUB PREȚ PIAȚĂ: €22.500" },
    { tag: "FLASH", asset: "TEREN BUFTEA LAC", info: "ACCEPTĂ OFERTE CASH ACUM" }
  ];

  const buyers = [
    { 
      slug: "gigi-v",
      name: "Gigi V.", target: "Mercedes S-Class / BMW 7", budget: "€100.000", tag: "CASH PREGĂTIT", category: "Auto",
      description: "Caut model după 2021, istoric curat, unic proprietar. Ofer cash pe loc după verificare la reprezentanță și semnare acte." 
    },
    { 
      slug: "andrei-p",
      name: "Andrei P.", target: "Teren Bran / Moieciu", budget: "€450.000", tag: "FONDURI VERIFICATE", category: "Imobiliare",
      description: "Interesat exclusiv de parcele cu utilități la teren și PUZ aprobat pentru turism. Fără probleme litigioase, plătesc azi." 
    },
    { 
      slug: "investgroup",
      name: "InvestGroup", target: "Penthouses Phuket", budget: "€1.200.000", tag: "CASH PREGĂTIT", category: "Imobiliare",
      description: "Cumpărăm urgent pentru portofoliu de randament. Doar proiecte finalizate sau cu predare în următoarele 3 luni." 
    }
  ];

  return (
    <div className="flex flex-col w-full bg-white selection:bg-[#FFD100] selection:text-black font-sans">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 35s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}} />

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
              { label: 'Standard', desc: 'Preț Maxim', time: '7-14 Zile' },
              { label: 'Urgent', desc: 'Lichidare', time: '48 Ore' },
              { label: 'Extreme', desc: 'Cash Instant', time: 'Azi' },
              { label: 'Flash', desc: 'Licitație', time: '24 Ore' }
            ].map((item) => (
              <div key={item.label} className="p-6 border-[3px] border-black rounded-2xl bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{item.label}</p>
                <p className="text-xl font-black uppercase italic leading-none">{item.time}</p>
                <p className="text-[9px] font-bold uppercase mt-2 opacity-60 tracking-tighter">{item.desc}</p>
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
                <Link key={cat.slug} href={`/categorii/${cat.slug}`} className="group flex flex-col items-center gap-5">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center border-[3px] border-gray-100 group-hover:border-black group-hover:bg-[#FFD100] group-hover:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-all duration-300">
                    <div className="text-black group-hover:scale-110 transition-transform">{cat.icon}</div>
                  </div>
                  <span className="text-[11px] md:text-[13px] font-black uppercase tracking-tight text-gray-800 group-hover:text-black transition-colors text-center w-full px-2">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TICKER DE TRADING */}
      <div className="w-full bg-black border-y-4 border-[#FFD100] overflow-hidden py-5 flex relative z-10 shadow-2xl">
        <div className="flex whitespace-nowrap animate-ticker items-center">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((item, index) => (
            <span key={index} className="inline-flex items-center text-white font-black uppercase tracking-widest text-[11px] md:text-[13px] italic">
              <span className={`px-2 py-1 ml-10 mr-4 text-black ${item.tag === 'PANIC SELL' || item.tag === 'EXTREME' ? 'bg-[#FFD100]' : 'bg-white'}`}>
                {item.tag}
              </span>
              <span className="text-white opacity-90">{item.asset}</span>
              <span className="mx-3 text-gray-600">|</span>
              <span className="text-[#FFD100]">{item.info}</span>
              <span className="ml-10 text-gray-700 text-lg tracking-[-0.2em]">///</span>
            </span>
          ))}
        </div>
      </div>

      {/* SECȚIUNEA OPORTUNITĂȚI CASH (VÂNZĂRI) */}
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4">
            <div className="flex justify-between items-end mb-16 border-b-[3px] border-black pb-8">
                <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">Oportunități <span className="text-[#FFD100]">Cash</span></h2>
                <button className="text-[10px] md:text-xs font-black uppercase tracking-widest italic hover:text-[#FFD100] transition-colors border-b-2 border-transparent hover:border-[#FFD100]">
                  Vezi toate activele →
                </button>
            </div>
    
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                <AdCard id="penthouse-phuket" title="Penthouse Panwa Bay" image="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80" marketPrice="€850.000" exitPrice="€590.000" discount="30" score={9.8} type="extreme" priority={true} />
                <AdCard id="mercedes-s-class" title="Mercedes S-Class 2022" image="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80" marketPrice="€95.000" exitPrice="€72.000" discount="24" score={8.5} type="urgent" />
                <AdCard id="teren-buftea" title="Teren Buftea Lac" image="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80" marketPrice="€220.000" exitPrice="€165.000" discount="25" score={9.2} type="extreme" />
            </div>
        </div>
      </section>

      {/* SECȚIUNEA CERERE CAPITAL (CUMPĂRĂTORI) - ACUM CU BRANDING GALBEN */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 border-b-[3px] border-black pb-8">
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-4">
                  <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
                    Capital <span className="text-black underline decoration-[#FFD100] decoration-[6px]">Disponibil</span>
                  </h2>
                  <div className="flex items-center gap-4">
                    <Link href="/posteaza-cerere" className="text-[10px] md:text-xs font-black uppercase tracking-widest italic text-gray-500 hover:text-black transition-colors">
                      Adaugă Cerere +
                    </Link>
                    <Link href="/capital-disponibil" className="text-[10px] md:text-xs font-black uppercase tracking-widest italic hover:text-[#FFD100] transition-colors border-b-2 border-transparent hover:border-[#FFD100]">
                      Vezi tot capitalul →
                    </Link>
                  </div>
              </div>
              <p className="text-sm md:text-base font-bold text-gray-500 uppercase italic">Clienți cu fonduri verificate caută să cumpere urgent aceste active.</p>
            </div>
    
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                {buyers.map((buyer, idx) => (
                  <div key={idx} className="bg-white border-[4px] border-[#FFD100] rounded-[2rem] p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[12px_12px_0_0_rgba(0,0,0,1)] transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <span className="bg-[#FFD100] text-black px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest italic border-2 border-black">
                          {buyer.tag}
                        </span>
                        <span className="text-2xl grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">💰</span>
                      </div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tight leading-none mb-3 text-black">{buyer.target}</h3>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded border border-gray-200">
                          {buyer.category}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Investitor: <span className="text-black">{buyer.name}</span></span>
                      </div>
                      <p className="text-sm font-bold text-gray-600 italic line-clamp-3 leading-relaxed">
                        &quot;{buyer.description}&quot;
                      </p>
                    </div>
                    <div className="mt-8 pt-6 border-t-[3px] border-gray-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Buget Alocat</p>
                      <p className="text-4xl font-black italic tracking-tighter text-black mb-6">{buyer.budget}</p>
                      <Link href={`/trimite-oferta/${buyer.slug}`} className="w-full bg-[#FFD100] border-[3px] border-black text-black py-4 rounded-xl font-black uppercase tracking-widest text-[11px] italic hover:bg-black hover:text-[#FFD100] transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 block text-center">
                        Vinde-i Activul Tău
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
        </div>
      </section>

      {/* STATISTICI GLOBALE LIVE AICI */}
      <GlobalStats />

    </div>
  );
}