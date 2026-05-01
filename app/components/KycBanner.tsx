'use client';

import { useState } from 'react';
import { ShieldAlert, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';

interface KycBannerProps {
  userId: string;
  kycStatus: 'unverified' | 'pending' | 'verified';
}

export default function KycBanner({ userId, kycStatus }: KycBannerProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Dacă e deja verificat, ascundem componenta complet. Nu-l mai deranjăm.
  if (kycStatus === 'verified') return null;

  const handleStartKyc = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/create-verification-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      
      const data = await res.json();
      
      if (data.url) {
        // Îl trimitem la Stripe să facă pozele
        window.location.href = data.url;
      } else {
        console.error("Eroare la generarea sesiunii KYC:", data.error);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Eroare request KYC:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0f1e] border border-red-500/30 rounded-2xl p-6 mb-8 shadow-[0_0_30px_rgba(239,68,68,0.1)] relative overflow-hidden">
      {/* Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] pointer-events-none"></div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="text-red-400" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">
              Verificarea Identității (KYC) Necesară
            </h3>
            <p className="text-sm text-gray-400">
              Pentru a menține standardul de securitate QuickExit, trebuie să îți verificăm identitatea înainte ca anunțul tău să devină public pentru investitori.
            </p>
          </div>
        </div>

        <button 
          onClick={handleStartKyc}
          disabled={isLoading}
          className="w-full md:w-auto whitespace-nowrap bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <><Loader2 className="animate-spin" size={20} /> Se pregătește portalul...</>
          ) : (
            <>Începe Verificarea <ArrowRight size={20} /></>
          )}
        </button>

      </div>
    </div>
  );
}