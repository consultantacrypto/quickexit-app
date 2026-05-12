"use client";

import { useState } from "react";
import { Shield, Loader2, ArrowRight } from "lucide-react";

interface KycBannerProps {
  userId: string;
  /** Status din profiles (Stripe Identity webhook); ascundem banner-ul doar la verified */
  kycStatus: string;
}

export default function KycBanner({ userId, kycStatus }: KycBannerProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (kycStatus === "verified") return null;

  const handleStartKyc = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/create-verification-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (data.url) {
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
    <div className="relative mb-6 overflow-hidden rounded-2xl border-[3px] border-black bg-neutral-950 p-5 shadow-[6px_6px_0_0_#FFD100] md:mb-8 md:p-6">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#FFD100]/10 blur-2xl" />

      <div className="relative z-10 flex flex-col items-stretch gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="flex min-w-0 items-start gap-3 md:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#FFD100] bg-[#FFD100]/15">
            <Shield className="text-[#FFD100]" size={22} aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black uppercase tracking-tight text-white md:text-lg">
              Verificare cont recomandată
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-300">
              Ai deja activitate plătită pe Quick Exit. Pentru a continua cu încredere și pentru a crește credibilitatea
              în fața cumpărătorilor, finalizează verificarea contului.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartKyc}
          disabled={isLoading}
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-black bg-[#FFD100] px-6 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:brightness-105 disabled:opacity-50 md:w-auto md:min-w-[12rem]"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={18} aria-hidden />
              Se pregătește...
            </>
          ) : (
            <>
              Finalizează verificarea
              <ArrowRight size={18} aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
