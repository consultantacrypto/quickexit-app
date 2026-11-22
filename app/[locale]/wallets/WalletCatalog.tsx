"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  WALLET_OUTBOUND_REL,
  buildWalletOutboundUrl,
  hasRealCheckoutCode,
  walletModelName,
  walletPriceView,
  type WalletDeviceType,
  type WalletLocale,
  type WalletProduct,
  type WalletTier,
} from "@/lib/walletCatalog";
import {
  WALLET_QUICK_PICKS,
  brandNeedsCheckoutNote,
  walletBrandShelves,
  type WalletBrandProfile,
  type WalletQuickPickId,
} from "@/lib/walletBrands";
import { reportWalletClick } from "@/lib/walletAffiliateTrafficClient";

type TierFilter = "all" | WalletTier;
type TypeFilter = "all" | WalletDeviceType;

const TIERS: TierFilter[] = ["all", "entry", "mid", "premium"];
const TYPES: TypeFilter[] = ["all", "card", "device", "airgap"];

function catalogLocale(locale: string): WalletLocale {
  return locale === "en" ? "en" : "ro";
}

function ModelPrice({ product, locale }: { product: WalletProduct; locale: WalletLocale }) {
  const t = useTranslations("Wallets");
  const price = walletPriceView(product, locale);
  if (price.status === "hidden") return null;
  return (
    <div className="shrink-0 text-right">
      <p className="whitespace-nowrap text-sm font-semibold text-black">
        {price.priceIsFrom ? <span className="mr-1 font-medium text-neutral-500">{t("fromPrefix")}</span> : null}
        {price.primary}
      </p>
      {price.secondary ? (
        <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">
          {price.secondaryKind === "geo_storefront"
            ? `${t("geoStorefront")}: ${price.secondary}`
            : `${price.secondary} ${t("samePage")}`}
        </p>
      ) : null}
      <p className="mt-0.5 whitespace-nowrap text-[10px] uppercase tracking-wider text-neutral-400">
        {t("checkedOn", { date: price.checkedOn })}
      </p>
    </div>
  );
}

function BrandCard({
  brand,
  models,
  locale,
  priority,
}: {
  brand: WalletBrandProfile;
  models: WalletProduct[];
  locale: WalletLocale;
  priority: boolean;
}) {
  const t = useTranslations("Wallets");
  const lead = models[0];
  const href = lead ? buildWalletOutboundUrl(lead) : brand.image.sourceUrl;
  const positioning = locale === "en" ? brand.positioningEn : brand.positioningRo;
  const alt = locale === "en" ? brand.image.altEn : brand.image.altRo;
  const showCodeNote = brandNeedsCheckoutNote(models);
  const realCode = models.find((model) => hasRealCheckoutCode(model))?.affiliateCode ?? null;

  return (
    <article
      id={`brand-${brand.slug}`}
      className="flex h-full scroll-mt-28 flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-black/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.07)]"
    >
      <div className={`relative aspect-[5/4] ${brand.tone === "dark" ? "bg-[#141414]" : "bg-[#F4F1E8]"}`}>
        <Image
          src={brand.image.src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-contain p-5"
        />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4 md:px-6 md:pb-6">
        <h2 className="text-2xl font-black tracking-tight text-black">{brand.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">{positioning}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {brand.highlights.map((item) => (
            <li
              key={item.en}
              className="rounded-full bg-[#F7F4EC] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-700"
            >
              {locale === "en" ? item.en : item.ro}
            </li>
          ))}
        </ul>
        <ul className="mt-5 border-t border-black/10">
          {models.map((model) => (
            <li key={model.slug} className="flex items-start justify-between gap-4 border-b border-black/10 py-2.5">
              <p className="min-w-0 text-sm leading-snug text-neutral-800">{walletModelName(model, locale)}</p>
              <ModelPrice product={model} locale={locale} />
            </li>
          ))}
        </ul>
        {realCode ? (
          <p className="mt-3 font-mono text-sm text-black">{realCode}</p>
        ) : null}
        {showCodeNote ? <p className="mt-3 text-xs leading-relaxed text-neutral-500">{t("codePending")}</p> : null}
        <div className="mt-auto pt-5">
          <a
            href={href}
            target="_blank"
            rel={WALLET_OUTBOUND_REL}
            onClick={() => {
              if (!lead) return;
              reportWalletClick({ brandSlug: lead.brandSlug, slug: lead.slug });
            }}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-[#FFD100] hover:text-black"
          >
            {t("buyOfficial")}
            <span className="sr-only"> ({t("newTab")})</span>
          </a>
        </div>
      </div>
    </article>
  );
}

export default function WalletCatalog() {
  const t = useTranslations("Wallets");
  const locale = catalogLocale(useLocale());
  const [tier, setTier] = useState<TierFilter>("all");
  const [deviceType, setDeviceType] = useState<TypeFilter>("all");
  const shelves = walletBrandShelves({ tier, deviceType });

  const tierLabel: Record<TierFilter, string> = {
    all: t("tierAll"),
    entry: t("tierEntry"),
    mid: t("tierMid"),
    premium: t("tierPremium"),
  };
  const typeLabel: Record<TypeFilter, string> = {
    all: t("typeAll"),
    card: t("typeCard"),
    device: t("typeDevice"),
    airgap: t("typeAirgap"),
  };
  const pickCopy: Record<WalletQuickPickId, { label: string; body: string }> = {
    start: { label: t("quickStart"), body: t("quickStartBody") },
    premium: { label: t("quickPremium"), body: t("quickPremiumBody") },
    airgap: { label: t("quickAirgap"), body: t("quickAirgapBody") },
    euro: { label: t("quickEuro"), body: t("quickEuroBody") },
  };

  function chipClass(selected: boolean) {
    return `min-h-9 rounded-full border px-3 text-[11px] font-semibold tracking-wide transition ${
      selected
        ? "border-black bg-black text-white"
        : "border-black/15 bg-white text-neutral-700 hover:border-black/40"
    }`;
  }

  return (
    <div className="bg-[#F7F4EC]">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 md:px-8 md:pt-14">
        <header className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">{t("eyebrow")}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-black md:text-6xl">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-700 md:text-lg">{t("intro")}</p>
        </header>

        <section
          id="wallets-affiliate-disclosure"
          aria-label={t("disclosureLabel")}
          className="mt-8 max-w-3xl scroll-mt-28 border-l-4 border-[#FFD100] bg-white/70 px-5 py-4"
        >
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{t("disclosureLabel")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-800 md:text-[15px]">{t("disclosure")}</p>
        </section>

        <section className="mt-10" aria-labelledby="wallet-quick-picks">
          <h2 id="wallet-quick-picks" className="text-sm font-semibold text-black">
            {t("quickTitle")}
          </h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {WALLET_QUICK_PICKS.map((pick) => {
              const copy = pickCopy[pick.id];
              return (
                <a
                  key={pick.id}
                  href={`#brand-${pick.brandSlug}`}
                  onClick={() => {
                    setTier("all");
                    setDeviceType("all");
                  }}
                  className="min-w-[11.5rem] flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 transition hover:border-black"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{copy.label}</p>
                  <p className="mt-1 text-sm font-semibold text-black">{copy.body}</p>
                </a>
              );
            })}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3">
          <div role="group" aria-label={t("filterTier")} className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{t("filterTier")}</span>
            {TIERS.map((value) => (
              <button key={value} type="button" aria-pressed={tier === value} onClick={() => setTier(value)} className={chipClass(tier === value)}>
                {tierLabel[value]}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t("filterType")} className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{t("filterType")}</span>
            {TYPES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={deviceType === value}
                onClick={() => setDeviceType(value)}
                className={chipClass(deviceType === value)}
              >
                {typeLabel[value]}
              </button>
            ))}
          </div>
        </div>

        {shelves.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-black/10 bg-white px-5 py-6 text-sm text-neutral-700">{t("empty")}</p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {shelves.map((shelf, index) => (
              <li key={shelf.brand.slug} className="min-h-full">
                <BrandCard brand={shelf.brand} models={shelf.models} locale={locale} priority={index < 3} />
              </li>
            ))}
          </ul>
        )}

        <section aria-label={t("disclosureLabel")} className="mt-14 max-w-3xl border-t border-black/10 pt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{t("disclosureLabel")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-700">{t("disclosure")}</p>
        </section>
      </div>
    </div>
  );
}
