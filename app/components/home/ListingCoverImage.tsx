"use client";

import Image from "next/image";
import supabaseImageLoader from "@/lib/supabase-image-loader";

type ListingCoverImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

export default function ListingCoverImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: ListingCoverImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      loader={supabaseImageLoader}
    />
  );
}
