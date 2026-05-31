"use client";

import type { PublicListingRow, SellerProfileRow } from "@/lib/listingSeo";
import {
  labelBase,
  inputBase,
  kycStatusRo,
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
          aria-label="Închide dialogul"
          className="absolute right-5 top-5 rounded-xl border-[3px] border-black px-3 py-1.5 text-[10px] font-black uppercase transition hover:bg-black hover:text-[#FFD100] md:right-6 md:top-6"
        >
          Închide
        </button>

        {activeModal === "verified" && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              Încredere pe <span className="text-[#FFD100]">platformă</span>
            </h3>
            <div className="space-y-3 text-base font-medium text-neutral-800">
              <p>
                Situația contului pentru acest utilizator este:{" "}
                <strong className="font-bold text-black">
                  {kycStatusRo(sellerProfile?.kyc_status ?? null)}
                </strong>
                .
              </p>
              <p className="text-sm italic text-neutral-600">
                Nu afișăm public telefon sau e-mail. Contactul legitim se face printr-o ofertă.
              </p>
              <p className="rounded-xl border-[3px] border-black/15 bg-[#F7F4EC]/80 p-4 text-sm text-neutral-700">
                Istoricul de tranzacții va fi disponibil după primele vânzări confirmate pe platformă.
              </p>
            </div>
          </div>
        )}

        {activeModal === "docs" && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              Fișier <span className="text-[#FFD100]">documentar</span>
            </h3>
            <p className="text-base font-medium text-neutral-800">
              Anunțurile marcate sunt structurate pentru a include documentele uzuale din tranzacția
              pentru categoria aleasă:
            </p>
            <ul className="grid grid-cols-1 gap-3 text-xs font-bold uppercase tracking-wide sm:grid-cols-2">
              <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">Act proprietate</li>
              <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">Intabulare</li>
              <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">Certificat fiscal</li>
              <li className="rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">Evaluare / expertiză</li>
            </ul>
            <p className="text-xs font-medium text-neutral-600">
              Lista exactă variază după tipul activului. Detaliile finale se stabilesc cu vânzătorul după
              depunerea unei oferte.
            </p>
          </div>
        )}

        {activeModal === "ai-score" && (
          <div className="space-y-6 pt-4">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              Scor <span className="text-[#FFD100]">lichiditate</span>
            </h3>
            <p className="text-base font-medium text-neutral-800">
              Scorul {adData.deal_score ?? "—"} reflectă o combinație de factori de piață și lichiditate
              (indicativ, nu garanție).
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-3 text-center">
                <p className="text-xl font-black italic leading-none md:text-2xl">40%</p>
                <p className="mt-2 text-[7px] font-black uppercase leading-tight md:text-[8px]">
                  Poziție față de piață
                </p>
              </div>
              <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-3 text-center">
                <p className="text-xl font-black italic leading-none md:text-2xl">35%</p>
                <p className="mt-2 text-[7px] font-black uppercase leading-tight md:text-[8px]">
                  Lichiditate / cerere
                </p>
              </div>
              <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC] p-3 text-center">
                <p className="text-xl font-black italic leading-none md:text-2xl">25%</p>
                <p className="mt-2 text-[7px] font-black uppercase leading-tight md:text-[8px]">
                  Atribute activ
                </p>
              </div>
            </div>
          </div>
        )}

        {activeModal === "accept" && (
          <div className="space-y-8 pt-4 text-center">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter md:text-3xl">
              Confirmare <span className="text-[#FFD100]">preț</span>
            </h3>

            {acceptSuccess ? (
              <div className="animate-in zoom-in rounded-2xl border-[3px] border-black bg-[#FFD100] p-6 text-center shadow-[4px_4px_0_0_#000] duration-300">
                <span className="mb-4 block text-5xl" aria-hidden>
                  🤝
                </span>
                <p className="mb-2 text-xl font-black uppercase italic text-black">
                  Cererea ta a fost înregistrată.
                </p>
                <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-neutral-900">
                  Vânzătorul a fost notificat în legătură cu acordul tău la prețul de{" "}
                  €{(adData.exit_price ?? 0).toLocaleString("ro-RO")}. Te poate contacta folosind datele
                  transmise prin ofertă.
                </p>
                <button
                  type="button"
                  onClick={onAcceptSuccessClose}
                  className="mt-6 w-full rounded-xl border-[3px] border-black bg-black py-4 text-[10px] font-black uppercase tracking-widest text-[#FFD100] transition hover:bg-neutral-900"
                >
                  Închide
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
                  Confirmi achiziția la{" "}
                  <span className="font-black">
                    €{(adData.exit_price ?? 0).toLocaleString("ro-RO")}
                  </span>{" "}
                  (preț de vânzare rapidă)?
                </p>
                <div className="space-y-4 text-left">
                  <div className="border-t-2 border-neutral-100 pt-4">
                    <p className={`${labelBase} mb-3`}>
                      Lasă datele tale — vânzătorul te contactează prin canalele agreate
                    </p>
                    <input
                      type="tel"
                      value={acceptPhone}
                      onChange={(e) => onAcceptPhoneChange(e.target.value)}
                      placeholder="Număr de telefon"
                      className={`${inputBase} mb-3 font-bold uppercase`}
                    />
                    <input
                      type="email"
                      value={acceptEmail}
                      onChange={(e) => onAcceptEmailChange(e.target.value)}
                      placeholder="E-mail (opțional)"
                      className={`${inputBase} mb-3 normal-case`}
                    />
                    <button
                      type="button"
                      onClick={onSubmitAccept}
                      disabled={isAccepting || !acceptPhone}
                      className="w-full rounded-xl border-[3px] border-black bg-black py-4 font-black uppercase tracking-widest text-[#FFD100] shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAccepting ? "Se trimite..." : "Trimite acordul"}
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
              Trimite <span className="text-[#FFD100]">ofertă</span>
            </h3>

            {offerSuccess ? (
              <div className="animate-in zoom-in rounded-2xl border-[3px] border-black bg-[#FFD100] p-6 text-center shadow-[4px_4px_0_0_#000] duration-300">
                <span className="mb-4 block text-5xl" aria-hidden>
                  📬
                </span>
                <p className="mb-2 text-xl font-black uppercase italic text-black">Oferta a fost trimisă.</p>
                <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-neutral-900">
                  Vânzătorul a fost notificat și te poate contacta folosind datele furnizate.
                </p>
                <button
                  type="button"
                  onClick={onOfferSuccessClose}
                  className="mt-6 w-full rounded-xl border-[3px] border-black bg-black py-4 text-[10px] font-black uppercase tracking-widest text-[#FFD100] transition hover:bg-neutral-900"
                >
                  Închide
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
                  <p className={labelBase}>Oferta ta (EUR)</p>
                  <p className="mb-4 font-black italic tracking-tighter text-black [font-size:clamp(2rem,5vw,2.5rem)]">
                    €{offerPrice.toLocaleString("ro-RO")}
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
                        clampOfferPrice(Number((e.target as HTMLInputElement).value))
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
                    aria-label="Suma ofertei"
                  />
                  <div className="mt-3 flex justify-between text-[9px] font-black uppercase text-neutral-500">
                    <span className="text-red-700">Min: €{minOffer.toLocaleString("ro-RO")} (−30%)</span>
                    <span>Max: €{maxOffer.toLocaleString("ro-RO")}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => onBuyerPhoneChange(e.target.value)}
                    placeholder="Număr de telefon"
                    className={inputBase}
                  />
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => onBuyerEmailChange(e.target.value)}
                    placeholder="E-mail (opțional)"
                    className={`${inputBase} normal-case`}
                  />
                  <textarea
                    value={offerMessage}
                    onChange={(e) => onOfferMessageChange(e.target.value)}
                    placeholder="Mesaj pentru vânzător (ex.: termeni de plată, termen de răspuns)..."
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
                  {isSubmittingOffer ? "Se trimite..." : "Trimite oferta"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
