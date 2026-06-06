"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Save, ArrowLeft, Loader2 } from "lucide-react";

export default function EditAdPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [category, setCategory] = useState("");
  const [adTitle, setAdTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    async function fetchAd() {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (data) {
        setCategory(data.category);
        setAdTitle(data.title);
        setDescription(data.description);
        setExitPrice(data.exit_price.toString());
        setFormData(data.details || {});
      }
      setIsLoading(false);
    }
    fetchAd();
  }, [id]);

  const handleUpdate = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('listings')
      .update({
        title: adTitle,
        description: description,
        exit_price: Number(exitPrice),
        details: formData
      })
      .eq('id', id);

    if (error) {
      alert("Eroare la salvare. Ai rulat politica SQL de UPDATE?");
    } else {
      router.push('/dashboard');
    }
    setIsSaving(false);
  };

  const updateField = (key: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center font-sans">
      <Loader2 className="animate-spin mr-2" />
      <span className="font-black uppercase tracking-widest text-xs">Se încarcă datele terminalului...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-24 px-4 font-sans text-black">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 font-black uppercase text-[10px] tracking-widest hover:text-[#FFD100] transition-colors">
          <ArrowLeft size={14} /> Înapoi la Centru de Comandă
        </button>

        <div className="bg-white p-8 rounded-2xl border-[3px] border-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">Editează <span className="text-[#FFD100]">Activul</span></h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Categoria: {category}</p>
            </div>
            <div className="bg-gray-100 text-gray-500 font-black text-[8px] uppercase tracking-widest px-3 py-1.5 rounded border border-gray-300">ID: {id.split('-')[0]}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400">Titlu Anunț</label>
              <input type="text" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase focus:outline-none focus:border-[#FFD100]" />
            </div>

            {/* AUTO & MOTO */}
            {category === "Auto & Moto" && (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Marcă</label>
                  <input type="text" value={formData.make || ""} onChange={(e) => updateField('make', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Model</label>
                  <input type="text" value={formData.model || ""} onChange={(e) => updateField('model', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Kilometraj (KM)</label>
                  <input type="number" value={formData.km || ""} onChange={(e) => updateField('km', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">An Fabricație</label>
                  <input type="number" value={formData.year || ""} onChange={(e) => updateField('year', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-gray-400">Motorizare / CP</label>
                   <input type="text" value={formData.engine || ""} onChange={(e) => updateField('engine', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase text-gray-400">Status</label>
                   <select value={formData.status || ""} onChange={(e) => updateField('status', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase">
                     <option>Înmatriculat RO</option>
                     <option>Neînmatriculat</option>
                   </select>
                </div>
              </>
            )}

            {/* IMOBILIARE */}
            {category === "Imobiliare" && (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Suprafață (mp)</label>
                  <input type="number" value={formData.surface || ""} onChange={(e) => updateField('surface', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Camere</label>
                  <input type="number" value={formData.rooms || ""} onChange={(e) => updateField('rooms', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Etaj / Regim</label>
                  <input type="text" value={formData.floor || ""} onChange={(e) => updateField('floor', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">An Construcție</label>
                  <input type="number" value={formData.buildYear || ""} onChange={(e) => updateField('buildYear', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Localizare Exactă</label>
                  <input type="text" value={formData.location || ""} onChange={(e) => updateField('location', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase focus:border-[#FFD100] outline-none" />
                </div>
              </>
            )}

             {/* LUX & CEASURI */}
             {category === "Lux & Ceasuri" && (
              <>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Brand</label>
                  <input type="text" value={formData.brand || ""} onChange={(e) => updateField('brand', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Model & Ref.</label>
                  <input type="text" value={formData.refModel || ""} onChange={(e) => updateField('refModel', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">An Achiziție</label>
                  <input type="number" value={formData.purchaseYear || ""} onChange={(e) => updateField('purchaseYear', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold" />
                </div>
                 <div>
                  <label className="text-[10px] font-black uppercase text-gray-400">Pachet</label>
                  <select value={formData.boxPapers || ""} onChange={(e) => updateField('boxPapers', e.target.value)} className="w-full mt-1 p-3 border-2 border-black rounded-lg font-bold uppercase">
                     <option>Full Set (Cutie + Acte)</option><option>Doar Ceasul</option><option>Ceas + Cutie</option>
                  </select>
                </div>
              </>
            )}

            <div className="md:col-span-2 mt-4">
              <label className="text-[10px] font-black uppercase text-gray-400">Noul Preț de Exit (EUR)</label>
              <div className="relative mt-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg">€</span>
                <input type="number" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className="w-full p-4 pl-10 border-[3px] border-black rounded-xl font-black text-2xl italic focus:outline-none focus:border-[#FFD100]" />
              </div>
              <p className="text-[8px] font-bold uppercase text-gray-500 mt-1">Modificarea prețului poate atrage noi alerți către investitori.</p>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase text-gray-400">Descriere & Condiții</label>
              <textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 p-4 border-2 border-black rounded-xl font-bold italic resize-none focus:border-[#FFD100] outline-none" />
            </div>

            <button 
              onClick={handleUpdate}
              disabled={isSaving}
              className="md:col-span-2 w-full bg-black text-[#FFD100] py-5 rounded-xl font-black uppercase tracking-widest text-xs italic shadow-[5px_5px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Save size={16} />}
              {isSaving ? "Se criptează datele..." : "Salvează Noua Versiune"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}