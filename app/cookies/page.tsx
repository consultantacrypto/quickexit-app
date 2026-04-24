import Link from "next/link";

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-block mb-12 text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-[#FFD100] transition-all italic">
          ← ÎNAPOI LA HOMEPAGE
        </Link>

        <div className="bg-white p-8 md:p-16 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="mb-12 border-b-4 border-gray-100 pb-12">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4 leading-none">
              Politică <span className="text-[#FFD100]">Cookies</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
              QUICK EXIT LLC • Transparență Totală
            </p>
          </div>

          <div className="space-y-8 text-sm md:text-base font-bold text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-black mb-4">Ce sunt modulele cookie?</h2>
              <p>Utilizăm fișiere de tip cookie pentru a ne asigura că platforma recunoaște preferințele tale de căutare și activele pe care le urmărești (Watchlist). Acestea ne ajută să îți oferim acele „Sniper Alerts” personalizate.</p>
            </section>
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-center italic text-xs font-black uppercase tracking-widest text-gray-400">
              [ Detalii tehnice despre cookie-uri ]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}