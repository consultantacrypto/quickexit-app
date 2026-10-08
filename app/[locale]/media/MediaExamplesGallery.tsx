"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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
  const [showEndFade, setShowEndFade] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setMarketingOk(hasMarketingConsent());
    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
  }, []);

  const updateTabFade = useCallback(() => {
    const el = tabListRef.current;
    if (!el) {
      setShowEndFade(false);
      return;
    }
    const canScroll = el.scrollWidth > el.clientWidth + 2;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setShowEndFade(canScroll && !atEnd);
  }, []);

  useEffect(() => {
    updateTabFade();
    const el = tabListRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateTabFade, { passive: true });
    window.addEventListener("resize", updateTabFade);
    return () => {
      el.removeEventListener("scroll", updateTabFade);
      window.removeEventListener("resize", updateTabFade);
    };
  }, [updateTabFade]);

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

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    const last = MEDIA_EXAMPLE_CATEGORIES.length - 1;
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = index === last ? 0 : index + 1;
    if (event.key === "ArrowLeft") nextIndex = index === 0 ? last : index - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = last;
    const next = MEDIA_EXAMPLE_CATEGORIES[nextIndex];
    selectCategory(next);
    const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
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

      <div className="relative mb-6 md:static">
        <div
          ref={tabListRef}
          role="tablist"
          aria-label={labels.sectionTitle}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:pb-0"
        >
          {MEDIA_EXAMPLE_CATEGORIES.map((item, index) => {
            const selected = item === category;
            return (
              <button
                key={item}
                id={`media-tab-${item}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="media-examples-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => selectCategory(item)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={`shrink-0 rounded-xl border-[3px] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black md:text-[11px] ${
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
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#F7F4EC] via-[#F7F4EC]/80 to-transparent transition-opacity duration-200 md:hidden ${
            showEndFade ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <div id="media-examples-panel" role="tabpanel" aria-labelledby={`media-tab-${category}`}>
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
      </div>

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
  const thumbAlt = clip.assetName
    ? `${clip.assetName} — QuickExit Story`
    : title;

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
              className="absolute right-3 top-3 z-10 rounded-lg border-2 border-black bg-[#FFD100] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {labels.closePlayer}
            </button>
          </>
        ) : (
          <>
            {clip.thumbnail ? (
              <Image
                src={clip.thumbnail}
                alt={thumbAlt}
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
                    className="inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD100] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD100]"
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
                        className="rounded-xl border-2 border-[#FFD100] bg-transparent px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#FFD100] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD100]"
                      >
                        {labels.openCookieSettings}
                      </button>
                      <a
                        href={clip.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border-2 border-white/40 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
                  className="inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#FFD100] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD100]"
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
