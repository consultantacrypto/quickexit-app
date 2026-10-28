"use client";

import { useState } from "react";
import { isStripeCheckoutUrl } from "@/lib/dealerSubscription";

export default function DealerSubscribeButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/stripe/dealer-checkout", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url || !isStripeCheckoutUrl(data.url)) {
        setError(data?.error || "Nu am putut deschide plata. Încearcă din nou.");
        setPending(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Nu am putut deschide plata. Încearcă din nou.");
      setPending(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex w-full items-center justify-center border-[3px] border-black bg-[#FFD100] px-5 py-4 text-sm font-black uppercase tracking-wider text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Se deschide plata..." : "Abonează-te și plătește 600 RON"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-bold text-red-800">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-xs font-semibold text-neutral-600">
          Plata se face pe Stripe, pe loc. Nu este nevoie de cont Quick Exit ca să începi.
        </p>
      )}
    </div>
  );
}
