"use client";

import { useTranslations } from "next-intl";
import {
  extractYoutubeVideoId,
  type FutureMobilityDetails,
  type FutureMobilityEvSpecs,
} from "@/lib/futureMobility";
import { formatEurAmount, getNumberLocale } from "@/lib/i18n/format";
import { useLocale } from "next-intl";

type FutureMobilitySectionsProps = {
  fm: FutureMobilityDetails;
  numberLocale?: string;
};

function SpecGrid({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {rows.map(({ label, value }, idx) => (
        <div
          key={`${label}-${idx}`}
          className="rounded-xl border-[3px] border-black bg-neutral-50/80 p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.08)] md:rounded-2xl"
        >
          <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-neutral-400">
            {label}
          </p>
          <p className="font-bold leading-snug text-black [overflow-wrap:anywhere]">{value}</p>
        </div>
      ))}
    </div>
  );
}

function buildEvSpecRows(
  fm: FutureMobilityDetails,
  ev: FutureMobilityEvSpecs,
  t: ReturnType<typeof useTranslations>,
  numberLocale: string,
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | number | undefined) => {
    if (value === undefined || value === "") return;
    rows.push({ label, value: String(value) });
  };

  if (fm.make) push(t("futureMobility.fields.make"), fm.make);
  if (fm.model) push(t("futureMobility.fields.model"), fm.model);
  if (fm.year !== undefined) push(t("futureMobility.fields.year"), String(fm.year));
  if (fm.fuel) push(t("futureMobility.fields.fuel"), fm.fuel);
  if (fm.transmission) push(t("futureMobility.fields.transmission"), fm.transmission);
  if (fm.bodyType) push(t("futureMobility.fields.bodyType"), fm.bodyType);
  if (fm.drivetrain) push(t("futureMobility.fields.drivetrain"), fm.drivetrain);

  if (ev.power_hp !== undefined) {
    const formattedPower = ev.power_hp.toLocaleString(numberLocale);
    push(t("futureMobility.fields.powerPsMax"), `${formattedPower} PS`);
  }
  if (ev.power_kw !== undefined) push(t("futureMobility.fields.powerKw"), `${ev.power_kw} kW`);
  if (ev.torque_nm !== undefined) push(t("futureMobility.fields.torque"), `${ev.torque_nm} Nm`);
  if (ev.battery_kwh !== undefined) push(t("futureMobility.fields.battery"), `${ev.battery_kwh} kWh`);
  if (ev.range_km_wltp !== undefined)
    push(t("futureMobility.fields.rangeWltp"), `${ev.range_km_wltp.toLocaleString(numberLocale)} km`);
  if (ev.range_km_cltc !== undefined)
    push(t("futureMobility.fields.rangeCltc"), `${ev.range_km_cltc.toLocaleString(numberLocale)} km`);
  if (ev.acceleration_0_100) push(t("futureMobility.fields.acceleration"), ev.acceleration_0_100);
  if (ev.top_speed_kmh !== undefined)
    push(t("futureMobility.fields.topSpeed"), `${ev.top_speed_kmh} km/h`);
  if (ev.charging_dc_kw !== undefined)
    push(t("futureMobility.fields.chargingDc"), `${ev.charging_dc_kw} kW`);
  if (ev.charging_10_80) push(t("futureMobility.fields.charging1080"), ev.charging_10_80);

  return rows;
}

export function FutureMobilityBadgePills({ fm }: { fm: FutureMobilityDetails }) {
  const t = useTranslations("ListingDetail");
  if (!fm.badges?.length) return null;

  const labelMap = {
    FUTURE_COLLECTION: t("futureMobility.badges.futureCollection"),
    IMPORT_PREMIUM: t("futureMobility.badges.importPremium"),
    EV_PREMIUM: t("futureMobility.badges.evPremium"),
    CONFIGURABIL: t("futureMobility.badges.configurable"),
  } as const;

  return (
    <div className="flex flex-wrap gap-2">
      {fm.badges.map((badge) => {
        const label = labelMap[badge];
        if (!label) return null;
        return (
          <span
            key={badge}
            className="rounded-full border-2 border-black bg-[#FFD100] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-black"
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

export function FutureMobilityAvailabilityLine({ fm }: { fm: FutureMobilityDetails }) {
  const t = useTranslations("ListingDetail");
  const availabilityLabel =
    fm.availability_type === "in_stock"
      ? t("futureMobility.availability.inStock")
      : fm.availability_type === "preorder"
        ? t("futureMobility.availability.preorder")
        : fm.availability_type === "on_order"
          ? t("futureMobility.availability.onOrder")
          : null;

  if (!availabilityLabel && !fm.delivery_estimate && !fm.delivery_note) return null;

  return (
    <div className="mt-4 space-y-1">
      {availabilityLabel ? (
        <p className="text-[11px] font-black uppercase tracking-widest text-black">
          {availabilityLabel}
        </p>
      ) : null}
      {fm.delivery_estimate ? (
        <p className="text-sm font-bold text-neutral-800">
          {t("futureMobility.deliveryEstimate", { estimate: fm.delivery_estimate })}
        </p>
      ) : null}
      {fm.delivery_note ? (
        <p className="text-xs font-medium italic text-neutral-600">{fm.delivery_note}</p>
      ) : null}
    </div>
  );
}

export function FutureMobilityVideoSection({ fm }: { fm: FutureMobilityDetails }) {
  const t = useTranslations("ListingDetail");
  if (!fm.videos?.length) return null;

  return (
    <div className="space-y-4">
      {fm.videos.map((video, index) => {
        const videoId = extractYoutubeVideoId(video);
        if (!videoId) return null;
        return (
          <div
            key={`${videoId}-${index}`}
            className="overflow-hidden rounded-[2rem] border-[3px] border-black bg-black shadow-[8px_8px_0_0_#FFD100]"
          >
            {video.title ? (
              <p className="border-b border-black/20 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black">
                {video.title}
              </p>
            ) : null}
            <div className="relative aspect-video w-full">
              <iframe
                title={video.title || t("futureMobility.videoTitle")}
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FutureMobilitySections({ fm }: FutureMobilitySectionsProps) {
  const t = useTranslations("ListingDetail");
  const locale = useLocale();
  const numberLocale = getNumberLocale(locale);

  const specRows = fm.ev_specs
    ? buildEvSpecRows(fm, fm.ev_specs, t, numberLocale)
    : buildEvSpecRows(fm, {}, t, numberLocale);

  return (
    <>
      {specRows.length > 0 ? <SpecGrid rows={specRows} /> : null}

      {fm.variants && fm.variants.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-black uppercase italic tracking-tight text-black">
            {t("futureMobility.variantsTitle")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {fm.variants.map((variant) => (
              <div
                key={variant.id}
                className="rounded-xl border-[3px] border-black bg-[#FFFEF6] p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.08)]"
              >
                <p className="font-black uppercase italic text-black">{variant.name}</p>
                {variant.price_from_eur !== undefined ? (
                  <p className="mt-1 text-sm font-bold text-neutral-800">
                    {t("futureMobility.priceFrom", {
                      price: formatEurAmount(variant.price_from_eur, locale),
                    })}
                  </p>
                ) : null}
                {variant.highlights?.length ? (
                  <ul className="mt-2 space-y-1 text-xs font-medium text-neutral-700">
                    {variant.highlights.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {fm.colors && fm.colors.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-black uppercase italic tracking-tight text-black">
            {t("futureMobility.colorsTitle")}
          </h2>
          <div className="flex flex-wrap gap-3">
            {fm.colors.map((color) => (
              <div
                key={color.id}
                className="flex items-center gap-2 rounded-xl border-[3px] border-black bg-white px-3 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.08)]"
              >
                {color.hex ? (
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border-2 border-black"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden
                  />
                ) : null}
                <span className="text-xs font-bold text-black">{color.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {fm.options && fm.options.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-black uppercase italic tracking-tight text-black">
            {t("futureMobility.optionsTitle")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {fm.options.map((option) => (
              <li
                key={option}
                className="rounded-lg border-2 border-black bg-[#F7F4EC] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-black"
              >
                {option}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {fm.battery_packs && fm.battery_packs.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-black uppercase italic tracking-tight text-black">
            {t("futureMobility.batteryTitle")}
          </h2>
          <ul className="space-y-2">
            {fm.battery_packs.map((pack) => (
              <li
                key={pack.id}
                className="text-sm font-bold text-neutral-800"
              >
                {pack.name}
                {pack.included ? (
                  <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                    ({t("futureMobility.included")})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {fm.warranty?.summary || fm.warranty?.months !== undefined ? (
        <div className="mt-8 rounded-xl border-[3px] border-black bg-[#FFFEF6] p-4">
          <h2 className="mb-2 text-sm font-black uppercase italic tracking-tight text-black">
            {t("futureMobility.warrantyTitle")}
          </h2>
          {fm.warranty.summary ? (
            <p className="text-sm font-medium text-neutral-800">{fm.warranty.summary}</p>
          ) : null}
          {fm.warranty.months !== undefined ? (
            <p className="mt-1 text-xs font-bold text-neutral-600">
              {t("futureMobility.warrantyMonths", { months: fm.warranty.months })}
            </p>
          ) : null}
        </div>
      ) : null}

      {fm.import?.type || fm.import?.homologation_note ? (
        <div className="mt-8 rounded-xl border-[3px] border-dashed border-black/40 bg-white p-4">
          <h2 className="mb-2 text-sm font-black uppercase italic tracking-tight text-black">
            {t("futureMobility.importTitle")}
          </h2>
          {fm.import.type ? (
            <p className="text-sm font-bold text-neutral-800">{fm.import.type}</p>
          ) : null}
          {fm.import.origin_market ? (
            <p className="mt-1 text-xs font-medium text-neutral-600">
              {t("futureMobility.importOrigin", { market: fm.import.origin_market })}
            </p>
          ) : null}
          {fm.import.homologation_note ? (
            <p className="mt-2 text-xs font-medium italic text-neutral-600">
              {fm.import.homologation_note}
            </p>
          ) : null}
        </div>
      ) : null}

      {fm.hero_story?.headline || fm.hero_story?.body ? (
        <div className="mt-8 rounded-[2rem] border-[3px] border-black bg-[#FFD100]/20 p-6 md:p-8">
          {fm.hero_story.headline ? (
            <h2 className="text-lg font-black uppercase italic tracking-tight text-black md:text-xl">
              {fm.hero_story.headline}
            </h2>
          ) : null}
          {fm.hero_story.body ? (
            <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-800 whitespace-pre-wrap">
              {fm.hero_story.body}
            </p>
          ) : null}
        </div>
      ) : null}

      {fm.competitors && fm.competitors.length > 0 ? (
        <div className="mt-8 overflow-x-auto">
          <h2 className="mb-4 text-sm font-black uppercase italic tracking-tight text-black">
            {t("futureMobility.competitorsTitle")}
          </h2>
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-2 pr-4 text-[10px] font-black uppercase tracking-widest">
                  {t("futureMobility.competitors.model")}
                </th>
                <th className="py-2 pr-4 text-[10px] font-black uppercase tracking-widest">
                  {t("futureMobility.competitors.power")}
                </th>
                <th className="py-2 pr-4 text-[10px] font-black uppercase tracking-widest">
                  {t("futureMobility.competitors.acceleration")}
                </th>
                <th className="py-2 text-[10px] font-black uppercase tracking-widest">
                  {t("futureMobility.competitors.range")}
                </th>
              </tr>
            </thead>
            <tbody>
              {fm.competitors.map((row) => (
                <tr key={row.name} className="border-b border-neutral-200">
                  <td className="py-3 pr-4 font-bold text-black">{row.name}</td>
                  <td className="py-3 pr-4 text-neutral-800">
                    {row.power_hp !== undefined
                      ? `${row.power_hp.toLocaleString(numberLocale)} PS`
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 text-neutral-800">{row.acceleration_0_100 ?? "—"}</td>
                  <td className="py-3 text-neutral-800">
                    {row.range_km !== undefined ? `${row.range_km} km` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {fm.faq && fm.faq.length > 0 ? (
        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-black uppercase italic tracking-tight text-black">
            {t("futureMobility.faqTitle")}
          </h2>
          {fm.faq.map((item, index) => (
            <details
              key={`${item.q}-${index}`}
              className="rounded-xl border-[3px] border-black bg-white p-4 shadow-[2px_2px_0_0_rgba(0,0,0,0.06)]"
            >
              <summary className="cursor-pointer text-sm font-black text-black">{item.q}</summary>
              <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-700">{item.a}</p>
            </details>
          ))}
        </div>
      ) : null}
    </>
  );
}

export function FutureMobilityDealerCard({ fm }: { fm: FutureMobilityDetails }) {
  const t = useTranslations("ListingDetail");
  const partner = fm.dealer_partner;
  if (!partner) return null;

  return (
    <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.85)]">
      <h3 className="mb-4 text-sm font-black uppercase italic tracking-tight text-black">
        {t("futureMobility.dealerTitle")}
      </h3>
      <div className="flex items-start gap-4">
        {partner.logo_url ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={partner.logo_url}
              alt=""
              className="h-full w-full object-contain p-1"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-black uppercase italic text-black">{partner.name}</p>
          {partner.description ? (
            <p className="mt-2 text-xs font-medium leading-relaxed text-neutral-700">
              {partner.description}
            </p>
          ) : null}
          {partner.website ? (
            <a
              href={partner.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-[10px] font-black uppercase tracking-widest text-black underline underline-offset-4"
            >
              {t("futureMobility.dealerWebsite")}
            </a>
          ) : null}
        </div>
      </div>
      <p className="mt-5 border-t border-neutral-200 pt-4 text-xs font-medium leading-relaxed text-neutral-600">
        {t("futureMobility.partnerConfirmNote")}
      </p>
    </div>
  );
}
