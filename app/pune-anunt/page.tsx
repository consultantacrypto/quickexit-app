"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; 

export default function PostAdPage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Auto & Moto");
  const [images, setImages] = useState<File[]>([]); 
  
  const [adTitle, setAdTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketPrice, setMarketPrice] = useState(0);
  const [analyzedItems, setAnalyzedItems] = useState(0);
  const [exitPrice, setExitPrice] = useState("");
  const [saleStrategy, setSaleStrategy] = useState("standard");
  const [selectedPackage, setSelectedPackage] = useState("flash"); 
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const categoriesList = [
    'Auto & Moto', 'Imobiliare', 'Lux & Ceasuri', 
    'Afaceri de vânzare', 'Gadgets', 'Foto & Audio'
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  // NOTĂ PENTRU LIVE: Aici va veni apelul către API-ul real de AI în faza următoare
  const generateAiPricing = () => {
    setStep(2);
    setIsAnalyzing(true);
    
    setTimeout(() => {
      const mockPrices: Record<string, number> = {
        'Auto & Moto': 85000,
        'Imobiliare': 320000,
        'Lux & Ceasuri': 45000,
        'Afaceri de vânzare': 150000,
        'Gadgets': 2500,
        'Foto & Audio': 4000
      };
      setMarketPrice(mockPrices[category] || 50000);
      setAnalyzedItems(Math.floor(Math.random() * 30) + 15);
      setExitPrice(""); 
      setIsAnalyzing(false);
    }, 3000);
  };

  const calculatedDiscount = exitPrice && marketPrice ? Math.round((1 - Number(exitPrice) / marketPrice) * 100) : 0;

  // FUNCȚIA DE SALVARE 100% REALĂ (CU POZE)
  const handleFinalSubmit = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Eroare: Trebuie să fii logat pentru a posta un anunț! Folosește meniul 'Contul Meu'.");
        setIsSaving(false);
        return;
      }

      // 1. UPLOAD IMAGINI ÎN SUPABASE STORAGE
      const uploadedImageUrls: string[] = [];
      
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('listings')
            .upload(filePath, file);
            
          if (uploadError) {
            console.error("Eroare upload imagine:", uploadError);
            throw new Error("Nu am putut încărca imaginile.");
          }
          
          const { data: publicUrlData } = supabase.storage
            .from('listings')
            .getPublicUrl(filePath);
            
          uploadedImageUrls.push(publicUrlData.publicUrl);
        }
      }

      // 2. CALCUL DEAL SCORE
      const discountVal = ((marketPrice - Number(exitPrice)) / marketPrice) * 100;
      const dealScore = Math.min(Math.round(discountVal * 1.5), 99); 

      // 3. SALVARE BAZĂ DE DATE
      const { error } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: adTitle,
          category: category,
          description: description || "Anunț detaliat.",
          market_price: marketPrice,
          exit_price: Number(exitPrice),
          sale_strategy: selectedPackage, 
          status: 'active',
          deal_score: dealScore,
          discount: calculatedDiscount,
          images: uploadedImageUrls // <--- ACUM SALVĂM URL-URILE REALE
        });

      if (error) {
        alert(`Eroare Supabase: ${error.message}`);
        throw error;
      }
      
      setIsSuccess(true); 
    } catch (error: any) {
      console.error("Eroare salvare anunț:", error);
      alert(error.message || "A apărut o problemă la publicarea anunțului.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full text-center bg-white border-[4px] border-black p-10 rounded-[2.5rem] shadow-[15px_15px_0_0_rgba(255,209,0,1)] animate-in zoom-in-95 duration-500">
          <span className="text-6xl mb-6 block">⚡</span>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-4">Lichiditate Activată!</h1>
          <p className="font-bold text-gray-500 uppercase text-xs tracking-widest leading-relaxed mb-8">
            Activul tău a fost listat în terminal cu galerie foto și investitorii au primit notificarea.
          </p>
          <Link href="/dashboard" className="block w-full bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-xs italic hover:scale-[1.02] transition-transform">
            Mergi în Dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black selection:bg-[#FFD100] antialiased">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Terminal */}
        <div className="mb-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 italic">Terminal de Lichiditate</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
            Listează <span className="text-[#FFD100]">Activul</span>
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-4 uppercase italic">Oferă date precise pentru încredere maximă a investitorilor.</p>
        </div>

        {/* Progresie */}
        <div className="flex justify-between mb-8 border-b-4 border-black pb-4">
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 1 ? 'text-black' : 'text-gray-300'}`}>1. Date Tehnice</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 2 ? 'text-black' : 'text-gray-300'}`}>2. Evaluare AI</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 3 ? 'text-black' : 'text-gray-300'}`}>3. Activare</div>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-2xl border-[3px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          
          {step === 1 && (
            <div className="space-y-8">
              
              {/* Selectie Categorie */}
              <div>
                <h2 className="text-xl font-black uppercase italic mb-4">Alege Categoria</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categoriesList.map((cat) => (
                    <button 
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`p-3 border-[3px] rounded-xl font-black uppercase text-[10px] md:text-xs italic transition-all ${category === cat ? 'border-black bg-black text-[#FFD100] shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 hover:border-black hover:bg-gray-50'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Titlu Anunt */}
              <div className="pt-6 border-t-2 border-gray-100">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">Titlu Anunț</label>
                <input 
                  type="text" 
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  placeholder="Ex: Mercedes S-Class S500 / Penthouse Herăstrău" 
                  className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-black uppercase focus:outline-none focus:bg-[#FFD100]/10 shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-colors" 
                />
              </div>

              {/* ===== DATE CHIRURGICALE PE CATEGORII ===== */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                
                {/* 1. AUTO & MOTO */}
                {category === 'Auto & Moto' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Marcă & Model</label>
                      <input type="text" placeholder="Ex: Mercedes-Benz S-Class" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Fabricație</label>
                      <input type="number" placeholder="2022" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rulaj (KM Curenți)</label>
                      <input type="number" placeholder="14000" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Combustibil</label>
                      <select className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Benzină</option><option>Diesel</option><option>Hibrid</option><option>Electric</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Motorizare / CP</label>
                      <input type="text" placeholder="Ex: 3.0 / 292 CP" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cutie de viteze</label>
                      <select className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Automată</option><option>Manuală</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Caroserie</label>
                      <select className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Sedan</option><option>SUV</option><option>Coupe</option><option>Cabrio</option><option>Off-Road</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Status Înmatriculare</label>
                      <select className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Înmatriculat RO</option><option>Neînmatriculat</option><option>Înmatriculat Extern</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">TVA DEDUCTIBIL?</label>
                      <select className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Nu (Vânzător PF)</option><option>Da (Vânzător PJ)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 2. IMOBILIARE */}
                {category === 'Imobiliare' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tip Proprietate</label>
                      <select className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Apartament</option><option>Casă / Vilă</option><option>Teren</option><option>Spațiu Comercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suprafață Utilă (mp)</label>
                      <input type="number" placeholder="Ex: 85" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Număr Camere</label>
                      <input type="number" placeholder="Ex: 3" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Construcție</label>
                      <input type="number" placeholder="Ex: 2023" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Etaj / Regim</label>
                      <input type="text" placeholder="Ex: 4 din 10" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Loc de Parcare</label>
                      <select className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Inclus în preț</option><option>Disponibil contra cost</option><option>Fără parcare</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suprafață Teren (pt Case)</label>
                      <input type="text" placeholder="Ex: 500 mp" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Localizare Exactă</label>
                      <input type="text" placeholder="Ex: București, Sector 1, Șos. Nordului" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 3. LUX & CEASURI */}
                {category === 'Lux & Ceasuri' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Brand</label>
                      <input type="text" placeholder="Ex: Patek Philippe, Rolex" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Model & Referință</label>
                      <input type="text" placeholder="Ex: Nautilus 5711" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Achiziție</label>
                      <input type="number" placeholder="Ex: 2021" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Mecanism</label>
                      <select className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Automatic</option><option>Manual</option><option>Quartz</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Material Carcasă</label>
                      <input type="text" placeholder="Ex: Aur roz, Oțel" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pachet & Proveniență</label>
                      <select className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Full Set (Cutie + Acte)</option><option>Doar Ceasul</option><option>Ceas + Cutie</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 4. AFACERI DE VÂNZARE */}
                {category === 'Afaceri de vânzare' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Domeniu de Activitate</label>
                      <input type="text" placeholder="Ex: E-commerce, Restaurant, Producție" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vechime Business</label>
                      <input type="text" placeholder="Ex: 5 ani" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cifră Afaceri Anuală (€)</label>
                      <input type="number" placeholder="Ex: 250000" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Profit Net Anual (€)</label>
                      <input type="number" placeholder="Ex: 45000" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Număr Angajați</label>
                      <input type="number" placeholder="Ex: 12" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ce include prețul?</label>
                      <input type="text" placeholder="Ex: Stocuri de 20k EUR, firmă curată, bază 10k clienți" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* 5 & 6. GADGETS / FOTO & AUDIO */}
                {(category === 'Gadgets' || category === 'Foto & Audio') && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Brand & Model Exact</label>
                      <input type="text" placeholder="Ex: Apple MacBook Pro M3 Max" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Achiziție</label>
                      <input type="number" placeholder="Ex: 2024" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Specificații Principale (RAM, Senzor, Stocare)</label>
                      <input type="text" placeholder="Ex: 36GB RAM, 1TB SSD, Baterie 100%" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Garanție Rămasă</label>
                      <input type="text" placeholder="Ex: 12 Luni Apple" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* Descriere Generala (Global) */}
                <div className="md:col-span-3 pt-4 border-t-2 border-gray-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Motivul vânzării & Detalii de finețe (Crucial pt AI)</label>
                  <textarea 
                    rows={4} 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Specifică eventuale defecte ascunse, motivul urgenței (ex: nevoie de lichiditate pentru alt proiect) sau dotări extra rare. Sinceritatea crește Scorul Tranzacției." 
                    className="w-full mt-2 p-4 border-[3px] border-black rounded-xl font-bold italic focus:outline-none focus:bg-gray-50 resize-none shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                  ></textarea>
                </div>

                {/* UPLOAD IMAGINI */}
                <div className="md:col-span-3 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-3">Galerie Foto (Atenție la detalii)</label>
                  <div className="w-full min-h-[160px] border-[3px] border-dashed border-black rounded-2xl flex flex-col items-center justify-center bg-gray-50 hover:bg-[#FFD100]/10 hover:border-[#FFD100] transition-all cursor-pointer relative p-6 shadow-[inner_0_0_10px_rgba(0,0,0,0.05)]">
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="text-center flex flex-col items-center">
                      <span className="text-4xl mb-3">📸</span>
                      <p className="text-xs font-black uppercase italic text-black">
                        {images.length > 0 ? `${images.length} imagini selectate` : 'Click / Drag & Drop pentru Fotografii'}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 mt-2">Investitorii verifică atent uzura. Pune minim 5 poze clare din unghiuri diferite.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t-2 border-gray-100">
                <button 
                  onClick={generateAiPricing} 
                  disabled={!adTitle}
                  className="w-full bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:bg-gray-900 transition-colors shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:shadow-none"
                >
                  Confirm Datele & Generează Raport AI →
                </button>
                {!adTitle && <p className="text-center text-[9px] font-bold text-red-500 mt-3 uppercase tracking-widest">Completează Titlul pentru a continua.</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 text-center min-h-[500px] flex flex-col justify-center">
              
              {isAnalyzing ? (
                <div className="animate-pulse space-y-6">
                  <div className="text-6xl mb-4 animate-spin inline-block">🎯</div>
                  <h2 className="text-3xl font-black uppercase italic">Scanăm Piața...</h2>
                  <p className="text-sm font-bold text-gray-500 uppercase italic">Identificăm {adTitle} în bazele de date partenere</p>
                  <div className="space-y-2 max-w-sm mx-auto text-left border-l-4 border-[#FFD100] pl-4">
                    <p className="text-xs font-bold text-black uppercase tracking-widest">Se extrag anunțurile active...</p>
                    <p className="text-xs font-bold text-black uppercase tracking-widest">Calculare depreciere & istoric...</p>
                    <p className="text-xs font-bold text-black uppercase tracking-widest">Generare Raport Lichiditate...</p>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-8">
                  
                  {/* Raportul de Piata (Ancora Mentala) */}
                  <div className="bg-white border-[4px] border-black p-6 md:p-8 rounded-[2rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 bg-black text-[#FFD100] text-[9px] font-black px-4 py-2 uppercase tracking-widest rounded-bl-xl">Date Reale</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Preț Mediu Piață Estimat</p>
                    <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-black">
                      €{marketPrice.toLocaleString('ro-RO')}
                    </p>
                    <div className="mt-4 pt-4 border-t-2 border-gray-100 flex flex-col gap-2">
                       <p className="text-xs font-bold text-gray-600">✓ Analiză generată comparând <span className="font-black text-black">{analyzedItems} anunțuri similare</span> active astăzi.</p>
                       <p className="text-xs font-bold text-gray-600">⚠ Timp mediu de vânzare la acest preț pe site-uri clasice: <span className="font-black text-red-600">94 de zile</span>.</p>
                    </div>
                  </div>

                  <div className="text-left space-y-6">
                    <div>
                      <h3 className="text-xl font-black uppercase italic mb-2">Setează Prețul Tău (Cash)</h3>
                      <p className="text-xs font-bold text-gray-500 uppercase italic">Alege cât ești dispus să lași din preț pentru a obține banii imediat.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 bg-gray-50 p-6 rounded-2xl border-[3px] border-black shadow-[inner_0_0_10px_rgba(0,0,0,0.05)]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vreau să încasez (EUR)</label>
                        <div className="relative mt-2">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl">€</span>
                          <input 
                            type="number" 
                            value={exitPrice}
                            onChange={(e) => setExitPrice(e.target.value)}
                            placeholder={marketPrice.toString()} 
                            className="w-full p-4 pl-10 border-[3px] border-black rounded-xl font-black text-3xl italic focus:outline-none focus:bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]" 
                          />
                        </div>
                      </div>

                      <div className={`w-full md:w-32 flex flex-col items-center justify-center p-4 rounded-2xl border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-colors ${calculatedDiscount >= 15 ? 'bg-[#FFD100] text-black' : calculatedDiscount > 0 ? 'bg-black text-[#FFD100]' : 'bg-gray-100 text-gray-400'}`}>
                         <span className="text-[10px] font-black uppercase tracking-widest mb-1">Discount</span>
                         <span className="text-3xl font-black italic leading-none">-{calculatedDiscount}%</span>
                      </div>
                    </div>

                    {/* SELECTIA STRATEGIEI (Cele 4 Carduri) */}
                    <div className="pt-6 border-t-2 border-gray-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-black mb-4">Alege Strategia de Vânzare</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <button onClick={() => setSaleStrategy('standard')} className={`p-4 rounded-2xl border-[3px] text-left transition-all ${saleStrategy === 'standard' ? 'border-black bg-[#FFD100] shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 bg-white hover:border-black'}`}>
                          <p className="font-black uppercase italic text-sm text-black">Standard</p>
                          <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase">Fără discount. Așteptare 14-30 zile.</p>
                        </button>

                        <button onClick={() => setSaleStrategy('lichidare')} className={`p-4 rounded-2xl border-[3px] text-left transition-all ${saleStrategy === 'lichidare' ? 'border-black bg-[#FFD100] shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 bg-white hover:border-black'}`}>
                          <p className="font-black uppercase italic text-sm text-black">Lichidare</p>
                          <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase">Preț redus. Targetăm oferte în 48h.</p>
                        </button>

                        <button onClick={() => setSaleStrategy('panic')} className={`p-4 rounded-2xl border-[3px] text-left transition-all ${saleStrategy === 'panic' ? 'border-black bg-black text-[#FFD100] shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 bg-white hover:border-black'}`}>
                          <p className="font-black uppercase italic text-sm flex items-center gap-2">Panic Sell <span className="text-xs">⚡</span></p>
                          <p className="text-[10px] font-bold mt-1 uppercase text-gray-400">Preț tăiat extrem. Alerte instant. Cash azi.</p>
                        </button>

                        <button onClick={() => setSaleStrategy('licitatie')} className={`p-4 rounded-2xl border-[3px] text-left transition-all ${saleStrategy === 'licitatie' ? 'border-black bg-black text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 bg-white hover:border-black'}`}>
                          <p className="font-black uppercase italic text-sm text-black flex items-center gap-2 group-hover:text-white">Licitație Flash <span className="text-xs">🔨</span></p>
                          <p className="text-[10px] font-bold mt-1 uppercase text-gray-400">Vânzare la cea mai bună ofertă în 24h.</p>
                        </button>

                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t-2 border-gray-100">
                    <button onClick={() => setStep(1)} className="w-1/3 border-[3px] border-black py-5 rounded-2xl font-black uppercase text-xs italic hover:bg-gray-50 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none">
                      Înapoi
                    </button>
                    <button 
                      onClick={() => setStep(3)} 
                      disabled={!exitPrice}
                      className="w-2/3 bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:scale-[1.01] transition-transform shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      Spre Pachete →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-black uppercase italic mb-6">Pachete de Lichiditate</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* STANDARD */}
                <div onClick={() => setSelectedPackage('standard')} className={`p-5 border-[3px] rounded-2xl cursor-pointer transition-all ${selectedPackage === 'standard' ? 'border-black bg-[#FFD100] shadow-[6px_6px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 hover:border-black'}`}>
                  <p className="font-black uppercase italic text-lg text-black">Standard <span className="text-[10px] bg-white px-2 py-1 border-2 border-black rounded ml-2">30 Zile</span></p>
                  <p className="text-[10px] font-bold text-gray-700 mt-2">Afișare normală în platformă.</p>
                  <p className="font-black text-2xl mt-4">99 RON</p>
                </div>

                {/* URGENT */}
                <div onClick={() => setSelectedPackage('urgent')} className={`p-5 border-[3px] rounded-2xl cursor-pointer transition-all ${selectedPackage === 'urgent' ? 'border-black bg-[#FFD100] shadow-[6px_6px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 hover:border-black'}`}>
                  <p className="font-black uppercase italic text-lg text-black">Urgent <span className="text-[10px] bg-black text-white px-2 py-1 rounded ml-2">7 Zile</span></p>
                  <p className="text-[10px] font-bold text-gray-700 mt-2">Boost zilnic în topul căutărilor.</p>
                  <p className="font-black text-2xl mt-4">149 RON</p>
                </div>

                {/* FLASH LIQUIDITY */}
                <div onClick={() => setSelectedPackage('flash')} className={`p-5 border-[3px] rounded-2xl cursor-pointer transition-all ${selectedPackage === 'flash' ? 'border-black bg-black text-[#FFD100] shadow-[6px_6px_0_0_rgba(255,209,0,1)]' : 'border-black bg-black text-white'}`}>
                  <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[9px] font-black px-3 py-1 uppercase rounded-full border-2 border-black animate-pulse">Hot</div>
                  <p className="font-black uppercase italic text-lg">Flash <span className="text-[10px] bg-white text-black px-2 py-1 rounded ml-2">48 ORE</span></p>
                  <p className="text-[10px] font-bold text-gray-300 mt-2">Alerta SMS directă către investitori.</p>
                  <p className="font-black text-2xl mt-4 text-[#FFD100]">249 RON</p>
                </div>

                {/* LICITAȚIE */}
                <div onClick={() => setSelectedPackage('licitatie')} className={`p-5 border-[3px] rounded-2xl cursor-pointer transition-all ${selectedPackage === 'licitatie' ? 'border-black bg-purple-600 text-[#FFD100] shadow-[6px_6px_0_0_rgba(0,0,0,1)]' : 'border-gray-200 hover:border-black'}`}>
                  <p className="font-black uppercase italic text-lg">Licitație <span className="text-[10px] bg-black text-white px-2 py-1 rounded ml-2">24 ORE</span></p>
                  <p className="text-[10px] font-bold text-gray-800 mt-2 opacity-80">Mod licitație la cel mai bun preț.</p>
                  <p className="font-black text-2xl mt-4">299 RON</p>
                </div>

              </div>

              <button 
                onClick={handleFinalSubmit}
                disabled={isSaving}
                className="w-full mt-8 bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic hover:scale-[1.01] transition-transform shadow-[8px_8px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              >
                {isSaving ? "Se Procesează..." : "Plătește & Activează Anunțul"}
              </button>
              
              <button onClick={() => setStep(2)} className="w-full mt-3 text-[10px] font-black uppercase text-gray-400 hover:text-black transition-colors italic border-b-2 border-transparent hover:border-black text-center pb-1 mx-auto block w-fit">
                ← Înapoi la Evaluare
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}