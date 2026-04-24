import Link from "next/link";

export default function TermeniSiConditii() {
  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100] selection:text-black">
      <div className="max-w-4xl mx-auto">
        
        {/* Buton Înapoi */}
        <Link href="/" className="inline-block mb-12 text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-[#FFD100] hover:border-[#FFD100] transition-all italic">
          ← Înapoi la Homepage
        </Link>

        {/* Container Principal Brutalist */}
        <div className="bg-white p-8 md:p-16 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          
          <div className="mb-12 border-b-4 border-gray-100 pb-12">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4 leading-none">
              Termeni și <span className="text-[#FFD100]">Condiții</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
              Ultima actualizare: {new Date().toLocaleDateString('ro-RO')} • Quick Exit LLC
            </p>
          </div>

          {/* Conținut Text */}
          <div className="space-y-8 text-sm md:text-base font-bold text-gray-600 leading-relaxed">
            
            <section>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-black mb-4">1. Introducere</h2>
              <p>
                Acest document reglementează utilizarea platformei Quick Exit. Accesând și utilizând această platformă, sunteți de acord cu acești termeni în totalitate. Platforma este dedicată exclusiv tranzacțiilor rapide și evaluărilor de lichiditate.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-black mb-4">2. Statutul Quick Exit LLC</h2>
              <p>
                Quick Exit LLC acționează ca un intermediar tehnologic care conectează vânzătorii de active cu o rețea de investitori. Nu garantăm vânzarea imediată, ci facilităm expunerea către capital disponibil în baza unui algoritm de <span className="text-black bg-[#FFD100] px-1">Deal Score AI</span>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-black mb-4">3. Politica de "Panic Sell" și Discount</h2>
              <p>
                Utilizatorii care listează active cu eticheta "Urgență" sau "Panic Sell" recunosc și acceptă că prețul propus trebuie să fie semnificativ sub prețul pieței pentru a declanșa alertele de lichiditate către investitori.
              </p>
            </section>

            {/* Placeholder pentru restul clauzelor */}
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-center mt-12">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 italic">
                [ Aici va fi integrat documentul juridic complet redactat de departamentul legal ]
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}