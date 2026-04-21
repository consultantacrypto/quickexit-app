"use client"; // Adăugăm asta pentru a fi siguri că interacțiunile merg brici

import Image from "next/image";
import Link from "next/link";
import { ro } from "../../locales/ro";

interface AdCardProps {
  id: string;
  title: string;
  image: string;
  marketPrice: string;
  exitPrice: string;
  discount: string;
  score: number;
  type: 'urgent' | 'extreme' | 'standard' | 'auction';
}

export default function AdCard({ id, title, image, marketPrice, exitPrice, discount, score, type }: AdCardProps) {
  const { cards } = ro;

  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 group">
      {/* Imaginea Activului */}
      <div className="relative h-64 w-full">
        <Image 
          src={image} 
          alt={title} 
          fill 
          className="object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        
        <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-xl font-black text-sm shadow-lg">
          -{discount}%
        </div>

        <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-[#FFD100] text-[#FFD100] px-3 py-2 rounded-xl flex items-center gap-2 shadow-xl">
          <span className="text-[10px] font-black uppercase tracking-tighter text-white/70">{cards.dealScore}</span>
          <span className="text-lg font-black">{score}</span>
        </div>
      </div>

      <div className="p-6 text-left">
        <h4 className="text-xl font-black text-black mb-4 truncate uppercase tracking-tight">{title}</h4>
        
        <div className="flex justify-between items-end mb-6">
          <div>
            <p className="text-xs font-bold text-gray-400 line-through mb-1">{cards.marketPrice}: {marketPrice}</p>
            <p className="text-2xl font-black text-black tracking-tighter">{exitPrice}</p>
          </div>
          <div className="text-right">
             <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                type === 'extreme' ? 'bg-black text-[#FFD100]' : 
                type === 'urgent' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
             }`}>
               {type === 'extreme' ? 'Oportunitate Maximă' : 
                type === 'urgent' ? 'Urgență Extremă' : 
                type === 'standard' ? 'Lichiditate' : 'Licitație'}
             </span>
          </div>
        </div>

        {/* LINK-ul ACTIV - Verifică ID-ul aici */}
        <Link 
          href={`/anunt/${id}`}
          key={id}
          className="block w-full py-4 bg-gray-50 text-black font-black uppercase text-xs tracking-widest rounded-xl border border-gray-200 hover:bg-black hover:text-white transition-all duration-300 text-center cursor-pointer"
        >
          {cards.viewDetails}
        </Link>
      </div>
    </div>
  );
}