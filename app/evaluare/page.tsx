"use client";

import { useState } from "react";
import Link from "next/link";

export default function EvaluationPage() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    category: "",
    subCategory: "",
    urgency: "standard",
    saleType: "direct",
    technicalDetails: ""
  });

  const categories = {
    "Auto & Moto": ["Autoturisme", "Motociclete", "Utilitare", "Piese Auto"],
    "Imobiliare": ["Apartamente", "Case / Vile", "Terenuri", "Spații Comerciale"],
    "Telefoane & Tablete": ["iPhone", "Samsung", "iPad", "Alte Branduri"],
    "Laptop & Console": ["MacBook", "Gaming PC", "PlayStation / Xbox", "Componente"],
    "Audio & Foto": ["Sisteme Hi-Fi", "Căști Premium", "Aparate Foto", "Boxe Portabile"],
    "Afaceri & Investiții": ["Afaceri la cheie", "Echipamente Business", "Ceasuri Lux", "Crypto / Web3"]
  };

  // FUNCȚIA MAGICĂ: Apelul către API-ul real
  const triggerAI = async () => {
    setIsAnalyzing(true);
    try {
      // Simulăm o mică întârziere pentru "vibe" de procesare AI
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          make: formData.technicalDetails.split(' ')[0] || "BMW", // Parsare rudimentară pentru MVP
          model: formData.technicalDetails.split(' ')[1] || "X5",
          year: 2021, // Aici vom adăuga ulterior un câmp de an în formular
          category: "auto"
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEvaluationResult(data);
        setStep(3);
      } else {
        alert(data.message || "Nu avem suficiente date pentru acest model încă.");
      }
    } catch (error) {
      console.error("Eroare API:", error);
      alert("Eroare la conectarea cu motorul de preț.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6 font-sans antialiased text-black">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          <div className="lg:col-span-8">
            {/* PASUL 1: SELECTIE CATEGORIE */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="mb-12">
                  <h2 className="text-5xl md:text-7xl font-black text-black tracking-tighter uppercase italic leading-[0.9] mb-6">
                    Vinde la prețul <span className="text-[#FFD100]">Corect</span>.
                  </h2>
                  <p className="text-lg font-bold text-gray-500 uppercase tracking-tight max-w-2xl leading-tight border-l-4 border-black pl-6">
                    Analiza noastră verifică piața în timp real ca să știi exact cât poți încasa astăzi. [cite: 1164, 1165]
                  </p>
                </div>

                <div className="mb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(categories).map((cat) => (
                        <button 
                        key={cat}
                        onClick={() => setFormData({...formData, category: cat, subCategory: ""})}
                        className={`p-8 rounded-[2rem] border-[3px] text-left transition-all duration-300 ${
                            formData.category === cat ? 'bg-black border-black shadow-2xl scale-[1.02]' : 'bg-gray-50 border-gray-100 hover:border-black'
                        }`}
                        >
                        <span className={`block text-xl font-black uppercase italic ${formData.category === cat ? 'text-[#FFD100]' : 'text-black'}`}>{cat}</span>
                        </button>
                    ))}
                    </div>
                </div>

                {formData.category && (
                  <div className="mb-10 animate-in zoom-in-95 duration-500">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {categories[formData.category as keyof typeof categories].map((sub) => (
                        <button
                          key={sub}
                          onClick={() => setFormData({...formData, subCategory: sub})}
                          className={`px-4 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 transition-all duration-300 ${
                            formData.subCategory === sub ? 'bg-[#FFD100] border-black text-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]' : 'bg-white border-gray-200 text-black hover:border-black'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.subCategory && (
                  <div className="mb-12 animate-in zoom-in-95 duration-500">
                    <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-black">
                      <h3 className="text-sm font-black uppercase tracking-widest mb-2 italic text-black">🔍 Detalii Activ</h3>
                      <textarea 
                        value={formData.technicalDetails}
                        onChange={(e) => setFormData({...formData, technicalDetails: e.target.value})}
                        placeholder="Ex: BMW X5 2021, 85000 km, automat..."
                        className="w-full bg-white border-2 border-gray-200 p-6 rounded-2xl font-bold focus:border-[#FFD100] outline-none min-h-[120px] text-black shadow-inner"
                      />
                    </div>
                  </div>
                )}

                <button 
                  disabled={!formData.subCategory}
                  onClick={() => setStep(2)}
                  className="w-full bg-black text-[#FFD100] py-8 rounded-[2rem] font-black uppercase tracking-widest hover:scale-[1.01] transition-all disabled:opacity-20 shadow-2xl text-xl italic"
                >
                  Continuă la strategia de preț → [cite: 1180]
                </button>
              </div>
            )}

            {/* PASUL 2: URGENȚĂ */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h2 className="text-5xl md:text-7xl font-black text-black tracking-tighter uppercase italic leading-[0.9] mb-8">
                  Viteza de <span className="text-red-600">Lichidare</span>
                </h2>
                
                <div className="grid grid-cols-1 gap-4 mb-12">
                  {[
                    { id: 'standard', label: 'Răbdare Maximă', desc: 'Prețul cel mai mare, 7-14 zile.' },
                    { id: 'urgent', label: 'Lichidare Rapidă', desc: 'Calibrăm pentru investitori rapizi.' },
                    { id: 'extreme', label: 'EXTREME CASH', desc: 'Vrei banii astăzi (Liquidation Mode).' }
                  ].map((u) => (
                    <button 
                      key={u.id}
                      onClick={() => setFormData({...formData, urgency: u.id})}
                      className={`p-8 rounded-[2rem] border-[3px] text-left transition-all ${
                        formData.urgency === u.id ? 'border-black bg-[#FFD100]/10 scale-[1.02] shadow-xl' : 'bg-gray-50 border-gray-100 opacity-60'
                      }`}
                    >
                      <span className="block text-2xl font-black uppercase italic mb-1">{u.label}</span>
                      <p className="text-[10px] font-bold uppercase tracking-tight opacity-60">{u.desc}</p>
                    </button>
                  ))}
                </div>

                <button 
                  onClick={triggerAI}
                  disabled={isAnalyzing}
                  className="w-full bg-black text-[#FFD100] py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-[#FFD100] hover:text-black transition-all text-xl shadow-2xl italic"
                >
                  {isAnalyzing ? "Analizăm piața reală..." : "Generează Raportul de Lichiditate"} [cite: 1194, 1195]
                </button>
              </div>
            )}

            {/* PASUL 3: RAPORTUL DE LICHIDITATE (FINAL) */}
            {step === 3 && evaluationResult && (
              <div className="animate-in zoom-in-95 duration-500 space-y-8">
                <div className="bg-black p-10 rounded-[3rem] text-white shadow-[20px_20px_0px_0px_rgba(255,209,0,1)] border-4 border-black">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <p className="text-[#FFD100] font-black uppercase tracking-widest text-xs italic mb-2">Raport Generat</p>
                      <h3 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Scara de <span className="text-[#FFD100]">Lichiditate</span></h3>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/20 text-center">
                       <p className="text-[8px] font-black uppercase text-gray-400">Confidence Score</p>
                       <p className="text-3xl font-black text-[#FFD100]">{evaluationResult.confidence_score}%</p>
                    </div>
                  </div>

                  {/* Market Anchor (Ancora) */}
                  <div className="mb-12 p-6 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Preț Mediu Listat (Piață)</p>
                    <p className="text-5xl font-black italic text-gray-400 line-through opacity-50">€{evaluationResult.estimated_market_price.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-gray-500 mt-2 uppercase italic">Timp estimat de vânzare la acest preț: 45-90 zile.</p>
                  </div>

                  {/* Cele 3 Opțiuni de EXIT */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-[#FFD100] rounded-2xl border-2 border-black text-black">
                       <p className="text-[9px] font-black uppercase mb-1">Quick Exit</p>
                       <p className="text-3xl font-black italic mb-4">€{evaluationResult.quick_exit_price.toLocaleString()}</p>
                       <Link href={`/pune-anunt?price=${evaluationResult.quick_exit_price}`} className="block w-full bg-black text-white py-3 rounded-xl font-black uppercase text-[9px] text-center italic">Alege Strategia</Link>
                    </div>
                    <div className="p-6 bg-white rounded-2xl border-2 border-black text-black scale-105 shadow-2xl relative">
                       <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Sweet Spot</div>
                       <p className="text-[9px] font-black uppercase mb-1">Strong Exit</p>
                       <p className="text-3xl font-black italic mb-4">€{evaluationResult.strong_exit_price.toLocaleString()}</p>
                       <Link href={`/pune-anunt?price=${evaluationResult.strong_exit_price}`} className="block w-full bg-red-600 text-white py-3 rounded-xl font-black uppercase text-[9px] text-center italic">Lichidează Acum</Link>
                    </div>
                    <div className="p-6 bg-gray-800 rounded-2xl border-2 border-white/20 text-white">
                       <p className="text-[9px] font-black uppercase mb-1 text-[#FFD100]">Liquidation</p>
                       <p className="text-3xl font-black italic mb-4">€{evaluationResult.liquidation_price.toLocaleString()}</p>
                       <Link href={`/pune-anunt?price=${evaluationResult.liquidation_price}`} className="block w-full bg-[#FFD100] text-black py-3 rounded-xl font-black uppercase text-[9px] text-center italic">Cash Imediat</Link>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <button onClick={() => setStep(1)} className="text-[10px] font-black uppercase text-gray-400 hover:text-black transition-colors italic border-b-2 border-transparent hover:border-black pb-1">← Reia Evaluarea</button>
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR - CONSULTANTUL VIRTUAL */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 bg-gray-50 border-[3px] border-black p-8 rounded-[2.5rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-black italic">Consultant AI Online</span>
              </div>
              <div className="space-y-6 text-[11px] font-black text-black uppercase tracking-tight leading-tight italic">
                <p>"Evaluarea te ajută să nu pierzi bani și să vinzi de 3x mai repede." [cite: 1200, 1201]</p>
                <div className="w-full h-px bg-gray-200" />
                <div className="space-y-3">
                  {['Autovit', 'OLX', 'eMAG', 'Imobiliare'].map((s) => (
                    <div key={s} className="flex justify-between items-center text-[10px] font-black uppercase italic">
                      <span className="text-gray-400">{s} Scan:</span>
                      <span className="text-green-500">ACTIV</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}