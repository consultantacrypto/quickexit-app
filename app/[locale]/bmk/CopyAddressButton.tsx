"use client";

import { useEffect, useState } from "react";

type CopyAddressButtonProps = {
  value: string;
  label: string;
  copiedLabel: string;
};

function copyWithTextarea(value: string): boolean {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("aria-hidden", "true");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "0";
  field.style.opacity = "0";
  field.style.pointerEvents = "none";
  document.body.appendChild(field);
  field.focus();
  field.select();
  field.setSelectionRange(0, value.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(field);
  return ok;
}

export default function CopyAddressButton({ value, label, copiedLabel }: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  function onCopy() {
    // execCommand stays inside the click gesture. The async clipboard API
    // rejects in some browsers and would expire that gesture before a fallback.
    const legacyOk = copyWithTextarea(value);
    if (legacyOk) {
      setCopied(true);
      return;
    }

    const write = navigator.clipboard?.writeText(value);
    if (!write) return;
    void write.then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      data-copied={copied ? "true" : "false"}
      className="inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-black bg-[#FFD100] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#000] transition hover:translate-y-0.5 hover:shadow-none"
    >
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
