"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";
import { calculateFinancing } from "@/lib/financingCalculator";
import { financingConfig } from "@/lib/financingConfig";
import { formatEurAmount } from "@/lib/i18n/format";
import { labelBase } from "./listingModalShared";

type FinancingCalculatorModalProps = {
  open: boolean;
  onClose: () => void;
  listingId: string;
  vehiclePrice: number;
};

function clampDepositPct(value: number): number {
  const stepped =
    Math.round(value / financingConfig.depositStep) * financingConfig.depositStep;
  return Math.min(
    financingConfig.depositMax,
    Math.max(financingConfig.depositMin, stepped),
  );
}

export default function FinancingCalculatorModal({
  open,
  onClose,
  listingId,
  vehiclePrice,
}: FinancingCalculatorModalProps) {
  const t = useTranslations("ListingDetail.financing");
  const locale = useLocale();
  const titleId = useId();

  const [interestPct, setInterestPct] = useState(financingConfig.defaultInterest);
  const [termMonths, setTermMonths] = useState(financingConfig.defaultTerm);
  const [depositPct, setDepositPct] = useState(financingConfig.defaultDeposit);
  const [depositInput, setDepositInput] = useState(String(financingConfig.defaultDeposit));

  const formatMoney = useCallback(
    (value: number) => formatEurAmount(value, locale),
    [locale],
  );

  const result = useMemo(
    () =>
      calculateFinancing({
        vehiclePrice,
        depositPct,
        annualInterestPct: interestPct,
        months: termMonths,
      }),
    [vehiclePrice, depositPct, interestPct, termMonths],
  );

  const trackDeposit = useCallback(
    (pct: number) => {
      trackEvent("change_financing_deposit", {
        listing_id: listingId,
        deposit_pct: pct,
        partner: financingConfig.partnerId,
      });
    },
    [listingId],
  );

  const handleInterestChange = (pct: number) => {
    setInterestPct(pct);
    trackEvent("change_financing_interest", {
      listing_id: listingId,
      interest_pct: pct,
      partner: financingConfig.partnerId,
    });
  };

  const handleTermChange = (months: number) => {
    setTermMonths(months);
    trackEvent("change_financing_term", {
      listing_id: listingId,
      term_months: months,
      partner: financingConfig.partnerId,
    });
  };

  const applyDepositPct = (raw: number) => {
    const clamped = clampDepositPct(raw);
    setDepositPct(clamped);
    setDepositInput(String(clamped));
    return clamped;
  };

  const handleDepositSliderChange = (value: number) => {
    applyDepositPct(value);
  };

  const handleDepositSliderCommit = () => {
    trackDeposit(depositPct);
  };

  const handleDepositInputChange = (raw: string) => {
    setDepositInput(raw);
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      applyDepositPct(parsed);
    }
  };

  const handleDepositInputBlur = () => {
    const clamped = applyDepositPct(Number(depositInput));
    trackDeposit(clamped);
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div
        role="presentation"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] border-[3px] border-black bg-white p-5 shadow-[14px_14px_0_0_#FFD100] sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-4 top-4 rounded-xl border-[3px] border-black px-3 py-1.5 text-[10px] font-black uppercase transition hover:bg-black hover:text-[#FFD100] sm:right-5 sm:top-5"
        >
          {t("close")}
        </button>

        <div className="space-y-6 pt-2">
          <div>
            <h2
              id={titleId}
              className="pr-16 text-xl font-black uppercase italic tracking-tight text-black sm:text-2xl"
            >
              {t("title")}
            </h2>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              {t("partnerLabel")}: {financingConfig.partnerName}
            </p>
          </div>

          <div>
            <p className={labelBase}>{t("annualInterest")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {financingConfig.interestOptions.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleInterestChange(pct)}
                  className={`rounded-xl border-[3px] border-black px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                    interestPct === pct
                      ? "bg-[#FFD100] text-black"
                      : "bg-white text-black hover:bg-[#FFF9E8]"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={labelBase}>{t("term")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {financingConfig.termsMonths.map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => handleTermChange(months)}
                  className={`rounded-xl border-[3px] border-black px-3 py-2 text-[10px] font-black uppercase tracking-wider transition ${
                    termMonths === months
                      ? "bg-black text-[#FFD100]"
                      : "bg-white text-black hover:bg-neutral-50"
                  }`}
                >
                  {months} {t("months")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <p className={labelBase}>{t("deposit")}</p>
              <span className="text-sm font-black text-black">{depositPct}%</span>
            </div>
            <input
              type="range"
              min={financingConfig.depositMin}
              max={financingConfig.depositMax}
              step={financingConfig.depositStep}
              value={depositPct}
              onChange={(event) => handleDepositSliderChange(Number(event.target.value))}
              onMouseUp={handleDepositSliderCommit}
              onTouchEnd={handleDepositSliderCommit}
              aria-label={t("deposit")}
              className="mt-3 h-2 w-full cursor-pointer accent-black"
            />
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={financingConfig.depositMin}
                max={financingConfig.depositMax}
                step={financingConfig.depositStep}
                value={depositInput}
                onChange={(event) => handleDepositInputChange(event.target.value)}
                onBlur={handleDepositInputBlur}
                aria-label={t("deposit")}
                className="w-20 rounded-xl border-[3px] border-black px-3 py-2 text-sm font-bold text-black outline-none focus:border-[#FFD100]"
              />
              <span className="text-xs font-bold text-neutral-600">%</span>
            </div>
          </div>

          <div
            aria-live="polite"
            className="min-h-[220px] space-y-3 rounded-[1.25rem] border-[3px] border-black bg-[#F7F4EC] p-4 sm:p-5"
          >
            {result ? (
              <>
                <ResultRow label={t("vehiclePrice")} value={formatMoney(result.vehiclePrice)} />
                <ResultRow label={t("depositAmount")} value={formatMoney(result.depositAmount)} />
                <ResultRow
                  label={t("financedAmount")}
                  value={formatMoney(result.financedAmount)}
                />
                <ResultRow
                  label={t("monthlyPayment")}
                  value={formatMoney(result.monthlyPayment)}
                  highlight
                />
                <ResultRow
                  label={t("totalInterest")}
                  value={formatMoney(result.totalInterest)}
                />
                <ResultRow
                  label={t("totalInstallments")}
                  value={formatMoney(result.totalInstallments)}
                />
                <ResultRow
                  label={t("totalCost")}
                  value={formatMoney(result.totalCostIncludingDeposit)}
                />
              </>
            ) : (
              <p className="text-sm font-semibold text-neutral-600">{t("unavailable")}</p>
            )}
          </div>

          <p className="text-[11px] font-medium leading-relaxed text-neutral-600">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-2 last:border-b-0 last:pb-0">
      <span className="text-[10px] font-black uppercase tracking-wide text-neutral-600">
        {label}
      </span>
      <span
        className={`text-right font-bold text-black ${highlight ? "text-base italic" : "text-sm"}`}
      >
        {value}
      </span>
    </div>
  );
}
