"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-black text-white pt-20 pb-10 border-t-8 border-[#FFD100]">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Grid Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Coloana 1: Brand & Misiune */}
          <div className="space-y-6">
            <div className="text-3xl font-black italic tracking-tighter text-[#FFD100]">
              QUICK EXIT
            </div>
            <p className="text-gray-400 text-sm font-bold leading-relaxed italic">
              Prima platformă de lichiditate ultra-rapidă din România. Transformăm activele complexe în capital imediat prin tehnologie și rețele de investitori verificați.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-gray-800 w-fit px-4 py-2 rounded-lg">
              <span>Made in Romania</span>
              <span className="text-base">🇷🇴</span>
            </div>
          </div>

          {/* Coloana 2: Utile / Navigare + BUTONUL SMART */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-[#FFD100] mb-6">Utile</h4>
            <ul className="space-y-4 text-xs font-bold uppercase italic text-gray-500 mb-8">
              <li><Link href="/" className="hover:text-white transition-colors">Acasă</Link></li>
              <li><Link href="/pune-anunt" className="hover:text-white transition-colors">Pune Anunț</Link></li>
              <li><Link href="/capital-disponibil" className="hover:text-white transition-colors">Capital Disponibil</Link></li>
              <li><Link href="/tarife" className="hover:text-white transition-colors">Tarife & Oferte</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Contul Meu</Link></li>
            </ul>

            {/* BUTONUL GALBEN SMART */}
            <Link href="/tarife">
               <button className="w-full bg-[#FFD100] text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] italic shadow-[4px_4px_0_0_rgba(255,255,255,1)] hover:shadow-none hover:translate-y-1 transition-all flex items-center justify-center gap-2 group">
                 <span>OFERTE SPECIALE & TARIFE</span>
                 <span className="group-hover:translate-x-1 transition-transform">→</span>
               </button>
            </Link>
          </div>

          {/* Coloana 3: Categorii */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-[#FFD100] mb-6">Categorii</h4>
            <ul className="space-y-4 text-[10px] font-black uppercase italic text-gray-500">
              <li><Link href="/categorii/auto" className="hover:text-[#FFD100] transition-colors">Auto & Moto</Link></li>
              <li><Link href="/categorii/imobiliare" className="hover:text-[#FFD100] transition-colors">Imobiliare</Link></li>
              <li><Link href="/categorii/lux" className="hover:text-[#FFD100] transition-colors">Lux & Ceasuri</Link></li>
              <li><Link href="/categorii/business" className="hover:text-[#FFD100] transition-colors">Afaceri de vânzare</Link></li>
              <li><Link href="/categorii/gadgets" className="hover:text-[#FFD100] transition-colors">Gadgets & Tech</Link></li>
            </ul>
          </div>

          {/* Coloana 4: Protecție & Legal */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-[#FFD100] mb-6">Protecție</h4>
            <div className="space-y-4">
              <a 
                href="https://anpc.ro/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block border border-gray-800 p-4 rounded-xl hover:border-[#FFD100] transition-colors group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-[#FFD100]">A.N.P.C.</span>
                <p className="text-[9px] text-gray-600 mt-1 uppercase">Protecția Consumatorilor</p>
              </a>
              <a 
                href="https://ec.europa.eu/consumers/odr/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block border border-gray-800 p-4 rounded-xl hover:border-[#FFD100] transition-colors group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-[#FFD100]">S.O.L.</span>
                <p className="text-[9px] text-gray-600 mt-1 uppercase">Soluționarea Online a Litigiilor</p>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-gray-600 italic">
            © 2026 QUICK EXIT LLC. TOATE DREPTURILE REZERVATE.
          </div>
          
          {/* Social Social / Trust */}
          <div className="flex gap-8 items-center opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
             <div className="text-[10px] font-black text-white italic tracking-tighter underline decoration-[#FFD100] decoration-2">SECURE PAYMENTS BY STRIPE</div>
             <div className="flex gap-4">
                <span className="text-[10px] font-black text-white italic">VISA</span>
                <span className="text-[10px] font-black text-white italic">MASTERCARD</span>
             </div>
          </div>
        </div>

      </div>
    </footer>
  );
}