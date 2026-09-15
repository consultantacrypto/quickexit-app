import { Link } from "@/src/i18n/navigation";
import type { PageLocale } from "@/lib/seo";
import { getCapitalDisponibilUiCopy } from "@/lib/capitalDisponibilContent";

type CapitalDisponibilGuideProps = {
  locale: PageLocale;
};

export default function CapitalDisponibilGuide({ locale }: CapitalDisponibilGuideProps) {
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
    <div className="mt-12">
      <div className="grid gap-5 md:grid-cols-2">
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
