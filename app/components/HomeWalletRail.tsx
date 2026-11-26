"use client";

import { useEffect, useRef, type ReactNode } from "react";

type HomeWalletRailProps = {
  children: ReactNode;
};

export default function HomeWalletRail({ children }: HomeWalletRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    const bar = barRef.current;
    if (!rail || !bar) return;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const max = rail.scrollWidth - rail.clientWidth;
      const ratio = max > 1 ? Math.min(1, Math.max(0, rail.scrollLeft / max)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };
    paint();
    rail.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      rail.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="min-w-0">
      <div ref={railRef} data-wallet-rail className="home-wallet-rail">
        {children}
      </div>
      <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-neutral-200 lg:hidden" data-wallet-progress aria-hidden>
        <div ref={barRef} className="h-full w-full origin-left bg-[#FFD100]" style={{ transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}
