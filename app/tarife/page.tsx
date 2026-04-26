import Link from "next/link";

export default function PricingPage() {
  const sellerPackages = [
    {
      name: "Economy",
      duration: "30 ZILE",
      price: "99 RON",
      tag: "EXPUNERE MAXIMĂ",
      features: ["Afișare standard în listă", "Contact direct cumpărători", "Alerte AI către investitori"],
      color: "bg-white",
      btnColor: "bg-black text-[#FFD100]",
      badge: "bg-black text-white"
    },
    {
      name: "Standard",
      duration: "14 ZILE",
      price: "79 RON",
      tag: "VÂNZARE RAPIDĂ",
      features: ["Poziționare Priority (Top)", "Badge 'FAST' pe card", "Notificare Email Investitori"],
      color: "bg-black text-white",
      btnColor: "bg-[#FFD100] text-black",
      badge: "bg-[#FFD100] text-black"
    },
    {
      name: "Urgent",
      duration: "48 ORE",
      price: "48 RON",
      tag: "LICHIDARE",
      features: ["Primul loc în terminal 48h", "Push Notification Global", "Verificare KYC Prioritară"],
      color: "bg-gray-100", // AM ÎNLOCUIT ROȘUL CU UN GRI PREMIUM
      btnColor: "bg-black text-white",
      badge: "bg-black text-white"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20 font-sans text-black antialiased selection:bg-black selection:text-[#FFD100]">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        
        {/* HEADER - SUBDIMENSIONAT */}
        <div className="text-center mb-12 md:mb-16">
          <Link href="/" className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-black transition-colors italic mb-6 inline-block border-b-2 border-transparent hover:border-black">
            ← Înapoi Acasă
          </Link>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none mb-4">
            Prețuri <span className="text-[#FFD100] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Lucide</span>.
          </h1>
          <p className="text-[10px] md:text-xs font-bold text-gray-600 max-w-xl mx-auto uppercase tracking-widest italic">
            Alege viteza de lichidare. Fără comisioane ascunse, doar taxe tehnice fixe pentru accesul la rețeaua de investitori.
          </p>
        </div>

        {/* 1. PACHETE VÂNZARE - ALINIATE ȘI MICȘORATE */}
        <div className="mb-8 border-b-2 border-black pb-2">
           <h2 className="text-xl font-black uppercase italic tracking-tight text-gray-400">1. Listare Activ <span className="text-black">(Vânzător)</span></h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {sellerPackages.map((pkg) => (
            <div key={pkg.name} className={`${pkg.color} border-[3px] border-black rounded-[1.5rem] p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] flex flex-col justify-between hover:-translate-y-1 transition-all`}>
              <div>
                <div className="flex justify-between items-start mb-5">
                  <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border-2 border-black ${pkg.badge}`}>{pkg.tag}</span>
                  <span className="text-xl">⚡</span>
                </div>
                <h3 className="text-3xl font-black uppercase italic tracking-tight mb-1">{pkg.name}</h3>
                <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-6">Valabilitate: {pkg.duration}</p>
                
                <div className="space-y-3 mb-8">
                  {pkg.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2.5 font-bold text-[11px] italic">
                      <span className="text-[#FFD100] text-lg">✓</span> {feat}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t-2 border-gray-100/10 pt-5">
                <p className="text-3xl font-black italic tracking-tighter mb-5">{pkg.price}</p>
                <Link href="/pune-anunt" className={`block w-full ${pkg.btnColor} py-3 rounded-xl font-black uppercase tracking-widest text-[9px] italic text-center shadow-[3px_3px_0_0_rgba(0,0,0,0.1)] active:translate-y-1`}>
                  Lansează Anunț
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* 2. LICITAȚIE - RECONFIGURATĂ PENTRU FLEXIBILITATE */}
        <div className="mb-8 border-b-2 border-black pb-2">
           <h2 className="text-xl font-black uppercase italic tracking-tight text-gray-400">2. Metoda <span className="text-black">Sniper</span></h2>
        </div>

        <div className="bg-[#FFD100] border-[4px] border-black rounded-[2rem] p-6 md:p-10 shadow-[10px_10px_0_0_rgba(0,0,0,1)] mb-16 relative overflow-hidden group">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="bg-black text-[#FFD100] px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest italic mb-4 inline-block">Flexibilitate Totală</span>
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.85] mb-4 text-black">Licitație <br /> <span className="text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">Personalizată</span></h2>
              <p className="text-sm font-bold text-black italic leading-relaxed mb-6">
                Tu alegi durata: <span className="underline decoration-white">24h, 48h sau 72h</span>. Activul tău devine centrul atenției în terminal, generând competiție directă între investitori sub presiunea timpului.
              </p>
              <ul className="space-y-3 mb-4">
                <li className="flex items-center gap-2 font-black uppercase italic text-[10px] text-black">⚔️ Război al ofertelor în timp real</li>
                <li className="flex items-center gap-2 font-black uppercase italic text-[10px] text-black">📢 Alerte recurente către baza Sniper</li>
                <li className="flex items-center gap-2 font-black uppercase italic text-[10px] text-black">⏱️ Cronometru vizual pe pagina activului</li>
              </ul>
            </div>
            <div className="text-center lg:border-l-2 lg:border-black/10 lg:pl-10">
               <p className="text-[8px] font-black uppercase tracking-widest text-black/50 mb-1 italic">Taxă Sesiune (Indiferent de durată)</p>
               <p className="text-6xl md:text-7xl font-black italic tracking-tighter mb-4 text-black uppercase">111 RON</p>
               <Link href="/pune-anunt" className="inline-block w-full bg-black text-[#FFD100] py-5 rounded-xl font-black uppercase tracking-widest text-base italic shadow-[6px_6px_0_0_rgba(255,255,255,1)] hover:scale-105 transition-transform active:translate-y-1">
                 Configurează Licitația
               </Link>
               <p className="text-[8px] font-black uppercase mt-4 text-black/40 italic">*Pachetul include suportul AI pentru validarea ofertelor.</p>
            </div>
          </div>
        </div>

        {/* 3. ALTE COSTURI - MICȘORATE */}
        <div className="mb-8 border-b-2 border-black pb-2">
           <h2 className="text-xl font-black uppercase italic tracking-tight text-gray-400">3. Servicii <span className="text-black">Cumpărători & Guest</span></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-white border-[3px] border-black p-6 rounded-[1.5rem] shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2">Cerere Capital</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 italic">Anunță cash-ul pregătit pentru achiziții urgente sub preț.</p>
            <p className="text-3xl font-black italic tracking-tighter mb-6">99 RON</p>
            <Link href="/posteaza-cerere" className="block w-full border-2 border-black py-3 rounded-lg font-black uppercase tracking-widest text-[9px] italic text-center hover:bg-black hover:text-[#FFD100] transition-all">Postează Bugetul</Link>
          </div>

          <div className="bg-white border-[3px] border-black p-6 rounded-[1.5rem] shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2">Guest Offer</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6 italic">Trimite o ofertă directă fără a avea un cont verificat.</p>
            <p className="text-3xl font-black italic tracking-tighter mb-6">49 RON</p>
            <Link href="/capital-disponibil" className="block w-full border-2 border-black py-3 rounded-lg font-black uppercase tracking-widest text-[9px] italic text-center hover:bg-black hover:text-[#FFD100] transition-all">Vinde-i Activul Tău</Link>
          </div>
        </div>

      </div>
    </div>
  );
}