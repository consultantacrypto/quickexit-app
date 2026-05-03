"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase"; 
import { Search } from "lucide-react";

export default function PostAdPage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState("Auto & Moto");
  const [images, setImages] = useState<File[]>([]); 
  
  const [adTitle, setAdTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [marketPrice, setMarketPrice] = useState(0);
  const [analyzedItems, setAnalyzedItems] = useState(0);
  
  const [exitPrice, setExitPrice] = useState("");
  const [saleStrategy, setSaleStrategy] = useState("standard");
  const [selectedPackage, setSelectedPackage] = useState<"economy" | "standard" | "urgent" | "auction">("standard"); 
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // STATE NOU: Capturăm datele scrise de utilizator pentru API
  const [formData, setFormData] = useState({
    make: "", model: "", year: "", km: "", fuel: "Benzină", engine: "", transmission: "Automată", bodyType: "Sedan", status: "Înmatriculat RO", tva: "Nu (Vânzător PF)",
    propType: "Apartament", surface: "", rooms: "", buildYear: "", floor: "", parking: "Inclus în preț", landSurface: "", location: "",
    brand: "", refModel: "", purchaseYear: "", mechanism: "Automatic", material: "", boxPapers: "Full Set (Cutie + Acte)",
    businessDomain: "", businessAge: "", revenue: "", profit: "", employees: "", includes: "",
    specs: "", warranty: "",
  });

  const categoriesList = [
    'Auto & Moto', 'Imobiliare', 'Lux & Ceasuri', 
    'Afaceri de vânzare', 'Gadgets', 'Foto & Audio'
  ];

  const packagePrices: Record<"economy" | "standard" | "urgent" | "auction", number> = {
    economy: 99,
    standard: 79,
    urgent: 48,
    auction: 111,
  };

  type PackageId = keyof typeof packagePrices;

  const PACKAGE_DEFS: {
    id: PackageId;
    title: string;
    durationLabel: string;
    description: string;
    badge?: string;
  }[] = [
    {
      id: "economy",
      title: "Expunere Maximă",
      durationLabel: "30 zile",
      description: "Pentru vânzători care vor mai mult timp pentru a primi oferte.",
    },
    {
      id: "standard",
      title: "Vânzare Rapidă",
      durationLabel: "14 zile",
      description: "Pentru cei care vor să vândă repede, dar fără presiune extremă.",
      badge: "Recomandat",
    },
    {
      id: "urgent",
      title: "Vânzare Urgentă",
      durationLabel: "48 ore",
      description: "Pentru situații în care ai nevoie de cumpărători rapid.",
    },
    {
      id: "auction",
      title: "Licitație Rapidă",
      durationLabel: "Licitație",
      description: "Cumpărătorii pot concura prin oferte pentru activul tău.",
    },
  ];

  const PACKAGE_TO_STRATEGY: Record<PackageId, "standard" | "lichidare" | "licitatie"> = {
    economy: "standard",
    standard: "standard",
    urgent: "lichidare",
    auction: "licitatie",
  };

  function selectPackage(pkg: PackageId) {
    setSelectedPackage(pkg);
    setSaleStrategy(PACKAGE_TO_STRATEGY[pkg]);
  }

  function validatePrimaryAssetFields(): string | null {
    if (!adTitle.trim()) return "Completează titlul anunțului.";
    if (category === "Auto & Moto") {
      if (!formData.make.trim() || !formData.model.trim()) return "Completează marca și modelul vehiculului.";
    } else if (category === "Imobiliare") {
      if (!formData.location.trim() || !formData.surface.trim()) return "Completează localizarea și suprafața.";
    } else if (category === "Lux & Ceasuri") {
      if (!formData.brand.trim() || !formData.refModel.trim()) return "Completează brandul și modelul.";
    } else if (category === "Afaceri de vânzare") {
      if (!formData.businessDomain.trim() || !formData.revenue.trim()) return "Completează domeniul și cifra de afaceri.";
    } else if (category === "Gadgets" || category === "Foto & Audio") {
      if (!formData.brand.trim()) return "Completează brandul și modelul produsului.";
    }
    return null;
  }

  const selectedPackageMeta = PACKAGE_DEFS.find((p) => p.id === selectedPackage)!;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const generateAiPricing = async () => {
    const missing = validatePrimaryAssetFields();
    if (missing) {
      alert(missing);
      return;
    }
    setIsAnalyzing(true);
    setStep(2);

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
        save_report: false
      };

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        setEvaluationResult(data);
        setMarketPrice(data.estimated_market_price || 0); 
        setAnalyzedItems(data.comparable_count || 0);
        
        if (data.strong_exit_price) {
          setExitPrice(data.strong_exit_price.toString());
        } else {
          setExitPrice(""); 
        }
      } else {
        alert(data.message || "Date insuficiente pentru o evaluare automată.");
        setStep(1);
      }
    } catch (error) {
      alert("Terminalul de preț este momentan indisponibil.");
      setStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // LOGICA NOUĂ: Calcul matematic pentru discount în funcție de strategie
  const baseRequestedPrice = Number(exitPrice) || 0;
  let finalCalculatedExitPrice = baseRequestedPrice;
  let currentDiscountPercent = 0;

  if (marketPrice === 0 && baseRequestedPrice > 0) {
    if (saleStrategy === 'lichidare') {
      finalCalculatedExitPrice = Math.round(baseRequestedPrice * 0.9);
      currentDiscountPercent = 10;
    } else if (saleStrategy === 'panic') {
      finalCalculatedExitPrice = Math.round(baseRequestedPrice * 0.8);
      currentDiscountPercent = 20;
    } else if (saleStrategy === 'licitatie') {
      finalCalculatedExitPrice = Math.round(baseRequestedPrice * 0.7);
      currentDiscountPercent = 30;
    }
  } else if (marketPrice > 0 && baseRequestedPrice > 0) {
    currentDiscountPercent = Math.round((1 - baseRequestedPrice / marketPrice) * 100);
    finalCalculatedExitPrice = baseRequestedPrice;
  }

  const handleFinalSubmit = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Eroare: Trebuie să fii logat pentru a posta un anunț! Folosește meniul 'Contul Meu'.");
        setIsSaving(false);
        return;
      }

      const uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        for (const file of images) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage.from('listings').upload(filePath, file);
         if (uploadError) {
            console.error("Supabase Upload Error:", uploadError);
            throw new Error(`Eroare Supabase la urcarea pozei: ${uploadError.message}`);
          }
          
          const { data: publicUrlData } = supabase.storage.from('listings').getPublicUrl(filePath);
          uploadedImageUrls.push(publicUrlData.publicUrl);
        }
      }

      const finalMarketPrice = marketPrice > 0 ? marketPrice : baseRequestedPrice;
      const dealScore = Math.min(Math.round(currentDiscountPercent * 1.5), 99); 

      // 1. Salvăm anunțul ca "PENDING_PAYMENT" și îl returnăm din baza de date
      const { data: insertedData, error } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: adTitle,
          category: category,
          description: description || "Anunț detaliat.",
          market_price: finalMarketPrice,
          exit_price: finalCalculatedExitPrice, 
          sale_strategy: selectedPackage, 
          status: 'pending_payment', // Anunțul este reținut până se confirmă plata
          is_seed: false, 
          deal_score: dealScore, 
          discount: currentDiscountPercent, 
          images: uploadedImageUrls,
          details: { ...formData, package: selectedPackage, strategy: saleStrategy } 
        })
        .select()
        .single();

      if (error) {
        alert(`Eroare Supabase: ${error.message}`);
        throw error;
      }
      
      // 2. Apelăm motorul de plăți Stripe
      const stripeRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: insertedData.id,
          packageId: selectedPackage,
          price: packagePrices[selectedPackage],
          title: adTitle
        }),
      });

      const stripeData = await stripeRes.json();
      
      if (stripeData.url) {
        // 3. Aruncăm utilizatorul către pagina securizată Stripe
        window.location.href = stripeData.url;
      } else {
        throw new Error(stripeData.error || "Eroare la generarea plății.");
      }
      
    } catch (error: any) {
      console.error("Eroare salvare anunț / plată:", error);
      alert(error.message || "A apărut o problemă la generarea plății.");
      setIsSaving(false);
    }
  };

  // Acest ecran nu va mai fi atins în mod normal aici, pentru că redirecționăm către Stripe
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
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 1 ? 'text-black' : 'text-gray-300'}`}>1. Date despre activ</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 2 ? 'text-black' : 'text-gray-300'}`}>2. Estimare piață</div>
          <div className={`text-[10px] font-black uppercase tracking-widest italic ${step >= 3 ? 'text-black' : 'text-gray-300'}`}>3. Pachet & plată</div>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-2xl border-[3px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Search size={150} strokeWidth={3} />
          </div>

          {step === 1 && (
            <div className="space-y-8 relative z-10">
              
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                
                {/* AUTO & MOTO */}
                {category === 'Auto & Moto' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Marcă</label>
                      <input type="text" value={formData.make} onChange={(e) => setFormData({...formData, make: e.target.value})} placeholder="Ex: Mercedes-Benz" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Model</label>
                      <input type="text" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} placeholder="Ex: S-Class" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Fabricație</label>
                      <input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} placeholder="2022" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rulaj (KM Curenți)</label>
                      <input type="number" value={formData.km} onChange={(e) => setFormData({...formData, km: e.target.value})} placeholder="14000" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Combustibil</label>
                      <select value={formData.fuel} onChange={(e) => setFormData({...formData, fuel: e.target.value})} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Benzină</option><option>Diesel</option><option>Hibrid</option><option>Electric</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Motorizare / CP</label>
                      <input type="text" value={formData.engine} onChange={(e) => setFormData({...formData, engine: e.target.value})} placeholder="Ex: 3.0 / 292 CP" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cutie de viteze</label>
                      <select value={formData.transmission} onChange={(e) => setFormData({...formData, transmission: e.target.value})} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Automată</option><option>Manuală</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Caroserie</label>
                      <select value={formData.bodyType} onChange={(e) => setFormData({...formData, bodyType: e.target.value})} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Sedan</option><option>SUV</option><option>Coupe</option><option>Cabrio</option><option>Off-Road</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Status Înmatriculare</label>
                      <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Înmatriculat RO</option><option>Neînmatriculat</option><option>Înmatriculat Extern</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">TVA DEDUCTIBIL?</label>
                      <select value={formData.tva} onChange={(e) => setFormData({...formData, tva: e.target.value})} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Nu (Vânzător PF)</option><option>Da (Vânzător PJ)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* IMOBILIARE */}
                {category === 'Imobiliare' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tip Proprietate</label>
                      <select value={formData.propType} onChange={(e) => setFormData({...formData, propType: e.target.value})} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Apartament</option><option>Casă / Vilă</option><option>Teren</option><option>Spațiu Comercial</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suprafață Utilă (mp)</label>
                      <input type="number" value={formData.surface} onChange={(e) => setFormData({...formData, surface: e.target.value})} placeholder="Ex: 85" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Număr Camere</label>
                      <input type="number" value={formData.rooms} onChange={(e) => setFormData({...formData, rooms: e.target.value})} placeholder="Ex: 3" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Construcție</label>
                      <input type="number" value={formData.buildYear} onChange={(e) => setFormData({...formData, buildYear: e.target.value})} placeholder="Ex: 2023" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Etaj / Regim</label>
                      <input type="text" value={formData.floor} onChange={(e) => setFormData({...formData, floor: e.target.value})} placeholder="Ex: 4 din 10" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Loc de Parcare</label>
                      <select value={formData.parking} onChange={(e) => setFormData({...formData, parking: e.target.value})} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Inclus în preț</option><option>Disponibil contra cost</option><option>Fără parcare</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Suprafață Teren (pt Case)</label>
                      <input type="text" value={formData.landSurface} onChange={(e) => setFormData({...formData, landSurface: e.target.value})} placeholder="Ex: 500 mp" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Localizare Exactă</label>
                      <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Ex: București, Sector 1, Șos. Nordului" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* LUX & CEASURI */}
                {category === 'Lux & Ceasuri' && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Brand</label>
                      <input type="text" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} placeholder="Ex: Patek Philippe, Rolex" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Model & Referință</label>
                      <input type="text" value={formData.refModel} onChange={(e) => setFormData({...formData, refModel: e.target.value})} placeholder="Ex: Nautilus 5711" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Achiziție</label>
                      <input type="number" value={formData.purchaseYear} onChange={(e) => setFormData({...formData, purchaseYear: e.target.value})} placeholder="Ex: 2021" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Mecanism</label>
                      <select value={formData.mechanism} onChange={(e) => setFormData({...formData, mechanism: e.target.value})} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Automatic</option><option>Manual</option><option>Quartz</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Material Carcasă</label>
                      <input type="text" value={formData.material} onChange={(e) => setFormData({...formData, material: e.target.value})} placeholder="Ex: Aur roz, Oțel" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pachet & Proveniență</label>
                      <select value={formData.boxPapers} onChange={(e) => setFormData({...formData, boxPapers: e.target.value})} className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50 appearance-none">
                        <option>Full Set (Cutie + Acte)</option><option>Doar Ceasul</option><option>Ceas + Cutie</option>
                      </select>
                    </div>
                  </>
                )}

                {/* AFACERI DE VÂNZARE */}
                {category === 'Afaceri de vânzare' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Domeniu de Activitate</label>
                      <input type="text" value={formData.businessDomain} onChange={(e) => setFormData({...formData, businessDomain: e.target.value})} placeholder="Ex: E-commerce, Restaurant, Producție" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vechime Business</label>
                      <input type="text" value={formData.businessAge} onChange={(e) => setFormData({...formData, businessAge: e.target.value})} placeholder="Ex: 5 ani" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cifră Afaceri Anuală (€)</label>
                      <input type="number" value={formData.revenue} onChange={(e) => setFormData({...formData, revenue: e.target.value})} placeholder="Ex: 250000" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Profit Net Anual (€)</label>
                      <input type="number" value={formData.profit} onChange={(e) => setFormData({...formData, profit: e.target.value})} placeholder="Ex: 45000" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Număr Angajați</label>
                      <input type="number" value={formData.employees} onChange={(e) => setFormData({...formData, employees: e.target.value})} placeholder="Ex: 12" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Ce include prețul?</label>
                      <input type="text" value={formData.includes} onChange={(e) => setFormData({...formData, includes: e.target.value})} placeholder="Ex: Stocuri de 20k EUR, firmă curată, bază 10k clienți" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* GADGETS / FOTO & AUDIO */}
                {(category === 'Gadgets' || category === 'Foto & Audio') && (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Brand & Model Exact</label>
                      <input type="text" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} placeholder="Ex: Apple MacBook Pro M3 Max" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">An Achiziție</label>
                      <input type="number" value={formData.purchaseYear} onChange={(e) => setFormData({...formData, purchaseYear: e.target.value})} placeholder="Ex: 2024" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Specificații Principale</label>
                      <input type="text" value={formData.specs} onChange={(e) => setFormData({...formData, specs: e.target.value})} placeholder="Ex: 36GB RAM, 1TB SSD, Baterie 100%" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Garanție Rămasă</label>
                      <input type="text" value={formData.warranty} onChange={(e) => setFormData({...formData, warranty: e.target.value})} placeholder="Ex: 12 Luni Apple" className="w-full mt-2 p-3 border-[3px] border-black rounded-xl font-bold uppercase focus:outline-none focus:bg-gray-50" />
                    </div>
                  </>
                )}

                {/* Descriere Generala */}
                <div className="md:col-span-3 pt-4 border-t-2 border-gray-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Motivul vânzării și detalii (pentru încrederea cumpărătorilor)</label>
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
                  Continuă către estimarea pe piață →
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
                  
                  {/* MODIFICAREA DE DESIGN PENTRU ACTIV EXCLUSIVIST */}
                  <div className="bg-white border-[4px] border-black p-6 md:p-8 rounded-[2rem] shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative overflow-hidden text-left">
                    <div className={`absolute top-0 right-0 ${marketPrice > 0 ? 'bg-black text-[#FFD100]' : 'bg-orange-500 text-white'} text-[9px] font-black px-4 py-2 uppercase tracking-widest rounded-bl-xl`}>
                      {marketPrice > 0 ? 'Date Reale' : 'Activ Exclusivist'}
                    </div>
                    
                    {marketPrice > 0 ? (
                      <>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Preț Mediu Piață Estimat</p>
                        <p className="text-4xl md:text-5xl font-black italic tracking-tighter text-black">
                          €{marketPrice.toLocaleString('ro-RO')}
                        </p>
                        <div className="mt-4 pt-4 border-t-2 border-gray-100 flex flex-col gap-2">
                           <p className="text-xs font-bold text-gray-600">✓ Analiză generată comparând <span className="font-black text-black">{analyzedItems} anunțuri similare</span>.</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Încredere estimare: {evaluationResult?.confidence_score || 0}%</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">Atenție: Istoric Insuficient</p>
                        <p className="text-2xl md:text-3xl font-black italic tracking-tighter text-black">
                          Activ Rar Identificat.
                        </p>
                        <div className="mt-4 pt-4 border-t-2 border-gray-100 flex flex-col gap-2">
                           <p className="text-xs font-bold text-gray-600">Nu am găsit suficiente repere identice în piață pentru o medie clară de preț. <span className="font-black">Setează prețul tău de bază mai jos.</span></p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-left space-y-6">
                    <div>
                      <h3 className="text-xl font-black uppercase italic mb-2">Setează Prețul Tău (Cash)</h3>
                      <p className="text-xs font-bold text-gray-500 uppercase italic">
                        {marketPrice > 0 
                          ? "Alege cât ești dispus să lași din preț pentru a obține banii imediat." 
                          : "Setează prețul dorit pe care îl vei folosi ca bază de pornire."}
                      </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 bg-gray-50 p-6 rounded-2xl border-[3px] border-black shadow-[inner_0_0_10px_rgba(0,0,0,0.05)]">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          {marketPrice > 0 ? "Vreau să încasez (EUR)" : "Prețul Tău Dorit (Bază / EUR)"}
                        </label>
                        <div className="relative mt-2">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl">€</span>
                          <input 
                            type="number" 
                            value={exitPrice}
                            onChange={(e) => setExitPrice(e.target.value)}
                            placeholder={marketPrice > 0 ? marketPrice.toString() : "Ex: 500000"} 
                            className="w-full p-4 pl-10 border-[3px] border-black rounded-xl font-black text-3xl italic focus:outline-none focus:bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]" 
                          />
                        </div>
                      </div>

                      {(marketPrice > 0 || (marketPrice === 0 && exitPrice)) && (
                        <div className={`w-full md:w-32 flex flex-col items-center justify-center p-4 rounded-2xl border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-colors ${currentDiscountPercent >= 15 ? 'bg-[#FFD100] text-black' : currentDiscountPercent > 0 ? 'bg-black text-[#FFD100]' : 'bg-gray-100 text-gray-400'}`}>
                           <span className="text-[10px] font-black uppercase tracking-widest mb-1">Discount</span>
                           <span className="text-3xl font-black italic leading-none">-{currentDiscountPercent}%</span>
                        </div>
                      )}
                    </div>

                    <p className="pt-6 text-xs font-semibold text-neutral-600 border-t-2 border-gray-100">
                      Viteza și modul de promovare le alegi la pasul următor (după ce stabilești prețul).
                    </p>
                  </div>

                  <div className="flex gap-4 pt-6 border-t-2 border-gray-100">
                    <button onClick={() => setStep(1)} className="w-1/3 border-[3px] border-black py-5 rounded-2xl font-black uppercase text-xs italic hover:bg-gray-50 transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none">
                      Înapoi
                    </button>
                    <button 
                      onClick={() => setStep(3)} 
                      disabled={!exitPrice}
                      className="w-2/3 bg-black text-[#FFD100] py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      Alege viteza de vânzare →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-black md:text-3xl">
                  Alege viteza de vânzare
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-neutral-600">
                  Pachetul stabilește cât timp va fi promovat anunțul și cât de rapid vrei să găsești cumpărători.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                {PACKAGE_DEFS.map((pkg) => {
                  const isSelected = selectedPackage === pkg.id;
                  const price = packagePrices[pkg.id];
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => selectPackage(pkg.id)}
                      className={`relative rounded-2xl border-[3px] p-6 text-left transition-all ${
                        isSelected
                          ? "border-black bg-[#FFD100] shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
                          : "border-neutral-200 bg-white hover:border-black hover:shadow-[4px_4px_0_0_rgba(0,0,0,0.12)]"
                      }`}
                    >
                      {pkg.badge && (
                        <span className="absolute -right-2 -top-2 rounded-full border-2 border-black bg-black px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#FFD100]">
                          {pkg.badge}
                        </span>
                      )}
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-lg font-black uppercase italic text-black">{pkg.title}</p>
                        <span className="rounded-md border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black">
                          {pkg.durationLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-[11px] font-semibold leading-snug text-neutral-700">{pkg.description}</p>
                      <p className="mt-5 font-black tabular-nums text-2xl text-black">{price} RON</p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-[#fafafa] px-5 py-4 text-center">
                <p className="text-sm font-black uppercase tracking-wide text-neutral-800">
                  Pachet ales: {selectedPackageMeta.title} — {packagePrices[selectedPackage]} RON
                </p>
              </div>

              <button
                onClick={handleFinalSubmit}
                disabled={isSaving}
                className="w-full bg-black py-5 text-[#FFD100] border-[3px] border-black rounded-2xl font-black uppercase tracking-widest text-sm italic transition-transform hover:scale-[1.01] shadow-[8px_8px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none disabled:opacity-50"
              >
                {isSaving ? "Se pregătește plata..." : "Plătește și publică anunțul"}
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="mx-auto block w-fit border-b-2 border-transparent pb-1 text-center text-[10px] font-black uppercase italic text-neutral-400 transition-colors hover:border-black hover:text-black"
              >
                ← Înapoi la estimare
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}