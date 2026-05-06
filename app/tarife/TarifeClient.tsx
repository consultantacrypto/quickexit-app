"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export default function TarifeClient() {
  const sellerPackages = [
    {
      id: "economy",
      name: "Economy",
      publicName: "Expunere Maximă",
      bestFor: "Potrivit dacă nu te grăbești și vrei expunere extinsă.",
      benefit: "Mai mult timp în piață pentru negocieri bune.",
      duration: "30 ZILE",
      price: "99 RON",
      tag: "EXPUNERE MAXIMĂ",
      features: [
        "Afișare standard în listă",
        "Contact direct cumpărători",
        "Alerte AI către investitori",
      ],
      color: "bg-[#FDFCF8]",
      btnColor: "bg-black text-[#FFD100]",
      badge: "bg-black text-white",
      isRecommended: false,
    },
    {
      id: "standard",
      name: "Standard",
      publicName: "Vânzare Rapidă",
      bestFor: "Potrivit dacă vrei echilibru între preț și viteză.",
      benefit: "Prioritate mai bună pentru vizibilitate imediată.",
      duration: "14 ZILE",
      price: "79 RON",
      tag: "VÂNZARE RAPIDĂ",
      features: [
        "Poziționare Priority (Top)",
        "Badge 'FAST' pe card",
        "Notificare Email Investitori",
      ],
      color: "bg-white",
      btnColor: "bg-[#FFD100] text-black",
      badge: "bg-[#FFD100] text-black",
      isRecommended: true,
    },
    {
      id: "urgent",
      name: "Urgent",
      publicName: "Vânzare Urgentă",
      bestFor: "Potrivit dacă ai nevoie de lichiditate imediată.",
      benefit: "Expunere accelerată pentru decizii rapide.",
      duration: "48 ORE",
      price: "48 RON",
      tag: "LICHIDARE",
      features: [
        "Primul loc în terminal 48h",
        "Push Notification Global",
        "Verificare KYC Prioritară",
      ],
      color: "bg-[#FDFCF8]",
      btnColor: "bg-black text-white",
      badge: "bg-black text-white",
      isRecommended: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EC] pt-16 pb-20 font-sans text-black antialiased selection:bg-black selection:text-[#FFD100]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 overflow-x-hidden">
        <section className="mb-12 border-[3px] border-black bg-black text-white rounded-[2rem] px-5 md:px-8 py-7 md:py-9 shadow-[8px_8px_0_0_rgba(255,209,0,1)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD100] mb-3">
            Tarife Quick Exit
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tight leading-tight">
                Alege viteza{" "}
                <span className="inline-block bg-[#FFD100] text-black px-2 py-1 rounded-md">
                  de vânzare
                </span>
              </h1>
              <p className="mt-4 text-sm md:text-base text-neutral-200 leading-relaxed">
                Pachetul stabilește durata, prioritatea și metoda de expunere a
                anunțului.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/pune-anunt"
                className="inline-flex items-center justify-center border-[3px] border-black bg-[#FFD100] text-black px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white transition-colors"
              >
                Publică anunț
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center border-[3px] border-white bg-transparent text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
              >
                ← Înapoi acasă
              </Link>
            </div>
          </div>
        </section>

        <div className="mb-8 border-b-2 border-black pb-2">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-neutral-700">
            Pachete pentru publicare anunț
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
          {sellerPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`${pkg.color} border-[3px] border-black rounded-[1.5rem] p-6 ${pkg.isRecommended ? "shadow-[10px_10px_0_0_rgba(255,209,0,1)]" : "shadow-[6px_6px_0_0_rgba(0,0,0,1)]"} flex flex-col justify-between hover:-translate-y-1 transition-all`}
            >
              <div>
                <div className="flex justify-between items-start mb-5">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border-2 border-black ${pkg.badge}`}
                  >
                    {pkg.tag}
                  </span>
                  {pkg.isRecommended && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border-2 border-black bg-[#FFD100] text-black">
                      Recomandat
                    </span>
                  )}
                </div>
                <h3 className="text-3xl font-black uppercase italic tracking-tight mb-2">
                  {pkg.publicName}
                </h3>
                <p className="text-xs font-bold text-neutral-700 mb-4">
                  {pkg.benefit}
                </p>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-600 mb-6">
                  Durată: {pkg.duration}
                </p>

                <div className="space-y-3 mb-6">
                  {pkg.features.map((feat) => (
                    <div
                      key={feat}
                      className="flex items-start gap-2.5 font-bold text-xs text-neutral-700"
                    >
                      <span className="text-[#FFD100] text-lg leading-none">
                        ✓
                      </span>{" "}
                      {feat}
                    </div>
                  ))}
                </div>
                <p className="text-xs font-semibold text-neutral-700">
                  {pkg.bestFor}
                </p>
              </div>
              <div className="border-t-2 border-neutral-200 pt-5">
                <p className="text-4xl font-black italic tracking-tighter mb-5">
                  {pkg.price}
                </p>
                <Link
                  href="/pune-anunt"
                  onClick={() =>
                    trackEvent("click_pricing_package", {
                      package_id: pkg.id,
                      price: Number(pkg.price.replace(/\D/g, "") || 0),
                    })
                  }
                  className={`block w-full ${pkg.btnColor} border-[3px] border-black py-3 rounded-xl font-black uppercase tracking-widest text-xs text-center shadow-[3px_3px_0_0_rgba(0,0,0,0.15)] active:translate-y-1`}
                >
                  Publică cu acest pachet
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 border-b-2 border-black pb-2">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-neutral-700">
            Licitație rapidă
          </h2>
        </div>

        <div className="bg-[#FFD100] border-[3px] border-black rounded-[2rem] p-6 md:p-10 shadow-[10px_10px_0_0_rgba(0,0,0,1)] mb-14 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="bg-black text-[#FFD100] px-3 py-1 rounded text-xs font-black uppercase tracking-widest italic mb-4 inline-block">
                Lichiditate imediată
              </span>
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.85] mb-4 text-black">
                Licitație <br />{" "}
                <span className="text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                  Rapidă
                </span>
              </h2>
              <p className="text-sm font-bold text-black leading-relaxed mb-6">
                Tu alegi durata:{" "}
                <span className="underline decoration-white">24h, 48h sau 72h</span>.
                Activul tău devine centrul atenției în terminal, generând
                competiție directă între investitori sub presiunea timpului.
              </p>
              <ul className="space-y-3 mb-4">
                <li className="flex items-center gap-2 font-black uppercase italic text-xs text-black">
                  Competiție în timp real între investitori
                </li>
                <li className="flex items-center gap-2 font-black uppercase italic text-xs text-black">
                  Expunere accelerată către cumpărători pregătiți
                </li>
                <li className="flex items-center gap-2 font-black uppercase italic text-xs text-black">
                  Cronometru vizual pe pagina activului
                </li>
              </ul>
            </div>
            <div className="text-center lg:border-l-2 lg:border-black/20 lg:pl-10">
              <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-1">
                Taxă sesiune
              </p>
              <p className="text-6xl md:text-7xl font-black italic tracking-tighter mb-4 text-black uppercase">
                111 RON
              </p>
              <Link
                href="/pune-anunt"
                onClick={() =>
                  trackEvent("click_pricing_package", {
                    package_id: "auction",
                    price: 111,
                  })
                }
                className="inline-block w-full bg-black text-[#FFD100] border-[3px] border-black py-5 rounded-xl font-black uppercase tracking-widest text-sm shadow-[6px_6px_0_0_rgba(255,255,255,1)] hover:scale-[1.01] transition-transform active:translate-y-1"
              >
                Publică cu acest pachet
              </Link>
              <p className="text-xs font-semibold mt-4 text-black/70">
                Potrivit pentru active cu nevoie de viteză maximă.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 border-b-2 border-black pb-2">
          <h2 className="text-xl font-black uppercase italic tracking-tight text-neutral-700">
            Servicii cumpărători
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white border-[3px] border-black p-6 rounded-[1.5rem] shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2">
              Cerere Capital
            </h3>
            <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest mb-6 italic">
              Anunță capital disponibil pentru achiziții urgente sub preț.
            </p>
            <p className="text-3xl font-black italic tracking-tighter mb-6">
              99 RON
            </p>
            <Link
              href="/posteaza-cerere"
              className="block w-full border-[3px] border-black py-3 rounded-lg font-black uppercase tracking-widest text-xs italic text-center hover:bg-black hover:text-[#FFD100] transition-all"
            >
              Postează bugetul
            </Link>
          </div>

          <div className="bg-white border-[3px] border-black p-6 rounded-[1.5rem] shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2">
              Ofertă Guest
            </h3>
            <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest mb-6 italic">
              Trimite o ofertă directă fără a avea un cont verificat.
            </p>
            <p className="text-3xl font-black italic tracking-tighter mb-6">
              49 RON
            </p>
            <Link
              href="/capital-disponibil"
              className="block w-full border-[3px] border-black py-3 rounded-lg font-black uppercase tracking-widest text-xs italic text-center hover:bg-black hover:text-[#FFD100] transition-all"
            >
              Vinde-i activul tău
            </Link>
          </div>
        </div>

        <section className="mb-8 bg-[#FDFCF8] border-[3px] border-black rounded-[1.5rem] p-6 md:p-8 shadow-[6px_6px_0_0_rgba(255,209,0,0.85)]">
          <h2 className="text-2xl font-black uppercase italic tracking-tight mb-5">
            Cum aleg pachetul potrivit?
          </h2>
          <div className="space-y-3 text-sm text-neutral-700">
            <p>
              <span className="font-black text-black">Dacă nu te grăbești:</span>{" "}
              Expunere Maximă.
            </p>
            <p>
              <span className="font-black text-black">
                Dacă vrei echilibru preț/viteză:
              </span>{" "}
              Vânzare Rapidă.
            </p>
            <p>
              <span className="font-black text-black">
                Dacă ai nevoie de lichiditate imediată:
              </span>{" "}
              Vânzare Urgentă sau Licitație Rapidă.
            </p>
          </div>
        </section>

        <p className="text-xs text-neutral-600 mb-4">
          Plata activează publicarea și expunerea anunțului. Nu garantează
          vânzarea activului.
        </p>
      </div>
    </div>
  );
}
