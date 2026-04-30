"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" | "" }>({ text: "", type: "" });

  // Reținem emailul ca să nu mai fie nevoie de reintroducere (Anti-Amnezie)
  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem("quickexit_email");
      if (savedEmail) {
        setEmail(savedEmail);
      }
      setMessage({ text: "", type: "" }); 
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    localStorage.setItem("quickexit_email", email);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Îl trimitem direct în Dashboard după click pe linkul din mail
        emailRedirectTo: `${window.location.origin}/dashboard`, 
      },
    });

    if (error) {
      setMessage({ text: "Eroare: " + error.message, type: "error" });
    } else {
      setMessage({ text: "✓ Verifică-ți mail-ul! Ți-am trimis link-ul de intrare.", type: "success" });
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Îl trimitem direct în Dashboard după login-ul cu Google
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  const handleWeb3Login = () => {
    setMessage({ text: "⚠ Sistemul WalletConnect este în mentenanță pentru Faza 2.", type: "error" });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans antialiased">
      {/* Background Blur Premium */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500" 
        onClick={onClose}
      ></div>

      {/* Modal - Design Neo-Brutalism 2026 */}
      <div className="relative bg-white w-full max-w-md border-[4px] border-black rounded-[2.5rem] shadow-[20px_20px_0_0_rgba(0,0,0,1)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Accent Bar - Black & Gold */}
        <div className="h-4 w-full bg-black flex">
            <div className="h-full w-1/3 bg-[#FFD100]"></div>
            <div className="h-full w-2/3 bg-black"></div>
        </div>

        {/* Buton Închidere */}
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 bg-gray-50 border-2 border-transparent hover:border-black hover:bg-[#FFD100] rounded-full flex items-center justify-center transition-all group z-10"
        >
          <span className="text-2xl font-black text-black opacity-40 group-hover:opacity-100 group-hover:rotate-90 transition-all duration-300">✕</span>
        </button>

        <div className="p-10 pt-14 text-center">
          <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-4">
            Bine ai <span className="text-[#FFD100] drop-shadow-[3px_3px_0_rgba(0,0,0,1)]">venit</span>
          </h2>
          <p className="text-[11px] md:text-[12px] font-bold text-gray-500 uppercase tracking-widest px-4 leading-relaxed">
            Intră în cont pentru a vedea ofertele cash sau pentru a vinde rapid.
          </p>
        </div>

        <div className="px-10 pb-12 space-y-8">
          
          {/* Căsuța de Email Albă - Luxury Styling */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative group">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-black mb-3 block ml-1 italic">
                Creează cont sau loghează-te cu mail
              </label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="adresa.ta@email.com" 
                className="w-full p-5 bg-white border-[3px] border-black text-black rounded-2xl font-black text-lg text-center focus:outline-none focus:bg-gray-50 shadow-[6px_6px_0_0_rgba(0,0,0,0.05)] transition-all placeholder:text-gray-200"
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-[#FFD100] border-[3px] border-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm italic transition-all hover:bg-gray-900 shadow-[8px_8px_0_0_rgba(255,209,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50"
            >
              {isLoading ? "Se procesează..." : "Primește link-ul de acces →"}
            </button>
            
            <p className="text-[9px] font-bold text-gray-400 text-center uppercase tracking-[0.1em] italic">
              Dacă nu ai cont, se va crea automat după ce apeși pe link-ul din mail.
            </p>
          </form>

          <div className="flex items-center gap-6">
            <div className="h-[2px] bg-gray-100 flex-1"></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Opțiuni Avansate</span>
            <div className="h-[2px] bg-gray-100 flex-1"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Login */}
            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-white border-[3px] border-black text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] italic flex items-center justify-center gap-3 hover:bg-gray-50 transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>

            {/* Web3 Wallet */}
            <button 
              onClick={handleWeb3Login}
              className="relative w-full bg-[#111] text-[#FFD100] border-[3px] border-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] italic transition-all hover:shadow-[0_0_20px_rgba(255,209,0,0.3)] active:scale-95 flex items-center justify-center gap-2 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.22l7.365 4.339 7.365-4.34L12.056 0z"/>
              </svg>
              Web3 Wallet
            </button>
          </div>

          {/* Mesaje status */}
          {message.text && (
            <div className={`p-4 rounded-2xl border-[3px] text-[10px] font-black uppercase text-center animate-in slide-in-from-top-4 ${message.type === 'error' ? 'bg-black border-red-500 text-red-500' : 'bg-black border-[#FFD100] text-[#FFD100]'}`}>
              {message.text}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}