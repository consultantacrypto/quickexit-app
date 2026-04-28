"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Zap, ArrowRight, Info, Search, Gavel } from "lucide-react";

export default function EvaluationPage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Auto & Moto");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Stocăm TOATE datele granulare exact ca în pune-anunt
  const [formData, setFormData] = useState({
    // Auto & Moto
    make: "", model: "", year: "", km: "", fuel: "Benzină", engine: "", transmission: "Automată", bodyType: "Sedan", status: "Înmatriculat RO", tva: "Nu (Vânzător PF)",
    // Imobiliare
    propType: "Apartament", surface: "", rooms: "", buildYear: "", floor: "", parking: "Inclus în preț", landSurface: "", location: "",
    // Lux & Ceasuri
    brand: "", refModel: "", purchaseYear: "", mechanism: "Automatic", material: "", boxPapers: "Full Set (Cutie + Acte)",
    // Afaceri
    businessDomain: "", businessAge: "", revenue: "", profit: "", employees: "", includes: "",
    // Gadgets / Foto
    specs: "", warranty: "",
    // Global
    description: ""
  });

  const categoriesList = [
    'Auto & Moto', 'Imobiliare', 'Lux & Ceasuri', 
    'Afaceri de vânzare', 'Gadgets', 'Foto & Audio'
  ];

  const triggerAI = async () => {
    setIsAnalyzing(true);
    try {
      const apiCategory = category === 'Auto & Moto' ? 'auto' :
                          category === 'Imobiliare' ? 'imobiliare' :
                          category === 'Lux & Ceasuri' ? 'lux' :
                          category === 'Afaceri de vânzare' ? 'business' :
                          category === 'Gadgets' ? 'gadgets' : 'foto';

      const payload = {
        category: apiCategory,
        make: formData.make,
        model: formData.model,
        year: formData.year ? parseInt(formData.year) : undefined,
        km: formData.km ? parseInt(formData.km) : undefined,
        surface: formData.surface ? parseInt(formData.surface) : undefined,
        location: formData.location,
        brand: formData.brand,
        revenue: formData.revenue ? parseInt(formData.revenue) : undefined,
        extraDetails: formData,
        save_report: true 
      };

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setEvaluationResult(data);
        setStep(2);
      } else {
        alert(data.message || "Eroare de procesare. Verifică datele introduse.");
      }
    } catch (error) {
      alert("Terminalul de preț este momentan indisponibil.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatPrice = (price: any) => {
    if (!price || isNaN(price)) return "N/A";
    return `€${Number(price).toLocaleString('ro-RO')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-24 px-4 font-sans text-black selection:bg-[#FFD100] antialiased">
      {/* AM MODIFICAT MAX-W-5XL în MAX-W-4XL PENTRU O CENTRARE PERFECTĂ PE DESKTOP */}
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER TERMINAL */}
        <div className="mb-10 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-gray-400">AI Evaluator Activ</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
            Cât <span className="text-[#FFD100]">Valorează?</span>
          </h1>
          <p className="text-xs md:text-sm font-bold text-gray-500 uppercase italic tracking-widest max-w-xl mx-auto leading-relaxed">
            Primul marketplace din România cu evaluator AI integrat. Analizăm piața în timp real și scanăm mii de anunțuri similare cu produsul tău.
          </p>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border-[4px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] md:shadow-[15px_15px_0_0_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Search size={150} strokeWidth={3} />
          </div>

          {/* PASUL 1: FORMULARUL GRANULAR */}
          {step === 1 && (
            <div className="space-y-8 relative z-10">
              
              <div>
                <h2 className="text-lg md:text-xl font-black uppercase italic mb-4">1. Selectează Categoria</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categoriesList.map((cat) => (
                    <button 
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`p-3 md:p-4 border-[3px] rounded-xl font-black uppercase text-[10px] md:text-xs italic transition-all ${category === cat ? 'border-black bg-black text-[#FFD100] shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 hover:border-black hover:bg-gray-50'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t-2 border-gray-100">
                <h2 className="text-lg md:text-xl font-black uppercase italic mb-6">2. Date Tehnice (Precizie AI)</h2>
                {/* GRILA ADAPTATĂ PENTRU A FI COMPACTĂ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
                  
                  {/* AUTO & MOTO */}
                  {category === 'Auto & Moto' && (
                    <>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Marcă</label>
                      <input type="text" placeholder="Ex: Audi" value={formData.make} onChange={(e) => setFormData({...formData, make: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-[#FFD100]/10" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Model</label>
                      <input type="text" placeholder="Ex: A4" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-[#FFD100]/10" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Fabricație</label>
                      <input type="number" placeholder="2021" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rulaj (KM Curenți)</label>
                      <input type="number" placeholder="85000" value={formData.km} onChange={(e) => setFormData({...formData, km: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Combustibil</label>
                      <select value={formData.fuel} onChange={(e) => setFormData({...formData, fuel: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"><option>Benzină</option><option>Diesel</option><option>Hibrid</option><option>Electric</option></select></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Motorizare / CP</label>
                      <input type="text" placeholder="Ex: 2.0 / 190 CP" value={formData.engine} onChange={(e) => setFormData({...formData, engine: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cutie de viteze</label>
                      <select value={formData.transmission} onChange={(e) => setFormData({...formData, transmission: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"><option>Automată</option><option>Manuală</option></select></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Caroserie</label>
                      <select value={formData.bodyType} onChange={(e) => setFormData({...formData, bodyType: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"><option>Sedan</option><option>SUV</option><option>Coupe</option><option>Cabrio</option><option>Off-Road</option></select></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">TVA DEDUCTIBIL?</label>
                      <select value={formData.tva} onChange={(e) => setFormData({...formData, tva: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"><option>Nu (Vânzător PF)</option><option>Da (Vânzător PJ)</option></select></div>
                    </>
                  )}

                  {/* IMOBILIARE */}
                  {category === 'Imobiliare' && (
                    <>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tip Proprietate</label>
                      <select value={formData.propType} onChange={(e) => setFormData({...formData, propType: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"><option>Apartament</option><option>Casă / Vilă</option><option>Teren</option><option>Spațiu Comercial</option></select></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suprafață Utilă (mp)</label>
                      <input type="number" placeholder="Ex: 85" value={formData.surface} onChange={(e) => setFormData({...formData, surface: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Număr Camere</label>
                      <input type="number" placeholder="Ex: 3" value={formData.rooms} onChange={(e) => setFormData({...formData, rooms: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" /></div>
                      <div className="md:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Localizare Exactă</label>
                      <input type="text" placeholder="Ex: București, Sector 1" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Construcție</label>
                      <input type="number" placeholder="Ex: 2023" value={formData.buildYear} onChange={(e) => setFormData({...formData, buildYear: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" /></div>
                    </>
                  )}

                  {/* LUX & CEASURI */}
                  {category === 'Lux & Ceasuri' && (
                    <>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Brand</label>
                      <input type="text" placeholder="Ex: Rolex" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Model & Referință</label>
                      <input type="text" placeholder="Ex: Submariner" value={formData.refModel} onChange={(e) => setFormData({...formData, refModel: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pachet & Proveniență</label>
                      <select value={formData.boxPapers} onChange={(e) => setFormData({...formData, boxPapers: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none"><option>Full Set (Cutie + Acte)</option><option>Doar Ceasul</option><option>Ceas + Cutie</option></select></div>
                    </>
                  )}

                  {/* AFACERI DE VÂNZARE */}
                  {category === 'Afaceri de vânzare' && (
                    <>
                      <div className="sm:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Domeniu de Activitate</label>
                      <input type="text" placeholder="Ex: E-commerce, Restaurant, Producție" value={formData.businessDomain} onChange={(e) => setFormData({...formData, businessDomain: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cifră Afaceri Anuală (€)</label>
                      <input type="number" placeholder="Ex: 250000" value={formData.revenue} onChange={(e) => setFormData({...formData, revenue: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" /></div>
                    </>
                  )}

                  {/* GADGETS / FOTO */}
                  {(category === 'Gadgets' || category === 'Foto & Audio') && (
                    <>
                      <div className="sm:col-span-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Brand & Model Exact</label>
                      <input type="text" placeholder="Ex: Apple MacBook Pro M3 Max" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" /></div>
                      <div><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Garanție Rămasă</label>
                      <input type="text" placeholder="Ex: 12 Luni" value={formData.warranty} onChange={(e) => setFormData({...formData, warranty: e.target.value})} className="w-full mt-2 p-3 md:p-4 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" /></div>
                    </>
                  )}
                </div>

                <div className="mt-8 pt-8 border-t-2 border-gray-100">
                  <button 
                    onClick={triggerAI} 
                    disabled={isAnalyzing}
                    className="w-full bg-black text-[#FFD100] py-5 md:py-6 rounded-2xl font-black uppercase tracking-widest text-base md:text-xl italic hover:bg-gray-900 transition-colors shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50"
                  >
                    {isAnalyzing ? "Scanăm piața..." : "Află Valoarea Reală →"}
                  </button>
                  <p className="text-center text-[9px] md:text-[10px] font-bold text-gray-400 mt-4 uppercase tracking-widest px-4">
                    Asigură-te că introduci exact marca și modelul (ex: Audi / A4) pentru ca algoritmul să găsească referințe.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PASUL 2: REZULTATE */}
          {step === 2 && evaluationResult && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              
              {!evaluationResult.estimated_market_price ? (
                
                /* ECRANUL VIP (DACA NU GĂSEȘTE DATE EXACTE) */
                <div className="text-center py-10">
                  <h3 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none mb-6">
                    Activ <span className="text-red-600">Complex</span> Identificat.
                  </h3>
                  <p className="text-xs font-bold uppercase italic tracking-widest text-gray-500 leading-relaxed mb-10 max-w-lg mx-auto">
                    Algoritmul necesită o validare manuală pentru acest model rar. Consultanții noștri te vor contacta pentru o evaluare de precizie.
                  </p>
                  <div className="flex flex-col md:flex-row justify-center gap-4">
                    <Link href="/posteaza-cerere" className="w-full md:w-auto bg-black text-[#FFD100] px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-y-1 transition-transform">
                      Evaluare Manuală
                    </Link>
                    <button onClick={() => setStep(1)} className="w-full md:w-auto border-[3px] border-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-gray-50">
                      Altă Căutare
                    </button>
                  </div>
                </div>

              ) : (

                /* ECRANUL DE SUCCES */
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 border-b-[4px] border-black pb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck size={18} className="text-green-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic text-gray-500">Analiză Validată de Piață</span>
                      </div>
                      <h3 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
                        Valoarea <span className="text-[#FFD100]">Reală</span>.
                      </h3>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl text-center min-w-[120px] border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] self-start sm:self-auto">
                      <p className="text-[9px] font-black uppercase text-gray-500 mb-1 tracking-widest">Încredere AI</p>
                      <p className={`text-3xl md:text-4xl font-black ${evaluationResult.confidence_score >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                        {evaluationResult.confidence_score || 0}%
                      </p>
                    </div>
                  </div>

                  {/* INFO BAR - EXPLICAREA DATELOR */}
                  <div className={`mb-8 p-4 rounded-xl border-[2px] flex items-start gap-4 ${evaluationResult.data_quality_label === 'market_index' ? 'bg-orange-50 border-orange-200 text-orange-800' : evaluationResult.data_quality_label === 'platform_market' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
                    <Info size={20} className="mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-xs md:text-sm uppercase tracking-widest mb-1">Status AI Evaluator:</p>
                      <p className="text-[11px] md:text-xs italic leading-relaxed">{evaluationResult.explanation || "Algoritmul a calculat prețul folosind comparabile disponibile."}</p>
                      {evaluationResult.data_quality_label !== 'low_data' && (
                        <p className="text-[9px] md:text-[10px] mt-2 font-bold opacity-70 uppercase tracking-widest">
                          Sursă calcul: {evaluationResult.live_comparable_count} anunțuri platformă | {evaluationResult.seed_comparable_count} index piață externă.
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] md:text-xs uppercase italic font-black text-black mb-4 tracking-widest">Opțiunile tale de vânzare bazate pe piața actuală:</p>

                  {/* NOUA GRILĂ SIMETRICĂ (3 SUS, 1 MARE JOS) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    
                    {/* OPTIUNEA 1: STANDARD */}
                    <div className="p-5 bg-white rounded-2xl border-[3px] border-black flex flex-col justify-between shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-[11px] font-black uppercase text-gray-500 mb-1 italic tracking-widest">Piață (Standard)</p>
                        <p className="text-[9px] font-bold uppercase text-gray-400 mb-4 italic">Max 30 zile valabilitate</p>
                      </div>
                      <p className="text-2xl md:text-3xl font-black italic">{formatPrice(evaluationResult.estimated_market_price)}</p>
                    </div>
                    
                    {/* OPTIUNEA 2: VANZARE RAPIDA */}
                    <div className="p-5 bg-white rounded-2xl border-[3px] border-black flex flex-col justify-between shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-[11px] font-black uppercase text-black mb-1 italic tracking-widest">Vânzare Rapidă</p>
                        <p className="text-[9px] font-bold uppercase text-gray-500 mb-4 italic">Interval 7-14 zile</p>
                      </div>
                      <p className="text-2xl md:text-3xl font-black italic">{formatPrice(evaluationResult.quick_exit_price)}</p>
                    </div>

                    {/* OPTIUNEA 3: LICITATIE SNIPER */}
                    <div className="p-5 bg-gray-900 text-white rounded-2xl border-[3px] border-black flex flex-col justify-between shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-transform hover:-translate-y-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[11px] font-black uppercase text-[#FFD100] mb-1 italic tracking-widest">Licitație Sniper</p>
                          <p className="text-[9px] font-bold uppercase text-gray-400 mb-4 italic">Start Recomandat</p>
                        </div>
                        <Gavel size={18} className="text-[#FFD100]" />
                      </div>
                      <p className="text-2xl md:text-3xl font-black italic">{formatPrice(evaluationResult.strong_exit_price)}</p>
                    </div>
                  </div>

                  {/* OPTIUNEA 4: QUICK EXIT (Ocupă toată lățimea jos) */}
                  <div className="p-6 md:p-8 bg-[#FFD100] rounded-3xl border-[4px] border-black flex flex-col justify-between shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative overflow-hidden transition-transform hover:scale-[1.01]">
                    <Zap className="absolute -top-4 -right-4 text-black opacity-10" size={150} />
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <p className="text-sm md:text-base font-black uppercase text-black mb-1 italic tracking-widest">Quick Exit (Lichidare)</p>
                        <p className="text-[10px] md:text-xs font-bold uppercase text-black/70 mb-4 md:mb-6 italic">Ofertă Cash în 48h</p>
                      </div>
                      <ArrowRight size={32} className="text-black hidden sm:block" />
                    </div>
                    <p className="text-5xl md:text-7xl font-black italic relative z-10">{formatPrice(evaluationResult.liquidation_price)}</p>
                  </div>
                  
                  {/* SUBSOL ACȚIUNI */}
                  <div className="mt-10 pt-6 border-t-[4px] border-black flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-[9px] md:text-[10px] font-black uppercase italic text-gray-500 tracking-wider text-center md:text-left">
                      Acest preț a fost calculat prin compararea a {evaluationResult.comparable_count || 0} anunțuri similare.
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <Link href="/pune-anunt" className="w-full sm:w-auto bg-black text-[#FFD100] px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-center hover:translate-y-1 transition-transform">
                        Vinde Acum
                      </Link>
                      <button onClick={() => setStep(1)} className="w-full sm:w-auto border-[3px] border-black bg-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-gray-50">
                        Altă Evaluare
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}