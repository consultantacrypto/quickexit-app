"use client";

import { useSyncExternalStore } from "react";
import {
  TANGEM_BLACK_FRIDAY_CODE,
  TANGEM_BLACK_FRIDAY_COPY,
  TANGEM_BLACK_FRIDAY_ENDS_AT,
  TANGEM_BLACK_FRIDAY_HREF,
  TANGEM_BLACK_FRIDAY_REL,
  tangemBlackFridayBannerVisible,
} from "@/lib/tangemBlackFriday";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black";

function subscribe(onStoreChange: () => void): () => void {
  const endsAt = Date.parse(TANGEM_BLACK_FRIDAY_ENDS_AT);
  const remaining = endsAt - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) return () => {};
  const delay = Math.min(remaining + 1, 2_147_483_647);
  const timer = window.setTimeout(onStoreChange, delay);
  const onVisible = () => {
    if (document.visibilityState === "visible") onStoreChange();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export default function TangemBlackFridayBanner({ serverVisible }: { serverVisible: boolean }) {
  const visible = useSyncExternalStore(
    subscribe,
    () => tangemBlackFridayBannerVisible(serverVisible, new Date()),
    () => serverVisible,
  );

  if (!visible) return null;

  return (
    <a
      href={TANGEM_BLACK_FRIDAY_HREF}
      target="_blank"
      rel={TANGEM_BLACK_FRIDAY_REL}
      lang="ro"
      data-tangem-black-friday=""
      className={`group mb-3 flex min-h-11 w-full flex-col items-start gap-2 rounded-2xl border border-black/10 bg-[#FFD100] px-3.5 py-2.5 text-neutral-950 no-underline shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#e6bc00] min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between md:w-fit md:max-w-3xl md:px-5 md:py-3 ${FOCUS}`}
    >
      <span className="min-w-0 text-[13px] font-semibold leading-snug group-hover:underline group-focus-visible:underline md:text-sm">
        {TANGEM_BLACK_FRIDAY_COPY}
        <span className="sr-only"> (se deschide într-o filă nouă)</span>
      </span>
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center rounded-full border border-black/15 bg-white px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-neutral-950"
      >
        {TANGEM_BLACK_FRIDAY_CODE}
      </span>
    </a>
  );
}
