import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white pt-10 pb-24 font-sans text-black selection:bg-[#FFD100]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        
        {/* HEADER 60 SECUNDE */}
        <div className="text-center mb-20">
          <p className="text-[12px] font-black uppercase tracking-[0.4em] text-red-600 mb-4 italic">60 Secunde. Zero Bullshit.</p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase italic tracking-tighter leading-[0.9]">
            Cum generăm <span className="text-[#FFD100] underline decoration-black decoration-[4px] md:decoration-[8px] underline-offset-4">Lichiditate</span>
          </h1>
          <p className="mt-8 text-lg md:text-xl font-bold text-gray-600 max-w-2xl mx-auto italic">
            QuickExit nu este un site de anunțuri unde aștepți 6 luni. Suntem un terminal care conectează direct activele sub prețul pieței cu investitori care au cash imediat.
          </p>
        </div>

        {/* SPLIT ECRAN - VÂNZĂTORI VS CUMPĂRĂTORI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          
          {/* FLOW VÂNZĂTOR */}
          <div className="bg-gray-50 p-8 md:p-12 rounded-[3rem] border-[4px] border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-black text-white px-6 py-2 rounded-bl-3xl font-black uppercase text-[10px] tracking-widest italic">Vreau Cash</div>
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-8 mt-4">Pentru <span className="text-gray-400 group-hover:text-black transition-colors">Vânzători</span></h2>
            
            <div className="space-y-8">
              <div className="flex gap-6">
                <span className="text-5xl font-black text-[#FFD100] italic leading-none">1</span>
                <div>
                  <h3 className="text-xl font-black uppercase italic">Evaluezi cu AI</h3>
                  <p className="text-sm font-bold text-gray-500 mt-1">Sistemul nostru îți spune instant cât valorează activul tău în piața reală de azi.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <span className="text-5xl font-black text-[#FFD100] italic leading-none">2</span>
                <div>
                  <h3 className="text-xl font-black uppercase italic">Setezi Prețul de Exit</h3>
                  <p className="text-sm font-bold text-gray-500 mt-1">Alegi un discount agresiv (minim 10-15%). Asta atrage atenția sistemului Sniper.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <span className="text-5xl font-black text-[#FFD100] italic leading-none">3</span>
                <div>
                  <h3 className="text-xl font-black uppercase italic">Primești Oferta</h3>
                  <p className="text-sm font-bold text-gray-500 mt-1">Investitorii primesc alertă instant. Te contactează pe WhatsApp sau Email și închideți tranzacția.</p>
                </div>
              </div>
            </div>

            <Link href="/pune-anunt" className="mt-12 w-full inline-block bg-white border-[3px] border-black text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic text-center hover:bg-black hover:text-[#FFD100] transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1">
              Lichidează un Activ →
            </Link>
          </div>

          {/* FLOW INVESTITOR */}
          <div className="bg-black text-white p-8 md:p-12 rounded-[3rem] border-[4px] border-[#FFD100] shadow-[12px_12px_0_0_rgba(255,209,0,1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-[#FFD100] text-black px-6 py-2 rounded-bl-3xl font-black uppercase text-[10px] tracking-widest italic">Am Capital</div>
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-8 mt-4 text-[#FFD100] group-hover:text-white transition-colors">Pentru Investitori</h2>
            
            <div className="space-y-8">
              <div className="flex gap-6">
                <span className="text-5xl font-black text-white italic leading-none opacity-20">1</span>
                <div>
                  <h3 className="text-xl font-black uppercase italic text-[#FFD100]">Postezi Cererea</h3>
                  <p className="text-sm font-bold text-gray-400 mt-1">Anunți platforma că ai un buget pregătit și spui exact ce specificații cauți.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <span className="text-5xl font-black text-white italic leading-none opacity-20">2</span>
                <div>
                  <h3 className="text-xl font-black uppercase italic text-[#FFD100]">Aștepți Oportunitatea</h3>
                  <p className="text-sm font-bold text-gray-400 mt-1">Când un vânzător e presat să vândă la prețul tău, te găsește în Directorul de Capital.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <span className="text-5xl font-black text-white italic leading-none opacity-20">3</span>
                <div>
                  <h3 className="text-xl font-black uppercase italic text-[#FFD100]">Execuți Tranzacția</h3>
                  <p className="text-sm font-bold text-gray-400 mt-1">Primești detaliile vânzătorului și închizi deal-ul cu banii jos, generând profit la cumpărare.</p>
                </div>
              </div>
            </div>

            <Link href="/posteaza-cerere" className="mt-12 w-full inline-block bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic text-center hover:bg-white transition-colors shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] active:shadow-none active:translate-y-1">
              + Anunță Capitalul →
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}