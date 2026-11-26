"use client";

import { useEffect, useId, useRef, useState } from "react";
import WalletHeroBackdrop from "./WalletHeroBackdrop";
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
  WALLET_BRANDS,
  WALLET_QUICK_PICKS,
  brandNeedsCheckoutNote,
  walletBrandShelves,
  type WalletBrandProfile,
  type WalletQuickPickId,
} from "@/lib/walletBrands";
import {
  brandFormFactors,
  brandStartingPrice,
  specsForBrand,
  type WalletSpecClaim,
} from "@/lib/walletBrandSpecs";
import {
  chooseWalletBrands,
  type ChooserBudget,
  type ChooserExperience,
  type ChooserMatch,
  type ChooserStyle,
} from "@/lib/walletChooser";
import { reportWalletClick } from "@/lib/walletAffiliateTrafficClient";

const TRUST_ARTICLE_URL =
  "https://www.stirilecrypto.ro/stiri/ledger-implant-virgin-megastore-dubai-604000-dolari-furati";

const HERO_DEVICES = [
  { src: "/wallets/trezor.webp", float: "wallet-float", className: "left-[2%] top-[4%] z-10 h-[90%] w-[54%] md:left-[0%] md:top-[8%] md:h-[86%] md:w-[46%]" },
  { src: "/wallets/ledger.webp", float: "wallet-float wallet-float-2", className: "left-[38%] top-[0%] z-20 h-[92%] w-[54%] md:left-[28%] md:top-[2%] md:h-[78%] md:w-[38%]" },
  { src: "/wallets/tangem.webp", float: "wallet-float wallet-float-3", className: "right-[2%] top-[4%] z-30 hidden h-[42%] w-[36%] md:block" },
  { src: "/wallets/bitbox.webp", float: "wallet-float wallet-float-4", className: "bottom-[8%] right-[4%] z-40 hidden h-[46%] w-[44%] md:block" },
] as const;

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

type TierFilter = "all" | WalletTier;
type TypeFilter = "all" | WalletDeviceType;

const TIERS: TierFilter[] = ["all", "entry", "mid", "premium"];
const TYPES: TypeFilter[] = ["all", "card", "device", "airgap"];
const MAX_COMPARE = 3;

function catalogLocale(locale: string): WalletLocale {
  return locale === "en" ? "en" : "ro";
}

function brandBySlug(slug: string): WalletBrandProfile | undefined {
  return WALLET_BRANDS.find((brand) => brand.slug === slug);
}

function ModelPrice({ product, locale }: { product: WalletProduct; locale: WalletLocale }) {
  const t = useTranslations("Wallets");
  const price = walletPriceView(product, locale);
  if (price.status === "hidden") return null;
  return (
    <div className="shrink-0 text-right">
      <p className="whitespace-nowrap text-sm font-semibold text-neutral-900">
        {price.priceIsFrom ? <span className="mr-1 font-medium text-neutral-700">{t("fromPrefix")}</span> : null}
        {price.primary}
      </p>
      {price.secondary ? (
        <p className="mt-0.5 text-[11px] leading-snug text-neutral-700">
          {price.secondaryKind === "geo_storefront"
            ? `${t("geoStorefront")}: ${price.secondary}`
            : `${price.secondary} ${t("samePage")}`}
        </p>
      ) : null}
      <p className="mt-0.5 whitespace-nowrap text-[11px] text-neutral-700">
        {t("checkedOn", { date: price.checkedOn })}
      </p>
    </div>
  );
}

function SecurityBadges({ brand }: { brand: WalletBrandProfile }) {
  const t = useTranslations("Wallets");
  const specs = specsForBrand(brand.slug);
  const factors = brandFormFactors(brand.slug);
  const badges: string[] = [];
  if (brand.usedByDani) badges.push(t("usedByDani"));
  if (factors.includes("airgap")) badges.push(t("typeAirgap"));
  if (specs.secureElement.value === "yes") badges.push(t("colSecure"));
  if (specs.openSource.value === "yes") badges.push(t("colOpen"));
  if (badges.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <li
          key={badge}
          className="rounded-full border border-black/15 bg-[#F7F4EC] px-2.5 py-1 text-[11px] font-semibold text-neutral-900"
        >
          {badge}
        </li>
      ))}
    </ul>
  );
}

function BrandCard({
  brand,
  models,
  locale,
  priority,
  anchor,
  compared,
  compareDisabled,
  onToggleCompare,
}: {
  brand: WalletBrandProfile;
  models: WalletProduct[];
  locale: WalletLocale;
  priority: boolean;
  anchor: boolean;
  compared: boolean;
  compareDisabled: boolean;
  onToggleCompare: (slug: WalletBrandProfile["slug"]) => void;
}) {
  const t = useTranslations("Wallets");
  const lead = models[0];
  const href = lead ? buildWalletOutboundUrl(lead) : brand.image.sourceUrl;
  const positioning = locale === "en" ? brand.positioningEn : brand.positioningRo;
  const alt = locale === "en" ? brand.image.altEn : brand.image.altRo;
  const showCodeNote = brandNeedsCheckoutNote(models);
  const discountCode =
    models.find((model) => model.checkoutCodeRequired && hasRealCheckoutCode(model))?.affiliateCode ?? null;
  const checkId = `compare-${brand.slug}${anchor ? "" : "-result"}`;

  return (
    <article
      id={anchor ? `brand-${brand.slug}` : undefined}
      className="flex h-full scroll-mt-28 flex-col overflow-hidden rounded-[1.75rem] border border-black/10 bg-white"
    >
      <div className="relative aspect-[5/4] bg-[#F4F1E8]">
        <Image
          src={brand.image.src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 92vw, (max-width: 1280px) 46vw, 30vw"
          className="object-contain p-3"
          unoptimized
        />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-5 pt-5 md:px-6 md:pb-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[1.65rem] font-black tracking-tight text-neutral-950">{brand.name}</h2>
          <label className={`inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-neutral-800 ${FOCUS} rounded-md`}>
            <input
              id={checkId}
              type="checkbox"
              className={`h-5 w-5 accent-black ${FOCUS}`}
              checked={compared}
              disabled={compareDisabled}
              onChange={() => onToggleCompare(brand.slug)}
            />
            {t("compareCheck")}
          </label>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-neutral-800">{positioning}</p>
        <SecurityBadges brand={brand} />
        <ul className="mt-5 border-t border-black/10">
          {models.map((model) => (
            <li key={model.slug} className="flex items-start justify-between gap-4 border-b border-black/10 py-3">
              <p className="min-w-0 text-sm leading-snug text-neutral-900">{walletModelName(model, locale)}</p>
              <ModelPrice product={model} locale={locale} />
            </li>
          ))}
        </ul>
        {showCodeNote ? <p className="mt-3 text-xs leading-relaxed text-neutral-700">{t("codePending")}</p> : null}
        <div className="mt-auto flex flex-col gap-2 pt-6">
          {discountCode ? <DiscountCodeButton code={discountCode} /> : null}
          <a
            href={href}
            target="_blank"
            rel={WALLET_OUTBOUND_REL}
            onClick={() => {
              if (!lead) return;
              reportWalletClick({ brandSlug: lead.brandSlug, slug: lead.slug });
            }}
            className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-neutral-950 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-[#FFD100] hover:text-neutral-950 ${FOCUS}`}
          >
            {t("buyOfficial")}
            <span className="sr-only"> ({t("newTab")})</span>
          </a>
        </div>
      </div>
    </article>
  );
}

function DiscountCodeButton({ code }: { code: string }) {
  const t = useTranslations("Wallets");
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={t("copyDiscount", { code })}
      onClick={() => {
        void navigator.clipboard.writeText(code).then(
          () => {
            setCopied(true);
            if (timer.current != null) window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(false), 2000);
          },
          () => setCopied(false),
        );
      }}
      className={`inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-black/15 bg-[#F7F4EC] px-3 text-sm font-semibold text-neutral-950 ${FOCUS}`}
    >
      <span aria-live="polite">{copied ? t("copied") : t("discountCode", { code })}</span>
    </button>
  );
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1 md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-x-2">
      <legend className="sr-only">{legend}</legend>
      <p aria-hidden="true" className="text-[11px] font-semibold leading-tight text-neutral-950 md:text-xs">{legend}</p>
      <div className="flex min-w-0 flex-wrap gap-1.5 md:flex-nowrap md:overflow-x-auto md:pb-0.5">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`inline-flex min-h-10 max-w-full cursor-pointer items-center rounded-full border px-2 py-1 text-[11px] leading-none md:min-h-9 md:shrink-0 md:whitespace-nowrap md:px-2.5 md:text-xs has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-black ${
                selected ? "border-neutral-950 bg-neutral-950 text-white" : "border-black/15 bg-white text-neutral-900"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function WalletChooser({
  locale,
  onToggleCompare,
  compared,
}: {
  locale: WalletLocale;
  compared: WalletBrandProfile["slug"][];
  onToggleCompare: (slug: WalletBrandProfile["slug"]) => void;
}) {
  const t = useTranslations("Wallets");
  const [budget, setBudget] = useState<ChooserBudget | null>(null);
  const [experience, setExperience] = useState<ChooserExperience | null>(null);
  const [style, setStyle] = useState<ChooserStyle | null>(null);
  const [matches, setMatches] = useState<ChooserMatch[] | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const ready = budget && experience && style;

  function reason(match: ChooserMatch): string {
    const styleLabel =
      style === "card" ? t("styleCard") : style === "screen" ? t("styleScreen") : t("styleAirgap");
    const budgetLabel =
      budget === "entry" ? t("budgetEntry") : budget === "mid" ? t("budgetMid") : t("budgetPremium");
    if (match.approximate) return t("chooserApproximate", { style: styleLabel });
    if (match.mentionsDani) return t("chooserReasonDani", { style: styleLabel, budget: budgetLabel });
    return t("chooserReason", { style: styleLabel, budget: budgetLabel, experience: experienceLabel(experience, t) });
  }

  const resultBrands =
    matches
      ?.map((match) => {
        const brand = brandBySlug(match.slug);
        if (!brand) return null;
        const models = walletBrandShelves({ tier: "all", deviceType: "all" }).find((shelf) => shelf.brand.slug === match.slug)
          ?.models;
        if (!models) return null;
        return { match, brand, models };
      })
      .filter((item): item is NonNullable<typeof item> => item != null) ?? [];

  return (
    <section className="mt-2 md:mt-3" aria-labelledby="wallet-chooser-title">
      <h2 id="wallet-chooser-title" className="text-sm font-black tracking-tight text-neutral-950 md:text-base">
        {t("chooserTitle")}
      </h2>
      <form
        className="mt-1.5 space-y-1.5 rounded-2xl border border-black/10 bg-white p-2 md:mt-2 md:space-y-2 md:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!budget || !experience || !style) return;
          const next = chooseWalletBrands({ budget, experience, style });
          setMatches(next);
          window.setTimeout(() => resultRef.current?.focus(), 0);
        }}
      >
        <ChoiceGroup
          legend={t("chooserBudget")}
          name="wallet-budget"
          value={budget}
          onChange={setBudget}
          options={[
            { value: "entry", label: t("budgetEntry") },
            { value: "mid", label: t("budgetMid") },
            { value: "premium", label: t("budgetPremium") },
          ]}
        />
        <ChoiceGroup
          legend={t("chooserExperience")}
          name="wallet-experience"
          value={experience}
          onChange={setExperience}
          options={[
            { value: "beginner", label: t("expBeginner") },
            { value: "familiar", label: t("expFamiliar") },
            { value: "handsOn", label: t("expHandsOn") },
          ]}
        />
        <ChoiceGroup
          legend={t("chooserStyle")}
          name="wallet-style"
          value={style}
          onChange={setStyle}
          options={[
            { value: "card", label: t("styleCard") },
            { value: "screen", label: t("styleScreen") },
            { value: "airgap", label: t("styleAirgap") },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!ready}
            className={`min-h-10 rounded-full bg-neutral-950 px-3 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-700 md:min-h-9 md:px-4 md:text-xs ${FOCUS}`}
          >
            {t("chooserShow")}
          </button>
          <button
            type="button"
            className={`min-h-10 rounded-full border border-black/20 bg-white px-3 text-[11px] font-semibold text-neutral-950 md:min-h-9 md:px-4 md:text-xs ${FOCUS}`}
            onClick={() => {
              setBudget(null);
              setExperience(null);
              setStyle(null);
              setMatches(null);
            }}
          >
            {t("chooserReset")}
          </button>
        </div>
      </form>
      <div
        ref={resultRef}
        tabIndex={-1}
        aria-live="polite"
        className={`outline-none ${matches ? `mt-3 ${FOCUS}` : ""}`}
      >
        {matches ? (
          <>
            <h3 className="text-base font-semibold text-neutral-950">{t("chooserResult")}</h3>
            {resultBrands.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-800">{t("chooserEmpty")}</p>
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                {resultBrands.map(({ match, brand, models }) => (
                  <li key={match.slug}>
                    <p className="mb-3 text-sm leading-relaxed text-neutral-800">{reason(match)}</p>
                    <BrandCard
                      brand={brand}
                      models={models}
                      locale={locale}
                      priority={false}
                      anchor={false}
                      compared={compared.includes(brand.slug)}
                      compareDisabled={!compared.includes(brand.slug) && compared.length >= MAX_COMPARE}
                      onToggleCompare={onToggleCompare}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

function experienceLabel(
  experience: ChooserExperience | null,
  t: ReturnType<typeof useTranslations<"Wallets">>,
): string {
  if (experience === "beginner") return t("expBeginner");
  if (experience === "familiar") return t("expFamiliar");
  return t("expHandsOn");
}

function SpecCell({ claim }: { claim: WalletSpecClaim }) {
  const t = useTranslations("Wallets");
  const label =
    claim.value === "yes" ? t("specYes") : claim.value === "partial" ? t("specPartial") : t("specUnknown");
  return (
    <td className="px-3 py-3 align-top text-sm text-neutral-900">
      <span>{label}</span>
      {claim.sourceUrl ? (
        <a
          href={claim.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-1 block text-xs text-neutral-800 underline ${FOCUS}`}
        >
          {t("specSource")}
          <span className="sr-only"> ({t("newTab")})</span>
        </a>
      ) : null}
    </td>
  );
}

function ComparisonStack({
  slugs,
  locale,
  caption,
}: {
  slugs: WalletBrandProfile["slug"][];
  locale: WalletLocale;
  caption: string;
}) {
  const t = useTranslations("Wallets");
  const rows = slugs
    .map((slug) => brandBySlug(slug))
    .filter((brand): brand is WalletBrandProfile => Boolean(brand));
  return (
    <div>
      <p className="text-sm font-semibold text-neutral-950">{caption}</p>
      <ul className="mt-3 space-y-3">
        {rows.map((brand) => {
          const specs = specsForBrand(brand.slug);
          const price = brandStartingPrice(brand.slug, locale);
          const factors = brandFormFactors(brand.slug)
            .map((factor) => (factor === "card" ? t("typeCard") : factor === "device" ? t("typeScreen") : t("typeAirgap")))
            .join(", ");
          const cells = [
            {
              label: t("colPrice"),
              value: price ? `${price.from ? `${t("fromPrefix")} ` : ""}${price.text}` : t("specUnknown"),
              note: price ? t("checkedOn", { date: price.checkedOn }) : null,
              source: null as string | null,
            },
            { label: t("colType"), value: factors || t("specUnknown"), note: null, source: null },
            {
              label: t("colOpen"),
              value: specs.openSource.value === "yes" ? t("specYes") : specs.openSource.value === "partial" ? t("specPartial") : t("specUnknown"),
              note: null,
              source: specs.openSource.sourceUrl,
            },
            {
              label: t("colSecure"),
              value:
                specs.secureElement.value === "yes"
                  ? t("specYes")
                  : specs.secureElement.value === "partial"
                    ? t("specPartial")
                    : t("specUnknown"),
              note: null,
              source: specs.secureElement.sourceUrl,
            },
          ];
          return (
            <li key={brand.slug} className="rounded-2xl bg-white p-4">
              <h3 className="text-base font-semibold text-neutral-950">{brand.name}</h3>
              <dl className="mt-2 space-y-2">
                {cells.map((cell) => (
                  <div key={cell.label} className="flex items-start justify-between gap-4">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-700">{cell.label}</dt>
                    <dd className="text-right text-sm text-neutral-950">
                      {cell.value}
                      {cell.note ? <span className="mt-0.5 block text-[11px] text-neutral-700">{cell.note}</span> : null}
                      {cell.source ? (
                        <a href={cell.source} target="_blank" rel="noopener noreferrer" className={`mt-0.5 block text-xs underline ${FOCUS}`}>
                          {t("specSource")}
                        </a>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ComparisonTable({
  slugs,
  locale,
  caption,
}: {
  slugs: WalletBrandProfile["slug"][];
  locale: WalletLocale;
  caption: string;
}) {
  const t = useTranslations("Wallets");
  const rows = slugs
    .map((slug) => brandBySlug(slug))
    .filter((brand): brand is WalletBrandProfile => Boolean(brand));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <caption className="mb-3 text-left text-sm font-semibold text-neutral-950">{caption}</caption>
        <thead>
          <tr className="border-b border-black/15 text-xs uppercase tracking-wider text-neutral-700">
            <th scope="col" className="px-3 py-2 font-semibold">{t("colBrand")}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t("colPrice")}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t("colType")}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t("colOpen")}</th>
            <th scope="col" className="px-3 py-2 font-semibold">{t("colSecure")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((brand) => {
            const specs = specsForBrand(brand.slug);
            const price = brandStartingPrice(brand.slug, locale);
            const factors = brandFormFactors(brand.slug)
              .map((factor) => (factor === "card" ? t("typeCard") : factor === "device" ? t("typeScreen") : t("typeAirgap")))
              .join(", ");
            return (
              <tr key={brand.slug} className="border-b border-black/10">
                <th scope="row" className="px-3 py-3 text-sm font-semibold text-neutral-950">
                  {brand.name}
                </th>
                <td className="px-3 py-3 text-sm text-neutral-900">
                  {price ? (
                    <>
                      <span className="whitespace-nowrap">
                        {price.from ? `${t("fromPrefix")} ` : null}
                        {price.text}
                      </span>
                      <span className="mt-1 block text-[11px] text-neutral-700">
                        {t("checkedOn", { date: price.checkedOn })}
                      </span>
                    </>
                  ) : (
                    t("specUnknown")
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-neutral-900">{factors || t("specUnknown")}</td>
                <SpecCell claim={specs.openSource} />
                <SpecCell claim={specs.secureElement} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FaqList() {
  const t = useTranslations("Wallets");
  const items = [
    { q: t("faqWhyQ"), a: t("faqWhyA") },
    { q: t("faqSeedQ"), a: t("faqSeedA") },
    { q: t("faqOfficialQ"), a: t("faqOfficialA") },
  ];
  return (
    <section className="mt-16" aria-labelledby="wallet-faq-title">
      <h2 id="wallet-faq-title" className="text-xl font-black tracking-tight text-neutral-950">
        {t("faqTitle")}
      </h2>
      <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
        {items.map((item) => (
          <details key={item.q} className="group py-1">
            <summary className={`cursor-pointer py-3 text-sm font-semibold text-neutral-950 ${FOCUS}`}>
              {item.q}
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-neutral-800">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export default function WalletCatalog() {
  const t = useTranslations("Wallets");
  const locale = catalogLocale(useLocale());
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    const desktop = window.matchMedia("(min-width: 768px)");
    if (reduce.matches || !fine.matches || !desktop.matches) return;
    const cluster = root.querySelector<HTMLElement>("[data-wallet-cluster]");
    if (!cluster) return;
    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      cluster.style.setProperty("--hero-x", `${(x * 14).toFixed(1)}px`);
      cluster.style.setProperty("--hero-y", `${(y * 8).toFixed(1)}px`);
    };
    const onLeave = () => {
      cluster.style.setProperty("--hero-x", "0px");
      cluster.style.setProperty("--hero-y", "0px");
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  const [tier, setTier] = useState<TierFilter>("all");
  const [deviceType, setDeviceType] = useState<TypeFilter>("all");
  const [compared, setCompared] = useState<WalletBrandProfile["slug"][]>([]);
  const shelves = walletBrandShelves({ tier, deviceType });
  const dialogShelves = walletBrandShelves({ tier: "all", deviceType: "all" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = () => setCompared((current) => current);
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, []);

  function toggleCompare(slug: WalletBrandProfile["slug"]) {
    setCompared((current) => {
      if (current.includes(slug)) return current.filter((item) => item !== slug);
      if (current.length >= MAX_COMPARE) return current;
      return [...current, slug];
    });
  }

  function openCompare() {
    dialogRef.current?.showModal();
  }

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

  const firstCompared = compared[0] ? brandBySlug(compared[0]) : undefined;
  const firstComparedLead = firstCompared
    ? dialogShelves.find((shelf) => shelf.brand.slug === firstCompared.slug)?.models[0]
    : undefined;

  return (
    <div className={`scroll-smooth bg-[#F7F4EC] ${compared.length > 0 ? "pb-28 md:pb-24" : ""}`}>
      <section
        id="wallet-hero"
        ref={heroRef}
        aria-labelledby={titleId}
        className="relative -mt-4 h-[40vh] max-h-[40vh] overflow-hidden rounded-none bg-[linear-gradient(128deg,#121212_0%,#1c1a16_42%,#4a3b10_100%)] text-white md:-mt-8 md:h-[38vh] md:max-h-[38vh]"
      >
        <div className="wallet-hero-mesh pointer-events-none absolute inset-0" aria-hidden />
        <WalletHeroBackdrop rootRef={heroRef} />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col px-4 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] md:px-8">
          <div className="flex min-h-0 flex-1 flex-col justify-center py-3 md:py-5">
            <h1 id={titleId} className="max-w-xl text-xl font-black leading-[1.12] tracking-tight text-white md:text-4xl md:leading-[1.05]">
              {t("heroTitle")}
            </h1>
            <p className="mt-1.5 max-w-md text-[11px] leading-snug text-white/90 md:mt-3 md:text-base">{t("heroLead")}</p>
            <p className="mt-1.5 max-w-md text-[11px] leading-snug text-[#FFE56A] md:mt-2 md:text-sm">{t("disclosureShort")}</p>
            <a
              href="#wallet-grid"
              className={`wallet-cta mt-2.5 inline-flex min-h-8 w-fit items-center rounded-full bg-[#FFD100] px-3.5 text-xs font-bold text-neutral-950 md:mt-4 md:min-h-10 md:px-4 md:text-sm ${FOCUS}`}
            >
              {t("seeWallets")}
            </a>
          </div>
          <div data-wallet-cluster className="wallet-device-cluster pointer-events-none relative h-[36%] shrink-0 md:h-auto" aria-hidden>
            <div className="wallet-glow pointer-events-none absolute inset-[8%] md:inset-[6%]" />
            {HERO_DEVICES.map((device) => (
              <div key={device.src} className={`absolute ${device.float} ${device.className}`}>
                <Image
                  src={device.src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 46vw, 240px"
                  className="object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.35)]"
                  unoptimized
                  priority={device.src.includes("ledger")}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-3 md:px-8 md:pt-6">
        <WalletChooser locale={locale} compared={compared} onToggleCompare={toggleCompare} />

        <div id="wallet-grid" className="mt-3 scroll-mt-24 md:scroll-mt-36">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <div role="group" aria-label={t("filterTier")} className="flex shrink-0 items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-700">{t("filterTier")}</span>
              {TIERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tier === value}
                  onClick={() => setTier(value)}
                  className={`min-h-8 shrink-0 rounded-full border px-2.5 text-[11px] font-semibold ${FOCUS} ${
                    tier === value ? "border-neutral-950 bg-neutral-950 text-white" : "border-black/15 bg-white text-neutral-900"
                  }`}
                >
                  {tierLabel[value]}
                </button>
              ))}
            </div>
            <div role="group" aria-label={t("filterType")} className="flex shrink-0 items-center gap-1.5">
              <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-700">{t("filterType")}</span>
              {TYPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={deviceType === value}
                  onClick={() => setDeviceType(value)}
                  className={`min-h-8 shrink-0 rounded-full border px-2.5 text-[11px] font-semibold ${FOCUS} ${
                    deviceType === value ? "border-neutral-950 bg-neutral-950 text-white" : "border-black/15 bg-white text-neutral-900"
                  }`}
                >
                  {typeLabel[value]}
                </button>
              ))}
            </div>
          </div>

        {shelves.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-black/10 bg-white px-5 py-6 text-sm text-neutral-800">{t("empty")}</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
            {shelves.map((shelf, index) => (
              <li key={shelf.brand.slug}>
                <BrandCard
                  brand={shelf.brand}
                  models={shelf.models}
                  locale={locale}
                  priority={index < 2}
                  anchor
                  compared={compared.includes(shelf.brand.slug)}
                  compareDisabled={!compared.includes(shelf.brand.slug) && compared.length >= MAX_COMPARE}
                  onToggleCompare={toggleCompare}
                />
              </li>
            ))}
          </ul>
        )}
        </div>

        <section className="mt-8" aria-labelledby="wallet-quick-picks">
          <h2 id="wallet-quick-picks" className="text-sm font-semibold text-neutral-950">
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
                  className={`min-w-[11.5rem] flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 ${FOCUS}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-700">{copy.label}</p>
                  <p className="mt-1 text-sm font-semibold text-neutral-950">{copy.body}</p>
                </a>
              );
            })}
          </div>
        </section>

        <section className="mt-16 hidden md:block" aria-labelledby="wallet-compare-table">
          <h2 id="wallet-compare-table" className="text-xl font-black tracking-tight text-neutral-950">
            {t("compareTitle")}
          </h2>
          <div className="mt-4">
            <ComparisonTable
              slugs={WALLET_BRANDS.map((brand) => brand.slug)}
              locale={locale}
              caption={t("compareTableCaption")}
            />
          </div>
        </section>

        <div className="mt-12 grid gap-6 border-t border-black/10 pt-8 lg:grid-cols-2">
          <section id="wallets-affiliate-disclosure" aria-label={t("disclosureLabel")} className="scroll-mt-28">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-700">{t("disclosureLabel")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-800">{t("disclosure")}</p>
          </section>
          <aside>
            <p className="text-base font-semibold leading-snug text-neutral-950">{t("trustTitle")}</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-800">{t("trustBody")}</p>
            <a
              href={TRUST_ARTICLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-3 inline-flex text-sm font-semibold text-neutral-950 underline ${FOCUS}`}
            >
              {t("trustLink")}
              <span className="sr-only"> ({t("newTab")})</span>
            </a>
          </aside>
        </div>

        <FaqList />
      </div>

      {compared.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <button
              type="button"
              onClick={openCompare}
              className={`min-h-12 flex-1 rounded-2xl bg-neutral-950 px-4 text-sm font-semibold text-white ${FOCUS}`}
            >
              {t("compareBar", { count: compared.length })}
            </button>
            {firstComparedLead ? (
              <a
                href={buildWalletOutboundUrl(firstComparedLead)}
                target="_blank"
                rel={WALLET_OUTBOUND_REL}
                onClick={() =>
                  reportWalletClick({ brandSlug: firstComparedLead.brandSlug, slug: firstComparedLead.slug })
                }
                className={`inline-flex min-h-12 items-center rounded-2xl border border-neutral-950 px-3 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-950 ${FOCUS}`}
              >
                {t("buyOfficial")}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="wallet-compare-dialog-title"
        className="m-0 mt-auto h-[min(100dvh,40rem)] w-full max-w-none rounded-t-3xl border border-black/10 bg-[#F7F4EC] p-0 text-neutral-950 backdrop:bg-black/50 md:m-auto md:h-auto md:max-h-[80vh] md:max-w-3xl md:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 id="wallet-compare-dialog-title" className="text-lg font-black">
            {t("compareTitle")}
          </h2>
          <button
            type="button"
            className={`min-h-11 rounded-full border border-black/15 bg-white px-4 text-sm font-semibold ${FOCUS}`}
            onClick={() => dialogRef.current?.close()}
          >
            {t("compareClose")}
          </button>
        </div>
        <div className="max-h-[calc(100dvh-5rem)] overflow-auto px-4 py-4 md:max-h-[60vh]">
          <ComparisonStack slugs={compared} locale={locale} caption={t("compareSheetCaption")} />
        </div>
      </dialog>
    </div>
  );
}
