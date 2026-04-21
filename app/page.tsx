import { ro } from "../locales/ro";
import AdCard from "./components/AdCard";

export default function Home() {
  const { hero, types, home } = ro;

  return (
    <div className="flex flex-col w-full bg-white">
      {/* HERO SECTION */}
      <section className="relative pt-20 pb-20 overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          {/* Titlu Principal - IMPACT */}
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-black mb-4 italic uppercase">
            {hero.title}
          </h1>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-[#FFD100] mb-8 uppercase">
            {hero.subtitle}
          </h2>
          
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-gray-600 mb-12 font-medium leading-relaxed">
            {hero.description}
          </p>

          {/* BARA DE CĂUTARE */}
          <div className="mx-auto max-w-3xl bg-white border-[3px] border-black p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col md:flex-row items-center gap-2 mb-20">
            <input 
              type="text" 
              placeholder={hero.searchPlaceholder}
              className="flex-grow w-full px-6 py-4 text-gray-700 bg-transparent focus:outline-none font-bold text-lg"
            />
            <button className="w-full md:w-auto bg-[#FFD100] text-black px-10 py-4 rounded-xl font-black uppercase hover:bg-black hover:text-white transition-all duration-300 tracking-widest text-sm">
              {hero.ctaPrimary}
            </button>
          </div>

          {/* CATEGORII */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto px-4">
            <div className="group cursor-pointer p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all border-b-4 hover:border-b-gray-400 text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-4">{types.standard.tag}</span>
              <h3 className="text-xl font-black leading-tight text-black">{types.standard.label}</h3>
            </div>
            
            <div className="group cursor-pointer p-8 bg-white rounded-3xl border-2 border-red-100 shadow-sm hover:shadow-2xl transition-all border-b-4 border-b-red-600 text-left scale-105 z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 block mb-4 animate-pulse">● {types.urgent.tag}</span>
              <h3 className="text-xl font-black leading-tight text-red-600">{types.urgent.label}</h3>
            </div>

            <div className="group cursor-pointer p-8 bg-black rounded-3xl shadow-xl hover:shadow-2xl transition-all border-b-4 border-b-[#FFD100] text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD100] block mb-4">{types.extreme.tag}</span>
              <h3 className="text-xl font-black leading-tight text-white">{types.extreme.label}</h3>
            </div>

            <div className="group cursor-pointer p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all border-b-4 hover:border-b-[#FFD100] text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-4">{types.auction.tag}</span>
              <h3 className="text-xl font-black leading-tight text-black">{types.auction.label}</h3>
            </div>
          </div>
        </div>
      </section>

      {/* LATEST DEALS GRID */}
      <section className="bg-gray-50 py-24 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-6 text-center">
            <h3 className="text-4xl font-black text-black mb-4 tracking-tighter uppercase italic">{home.latestDealsTitle}</h3>
            <p className="text-gray-500 font-bold mb-16 tracking-widest text-xs">{home.kycOnly}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                <AdCard 
                    title="Penthouse Panwa Bay - Phuket" 
                    image="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
                    marketPrice="€850.000"
                    exitPrice="€590.000"
                    discount="30"
                    score={9.8}
                    type="extreme"
                />
                <AdCard 
                    title="Mercedes S-Class 350d 2022" 
                    image="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80"
                    marketPrice="€95.000"
                    exitPrice="€72.000"
                    discount="24"
                    score={8.5}
                    type="urgent"
                />
                <AdCard 
                    title="Teren Intravilan Buftea Lac" 
                    image="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80"
                    marketPrice="€120.000"
                    exitPrice="€85.000"
                    discount="29"
                    score={9.2}
                    type="standard"
                />
            </div>
        </div>
      </section>
    </div>
  );
}