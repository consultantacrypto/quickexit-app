"use client";
import { ro } from "../../locales/ro";

export default function EvaluationPage() {
  const { evaluation } = ro;

  return (
    <div className="min-h-screen bg-white py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#FFD100] font-black tracking-[0.3em] text-xs uppercase block mb-4">AI Engine v1.0</span>
          <h1 className="text-5xl font-black text-black tracking-tighter mb-4 uppercase italic">{evaluation.title}</h1>
          <p className="text-gray-500 font-medium">{evaluation.subtitle}</p>
        </div>

        <form className="bg-white border-2 border-black p-8 md:p-12 rounded-[2rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
          <div className="space-y-8">
            {/* TIP ACTIV */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-4 text-gray-400">{evaluation.assetType}</label>
              <select className="w-full bg-gray-50 border-b-2 border-gray-200 py-4 px-2 focus:outline-none focus:border-black font-bold text-lg appearance-none">
                <option>Imobiliare</option>
                <option>Auto / Luxury Cars</option>
                <option>Business / Afacere</option>
                <option>Ceasuri / Bijuterii</option>
                <option>Crypto / Altele</option>
              </select>
            </div>

            {/* VALOARE */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-4 text-gray-400">{evaluation.estimatedValue}</label>
              <input 
                type="text" 
                placeholder="ex: 150.000 €"
                className="w-full bg-gray-50 border-b-2 border-gray-200 py-4 px-2 focus:outline-none focus:border-black font-bold text-2xl tracking-tighter"
              />
            </div>

            {/* URGENTA */}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-4 text-gray-400">{evaluation.urgency}</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button type="button" className="p-4 border-2 border-gray-100 rounded-xl font-bold hover:border-black transition-all text-sm">{evaluation.urgencyLow}</button>
                <button type="button" className="p-4 border-2 border-gray-100 rounded-xl font-bold hover:border-black transition-all text-sm">{evaluation.urgencyMedium}</button>
                <button type="button" className="p-4 border-2 border-red-500 bg-red-50 text-red-600 rounded-xl font-bold text-sm">{evaluation.urgencyHigh}</button>
              </div>
            </div>

            {/* SUBMIT */}
            <button className="w-full bg-black text-[#FFD100] py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:scale-[1.02] transition-transform shadow-xl">
              {evaluation.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}