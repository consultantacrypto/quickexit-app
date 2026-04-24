"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
  const [isFavorite, setIsFavorite] = useState(false);

  const typeConfig = {
    standard: { bg: "bg-white text-black border-2 border-black", label: "LICHIDITATE" },
    urgent: { bg: "bg-red-600 text-white border-2 border-black", label: "URGENȚĂ EXTREMĂ" },
    extreme: { bg: "bg-[#FFD100] text-black border-2 border-black", label: "OPORTUNITATE MAXIMĂ" },
    auction: { bg: "bg-black text-[#FFD100] border-2 border-[#FFD100]", label: "LICITAȚIE" },
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsFavorite(!isFavorite);
  };

  return (
    <Link 
      href={`/anunt/${id}`} 
      className="group relative flex flex-col bg-white rounded-[2rem] overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-300"
    >
      {/* Etichetă Tip Ofertă */}
      <div className={`absolute top-4 left-4 z-10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest italic ${typeConfig[type].bg}`}>
        {typeConfig[type].label}
      </div>

      {/* Scor AI */}
      <div className="absolute top-4 right-4 z-10 bg-black border-2 border-[#FFD100] w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl">
        <span className="text-[8px] font-black text-[#FFD100] leading-none uppercase italic">Scor AI</span>
        <span className="text-xl font-black text-white leading-none tracking-tighter">{score}</span>
      </div>

      {/* Imaginea - Curată, fără cifre false */}
      <div className="relative h-64 w-full overflow-hidden border-b-4 border-black">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Detalii Anunț */}
      <div className="p-6 flex flex-col flex-grow bg-white">
        <div className="flex justify-between items-start mb-4 gap-4">
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-black leading-none min-h-[40px] flex-1">
            {title}
          </h3>
          <button 
            onClick={toggleFavorite}
            className="bg-gray-50 border-2 border-black p-2 rounded-xl hover:bg-[#FFD100] transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill={isFavorite ? "black" : "none"} viewBox="0 0 24 24" strokeWidth={2.5} stroke="black" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-widest text-red-600 italic mb-1">
              {cards?.marketPrice || "Preț Piață"}: <span className="line-through decoration-black decoration-2">{marketPrice}</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-black tracking-tightest italic leading-none">
                {exitPrice}
              </span>
            </div>
          </div>

          <div className="bg-[#FFD100] border-2 border-black px-4 py-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="block text-xl font-black text-black leading-none italic">
              -{discount}%
            </span>
          </div>
        </div>

        {/* Butonul de Conversie Directă */}
        <div className="mt-8 w-full py-4 bg-black text-[#FFD100] text-center font-black uppercase text-xs tracking-[0.3em] rounded-xl italic group-hover:bg-[#FFD100] group-hover:text-black transition-all">
          CUMPĂRĂ ACUM →
        </div>
      </div>
    </Link>
  );
}