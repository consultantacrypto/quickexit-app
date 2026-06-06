"use client";

import { useTranslations, useLocale } from "next-intl";
import type { PublicListingRow, SellerProfileRow } from "@/lib/listingSeo";
import { formatEurAmount } from "@/lib/i18n/format";
import {
  labelBase,
  inputBase,
  type ListingModalId,
  type ListingOfferActionMessage,
} from "./listingModalShared";

export type ListingModalsProps = {
  activeModal: ListingModalId;
  onClose: () => void;
  adData: PublicListingRow;
  sellerProfile: SellerProfileRow | null;
  acceptSuccess: boolean;
  acceptActionMessage: ListingOfferActionMessage;
  acceptPhone: string;
  acceptEmail: string;
  isAccepting: boolean;
  onAcceptPhoneChange: (value: string) => void;
  onAcceptEmailChange: (value: string) => void;
  onSubmitAccept: () => void;
  onAcceptSuccessClose: () => void;
  offerSuccess: boolean;
  offerActionMessage: ListingOfferActionMessage;
  buyerPhone: string;
  buyerEmail: string;
  offerMessage: string;
  offerPrice: number;
  minOffer: number;
  maxOffer: number;
  offerStep: number;
  isSubmittingOffer: boolean;
  onBuyerPhoneChange: (value: string) => void;
  onBuyerEmailChange: (value: string) => void;
  onOfferMessageChange: (value: string) => void;
  onOfferPriceChange: (value: number) => void;
  onSubmitOffer: () => void;
  onOfferSuccessClose: () => void;
  clampOfferPrice: (value: number) => number;
};

export default function ListingModals({
  activeModal,
  onClose,
  adData,
  sellerProfile,
  acceptSuccess,
  acceptActionMessage,
  acceptPhone,
  acceptEmail,
  isAccepting,
  onAcceptPhoneChange,
  onAcceptEmailChange,
  onSubmitAccept,
  onAcceptSuccessClose,
  offerSuccess,
  offerActionMessage,
  buyerPhone,
  buyerEmail,
  offerMessage,
  offerPrice,
  minOffer,
  maxOffer,
  offerStep,
  isSubmittingOffer,
  onBuyerPhoneChange,
  onBuyerEmailChange,
  onOfferMessageChange,
  onOfferPriceChange,
  onSubmitOffer,
  onOfferSuccessClose,
  clampOfferPrice,
}: ListingModalsProps) {
  const t = useTranslations("ListingDetail");
  const locale = useLocale();

  const formatPrice = (value: number | null | undefined) =>
    formatEurAmount(Number(value ?? 0), locale);

  const kycStatusLabel = (status: string | null | undefined): string => {
    if (status === "verified") return t("kyc.verified");
    if (status === "processing") return t("kyc.processing");
    if (status === "requires_input") return t("kyc.requiresInput");
    return t("kyc.pending");
  };

  const exitPriceFormatted = formatPrice(adData.exit_price ?? 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        role="presentation"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border-[3px] border-black bg-white p-8 shadow-[14px_14px_0_0_#FFD100] md:p-10">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("modals.closeDialog")}
          className="absolute right-5 top-5 rounded-xl border-[3px] border-black px-3 py-1.5 text-[10px] font-black uppercase transition hover:bg-black hover:text-[#FFD100] md:right-6 md:top-6"
        >
          {t("modals.close")}
        </button>

        {activeModal === "verified" && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              {t("modals.verified.title")}{" "}
              <span className="text-[#FFD100]">{t("modals.verified.titleHighlight")}</span>
            </h3>
            <div className="space-y-3 text-base font-medium text-neutral-800">
              <p>
                {t("modals.verified.statusLine", {
                  status: kycStatusLabel(sellerProfile?.kyc_status ?? null),
                })}
              </p>
              <p className="text-sm italic text-neutral-600">{t("modals.verified.privacyHint")}</p>
              <p className="rounded-xl border-[3px] border-black/15 bg-[#F7F4EC]/80 p-4 text-sm text-neutral-700">
                {t("modals.verified.transactionHistory")}
              </p>
            </div>
          </div>
        )}

        {activeModal === "docs" && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              {t("modals.docs.title")}{" "}
              <span className="text-[#FFD100]">{t("modals.docs.titleHighlight")}</span>
            </h3>
            <p className="text-base font-medium text-neutral-800">{t("modals.docs.intro")}</p>
            <ul className="grid grid-cols-1 gap-3 text-xs font-bold uppercase tracking-wide sm:grid-cols-2">
              <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">
                {t("modals.docs.items.ownership")}
              </li>
              <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">
                {t("modals.docs.items.registration")}
              </li>
              <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">
                {t("modals.docs.items.fiscal")}
              </li>
              <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">
                {t("modals.docs.items.appraisal")}
              </li>
            </ul>
            <p className="text-xs font-medium text-neutral-600">{t("modals.docs.footer")}</p>
          </div>
        )}

        {activeModal === "ai-score" && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              {t("modals.aiScore.title")}{" "}
              <span className="text-[#FFD100]">{t("modals.aiScore.titleHighlight")}</span>
            </h3>
            <p className="text-base font-medium text-neutral-800">
              {t("modals.aiScore.description", { score: adData.deal_score ?? "—" })}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-3 text-center">
                <p className="text-xl font-black italic leading-none md:text-2xl">40%</p>
                <p className="mt-2 text-[7px] font-black uppercase leading-tight md:text-[8px]">
                  {t("modals.aiScore.marketPosition")}
                </p>
              </div>
              <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-3 text-center">
                <p className="text-xl font-black italic leading-none md:text-2xl">35%</p>
                <p className="mt-2 text-[7px] font-black uppercase leading-tight md:text-[8px]">
                  {t("modals.aiScore.liquidityDemand")}
                </p>
              </div>
              <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-3 text-center">
                <p className="text-xl font-black italic leading-none md:text-2xl">25%</p>
                <p className="mt-2 text-[7px] font-black uppercase leading-tight md:text-[8px]">
                  {t("modals.aiScore.assetAttributes")}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeModal === "accept" && (
          <div className="space-y-8 pt-4 text-center">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              {t("modals.accept.title")}{" "}
              <span className="text-[#FFD100]">{t("modals.accept.titleHighlight")}</span>
            </h3>

            {acceptSuccess ? (
              <div className="animate-in zoom-in rounded-2xl border-[3px] border-black bg-[#FFD100] p-6 text-center shadow-[4px_4px_0_0_#000] duration-300">
                <span className="mb-4 block text-5xl" aria-hidden>
                  🤝
                </span>
                <p className="mb-2 text-xl font-black uppercase italic text-black">
                  {t("modals.accept.successTitle")}
                </p>
                <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-neutral-900">
                  {t("modals.accept.successBody", { price: exitPriceFormatted })}
                </p>
                <button
                  type="button"
                  onClick={onAcceptSuccessClose}
                  className="mt-6 w-full rounded-xl border-[3px] border-black bg-black py-4 text-[10px] font-black uppercase tracking-widest text-[#FFD100] transition hover:bg-neutral-900"
                >
                  {t("modals.close")}
                </button>
              </div>
            ) : (
              <>
                {acceptActionMessage && (
                  <div className="rounded-xl border-2 border-red-700 bg-red-100 px-4 py-3 text-sm font-bold text-red-900">
                    {acceptActionMessage.text}
                  </div>
                )}
                <p className="text-left text-base font-medium text-neutral-800">
                  {t("modals.accept.confirmQuestion", { price: exitPriceFormatted })}
                </p>
                <div className="space-y-4 text-left">
                  <div className="border-t-2 border-neutral-100 pt-4">
                    <p className={`${labelBase} mb-3`}>{t("modals.accept.contactHint")}</p>
                    <input
                      type="tel"
                      value={acceptPhone}
                      onChange={(e) => onAcceptPhoneChange(e.target.value)}
                      placeholder={t("modals.accept.phonePlaceholder")}
                      className={`${inputBase} mb-3 font-bold uppercase`}
                    />
                    <input
                      type="email"
                      value={acceptEmail}
                      onChange={(e) => onAcceptEmailChange(e.target.value)}
                      placeholder={t("modals.accept.emailPlaceholder")}
                      className={`${inputBase} mb-3 normal-case`}
                    />
                    <button
                      type="button"
                      onClick={onSubmitAccept}
                      disabled={isAccepting || !acceptPhone}
                      className="w-full rounded-xl border-[3px] border-black bg-black py-4 font-black uppercase tracking-widest text-[#FFD100] shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAccepting ? t("modals.accept.submitting") : t("modals.accept.submit")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeModal === "offer" && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              {t("modals.offer.title")}{" "}
              <span className="text-[#FFD100]">{t("modals.offer.titleHighlight")}</span>
            </h3>

            {offerSuccess ? (
              <div className="animate-in zoom-in rounded-2xl border-[3px] border-black bg-[#FFD100] p-6 text-center shadow-[4px_4px_0_0_#000] duration-300">
                <span className="mb-4 block text-5xl" aria-hidden>
                  📬
                </span>
                <p className="mb-2 text-xl font-black uppercase italic text-black">
                  {t("modals.offer.successTitle")}
                </p>
                <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-neutral-900">
                  {t("modals.offer.successBody")}
                </p>
                <button
                  type="button"
                  onClick={onOfferSuccessClose}
                  className="mt-6 w-full rounded-xl border-[3px] border-black bg-black py-4 text-[10px] font-black uppercase tracking-widest text-[#FFD100] transition hover:bg-neutral-900"
                >
                  {t("modals.close")}
                </button>
              </div>
            ) : (
              <>
                {offerActionMessage && (
                  <div className="rounded-xl border-2 border-red-700 bg-red-100 px-4 py-3 text-sm font-bold text-red-900">
                    {offerActionMessage.text}
                  </div>
                )}
                <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-6">
                  <p className={labelBase}>{t("modals.offer.yourOffer")}</p>
                  <p className="mb-4 font-black italic tracking-tighter text-black [font-size:clamp(2rem,5vw,2.5rem)]">
                    {formatPrice(offerPrice)}
                  </p>
                  <input
                    type="range"
                    min={minOffer}
                    max={maxOffer}
                    step={offerStep}
                    value={offerPrice}
                    onChange={(e) => onOfferPriceChange(clampOfferPrice(Number(e.target.value)))}
                    onInput={(e) =>
                      onOfferPriceChange(
                        clampOfferPrice(Number((e.target as HTMLInputElement).value)),
                      )
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-black"
                  />
                  <input
                    type="number"
                    min={minOffer}
                    max={maxOffer}
                    step={offerStep}
                    value={offerPrice}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") return;
                      onOfferPriceChange(clampOfferPrice(Number(raw)));
                    }}
                    className="mt-3 w-full rounded-xl border-[3px] border-black bg-white px-4 py-3 text-lg font-black italic text-black outline-none focus:border-[#FFD100]"
                    aria-label={t("modals.offer.offerAmountAria")}
                  />
                  <div className="mt-3 flex justify-between text-[9px] font-black uppercase text-neutral-500">
                    <span className="text-red-700">
                      {t("modals.offer.minOffer", { price: formatPrice(minOffer) })}
                    </span>
                    <span>{t("modals.offer.maxOffer", { price: formatPrice(maxOffer) })}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => onBuyerPhoneChange(e.target.value)}
                    placeholder={t("modals.offer.phonePlaceholder")}
                    className={inputBase}
                  />
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => onBuyerEmailChange(e.target.value)}
                    placeholder={t("modals.offer.emailPlaceholder")}
                    className={`${inputBase} normal-case`}
                  />
                  <textarea
                    value={offerMessage}
                    onChange={(e) => onOfferMessageChange(e.target.value)}
                    placeholder={t("modals.offer.messagePlaceholder")}
                    rows={3}
                    className={`${inputBase} resize-none font-medium normal-case`}
                  />
                </div>

                <button
                  type="button"
                  onClick={onSubmitOffer}
                  disabled={isSubmittingOffer || !buyerPhone}
                  className="mt-2 w-full rounded-2xl border-[3px] border-black bg-black py-5 font-black uppercase tracking-widest text-[#FFD100] shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingOffer ? t("modals.offer.submitting") : t("modals.offer.submit")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
