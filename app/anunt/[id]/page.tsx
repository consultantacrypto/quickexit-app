import Image from "next/image";
import Link from "next/link";
import { ro } from "../../../locales/ro";

export default function AdDetail() {
  const { cards } = ro;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Navigare Inapoi */}
        <Link href="/" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-black mb-8 transition-colors">
          ← ÎNAPOI LA OPORTUNITĂȚI
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Partea Stângă: Galerie Foto */}
          <div className="space-y-4">
            <div className="relative h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
              <Image 
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80" 
                alt="Property Detail" 
                fill 
                className="object-cover"
              />
              <div className="absolute top-6 left-6 bg-red-600 text-white px-6 py-3 rounded-2xl font-black text-xl shadow-xl">
                -30% DISCOUNT
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="relative h-32 rounded-2xl overflow-hidden border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity">
                  <Image src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80" alt="thumb" fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Partea Dreaptă: Detalii & Acțiune */}
          <div className="flex flex-col justify-center">
            <div className="inline-block px-4 py-1 bg-black text-[#FFD100] text-[10px] font-black tracking-[0.2em] uppercase rounded-full w-fit mb-6">
              PANIC SELL • VERIFICAT KYC
            </div>
            
            <h1 className="text-5xl font-black text-black mb-4 tracking-tighter leading-tight uppercase italic">
              Penthouse Panwa Bay - Phuket
            </h1>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-[#FFD100]/10 border border-[#FFD100] px-4 py-2 rounded-xl">
                <span className="text-[10px] font-black block text-gray-500 uppercase tracking-tighter">Deal Score AI</span>
                <span className="text-2xl font-black text-black">9.8/10</span>
              </div>
              <p className="text-gray-500 font-medium max-w-[200px] text-xs">
                Oportunitate rară: Evaluarea AI confirmă un preț cu 30% sub piață.
              </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">{cards.marketPrice}</span>
                <span className="text-xl font-bold text-gray-400 line-through italic">€850.000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-black font-black uppercase text-sm tracking-widest">PREȚ QUICK EXIT</span>
                <span className="text-5xl font-black text-black tracking-tighter">€590.000</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
               <button className="bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl text-sm">
                 VREAU SĂ CUMPĂR
               </button>
               <button className="bg-white text-black border-2 border-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all text-sm">
                 DESCARCĂ AUDIT
               </button>
            </div>

            <div className="border-t border-gray-100 pt-8">
              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 mb-4">Motivul Vânzării</h4>
              <p className="text-gray-600 font-medium italic leading-relaxed">
                "Proprietarul are nevoie de lichiditate imediată pentru un proiect Web3 în derulare. Tranzacția trebuie finalizată în maximum 72 de ore."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}