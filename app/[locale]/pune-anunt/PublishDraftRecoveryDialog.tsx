"use client";

import { useEffect, useRef } from "react";
import {
  handlePublishRecoveryDialogKeyDown,
  RECOVERY_DIALOG_FOCUSABLE_SELECTOR,
} from "@/lib/publishDraftRecoveryDialog";

type PublishDraftRecoveryDialogProps = {
  title: string;
  body: string;
  consequence: string;
  expires: string;
  continueLabel: string;
  startNewLabel: string;
  onContinue: () => void;
  onStartNew: () => void;
};

export default function PublishDraftRecoveryDialog({
  title,
  body,
  consequence,
  expires,
  continueLabel,
  startNewLabel,
  onContinue,
  onStartNew,
}: PublishDraftRecoveryDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused =
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    continueRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      handlePublishRecoveryDialogKeyDown(event, {
        getFocusables: () => {
          if (!panelRef.current) return [];
          return Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(RECOVERY_DIALOG_FOCUSABLE_SELECTOR),
          );
        },
        getActive: () => document.activeElement,
      });
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-draft-recovery-title"
      aria-describedby="publish-draft-recovery-body"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-[1.75rem] border-[3px] border-black bg-white p-6 shadow-[10px_10px_0_0_#FFD100] md:p-8"
      >
        <h2
          id="publish-draft-recovery-title"
          className="text-xl font-black uppercase italic tracking-tight text-black md:text-2xl"
        >
          {title}
        </h2>
        <p
          id="publish-draft-recovery-body"
          className="mt-3 text-sm font-medium leading-relaxed text-neutral-700"
        >
          {body}
        </p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-700">
          {consequence}
        </p>
        <p className="mt-2 text-xs font-semibold text-neutral-500">{expires}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            ref={continueRef}
            type="button"
            onClick={onContinue}
            className="w-full rounded-2xl border-[3px] border-black bg-[#FFD100] py-4 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000]"
          >
            {continueLabel}
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="w-full rounded-2xl border-[3px] border-black bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000]"
          >
            {startNewLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
