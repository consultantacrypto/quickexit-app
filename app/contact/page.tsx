import Link from "next/link";

export default function Contact() {
  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100] selection:text-black">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-block mb-12 text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-[#FFD100] hover:border-[#FFD100] transition-all italic">
          ← Înapoi la Homepage
        </Link>

        <div className="bg-white p-8 md:p-16 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="mb-12 border-b-4 border-gray-100 pb-12">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4 leading-none">
              <span className="text-[#FFD100]">Contactează</span> Quick Exit
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
              Suport VIP • Investitori • Parteneriate
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 italic">Email Direct</p>
                <p className="text-2xl font-black italic tracking-tighter">vip@quickexit.ro</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 italic">Program de lucru</p>
                <p className="text-xl font-black italic tracking-tighter">24/7 pentru tranzacții active</p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <p className="text-sm font-bold text-gray-600 mb-6 italic">Ești investitor instituțional sau dorești un parteneriat B2B?</p>
              <button className="w-full bg-black text-[#FFD100] py-4 rounded-xl font-black uppercase text-xs tracking-widest italic hover:scale-[1.02] transition-transform">
                Aplică pentru cont PRO →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}