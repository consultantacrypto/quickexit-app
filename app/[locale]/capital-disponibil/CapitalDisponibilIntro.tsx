import { Link } from "@/src/i18n/navigation";
import type { PageLocale } from "@/lib/seo";
import { getCapitalDisponibilUiCopy } from "@/lib/capitalDisponibilContent";

type CapitalDisponibilIntroProps = {
  locale: PageLocale;
};

export default function CapitalDisponibilIntro({ locale }: CapitalDisponibilIntroProps) {
  const copy = getCapitalDisponibilUiCopy(locale);
  const sections = [
    copy.sections.whatIs,
    copy.sections.forBuyers,
    copy.sections.forSellers,
    copy.sections.different,
    copy.sections.kyc,
    copy.sections.notQuickExit,
  ];

  return (
    <div className="mb-10">
      <Link
        href="/"
        className="text-[11px] font-black uppercase tracking-[0.3em] italic border-b-[3px] border-black pb-1 hover:text-[#FFD100] hover:border-[#FFD100] transition-all"
      >
        {copy.backHome}
      </Link>

      <div className="mt-7 bg-black text-white border-[3px] border-black rounded-[2rem] p-6 md:p-8 shadow-[8px_8px_0_0_rgba(255,209,0,1)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#FFD100] mb-3 italic">
          {copy.eyebrow}
        </p>
        <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-[0.95] mb-4">
          {copy.h1}
        </h1>
        <p className="text-sm md:text-base font-bold text-neutral-200 max-w-3xl leading-relaxed">
          {copy.intro}
        </p>
        <Link
          href="/posteaza-cerere"
          className="mt-6 inline-block w-full md:w-auto bg-[#FFD100] text-black px-7 py-4 rounded-xl border-[3px] border-black font-black uppercase tracking-widest text-xs italic shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-white transition-colors text-center"
        >
          {copy.postDemandCta}
        </Link>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.08)] md:p-7"
          >
            <h2 className="text-base font-black uppercase italic tracking-tight text-black md:text-lg">
              {section.title}
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-700">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-8 max-w-4xl rounded-2xl border-2 border-black/20 bg-[#FFF8E7] p-5 text-sm font-medium leading-relaxed text-neutral-900 md:text-[15px]">
        {copy.compliance}
      </p>

      <nav
        aria-label={copy.relatedLinksTitle}
        className="mt-8 rounded-2xl border-[3px] border-black bg-[#FFFCF4] p-6 md:p-7"
      >
        <h2 className="text-sm font-black uppercase italic tracking-tight text-black md:text-base">
          {copy.relatedLinksTitle}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {copy.relatedLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-block rounded-xl border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-[#FFD100]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
