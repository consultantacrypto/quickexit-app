"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type HomeWalletRailProps = {
  children: ReactNode;
  labels: string[];
};

export default function HomeWalletRail({ children, labels }: HomeWalletRailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const cards = [...el.querySelectorAll<HTMLElement>(":scope > article")];
      if (cards.length === 0) return;
      const railLeft = el.getBoundingClientRect().left;
      let next = 0;
      let best = Number.POSITIVE_INFINITY;
      cards.forEach((card, cardIndex) => {
        const distance = Math.abs(card.getBoundingClientRect().left - railLeft);
        if (distance < best) {
          best = distance;
          next = cardIndex;
        }
      });
      setIndex(next);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="min-w-0">
      <div ref={ref} data-wallet-rail className="home-wallet-rail">
        {children}
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5 lg:hidden">
        {labels.map((label, dotIndex) => {
          const active = dotIndex === index;
          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              aria-current={active ? "true" : undefined}
              className={`h-1.5 rounded-full border border-black ${active ? "w-4 bg-[#FFD100]" : "w-1.5 bg-white"}`}
              onClick={() => {
                const rail = ref.current;
                const card = rail?.querySelectorAll("article")[dotIndex];
                card?.scrollIntoView({ inline: "start", block: "nearest" });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
