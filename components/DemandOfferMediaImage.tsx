"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  isLegacyPublicDemandOfferMediaUrl,
  isPrivateDemandOfferMediaRef,
} from "@/lib/demandOfferMedia";

type Props = {
  mediaRef: string;
  offerId?: string | null;
  alt: string;
  className?: string;
};

/**
 * Dual-read renderer for demand-offer media:
 * - legacy public listings URLs → use directly
 * - private demand-offers refs → short-lived signed URL via API
 */
export function DemandOfferMediaImage({
  mediaRef,
  offerId,
  alt,
  className,
}: Props) {
  const [src, setSrc] = useState<string | null>(
    isLegacyPublicDemandOfferMediaUrl(mediaRef) ? mediaRef : null,
  );
  const [state, setState] = useState<"loading" | "ready" | "denied" | "missing">(
    isLegacyPublicDemandOfferMediaUrl(mediaRef) ? "ready" : "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (isLegacyPublicDemandOfferMediaUrl(mediaRef)) {
        if (!cancelled) {
          setSrc(mediaRef);
          setState("ready");
        }
        return;
      }

      if (!isPrivateDemandOfferMediaRef(mediaRef)) {
        if (!cancelled) setState("missing");
        return;
      }

      setState("loading");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (!cancelled) setState("denied");
        return;
      }

      try {
        const res = await fetch("/api/demand-offers/media/signed-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            media_ref: mediaRef,
            offer_id: offerId ?? undefined,
          }),
        });
        if (cancelled) return;
        if (res.status === 403 || res.status === 401) {
          setState("denied");
          return;
        }
        if (!res.ok) {
          setState("missing");
          return;
        }
        const json = (await res.json()) as { url?: string };
        if (!json.url) {
          setState("missing");
          return;
        }
        setSrc(json.url);
        setState("ready");
      } catch {
        if (!cancelled) setState("missing");
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [mediaRef, offerId]);

  if (state === "loading") {
    return (
      <div
        className={
          className ??
          "flex h-20 w-full items-center justify-center bg-neutral-100 text-[10px] font-bold uppercase text-neutral-500"
        }
        aria-busy="true"
      >
        …
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div
        className={
          className ??
          "flex h-20 w-full items-center justify-center bg-neutral-100 text-[10px] font-bold uppercase text-neutral-500"
        }
      >
        Acces restricționat
      </div>
    );
  }

  if (state === "missing" || !src) {
    return (
      <div
        className={
          className ??
          "flex h-20 w-full items-center justify-center bg-neutral-100 text-[10px] font-bold uppercase text-neutral-500"
        }
      >
        Imagine indisponibilă
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className ?? "h-20 w-full object-cover"} />
  );
}
