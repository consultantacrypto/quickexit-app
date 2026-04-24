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

          {/* Coloana 2: Utile / Navigare */}
          <div>
            <h4 className="text-[#FFD100] font-black uppercase tracking-[0.2em] text-xs mb-8 italic">Platformă</h4>
            <ul className="space-y-4">
              <li><Link href="/evaluare" className="text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Cât valorează ce vinzi?</Link></li>
              <li><Link href="/#how-it-works" className="text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Cum funcționează</Link></li>
              <li><Link href="/vinde" className="text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Vinde Urgent</Link></li>
              <li><Link href="/cariere" className="text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Cariere</Link></li>
            </ul>
          </div>

          {/* Coloana 3: Legal & Suport */}
          <div>
            <h4 className="text-[#FFD100] font-black uppercase tracking-[0.2em] text-xs mb-8 italic">Suport Legal</h4>
            <ul className="space-y-4">
              <li><Link href="/termeni" className="text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Termeni și Condiții</Link></li>
              <li><Link href="/confidentialitate" className="text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Politică de Confidențialitate</Link></li>
              <li><Link href="/cookies" className="text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Politică Cookies</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase italic">Contact</Link></li>
            </ul>
          </div>

          {/* Coloana 4: Legături Obligatorii RO (ANPC) */}
          <div>
            <h4 className="text-[#FFD100] font-black uppercase tracking-[0.2em] text-xs mb-8 italic">Protecția Consumatorului</h4>
            <div className="space-y-4">
              <a 
                href="https://anpc.ro/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block border border-gray-800 p-4 rounded-xl hover:border-[#FFD100] transition-colors group"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-[#FFD100]">A.N.P.C.</span>
                <p className="text-[9px] text-gray-600 mt-1 uppercase">Autoritatea Națională pentru Protecția Consumatorilor</p>
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
             <div className="text-[10px] font-black text-white italic tracking-tighter">VISA</div>
             <div className="text-[10px] font-black text-white italic tracking-tighter">MASTERCARD</div>
             <div className="text-[10px] font-black text-white italic tracking-tighter">STRIPE</div>
          </div>
        </div>

      </div>
    </footer>
  );
}