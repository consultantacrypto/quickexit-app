"use client";

import { useState } from "react";

export default function EvaluationPage() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const triggerAI = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setStep(3);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-6 font-sans antialiased text-black">
      <div className="max-w-6xl mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          <div className="lg:col-span-8">
            {/* PASUL 1: EDUCARE ȘI CATEGORIE */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="mb-12">
                  <h2 className="text-5xl md:text-7xl font-black text-black tracking-tighter uppercase italic leading-[0.9] mb-6">
                    Vinde la prețul <span className="text-[#FFD100]">Corect</span>.
                  </h2>
                  <p className="text-lg font-bold text-gray-500 uppercase tracking-tight max-w-2xl leading-tight border-l-4 border-black pl-6">
                    Majoritatea anunțurilor eșuează din cauza prețului greșit. 
                    <span className="text-black"> Analiza noastră verifică piața în timp real</span> ca să știi exact cât poți încasa astăzi.
                  </p>
                </div>

                <div className="mb-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-black italic">Ce vrei să analizăm astăzi?</p>
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
                            formData.subCategory === sub 
                              ? 'bg-[#FFD100] border-black text-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]' 
                              : 'bg-white border-gray-200 text-black hover:border-black'
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
                      <h3 className="text-sm font-black uppercase tracking-widest mb-2 italic text-black">
                        🔍 Pasul Logic: Detalii Activ
                      </h3>
                      <p className="text-[11px] text-gray-500 font-bold uppercase mb-6 leading-relaxed">
                        Fără date precise, evaluarea e doar o presupunere. 
                        Introdu modelul sau seria pentru a scana prețurile reale pe site-urile de profil.
                      </p>
                      
                      <textarea 
                        value={formData.technicalDetails}
                        onChange={(e) => setFormData({...formData, technicalDetails: e.target.value})}
                        placeholder="Ex: BMW 520d 2021, Dotări, Stare..."
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
                  Continuă la strategia de preț →
                </button>
              </div>
            )}

            {/* PASUL 2: LOGICA DE URGENȚĂ */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h2 className="text-5xl md:text-7xl font-black text-black tracking-tighter uppercase italic leading-[0.9] mb-8">
                  Cât de <span className="text-red-600">Tare</span> ai nevoie de <span className="text-[#FFD100]">Bani</span>?
                </h2>
                <p className="text-gray-500 font-bold uppercase text-[12px] tracking-widest mb-10 italic border-l-4 border-[#FFD100] pl-6">
                  Prețul nu este fix. El depinde de <span className="text-black underline">viteza de lichidare</span>. 
                  Alege cum vrei să vindem:
                </p>
                
                <div className="grid grid-cols-1 gap-4 mb-12">
                  {[
                    { id: 'standard', label: 'Răbdare Maximă', info: 'Obține prețul cel mai mare', desc: 'Ideal dacă poți aștepta un cumpărător retail (7-14 zile).' },
                    { id: 'urgent', label: 'Lichidare Rapidă', info: 'Banii în 48 de ore', desc: 'Calibrăm prețul pentru investitorii care cumpără rapid.' },
                    { id: 'extreme', label: 'EXTREME CASH', info: 'Vrei banii astăzi', desc: 'Cea mai agresivă evaluare pentru lichiditate instant.' }
                  ].map((u) => (
                    <button 
                      key={u.id}
                      onClick={() => setFormData({...formData, urgency: u.id})}
                      className={`p-8 rounded-[2rem] border-[3px] text-left transition-all ${
                        formData.urgency === u.id 
                          ? (u.id === 'extreme' ? 'bg-black border-black text-[#FFD100] scale-[1.02] shadow-2xl' : 'border-black bg-[#FFD100]/10 scale-[1.02] shadow-xl') 
                          : 'bg-gray-50 border-gray-100 opacity-60'
                      }`}
                    >
                      <span className="block text-2xl font-black uppercase italic mb-1">{u.label}</span>
                      <span className="block text-[10px] font-black uppercase tracking-[0.2em] mb-3">{u.info}</span>
                      <p className="text-[10px] font-bold uppercase tracking-tight opacity-60 leading-tight">{u.desc}</p>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                  <button onClick={() => setFormData({...formData, saleType: 'direct'})} className={`p-8 rounded-2xl border-2 font-black italic transition-all ${formData.saleType === 'direct' ? 'bg-black text-white border-black shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>VÂNZARE DIRECTĂ</button>
                  <button onClick={() => setFormData({...formData, saleType: 'auction'})} className={`p-8 rounded-2xl border-2 font-black italic transition-all ${formData.saleType === 'auction' ? 'bg-[#FFD100] text-black border-black shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>LICITAȚIE FLASH</button>
                </div>

                <button 
                  onClick={triggerAI}
                  className="w-full bg-black text-[#FFD100] py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-[#FFD100] hover:text-black transition-all text-xl shadow-2xl italic"
                >
                  {isAnalyzing ? "Analizăm baza de date..." : "Află prețul de vânzare acum"}
                </button>
              </div>
            )}

            {/* PASUL 3: FINAL */}
            {step === 3 && (
              <div className="text-center py-20 animate-in zoom-in-95 duration-500 bg-black rounded-[3rem] text-white shadow-[30px_30px_0px_0px_rgba(255,209,0,1)]">
                <h3 className="text-5xl font-black italic uppercase mb-6 text-[#FFD100]">Analiză Completă</h3>
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] mb-12 px-10 leading-relaxed text-sm">
                   Acum ai o cifră bazată pe realitate, nu pe presupuneri. 
                </p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="bg-[#FFD100] text-black px-12 py-6 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all italic text-xl"
                >
                  Vezi prețul recomandat
                </button>
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
              
              <div className="space-y-6">
                <p className="text-[11px] font-black text-black uppercase tracking-tight leading-tight italic">
                  "Evaluarea te ajută să nu pierzi bani și să vinzi de 3x mai repede."
                </p>
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

              <div className="mt-12 p-6 bg-black rounded-2xl">
                <p className="text-[10px] text-[#FFD100] font-black uppercase tracking-[0.2em] mb-2 italic text-center underline">Status Analiză</p>
                <div className="text-sm font-black text-white italic text-center uppercase leading-tight">
                  {isAnalyzing ? (
                    'Căutăm oferte similare...'
                  ) : formData.subCategory ? (
                    'Datele sunt gata de scanare'
                  ) : (
                    'Așteptare selectie produs'
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}