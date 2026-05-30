import type { ImageLoaderProps } from "next/image";

const SUPABASE_OBJECT_PUBLIC = "/storage/v1/object/public/";
const SUPABASE_RENDER_PUBLIC = "/storage/v1/render/image/public/";

function isSupabaseStorageObjectUrl(src: string): boolean {
  return src.includes(SUPABASE_OBJECT_PUBLIC);
}

export default function supabaseImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (!src || typeof src !== "string") {
    return src;
  }

  if (!isSupabaseStorageObjectUrl(src)) {
    return src;
  }

  const renderSrc = src.replace(SUPABASE_OBJECT_PUBLIC, SUPABASE_RENDER_PUBLIC);

  try {
    const url = new URL(renderSrc);
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality ?? 75));
    return url.toString();
  } catch {
    const separator = renderSrc.includes("?") ? "&" : "?";
    return `${renderSrc}${separator}width=${width}&quality=${quality ?? 75}`;
  }
}
