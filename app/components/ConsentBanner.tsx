"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useConsent } from "./ConsentProvider";

function Toggle({
  checked,
  disabled,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onChange?: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border-[3px] border-black bg-[#FDFCF8] p-4">
      <span>
        <span className="block text-sm font-black uppercase italic text-black">{label}</span>
        <span className="mt-1 block text-xs font-medium leading-relaxed text-neutral-600">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 accent-black"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
    </label>
  );
}

function PreferencesDialog({
  initialAnalytics,
  initialMarketing,
}: {
  initialAnalytics: boolean;
  initialMarketing: boolean;
}) {
  const t = useTranslations("Consent");
  const { closePreferences, savePreferences } = useConsent();
  const dialogTitleId = useId();
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const [draftAnalytics, setDraftAnalytics] = useState(initialAnalytics);
  const [draftMarketing, setDraftMarketing] = useState(initialMarketing);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstActionRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePreferences();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [closePreferences]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={dialogTitleId}
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-4 sm:items-center"
    >
      <div className="w-full max-w-lg rounded-[1.75rem] border-[3px] border-black bg-white p-5 shadow-[10px_10px_0_0_#FFD100] md:p-7">
        <h2
          id={dialogTitleId}
          className="text-xl font-black uppercase italic tracking-tight text-black"
        >
          {t("preferencesTitle")}
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700">
          {t("preferencesBody")}
        </p>
        <div className="mt-5 space-y-3">
          <Toggle
            checked
            disabled
            label={t("necessaryLabel")}
            description={t("necessaryHelp")}
          />
          <Toggle
            checked={draftAnalytics}
            label={t("analyticsLabel")}
            description={t("analyticsHelp")}
            onChange={setDraftAnalytics}
          />
          <Toggle
            checked={draftMarketing}
            label={t("marketingLabel")}
            description={t("marketingHelp")}
            onChange={setDraftMarketing}
          />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            ref={firstActionRef}
            type="button"
            onClick={() =>
              savePreferences({ analytics: draftAnalytics, marketing: draftMarketing })
            }
            className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000]"
          >
            {t("savePreferences")}
          </button>
          <button
            type="button"
            onClick={closePreferences}
            className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000]"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConsentBanner() {
  const t = useTranslations("Consent");
  const {
    bannerVisible,
    preferences,
    preferencesOpen,
    acceptAll,
    rejectOptional,
  } = useConsent();
  const titleId = useId();

  if (!bannerVisible && !preferencesOpen) return null;

  return (
    <>
      {bannerVisible ? (
        <div
          role="region"
          aria-labelledby={titleId}
          className="fixed inset-x-0 bottom-0 z-[70] border-t-[3px] border-black bg-white p-4 shadow-[0_-8px_0_0_#FFD100] md:p-5"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            <div>
              <h2 id={titleId} className="text-base font-black uppercase italic text-black md:text-lg">
                {t("bannerTitle")}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-neutral-700">
                {t("bannerBody")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000]"
              >
                {t("acceptAll")}
              </button>
              <button
                type="button"
                onClick={rejectOptional}
                className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000]"
              >
                {t("rejectOptional")}
              </button>
              <CustomizeButton />
            </div>
          </div>
        </div>
      ) : null}

      {preferencesOpen ? (
        <PreferencesDialog
          initialAnalytics={preferences?.analytics === true}
          initialMarketing={preferences?.marketing === true}
        />
      ) : null}
    </>
  );
}

function CustomizeButton() {
  const t = useTranslations("Consent");
  const { openPreferences } = useConsent();
  return (
    <button
      type="button"
      onClick={openPreferences}
      className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000]"
    >
      {t("customize")}
    </button>
  );
}
