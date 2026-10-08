"use client";

import { useTranslations } from "next-intl";
import type {
  MediaEditorialUxKey,
  MediaOrderStatusView,
  MediaPaymentUxKey,
} from "@/lib/mediaStatusDisplay";
import { mediaPackageLabelKey, resolveMediaPaymentUx } from "@/lib/mediaStatusDisplay";

type Props = {
  listingId: string;
  listingStatus: string | null | undefined;
  mediaOrder: MediaOrderStatusView | null | undefined;
  paymentSuccessContext: boolean;
  onDismiss?: () => void;
  compact?: boolean;
};

const UX_MESSAGE_KEYS: Record<MediaPaymentUxKey, string> = {
  processing: "mediaPaymentStatus.processing",
  listingActiveMediaPaid: "mediaPaymentStatus.listingActiveMediaPaid",
  listingActiveMediaPending: "mediaPaymentStatus.listingActiveMediaPending",
  mediaFailed: "mediaPaymentStatus.mediaFailed",
  listingOnlySuccess: "mediaPaymentStatus.listingOnlySuccess",
};

const EDITORIAL_KEYS: Record<MediaEditorialUxKey, string> = {
  queued: "mediaEditorialStatus.queued",
  needs_info: "mediaEditorialStatus.needs_info",
  in_research: "mediaEditorialStatus.in_research",
  in_production: "mediaEditorialStatus.in_production",
  published: "mediaEditorialStatus.published",
  rejected: "mediaEditorialStatus.rejected",
  cancelled: "mediaEditorialStatus.cancelled",
};

export default function MediaPaymentStatusBanner({
  listingId,
  listingStatus,
  mediaOrder,
  paymentSuccessContext,
  onDismiss,
  compact = false,
}: Props) {
  const t = useTranslations("Dashboard");
  const resolved = resolveMediaPaymentUx({
    paymentSuccessContext,
    listingStatus,
    mediaOrder,
  });

  if (!resolved.ux) return null;

  const pkgKey = mediaPackageLabelKey(mediaOrder?.package);
  const tone =
    resolved.ux === "mediaFailed"
      ? "border-red-700 bg-red-50 text-red-950"
      : resolved.ux === "processing" || resolved.ux === "listingActiveMediaPending"
        ? "border-black bg-[#FFF8D6] text-neutral-900"
        : "border-black bg-[#F0FDF4] text-neutral-900";

  return (
    <div
      role="status"
      data-listing-id={listingId}
      data-media-ux={resolved.ux}
      className={`rounded-xl border-[3px] shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${tone} ${
        compact ? "p-3" : "mb-6 p-4 md:p-5"
      }`}
    >
      <p className={`font-bold leading-relaxed ${compact ? "text-xs" : "text-sm"}`}>
        {t(UX_MESSAGE_KEYS[resolved.ux])}
      </p>
      {pkgKey && mediaOrder ? (
        <p className={`mt-2 font-semibold text-neutral-700 ${compact ? "text-[10px]" : "text-xs"}`}>
          {t("mediaPaymentStatus.packageLabel", {
            package: t(`mediaPaymentStatus.packages.${pkgKey}`),
          })}
        </p>
      ) : null}
      {resolved.showEditorial && resolved.editorial ? (
        <p className={`mt-2 font-semibold text-neutral-700 ${compact ? "text-[10px]" : "text-xs"}`}>
          {t("mediaPaymentStatus.editorialLabel", {
            status: t(EDITORIAL_KEYS[resolved.editorial]),
          })}
        </p>
      ) : null}
      {resolved.shouldRefresh ? (
        <p className={`mt-2 font-semibold uppercase tracking-wide text-neutral-600 ${compact ? "text-[10px]" : "text-[11px]"}`}>
          {t("mediaPaymentStatus.refreshing")}
        </p>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 text-[11px] font-black uppercase tracking-widest text-neutral-600 underline-offset-4 hover:text-black hover:underline"
        >
          {t("mediaPaymentStatus.dismiss")}
        </button>
      ) : null}
    </div>
  );
}
