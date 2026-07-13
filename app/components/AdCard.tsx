"use client";

import Image from "next/image";
import { Link } from "@/src/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import supabaseImageLoader from "@/lib/supabase-image-loader";
import { listingDetailPath } from "@/src/i18n/paths";
import {
  auctionOfferLineForCard,
  formatAuctionCardTimeLeft,
  formatHighestOfferEURLabel,
  parseListingOfferCount,
  type AuctionCardCopy,
} from "@/utils/auctionListingUi";

interface AdCardProps {
  id: string;
  title: string;
  image: string;
  marketPrice: string;
  exitPrice: string;
  discount: string;
  score?: number | null;
  type: "urgent" | "extreme" | "standard" | "auction";
  priority?: boolean;
  offerCount?: number | null;
  highestOffer?: number | string | null;
  expiresAt?: string | null;
  extraBadges?: string[];
}

export default function AdCard({
  id,
  title,
  image,
  marketPrice,
  exitPrice,
  discount,
  score,
  type,
  priority = false,
  offerCount,
  highestOffer,
  expiresAt,
  extraBadges,
}: AdCardProps) {
  const t = useTranslations("AdCard");
  const locale = useLocale();
  const [isFavorite, setIsFavorite] = useState(false);
  const listingHref = listingDetailPath(id);

  const auctionCopy: AuctionCardCopy = useMemo(
    () => ({
      expired: t("auction.expired"),
      closesToday: t("auction.closesToday"),
      closesInOneDay: t("auction.closesInOneDay"),
      closesInDays: (days) => t("auction.closesInDays", { days }),
      firstOffer: t("auction.firstOffer"),
      oneOffer: t("auction.oneOffer"),
      manyOffers: (count) => t("auction.manyOffers", { count }),
    }),
    [t],
  );

  const nOffers = parseListingOfferCount(offerCount ?? null);
  const highestLabel = formatHighestOfferEURLabel(highestOffer ?? null, locale);
  const timeLeft = formatAuctionCardTimeLeft(expiresAt ?? null, auctionCopy);
  const discountNum = Number(discount) || 0;
  const showExtraBadges = Array.isArray(extraBadges) && extraBadges.length > 0;
  const showMarketPrice = marketPrice.trim().length > 0;
  const showExitPrice = exitPrice.trim().length > 0;
  const showLiquidityScore = score != null && Number.isFinite(score);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-line/70 bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-neutral-300/80 hover:shadow-[0_28px_50px_-16px_rgba(0,0,0,0.22)]">
      <Link href={listingHref} aria-label={title} className="absolute inset-0 z-[1]" />

      {/* IMAGINEA — eroul cardului */}
      <div className="pointer-events-none relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={priority}
          className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          loader={supabaseImageLoader}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

        {/* tip — glass pill discret */}
        <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
          {t(`type.${type}`)}
        </span>

        {showExtraBadges ? (
          <div className="absolute bottom-4 left-4 z-[2] flex max-w-[70%] flex-wrap gap-1.5">
            {extraBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-black/20 bg-[#FFD100]/95 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-black"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        {/* DISCOUNT — accentul vizual principal */}
        {discountNum > 0 && (
          <span className="absolute right-4 top-4 rounded-full bg-gold px-3.5 py-1.5 text-sm font-bold tracking-tight text-ink shadow-[0_4px_14px_rgba(0,0,0,0.18)]">
            −{discountNum}%
          </span>
        )}

        {/* favorite — subtil, jos-dreapta */}
        <button
          type="button"
          onClick={() => setIsFavorite(!isFavorite)}
          aria-label={
            isFavorite ? t("favoriteRemove", { title }) : t("favoriteAdd", { title })
          }
          aria-pressed={isFavorite}
          className="pointer-events-auto absolute bottom-4 right-4 z-[2] flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill={isFavorite ? "currentColor" : "none"}
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
          </svg>
        </button>
      </div>

      {/* CONȚINUT */}
      <div className="pointer-events-none relative z-[1] flex flex-1 flex-col gap-5 p-7">
        <div>
          {showLiquidityScore ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              {t("liquidityScore")} · {score}
            </p>
          ) : null}
          <h3
            className={`line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-ink ${showLiquidityScore ? "mt-2" : ""}`}
          >
            {title}
          </h3>
        </div>

        {type === "auction" && (
          <div className="space-y-1 text-[11px] font-medium leading-tight text-muted">
            <p>{auctionOfferLineForCard(nOffers, auctionCopy)}</p>
            {highestLabel ? (
              <p>
                {t("highestOffer")}: {highestLabel}
              </p>
            ) : null}
            {timeLeft ? <p>{timeLeft}</p> : null}
          </div>
        )}

        {/* PREȚ — bloc curat, mult aer */}
        <div className="mt-auto flex items-end justify-between border-t border-line/60 pt-5">
          <div>
            {showMarketPrice ? (
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                {t("marketPrice")}:{" "}
                <span className="line-through decoration-neutral-300">{marketPrice}</span>
              </p>
            ) : null}
            {showExitPrice ? (
              <p
                className={`text-[28px] font-bold leading-none tracking-tight text-ink ${showMarketPrice ? "mt-1" : ""}`}
              >
                {exitPrice}
              </p>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink transition-colors group-hover:text-gold-deep">
            {t("details")}
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </article>
  );
}
