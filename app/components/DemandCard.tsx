"use client";

import Link from "next/link";

interface DemandCardProps {
  id: string;
  targetAsset: string;
  category: string;
  budget: string;
  description: string;
}

export default function DemandCard({ id, targetAsset, category, budget, description }: DemandCardProps) {
  return (
    <div className="bg-white border-[4px] border-[#FFD100] rounded-[2rem] p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[12px_12px_0_0_rgba(0,0,0,1)] transition-all flex flex-col justify-between group h-full">
      <div>
        <div className="flex justify-between items-start mb-6">
          <span className="bg-[#FFD100] text-black px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest italic border-2 border-black">
            CASH PREGĂTIT
          </span>
          <span className="text-2xl grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">💰</span>
        </div>
        
        <h3 className="text-2xl font-black uppercase italic tracking-tight leading-none mb-3 text-black">
          {targetAsset}
        </h3>
        
        <div className="flex items-center gap-2 mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-2 py-1 rounded border border-gray-200">
            {category || "General"}
          </span>
        </div>
        
        <p className="text-sm font-bold text-gray-600 italic line-clamp-3 leading-relaxed">
          &quot;{description}&quot;
        </p>
      </div>
      
      <div className="mt-8 pt-6 border-t-[3px] border-gray-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Buget Maxim</p>
        <p className="text-4xl font-black italic tracking-tighter text-black mb-8 break-words">
          €{budget}
        </p>
        
        <Link 
          href={`/trimite-oferta/${id}`} 
          className="w-full bg-[#FFD100] border-[3px] border-black text-black py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] md:text-xs italic hover:bg-black hover:text-[#FFD100] transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 block text-center"
        >
          Vinde-i Activul Tău
        </Link>
      </div>
    </div>
  );
}