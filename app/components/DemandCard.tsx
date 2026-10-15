"use client";

import { Link } from "@/src/i18n/navigation";
import { useTranslations } from "next-intl";
import { demandOfferPath } from "@/src/i18n/paths";
import {
  extractDemandLocation,
  formatDemandRequirementChips,
} from "@/lib/demandRequirements";

interface DemandCardProps {
  id: string;
  targetAsset: string;
  category: string;
  budget: string;
  description: string;
  requirements?: unknown;
  buyerVerified?: boolean;
  expiresAt?: string | null;
  locale?: "ro" | "en";
}

export default function DemandCard({
  id,
  targetAsset,
  category,
  budget,
  description,
  requirements,
  buyerVerified = false,
  expiresAt = null,
  locale = "ro",
}: DemandCardProps) {
  const t = useTranslations("DemandCard");
  const chips = formatDemandRequirementChips(requirements, locale, 3);
  const location = extractDemandLocation(requirements);

  return (
    <article className="group flex h-full flex-col justify-between rounded-3xl border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.12)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#FFD100] md:p-8">
      <div>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="rounded-lg border-2 border-black bg-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFD100]">
            {t("buyingLabel")}
          </span>
          {buyerVerified ? (
            <span className="rounded-lg border-2 border-black bg-[#FFD100] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black">
              {t("verifiedBuyer")}
            </span>
          ) : null}
          {category ? (
            <span className="rounded-lg border border-black/20 bg-[#F7F4EC] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-700">
              {category}
            </span>
          ) : null}
        </div>

        <h3 className="mb-4 text-2xl font-black uppercase italic leading-snug tracking-tight text-black md:text-[1.65rem]">
          {targetAsset}
        </h3>

        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
          {t("availableBudget")}
        </p>
        <p className="mb-5 break-words text-4xl font-black tracking-tight text-black md:text-5xl">
          {budget}
        </p>

        <div className="mb-5 flex flex-col gap-1.5 text-xs font-semibold text-neutral-700">
          {location ? (
            <p>
              <span className="font-black uppercase tracking-widest text-neutral-500">
                {t("location")}:{" "}
              </span>
              {location}
            </p>
          ) : null}
          <p>
            <span className="font-black uppercase tracking-widest text-neutral-500">
              {t("timeHorizon")}:{" "}
            </span>
            {t("timeHorizonValue")}
          </p>
          {expiresAt ? (
            <p className="text-[11px] text-neutral-500">
              {t("activeUntil")}:{" "}
              {new Date(expiresAt).toLocaleDateString(locale === "en" ? "en-GB" : "ro-RO")}
            </p>
          ) : null}
        </div>

        {chips.length > 0 ? (
          <ul className="mb-5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li
                key={`${chip.key}-${chip.value}`}
                className="max-w-full truncate rounded-full border border-black/15 bg-[#FDFCF8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-800"
                title={`${chip.label}: ${chip.value}`}
              >
                {chip.label}: {chip.value}
              </li>
            ))}
          </ul>
        ) : null}

        {description ? (
          <p className="line-clamp-2 text-sm font-medium italic leading-relaxed text-neutral-600">
            &quot;{description}&quot;
          </p>
        ) : null}
      </div>

      <div className="mt-8 border-t-[3px] border-black/10 pt-6">
        <Link
          href={demandOfferPath(id)}
          aria-label={t("sellCtaAria", { targetAsset })}
          className="block w-full rounded-2xl border-[3px] border-black bg-black py-4 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#FFD100] transition-colors duration-200 hover:bg-[#FFD100] hover:text-black md:text-xs"
        >
          {t("sellCta")}
        </Link>
      </div>
    </article>
  );
}
