"use client";

import { useState } from "react";
import Link from "next/link";

export default function PostAdPage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100]">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Terminal */}
        <div className="mb-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 italic">Terminal de Lichiditate</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
            Listează <span className="text-[#FFD100]">Activul</span>
          </h1>
        </div>

        {/* Progresie */}
        <div className="flex justify-between mb-8 border-b-4 border-black pb-4">
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 1 ? 'text-black' : 'text-gray-300'}`}>1. Detalii</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 2 ? 'text-black' : 'text-gray-300'}`}>2. AI Pricing</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 3 ? 'text-black' : 'text-gray-300'}`}>3. Pachet & Plată</div>
        </div>

        {/* Container Formular Brutalist */}
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border-[3px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase italic mb-6">Ce dorești să vinzi?</h2>
              
              <div className="grid grid-cols-2 gap-4">
                {['Auto & Moto', 'Imobiliare', 'Ceasuri Lux', 'Business'].map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`p-4 border-[3px] rounded-2xl font-black uppercase text-xs italic transition-all ${category === cat ? 'border-black bg-[#FFD100] shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 hover:border-black'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="pt-6">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Titlu Anunț (Scurt și Clar)</label>
                <input type="text" placeholder="Ex: Mercedes S-Class 2022" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
              </div>

              <button onClick={() => setStep(2)} className="w-full mt-8 bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:bg-gray-900 transition-colors">
                Continuă →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center">
              <h2 className="text-2xl font-black uppercase italic">Evaluare & <span className="text-red-600">Urgență</span></h2>
              <p className="text-xs font-bold text-gray-500 uppercase">Setează prețul corect pentru a declanșa Alertele Sniper.</p>
              
              <div className="bg-gray-50 p-6 rounded-2xl border-[3px] border-black text-left">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Prețul tău de vânzare (EUR)</label>
                <input type="number" placeholder="50000" className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-black text-2xl italic focus:outline-none" />
              </div>

              <div className="bg-[#FFD100] p-6 rounded-2xl border-[3px] border-black mt-4 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/60">Tipul Vânzării</p>
                <select className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-black text-sm uppercase bg-white focus:outline-none">
                  <option>Vânzare Standard (Fără grabă)</option>
                  <option>Lichidare (Discount aplicat)</option>
                  <option>Panic Sell (Cel mai mic preț din piață)</option>
                </select>
              </div>

              <div className="flex gap-4 pt-6">
                <button onClick={() => setStep(1)} className="w-1/3 border-[3px] border-black py-5 rounded-2xl font-black uppercase text-xs italic">Înapoi</button>
                <button onClick={() => setStep(3)} className="w-2/3 bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase text-sm italic">Spre Pachete →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase italic mb-6">Alege Pachetul</h2>
              
              <div className="space-y-4">
                {/* Pachet Standard */}
                <div className="p-6 border-[3px] border-gray-200 rounded-2xl flex justify-between items-center hover:border-black cursor-pointer group">
                  <div>
                    <p className="font-black uppercase italic text-lg">Standard <span className="text-[10px] bg-gray-100 px-2 py-1 rounded">30 Zile</span></p>
                    <p className="text-xs font-bold text-gray-500">Expunere normală în platformă.</p>
                  </div>
                  <div className="font-black text-2xl group-hover:text-[#FFD100] transition-colors">99 RON</div>
                </div>

                {/* Pachet Flash */}
                <div className="p-6 border-[3px] border-black bg-black text-white rounded-2xl flex justify-between items-center relative overflow-hidden shadow-[6px_6px_0_0_rgba(255,209,0,1)]">
                  <div className="absolute top-0 right-0 bg-[#FFD100] text-black text-[8px] font-black px-3 py-1 uppercase tracking-widest rounded-bl-lg">Recomandat</div>
                  <div>
                    <p className="font-black uppercase italic text-lg text-[#FFD100]">Flash Liquidity <span className="text-[10px] border border-[#FFD100] px-2 py-1 rounded text-white ml-2">48 ORE</span></p>
                    <p className="text-xs font-bold text-gray-300 mt-1 max-w-[200px]">Trimitere instantă SMS/Email către toți investitorii Sniper.</p>
                  </div>
                  <div className="font-black text-2xl text-[#FFD100]">149 RON</div>
                </div>
              </div>

              <p className="text-[9px] font-bold text-gray-400 text-center uppercase pt-4">*KYC (Verificarea identității) se va face automat după efectuarea plății cu cardul (Stripe) sau Crypto.</p>

              <button className="w-full mt-4 bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:scale-[1.02] transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                Plătește & Activează Anunțul
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}