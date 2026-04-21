import Link from "next/link";
import Image from "next/image";
import { ro } from "../../locales/ro"; // Asigură-te că dicționarul ro.ts este în locales/

export default function Header() {
  const t = ro.header;

  return (
    <header className="w-full border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="mx-auto flex h-28 max-w-7xl items-center justify-between px-6">
        
        {/* ZONA LOGO - Cloud Organic cu Efecte */}
        <div className="flex items-center -ml-6 md:-ml-8 transition-transform duration-300 hover:scale-105">
          <Link href="/" className="block">
            {/* Norul Organic cu Gradient și Umbră */}
            <div 
              className="bg-black flex items-center justify-center shadow-2xl transition-all duration-300 hover:shadow-cyan-900/40 hover:-translate-y-1"
              style={{
                width: '280px', // Mărit pentru vizibilitate maximă
                height: '100px',
                // Forma de nor organic/imperfect desenat din cod
                borderRadius: '60% 40% 70% 30% / 40% 50% 60% 70%',
                padding: '12px 24px',
                // Un efect discret de gradient pe fundal pentru lux
                background: 'linear-gradient(145deg, #111111 0%, #000000 100%)'
              }}
            >
              <Image 
                src="/logo-black.png" // Sursa ta corectă .png
                alt="Quick Exit Logo" 
                width={210} // Textul este acum mult mai mare
                height={65}
                style={{ height: 'auto', width: 'auto' }} // Rezolvă eroarea de aspect ratio
                className="object-contain"
                priority // Îi spune platformei să încarce logo-ul primul
              />
            </div>
          </Link>
        </div>

        {/* NAVIGARE CENTRALA - Vizibilă pe Desktop */}
        <nav className="hidden md:flex items-center gap-10 text-sm font-semibold text-gray-800">
          <Link href="/how-it-works" className="hover:text-black transition-colors">{t.howItWorks}</Link>
          <Link href="/categories" className="hover:text-black transition-colors">{t.categories}</Link>
          <Link href="/ai-advisor" className="hover:text-[#FFD100] transition-colors">{t.aiAdvisor}</Link>
        </nav>

        {/* Zona de butoane (Login & Vinde Urgent) */}
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-bold text-gray-800 hover:text-black transition-colors">
            {t.login}
          </Link>
          <Link href="/post-ad" className="bg-[#FFD100] px-6 py-2.5 text-sm font-extrabold text-black rounded hover:bg-[#Facc15] transition-transform hover:scale-105 shadow-sm">
            {t.postAd}
          </Link>
        </div>

      </div>
    </header>
  );
}