"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import {
  LISTING_CARD_ASPECT,
  LISTING_MEDIA_NEUTRAL_BG,
  canonicalListingImageSrc,
  listingImageAspectRatio,
  listingObjectFit,
} from "@/lib/listingMedia";

type ListingMediaProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  containerAspect?: number;
  className?: string;
  imgClassName?: string;
  onError?: () => void;
};

function ListingMediaInner({
  canonical,
  alt,
  sizes,
  priority,
  containerAspect,
  className,
  imgClassName,
  onError,
}: {
  canonical: string;
  alt: string;
  sizes: string;
  priority: boolean;
  containerAspect: number;
  className: string;
  imgClassName: string;
  onError?: () => void;
}) {
  const [fit, setFit] = useState<"cover" | "contain">("contain");

  const onLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      const aspect = listingImageAspectRatio(img.naturalWidth, img.naturalHeight);
      setFit(listingObjectFit(aspect, containerAspect));
    },
    [containerAspect],
  );

  return (
    <div
      // Do not add `relative` here: callers pass `absolute inset-0`, and both
      // utilities together collapse this box to height 0 (fill image unpainted).
      className={`h-full w-full overflow-hidden ${className}`.trim()}
      style={{ backgroundColor: LISTING_MEDIA_NEUTRAL_BG }}
    >
      {canonical ? (
        <Image
          src={canonical}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={onLoad}
          onError={onError}
          className={`${fit === "cover" ? "object-cover object-center" : "object-contain object-center"} ${imgClassName}`.trim()}
        />
      ) : null}
    </div>
  );
}

export default function ListingMedia({
  src,
  alt,
  sizes,
  priority = false,
  containerAspect = LISTING_CARD_ASPECT,
  className = "",
  imgClassName = "",
  onError,
}: ListingMediaProps) {
  const canonical = canonicalListingImageSrc(src);
  return (
    <ListingMediaInner
      key={canonical}
      canonical={canonical}
      alt={alt}
      sizes={sizes}
      priority={priority}
      containerAspect={containerAspect}
      className={className}
      imgClassName={imgClassName}
      onError={onError}
    />
  );
}
