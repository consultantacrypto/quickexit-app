"use client";

import { useEffect, useRef, useState } from "react";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

export default function CopyCheckoutCode({
  code,
  copyLabel,
  copiedLabel,
}: {
  code: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={`${copyLabel} ${code}`}
      onClick={() => {
        void navigator.clipboard.writeText(code).then(
          () => {
            setCopied(true);
            if (timer.current != null) window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(false), 2000);
          },
          () => setCopied(false),
        );
      }}
      className={`inline-flex min-h-11 items-center justify-center rounded-2xl border border-black/15 bg-[#F7F4EC] px-4 text-sm font-semibold text-neutral-950 ${FOCUS}`}
    >
      <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
    </button>
  );
}
