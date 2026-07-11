"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
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

type ModalStep = "calculator" | "form" | "success";

const inputClass =
  "w-full rounded-xl border-[3px] border-black bg-white px-3 py-3 text-sm font-semibold text-black outline-none focus:border-[#FFD100]";

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
  const fullNameRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<ModalStep>("calculator");
  const [interestPct, setInterestPct] = useState(financingConfig.defaultInterest);
  const [termMonths, setTermMonths] = useState(financingConfig.defaultTerm);
  const [depositPct, setDepositPct] = useState(financingConfig.defaultDeposit);
  const [depositInput, setDepositInput] = useState(String(financingConfig.defaultDeposit));
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const canSubmitForm =
    fullName.trim().length >= 2 &&
    phone.trim().length > 0 &&
    consent &&
    !isSubmitting &&
    step === "form";

  const resetFormState = useCallback(() => {
    setStep("calculator");
    setFullName("");
    setPhone("");
    setEmail("");
    setConsent(false);
    setWebsite("");
    setIsSubmitting(false);
    setSubmitError(null);
  }, []);

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

  const handleOpenRequestForm = () => {
    if (!result) {
      return;
    }
    trackEvent("open_financing_request_form", {
      listing_id: listingId,
      partner: financingConfig.partnerId,
      deposit_pct: depositPct,
      interest_pct: interestPct,
      term_months: termMonths,
    });
    setSubmitError(null);
    setStep("form");
  };

  const handleBackToCalculator = () => {
    setSubmitError(null);
    setStep("calculator");
  };

  const resolveSubmitErrorMessage = (errorCode?: string) => {
    if (errorCode === "duplicate_request") {
      return t("duplicateError");
    }
    if (errorCode === "validation_error") {
      return t("validationError");
    }
    return t("genericError");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitForm || !result) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    trackEvent("submit_financing_request", {
      listing_id: listingId,
      partner: financingConfig.partnerId,
      deposit_pct: depositPct,
      interest_pct: interestPct,
      term_months: termMonths,
      status: "pending",
    });

    try {
      const response = await fetch("/api/financing/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          consent: true,
          locale,
          depositPct,
          interestPct,
          termMonths,
          website,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        error_code?: string;
      } | null;

      if (!response.ok || payload?.success !== true) {
        const errorCode = payload?.error_code ?? "server_error";
        setSubmitError(resolveSubmitErrorMessage(errorCode));
        trackEvent("financing_request_error", {
          listing_id: listingId,
          partner: financingConfig.partnerId,
          deposit_pct: depositPct,
          interest_pct: interestPct,
          term_months: termMonths,
          status: "error",
          error_code: errorCode,
        });
        return;
      }

      trackEvent("financing_request_success", {
        listing_id: listingId,
        partner: financingConfig.partnerId,
        deposit_pct: depositPct,
        interest_pct: interestPct,
        term_months: termMonths,
        status: "success",
      });
      setStep("success");
    } catch {
      setSubmitError(t("genericError"));
      trackEvent("financing_request_error", {
        listing_id: listingId,
        partner: financingConfig.partnerId,
        deposit_pct: depositPct,
        interest_pct: interestPct,
        term_months: termMonths,
        status: "error",
        error_code: "network_error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      resetFormState();
      return;
    }

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
  }, [open, onClose, resetFormState]);

  useEffect(() => {
    if (open && step === "form") {
      fullNameRef.current?.focus();
    }
  }, [open, step]);

  useEffect(() => {
    if (submitError && statusRef.current) {
      statusRef.current.focus();
    }
  }, [submitError]);

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
              {step === "form" ? t("contactStepTitle") : t("title")}
            </h2>
            {step === "calculator" ? (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                {t("partnerLabel")}: {financingConfig.partnerName}
              </p>
            ) : null}
          </div>

          {step === "calculator" ? (
            <>
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

              {result ? (
                <button
                  type="button"
                  onClick={handleOpenRequestForm}
                  className="w-full rounded-2xl border-[3px] border-black bg-[#FFD100] px-4 py-4 text-[11px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition hover:bg-white"
                >
                  {t("requestOfferCta")}
                </button>
              ) : null}
            </>
          ) : null}

          {step === "form" && result ? (
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="rounded-[1.25rem] border-[3px] border-black bg-[#F7F4EC] p-4 text-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                  {t("simulationSummary")}
                </p>
                <dl className="mt-3 space-y-2">
                  <SummaryRow
                    label={t("summaryMonthly")}
                    value={formatMoney(result.monthlyPayment)}
                    highlight
                  />
                  <SummaryRow
                    label={t("summaryDeposit")}
                    value={`${depositPct}% · ${formatMoney(result.depositAmount)}`}
                  />
                  <SummaryRow label={t("summaryTerm")} value={`${termMonths} ${t("months")}`} />
                  <SummaryRow label={t("summaryInterest")} value={`${interestPct}%`} />
                </dl>
              </div>

              <div>
                <label htmlFor="financing-full-name" className={labelBase}>
                  {t("fullNameLabel")}
                </label>
                <input
                  ref={fullNameRef}
                  id="financing-full-name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={200}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={t("fullNamePlaceholder")}
                  className={`${inputClass} mt-2`}
                />
              </div>

              <div>
                <label htmlFor="financing-phone" className={labelBase}>
                  {t("phoneLabel")}
                </label>
                <input
                  id="financing-phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t("phonePlaceholder")}
                  className={`${inputClass} mt-2`}
                />
              </div>

              <div>
                <label htmlFor="financing-email" className={labelBase}>
                  {t("emailLabel")}
                </label>
                <input
                  id="financing-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className={`${inputClass} mt-2`}
                />
              </div>

              <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
                <label htmlFor="financing-website">Website</label>
                <input
                  id="financing-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border-[3px] border-black bg-white p-4">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  required
                  className="mt-0.5 h-5 w-5 shrink-0 accent-black"
                />
                <span className="text-xs font-semibold leading-relaxed text-neutral-800">
                  {t("consentLabel")}{" "}
                  <Link
                    href={`/${locale}/confidentialitate`}
                    className="font-bold underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("privacyLink")}
                  </Link>
                </span>
              </label>

              <p className="text-[11px] font-medium leading-relaxed text-neutral-600">
                {t("disclaimer")}
              </p>

              {submitError ? (
                <div
                  ref={statusRef}
                  tabIndex={-1}
                  role="alert"
                  aria-live="polite"
                  className="rounded-xl border-2 border-red-700 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900"
                >
                  {submitError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleBackToCalculator}
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black transition hover:bg-neutral-50 disabled:opacity-60"
                >
                  {t("backToCalculator")}
                </button>
                <button
                  type="submit"
                  disabled={!canSubmitForm}
                  className="w-full rounded-2xl border-[3px] border-black bg-black px-4 py-3 text-[11px] font-black uppercase tracking-widest text-[#FFD100] transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? t("submitting") : t("submitRequest")}
                </button>
              </div>
            </form>
          ) : null}

          {step === "success" ? (
            <div aria-live="polite" className="space-y-4 rounded-[1.25rem] border-[3px] border-black bg-[#F7F4EC] p-5">
              <p className="text-lg font-black uppercase italic tracking-tight text-black">
                {t("successTitle")}
              </p>
              <p className="text-sm font-semibold leading-relaxed text-neutral-700">
                {t("successBody")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl border-[3px] border-black bg-[#FFD100] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black"
              >
                {t("close")}
              </button>
            </div>
          ) : null}
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

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[10px] font-black uppercase tracking-wide text-neutral-600">{label}</dt>
      <dd
        className={`text-right font-bold text-black ${highlight ? "text-base italic" : "text-sm"}`}
      >
        {value}
      </dd>
    </div>
  );
}
