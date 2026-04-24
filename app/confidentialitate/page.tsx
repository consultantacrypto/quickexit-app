import Link from "next/link";

export default function Confidentialitate() {
  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100] selection:text-black">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-block mb-12 text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1 hover:text-[#FFD100] hover:border-[#FFD100] transition-all italic">
          ← Înapoi la Homepage
        </Link>

        <div className="bg-white p-8 md:p-16 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="mb-12 border-b-4 border-gray-100 pb-12">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4 leading-none">
              Politica de <span className="text-[#FFD100]">Confidențialitate</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
              Conform GDPR • Quick Exit LLC
            </p>
          </div>

          <div className="space-y-8 text-sm md:text-base font-bold text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-black mb-4">1. Colectarea Datelor</h2>
              <p>Pentru a facilita evaluările rapide și a asigura siguranța tranzacțiilor (KYC), colectăm date strict necesare funcționării algoritmului nostru și punerii în legătură a investitorilor cu vânzătorii.</p>
            </section>

            <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-center mt-12">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 italic">
                [ Documentul juridic GDPR va fi integrat aici ]
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}