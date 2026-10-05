"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CONSENT_CHANGE_EVENT,
  emitOpenConsentPreferences,
  hasMarketingConsent,
} from "@/lib/consentPreferences";
import {
  getMediaExamplesByCategory,
  MEDIA_EXAMPLE_CATEGORIES,
  type MediaExample,
  type MediaExampleCategory,
} from "@/lib/mediaExamples";

type Labels = {
  sectionTitle: string;
  sectionBody: string;
  playYoutube: string;
  openTiktok: string;
  openYoutube: string;
  consentNeeded: string;
  openCookieSettings: string;
  closePlayer: string;
  proofNote: string;
  platformTiktok: string;
  platformYoutube: string;
  categories: Record<MediaExampleCategory, string>;
  titles: Record<string, string>;
};

type MediaExamplesGalleryProps = {
  initialCategory: MediaExampleCategory;
  labels: Labels;
};

export default function MediaExamplesGallery({
  initialCategory,
  labels,
}: MediaExamplesGalleryProps) {
  const [category, setCategory] = useState<MediaExampleCategory>(initialCategory);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [marketingOk, setMarketingOk] = useState(false);

  useEffect(() => {
    const sync = () => setMarketingOk(hasMarketingConsent());
    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
  }, []);

  const closePlayer = useCallback(() => setActiveId(null), []);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePlayer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, closePlayer]);

  const clips = useMemo(() => getMediaExamplesByCategory(category), [category]);

  const selectCategory = (next: MediaExampleCategory) => {
    setCategory(next);
    setActiveId(null);
  };

  return (
    <section id="exemple" aria-labelledby="media-examples-heading" className="scroll-mt-28">
      <div className="mb-8 max-w-2xl">
        <h2
          id="media-examples-heading"
          className="text-2xl font-black uppercase italic tracking-tighter text-black md:text-3xl"
        >
          {labels.sectionTitle}
        </h2>
        <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-600 md:text-base">
          {labels.sectionBody}
        </p>
      </div>

      <div
        role="tablist"
        aria-label={labels.sectionTitle}
        className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:pb-0"
      >
        {MEDIA_EXAMPLE_CATEGORIES.map((item) => {
          const selected = item === category;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectCategory(item)}
              className={`shrink-0 rounded-xl border-[3px] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition md:text-[11px] ${
                selected
                  ? "border-black bg-[#FFD100] text-black shadow-[3px_3px_0_0_#000]"
                  : "border-black bg-white text-neutral-700 hover:bg-[#FFF8D6]"
              }`}
            >
              {labels.categories[item]}
            </button>
          );
        })}
      </div>

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
        {clips.map((clip) => (
          <li key={clip.id} className="min-w-0">
            <ExampleCard
              clip={clip}
              labels={labels}
              marketingOk={marketingOk}
              isActive={activeId === clip.id}
              onPlay={() => setActiveId(clip.id)}
              onClose={closePlayer}
            />
          </li>
        ))}
      </ul>

      <p className="mt-6 max-w-3xl text-xs font-medium leading-relaxed text-neutral-500">
        {labels.proofNote}
      </p>
    </section>
  );
}

function ExampleCard({
  clip,
  labels,
  marketingOk,
  isActive,
  onPlay,
  onClose,
}: {
  clip: MediaExample;
  labels: Labels;
  marketingOk: boolean;
  isActive: boolean;
  onPlay: () => void;
  onClose: () => void;
}) {
  const title = labels.titles[clip.titleKey] ?? "QuickExit Story";
  const isYoutube = clip.platform === "youtube";
  const canEmbed = isYoutube && Boolean(clip.youtubeId) && marketingOk;
  const showIframe = isActive && canEmbed && clip.youtubeId;

  return (
    <article className="overflow-hidden rounded-[1.5rem] border-[3px] border-black bg-black shadow-[6px_6px_0_0_rgba(0,0,0,0.12)]">
      <div className="relative aspect-[9/16] w-full bg-neutral-950">
        {showIframe ? (
          <>
            <iframe
              title={title}
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${clip.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 rounded-lg border-2 border-black bg-[#FFD100] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-black"
            >
              {labels.closePlayer}
            </button>
          </>
        ) : (
          <>
            {clip.thumbnail ? (
              <Image
                src={clip.thumbnail}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
                loading="lazy"
              />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,209,0,0.28),transparent_55%),linear-gradient(165deg,#141414_0%,#0a0a0a_48%,#1a1608_100%)]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 z-[1] space-y-3 p-4 md:p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#FFD100]">
                {isYoutube ? labels.platformYoutube : labels.platformTiktok}
              </p>
              <h3 className="text-sm font-black uppercase italic leading-snug text-white md:text-base">
                {title}
              </h3>

              {isYoutube ? (
                marketingOk ? (
                  <button
                    type="button"
                    onClick={onPlay}
                    className="inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD100] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#000]"
                  >
                    <span
                      aria-hidden
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] text-[#FFD100]"
                    >
                      ▶
                    </span>
                    {labels.playYoutube}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-neutral-300">
                      {labels.consentNeeded}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => emitOpenConsentPreferences()}
                        className="rounded-xl border-2 border-[#FFD100] bg-transparent px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#FFD100]"
                      >
                        {labels.openCookieSettings}
                      </button>
                      <a
                        href={clip.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border-2 border-white/40 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white"
                      >
                        {labels.openYoutube}
                      </a>
                    </div>
                  </div>
                )
              ) : (
                <a
                  href={clip.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD100] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#000]"
                >
                  {labels.openTiktok}
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
