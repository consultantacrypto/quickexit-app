"use client";

import { Link } from "@/src/i18n/navigation";

interface DemandCardProps {
  id: string;
  targetAsset: string;
  category: string;
  budget: string;
  description: string;
}

export default function DemandCard({ id, targetAsset, category, budget, description }: DemandCardProps) {
  return (
    <div className="group flex h-full flex-col justify-between rounded-3xl border border-line/70 bg-surface p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-neutral-300/80 hover:shadow-[0_28px_50px_-16px_rgba(0,0,0,0.22)]">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-full border border-line bg-canvas px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Buget declarat
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-deep">
            {category || "General"}
          </span>
        </div>

        <h3 className="mb-3 text-2xl font-semibold leading-snug tracking-tight text-ink">
          {targetAsset}
        </h3>

        <p className="mb-6 text-xs font-medium leading-relaxed text-muted">
          Bugetul este declarat de cumpărător și trebuie verificat direct între părți.
        </p>

        <p className="line-clamp-3 text-sm font-normal italic leading-relaxed text-neutral-500">
          &quot;{description}&quot;
        </p>
      </div>

      <div className="mt-8 border-t border-line/60 pt-6">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          Buget maxim
        </p>
        <p className="mb-8 break-words text-4xl font-bold tracking-tight text-ink">€{budget}</p>

        <Link
          href={`/trimite-oferta/${id}`}
          aria-label={`Vinde-i activul tău pentru cererea: ${targetAsset}`}
          className="block w-full rounded-2xl bg-ink py-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-300 hover:bg-gold hover:text-ink md:text-xs"
        >
          Vinde-i activul tău
        </Link>
      </div>
    </div>
  );
}
