"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export default function TarifeClient() {
  const sellerPackages = [
    {
      id: "economy",
      name: "Economy",
      publicName: "Expunere Maximă",
      bestFor: "Pentru anunțuri care au nevoie de mai mult timp la vedere.",
      benefit: "Listare vizibilă 30 zile, timp pentru oferte și mesaje.",
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
      bestFor: "Pentru listări echilibrate între timp, cost și vizibilitate.",
      benefit: "14 zile de expunere cu accent pe vizibilitate în listă.",
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
      bestFor: "Pentru situații în care vrei răspuns rapid.",
      benefit: "Fereastră scurtă (48 ore) pentru mesaje și oferte rapide.",
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
                  href={`/pune-anunt?package=${pkg.id}`}
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
            Licitație deschisă 30 zile
          </h2>
        </div>

        <div className="bg-[#FFD100] border-[3px] border-black rounded-[2rem] p-6 md:p-10 shadow-[10px_10px_0_0_rgba(0,0,0,1)] mb-14 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="bg-black text-[#FFD100] px-3 py-1 rounded text-xs font-black uppercase tracking-widest italic mb-4 inline-block">
                Vizibilitate extinsă
              </span>
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-[0.85] mb-4 text-black">
                Licitație <br />{" "}
                <span className="text-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                  deschisă 30 zile
                </span>
              </h2>
              <p className="text-sm font-bold text-black leading-relaxed mb-4">
                Vizibilitate extinsă până la{" "}
                <span className="underline decoration-white">30 zile</span> și fereastră de ofertare pe întreaga
                perioadă. Comparativ cu urgentă (48 ore), ai mai mult timp să strângi și să compari oferte, fără escrow
                sau plată între părți prin platformă.
              </p>
              <p className="text-xs font-bold text-black leading-relaxed mb-4">
                Pentru active unde vrei să strângi mai multe oferte și să alegi manual varianta potrivită. Include
                afișare ca licitație, fereastră de ofertare 30 zile și semnale publice de interes: număr oferte, cea mai
                mare ofertă și timp rămas.
              </p>
              <p className="text-sm font-bold text-black leading-relaxed mb-4">
                Nu există câștigător automat. Tu alegi manual dacă accepți o ofertă.
              </p>
              <p className="text-xs font-bold text-black leading-relaxed mb-4">
                Acceptarea unei oferte nu finalizează automat tranzacția. Plata și predarea se stabilesc direct între
                părți.
              </p>
              <ul className="space-y-3 mb-4">
                <li className="flex items-center gap-2 font-black uppercase italic text-xs text-black">
                  Oferte în timpul celor 30 de zile de listare eligibilă
                </li>
                <li className="flex items-center gap-2 font-black uppercase italic text-xs text-black">
                  Expunere susținută către cumpărători și investitori
                </li>
                <li className="flex items-center gap-2 font-black uppercase italic text-xs text-black">
                  Dată clară de expirare vizibilă pe anunț
                </li>
              </ul>
            </div>
            <div className="text-center lg:border-l-2 lg:border-black/20 lg:pl-10">
              <p className="text-xs font-black uppercase tracking-widest text-black/60 mb-1">
                Taxă listare licitație
              </p>
              <p className="text-6xl md:text-7xl font-black italic tracking-tighter mb-4 text-black uppercase">
                111 RON
              </p>
              <Link
                href="/pune-anunt?package=auction"
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
                Când vrei mai mult timp pentru oferte și alegerea manuală, nu doar sprint 48h.
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
              Vânzare Urgentă (48h) sau Licitație deschisă 30 zile.
            </p>
          </div>
        </section>

        <section className="mb-8 rounded-[1.5rem] border-[3px] border-black bg-white p-5 md:p-7 shadow-[4px_4px_0_0_rgba(0,0,0,0.12)]">
          <h2 className="text-lg font-black uppercase italic tracking-tight text-black md:text-xl">
            Tranzacții directe, cu atenție
          </h2>
          <p className="mt-3 text-xs font-medium leading-relaxed text-neutral-800 md:text-sm">
            Quick Exit nu procesează plata dintre părți și nu ține fonduri în custodie. Verifică activul, actele și
            identitatea celeilalte părți înainte de plată sau predare.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs font-medium leading-relaxed text-neutral-800 md:text-sm">
            <li>Nu trimite bani în avans fără verificări.</li>
            <li>Pentru sume mari, folosește contract și consultanță de specialitate.</li>
            <li>Nu introduce datele cardului în linkuri primite de la alți utilizatori.</li>
          </ul>
        </section>

        <p className="text-xs text-neutral-600 mb-4">
          Plata activează publicarea și expunerea anunțului. Nu garantează
          vânzarea activului.
        </p>
      </div>
    </div>
  );
}
