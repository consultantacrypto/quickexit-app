"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

type TooltipBox = { top: number; left: number; width: number };

/**
 * Yellow QE badge with a tooltip that stays available to assistive tech and
 * opens on hover, keyboard focus, and tap. The visible layer is portaled so
 * card overflow does not clip it and opening it does not shift layout.
 */
export default function VerifiedQeBadge() {
  const t = useTranslations("VerifiedQe");
  const tipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [box, setBox] = useState<TooltipBox | null>(null);
  const open = hover || pinned;

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = Math.min(260, Math.max(160, window.innerWidth - 16));
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      let top = rect.bottom + 8;
      const estimated = 72;
      if (top + estimated > window.innerHeight - 8) {
        top = Math.max(8, rect.top - estimated - 8);
      }
      setBox({ top, left, width });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!pinned) return;
    const onDoc = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && buttonRef.current?.contains(target)) return;
      setPinned(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinned(false);
        setHover(false);
      }
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  const tooltip = t("tooltip");

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-testid="verified-qe-badge"
        aria-describedby={tipId}
        aria-expanded={open}
        className="pointer-events-auto relative z-[2] inline-flex items-center rounded-md border-2 border-black bg-[#FFD100] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        onPointerEnter={(event) => {
          if (event.pointerType === "touch") return;
          setHover(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "touch") return;
          setHover(false);
        }}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPinned((value) => !value);
        }}
      >
        {t("label")}
      </button>
      <span id={tipId} className="sr-only">
        {tooltip}
      </span>
      {open && box && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              data-testid="verified-qe-tooltip"
              aria-hidden="true"
              className="pointer-events-none fixed z-[80] rounded-xl border-2 border-black bg-[#FFD100] px-3 py-2 text-left text-[11px] font-bold leading-snug text-black shadow-[4px_4px_0_0_#000]"
              style={{ top: box.top, left: box.left, width: box.width }}
            >
              {tooltip}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
