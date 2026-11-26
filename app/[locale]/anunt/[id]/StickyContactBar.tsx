"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { useConsent } from "@/app/components/ConsentProvider";
import { buildListingWhatsAppHref } from "@/lib/listingWhatsApp";
import { getSiteUrl } from "@/lib/siteUrl";

type StickyContactBarProps = {
  listingId: string;
  listingTitle: string;
  exitPrice: number | null;
  locale: string;
  offerLabel: string;
  offerAriaLabel: string;
  whatsappLabel: string;
  whatsappAriaLabel: string;
  barLabel: string;
  /** Hide the bar while a modal, lightbox, or auth dialog is open. */
  suspended: boolean;
  onMakeOffer: () => void;
};

export default function StickyContactBar({
  listingId,
  listingTitle,
  exitPrice,
  locale,
  offerLabel,
  offerAriaLabel,
  whatsappLabel,
  whatsappAriaLabel,
  barLabel,
  suspended,
  onMakeOffer,
}: StickyContactBarProps) {
  const pathname = usePathname() || "";
  const { bannerVisible, preferencesOpen } = useConsent();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const listingPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const listingUrl = `${getSiteUrl()}${listingPath}`;
  const whatsappHref = buildListingWhatsAppHref({
    title: listingTitle,
    listingUrl,
    listingId,
    exitPrice,
    locale,
  });
  const showBar = mounted && !suspended && !bannerVisible && !preferencesOpen;

  const trackWhatsApp = () => {
    trackEvent("click_listing_whatsapp", {
      listing_id: listingId,
      interaction_source: "mobile_sticky_bar",
    });
  };

  return (
    <>
      {/* Reserves body padding on small screens before paint, including while the bar is hidden. */}
      <div data-listing-mobile-cta="" hidden />
      {showBar ? (
        <div
          role="region"
          aria-label={barLabel}
          className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-black bg-white px-3 pt-2 shadow-[0_-4px_0_0_#FFD100] lg:hidden"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto flex max-w-[1400px] gap-2">
            <button
              type="button"
              onClick={onMakeOffer}
              aria-label={offerAriaLabel}
              className="flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-xl border-[3px] border-black bg-black px-3 py-2 text-center text-[11px] font-black uppercase leading-tight tracking-wide text-[#FFD100] transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD100]"
            >
              {offerLabel}
            </button>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackWhatsApp}
                aria-label={whatsappAriaLabel}
                className="flex min-h-12 flex-1 items-center justify-center whitespace-nowrap rounded-xl border-[3px] border-black bg-[#FFD100] px-3 py-2 text-center text-[11px] font-black uppercase leading-tight tracking-wide text-black transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                {whatsappLabel}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
