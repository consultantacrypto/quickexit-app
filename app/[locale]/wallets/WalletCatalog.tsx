"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  WALLET_OUTBOUND_REL,
  buildWalletOutboundUrl,
  filterWalletProducts,
  hasRealCheckoutCode,
  walletModelName,
  walletPriceView,
  type WalletDeviceType,
  type WalletLocale,
  type WalletProduct,
  type WalletTier,
} from "@/lib/walletCatalog";
import { reportWalletClick } from "@/lib/walletAffiliateTrafficClient";

type TierFilter = "all" | WalletTier;
type TypeFilter = "all" | WalletDeviceType;

const TIERS: TierFilter[] = ["all", "entry", "mid", "premium"];
const TYPES: TypeFilter[] = ["all", "card", "device", "airgap"];

function catalogLocale(locale: string): WalletLocale {
  return locale === "en" ? "en" : "ro";
}

function WalletSilhouette() {
  return (
    <svg viewBox="0 0 160 120" className="h-24 w-32 text-black" aria-hidden>
      <rect
        x="18"
        y="28"
        width="78"
        height="64"
        rx="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="57" cy="60" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect
        x="78"
        y="40"
        width="64"
        height="40"
        rx="6"
        fill="#F7F4EC"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}

function WalletCard({ product, locale }: { product: WalletProduct; locale: WalletLocale }) {
  const t = useTranslations("Wallets");
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const price = walletPriceView(product, locale);
  const realCode = hasRealCheckoutCode(product) ? product.affiliateCode : null;
  const href = buildWalletOutboundUrl(product);
  const model = walletModelName(product, locale);

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  async function copyCode() {
    if (!realCode) return;
    try {
      await navigator.clipboard.writeText(realCode);
      setCopied(true);
      if (timeoutRef.current != null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const tierLabel =
    product.tier === "entry" ? t("tierEntry") : product.tier === "mid" ? t("tierMid") : t("tierPremium");
  const typeLabel =
    product.deviceType === "card"
      ? t("typeCard")
      : product.deviceType === "device"
        ? t("typeDevice")
        : t("typeAirgap");

  return (
    <article className="flex h-full flex-col rounded-[1.75rem] border-2 border-black bg-white p-5 shadow-[6px_6px_0_0_rgba(0,0,0,0.06)]">
      <div
        className="flex aspect-[4/3] items-center justify-center rounded-2xl border-2 border-black bg-[#F7F4EC]"
        role="img"
        aria-label={model}
      >
        <WalletSilhouette />
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">
        {product.brand}
      </p>
      <h2 className="mt-1 text-lg font-black uppercase italic leading-tight tracking-tight text-black">
        {model}
      </h2>
      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-600">
        {typeLabel}
        <span aria-hidden> · </span>
        {tierLabel}
      </p>

      <div className="mt-4 min-h-16" data-price-status={price.status}>
        {price.status === "hidden" ? (
          <p className="text-sm font-semibold leading-relaxed text-neutral-700">{t("priceOnRequest")}</p>
        ) : (
          <>
            <p className="text-2xl font-black tracking-tight text-black">
              {price.priceIsFrom ? (
                <>
                  <span className="mr-1 text-sm font-bold uppercase tracking-widest text-neutral-600">
                    {t("fromPrefix")}
                  </span>
                  {price.primary}
                </>
              ) : (
                price.primary
              )}
            </p>
            {price.compareAt ? (
              <p className="mt-1 text-xs font-medium text-neutral-500">
                {t("listPrice")} {price.compareAt}
              </p>
            ) : null}
            {price.secondary ? (
              <p className="mt-1 text-xs font-medium text-neutral-600">
                {price.secondaryKind === "geo_storefront"
                  ? `${t("geoStorefront")}: ${price.secondary}`
                  : `${price.secondary} ${t("samePage")}`}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              {t("checkedOn", { date: price.checkedOn })}
            </p>
          </>
        )}
      </div>

      <a
        href="#wallets-affiliate-disclosure"
        className="mt-3 text-xs font-bold text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-black"
      >
        {t("affiliateNote")}
      </a>

      {realCode ? (
        <div className="mt-4 rounded-2xl border-2 border-black bg-[#F7F4EC] p-3">
          <p className="font-mono text-sm font-bold tracking-wide text-black">{realCode}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-neutral-700">{t("applyCode")}</p>
          <button
            type="button"
            onClick={() => {
              void copyCode();
            }}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-black bg-white px-3 py-2 text-[11px] font-black uppercase tracking-widest text-black"
          >
            {copied ? t("copied") : t("copyCode")}
          </button>
        </div>
      ) : null}

      {product.checkoutCodeRequired && !realCode ? (
        <p className="mt-4 text-xs font-medium leading-relaxed text-neutral-600">{t("codePending")}</p>
      ) : null}

      <div className="mt-auto pt-5">
        <a
          href={href}
          target="_blank"
          rel={WALLET_OUTBOUND_REL}
          onClick={() => {
            reportWalletClick({ brandSlug: product.brandSlug, slug: product.slug });
          }}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-black bg-white px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest text-black transition hover:border-[#FFD100]"
        >
          {t("buyOfficial")}
          <span className="sr-only"> ({t("newTab")})</span>
        </a>
      </div>
    </article>
  );
}

export default function WalletCatalog() {
  const t = useTranslations("Wallets");
  const locale = catalogLocale(useLocale());
  const [tier, setTier] = useState<TierFilter>("all");
  const [deviceType, setDeviceType] = useState<TypeFilter>("all");
  const products = filterWalletProducts({ tier, deviceType });

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

  return (
    <div className="bg-[#F7F4EC] px-4 pb-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl pt-6 md:pt-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-neutral-500">{t("eyebrow")}</p>
          <h1 className="mt-3 text-4xl font-black uppercase italic leading-[0.95] tracking-tight text-black md:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-neutral-700 md:text-base">
            {t("subtitle")}
          </p>
        </header>

        <section
          id="wallets-affiliate-disclosure"
          aria-label={t("disclosureLabel")}
          className="mt-8 scroll-mt-28 rounded-[1.75rem] border-2 border-black bg-white p-5 md:p-7"
        >
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-black">{t("disclosureLabel")}</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-800 md:text-base">{t("disclosure")}</p>
        </section>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <div role="group" aria-label={t("filterTier")} className="flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{t("filterTier")}</p>
              <div className="flex flex-wrap gap-2">
              {TIERS.map((value) => {
                const selected = tier === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setTier(value)}
                    className={`min-h-11 rounded-full border-2 border-black px-4 text-[11px] font-black uppercase tracking-widest ${
                      selected ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {tierLabel[value]}
                  </button>
                );
              })}
              </div>
            </div>
            <div role="group" aria-label={t("filterType")} className="flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">{t("filterType")}</p>
              <div className="flex flex-wrap gap-2">
              {TYPES.map((value) => {
                const selected = deviceType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDeviceType(value)}
                    className={`min-h-11 rounded-full border-2 border-black px-4 text-[11px] font-black uppercase tracking-widest ${
                      selected ? "bg-black text-white" : "bg-white text-black"
                    }`}
                  >
                    {typeLabel[value]}
                  </button>
                );
              })}
              </div>
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
            {t("results", { count: products.length })}
          </p>
        </div>

        {products.length === 0 ? (
          <p className="mt-10 rounded-2xl border-2 border-black bg-white p-6 text-sm font-semibold text-neutral-700">
            {t("empty")}
          </p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((item) => (
              <li key={item.slug}>
                <WalletCard product={item} locale={locale} />
              </li>
            ))}
          </ul>
        )}

        <section aria-label={t("disclosureLabel")} className="mt-12 rounded-[1.75rem] border-2 border-black bg-white p-5 md:p-7">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-black">{t("disclosureLabel")}</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-800 md:text-base">{t("disclosure")}</p>
        </section>
      </div>
    </div>
  );
}
