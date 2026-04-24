import Link from "next/link";

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-block mb-12 text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-[#FFD100] transition-all italic">
          ← ÎNAPOI LA HOMEPAGE
        </Link>

        <div className="bg-white p-8 md:p-16 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="mb-12 border-b-4 border-gray-100 pb-12 text-center">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4 leading-none">
              Construiește <span className="text-[#FFD100]">Viitorul</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
              Echipa Quick Exit LLC
            </p>
          </div>

          <div className="space-y-12">
            <div className="p-8 border-2 border-black rounded-3xl bg-gray-50">
              <h3 className="text-2xl font-black uppercase italic mb-2 tracking-tighter text-black">Analist Evaluare AI</h3>
              <p className="text-sm font-bold text-gray-500 mb-6 uppercase">Remote / București</p>
              <button className="bg-black text-[#FFD100] px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Vezi Rolul</button>
            </div>
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-3xl">
              <p className="text-xs font-black uppercase tracking-widest text-gray-300">Nu am găsit rolul potrivit? Trimite-ne un email.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}