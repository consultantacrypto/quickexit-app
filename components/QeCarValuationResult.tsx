"use client";

import type { ReactNode } from "react";
import { Link } from "@/src/i18n/navigation";
import { ShieldCheck } from "lucide-react";
import {
  QE_INSUFFICIENT_MESSAGE,
  QE_VALUATION_CONSENT_VERSION,
  type QeValuationPublicBody,
} from "@/lib/qeCarValuation";

function formatEur(value: number): string {
  return `${value.toLocaleString("ro-RO")} EUR`;
}

function formatKm(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return value;
  return `${Number(digits).toLocaleString("ro-RO")} km`;
}

export type QeCarValuationResultProps = {
  make: string;
  model: string;
  year: string;
  km: string;
  result: QeValuationPublicBody;
  listingHref: string;
  onListingClick: () => void;
  onRestart: () => void;
  email: string;
  consent: boolean;
  website: string;
  onEmailChange: (value: string) => void;
  onConsentChange: (value: boolean) => void;
  onWebsiteChange: (value: string) => void;
  onEmailSubmit: () => void;
  emailSubmitting: boolean;
  emailNotice: string | null;
  emailNoticeTone: "neutral" | "error";
  turnstile?: ReactNode;
};

export default function QeCarValuationResult({
  make,
  model,
  year,
  km,
  result,
  listingHref,
  onListingClick,
  onRestart,
  email,
  consent,
  website,
  onEmailChange,
  onConsentChange,
  onWebsiteChange,
  onEmailSubmit,
  emailSubmitting,
  emailNotice,
  emailNoticeTone,
  turnstile,
}: QeCarValuationResultProps) {
  const priced = result.sufficient && result.range !== null;
  const countLabel =
    result.comparable_count === 1
      ? "1 anunț comparabil"
      : `${result.comparable_count} anunțuri comparabile`;

  return (
    <section className="space-y-8 md:space-y-10" data-qe-valuation={priced ? "result" : "insufficient"}>
      <div
        role="note"
        className="rounded-xl border-2 border-amber-600/40 bg-amber-50 px-4 py-3 text-center text-[10px] font-black uppercase leading-relaxed tracking-wide text-amber-950 md:text-[11px]"
      >
        Prețuri cerute pe QuickExit — nu evaluare autorizată, nu preț de tranzacție.
      </div>

      <div className="rounded-[2rem] border-[3px] border-black bg-black p-6 text-white shadow-[10px_10px_0_0_#FFD100] md:p-10 lg:p-12">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FFD100]/90">
          Evaluare auto QuickExit
        </p>
        <h2 className="mt-3 text-2xl font-black uppercase italic leading-tight tracking-tight md:text-4xl">
          {make} {model}
        </h2>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
          {year} · {formatKm(km)}
        </p>

        {priced && result.range ? (
          <div className="mt-8 border-t border-white/15 pt-8">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#FFD100]">
              {result.tier_label}
            </p>
            <p className="mt-4 text-3xl font-black leading-none tabular-nums text-white sm:text-4xl md:text-5xl">
              <span className="block sm:inline">{formatEur(result.range.p25)}</span>
              <span className="mx-0 my-2 block text-[#FFD100] sm:mx-3 sm:my-0 sm:inline">–</span>
              <span className="block sm:inline">{formatEur(result.range.p75)}</span>
            </p>
            <p className="mt-4 text-sm font-semibold text-neutral-200 md:text-base">
              Mediană {formatEur(result.range.p50)}
            </p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              {countLabel} pe QuickExit
              {result.tier ? ` · nivel ${result.tier}` : ""}
            </p>
          </div>
        ) : (
          <div className="mt-8 border-t border-white/15 pt-8">
            <h3 className="text-xl font-black uppercase italic leading-snug text-white md:text-3xl">
              {QE_INSUFFICIENT_MESSAGE}
            </h3>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300 md:text-base">
              Nu inventăm un preț când anunțurile comparabile sunt prea puține. Poți lista mașina
              pe QuickExit și stabilești tu prețul.
            </p>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400">
              {result.comparable_count > 0
                ? `Am găsit ${result.comparable_count} anunțuri active, sub pragul minim pentru un interval.`
                : "Nu am găsit anunțuri active potrivite pe QuickExit."}
            </p>
          </div>
        )}

        {result.equipment ? (
          <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFD100]/85">
              Dotare notată
            </p>
            <p className="mt-2 break-words text-sm font-medium leading-relaxed text-neutral-100">
              {result.equipment}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-neutral-400">{result.equipment_note}</p>
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-white/20 bg-neutral-950/80 p-5">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#FFD100]" aria-hidden />
            <p className="text-sm font-medium leading-relaxed text-neutral-200">{result.disclaimer}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={listingHref}
            onClick={onListingClick}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border-[3px] border-black bg-[#FFD100] px-6 py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-black shadow-[5px_5px_0_0_rgba(0,0,0,0.9)] transition hover:brightness-105"
          >
            Listează la QE
          </Link>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-white/30 bg-transparent px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-neutral-300 transition hover:border-white hover:text-white"
          >
            Reiau evaluarea
          </button>
        </div>
      </div>

      <form
        className="relative rounded-[1.75rem] border-[3px] border-black bg-[#F7F4EC] p-6 md:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          onEmailSubmit();
        }}
      >
        <h3 className="text-lg font-black uppercase italic tracking-tight text-black md:text-xl">
          Primești raportul pe email
        </h3>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-neutral-600">
          Opțional. Intervalul rămâne pe pagină și fără email.
        </p>

        <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(event) => onWebsiteChange(event.target.value)}
              name="company_website"
            />
          </label>
        </div>

        <label className="mt-6 block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
            Email
          </span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="w-full rounded-xl border-2 border-black bg-white px-4 py-3 text-base font-semibold text-neutral-900 outline-none focus:border-[#FFD100] focus:ring-[3px] focus:ring-[#FFD100]/40"
            placeholder="nume@exemplu.ro"
          />
        </label>

        <label className="mt-4 flex items-start gap-3 rounded-xl border-2 border-black bg-white p-4">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 accent-black"
            checked={consent}
            onChange={(event) => onConsentChange(event.target.checked)}
          />
          <span className="text-sm font-medium leading-relaxed text-neutral-800">
            Sunt de acord ca QuickExit să păstreze acest email și să îl folosească pentru a-mi
            trimite raportul de evaluare. Am citit{" "}
            <Link href="/confidentialitate" className="font-black underline">
              politica de confidențialitate
            </Link>
            . Pot cere ștergerea datelor. Consimțământ versiunea {QE_VALUATION_CONSENT_VERSION}.
          </span>
        </label>

        {turnstile ? <div className="mt-4">{turnstile}</div> : null}

        {emailNotice ? (
          <p
            role="status"
            className={`mt-4 text-sm font-semibold leading-relaxed ${
              emailNoticeTone === "error" ? "text-red-800" : "text-neutral-800"
            }`}
          >
            {emailNotice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={emailSubmitting}
          className="mt-6 w-full rounded-xl border-2 border-black bg-white px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-[#FFD100] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {emailSubmitting ? "Se trimite..." : "Trimite raportul pe email"}
        </button>
      </form>
    </section>
  );
}
