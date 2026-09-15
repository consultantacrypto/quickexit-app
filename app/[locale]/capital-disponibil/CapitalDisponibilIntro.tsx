import { Link } from "@/src/i18n/navigation";
import type { PageLocale } from "@/lib/seo";
import { getCapitalDisponibilUiCopy } from "@/lib/capitalDisponibilContent";

type CapitalDisponibilIntroProps = {
  locale: PageLocale;
};

export default function CapitalDisponibilIntro({ locale }: CapitalDisponibilIntroProps) {
  const copy = getCapitalDisponibilUiCopy(locale);

  return (
    <div className="mb-8">
      <Link
        href="/"
        className="text-[11px] font-black uppercase tracking-[0.3em] italic border-b-[3px] border-black pb-1 hover:text-[#FFD100] hover:border-[#FFD100] transition-all"
      >
        {copy.backHome}
      </Link>

      <div className="mt-5 bg-black text-white border-[3px] border-black rounded-[1.5rem] p-5 md:p-6 shadow-[8px_8px_0_0_rgba(255,209,0,1)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FFD100] mb-2 italic">
          {copy.eyebrow}
        </p>
        <h1 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter leading-[0.95] mb-3">
          {copy.h1}
        </h1>
        <p className="text-sm md:text-base font-bold text-neutral-200 max-w-3xl leading-relaxed">
          {copy.intro}
        </p>
        <Link
          href="/posteaza-cerere"
          className="mt-5 inline-block w-full md:w-auto bg-[#FFD100] text-black px-7 py-4 rounded-xl border-[3px] border-black font-black uppercase tracking-widest text-xs italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-white transition-colors text-center"
        >
          {copy.postDemandCta}
        </Link>
      </div>
    </div>
  );
}
