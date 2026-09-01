"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Star, X } from "lucide-react";
import ListingMedia from "@/app/components/ListingMedia";
import { reorderListingImagesCover } from "@/lib/listingMedia";
import {
  LISTING_IMAGE_ACCEPT,
  MAX_LISTING_IMAGE_BYTES,
  MAX_LISTING_IMAGES,
  canRemoveListingImage,
  listingImageMagicLooksValid,
  moveListingImage,
  removeListingImageAt,
  sanitizeListingImageUrls,
  uploadListingImageFile,
  validateListingImageFile,
  type ListingImageFileError,
} from "@/lib/listingImageUpload";
import { supabase } from "@/lib/supabase";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1";

type UploadRow = {
  id: string;
  name: string;
  status: "uploading" | "ok" | "error";
  error?: ListingImageFileError | "upload_failed";
};

type ListingPhotoEditorProps = {
  images: string[];
  onChange: (next: string[]) => void;
  userId: string;
  listingTitle: string;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  labels: {
    title: string;
    hint: string;
    add: string;
    main: string;
    setMain: string;
    remove: string;
    moveLeft: string;
    moveRight: string;
    preview: string;
    empty: string;
    uploading: string;
    remaining: string;
    previewFailed: string;
    keepLast: string;
    alt: string;
    errors: Record<ListingImageFileError | "upload_failed", string>;
  };
};

function EditorPhotoFrame({
  src,
  alt,
  sizes,
  failedLabel,
}: {
  src: string;
  alt: string;
  sizes: string;
  failedLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-[#F5F1E8] px-2 text-center text-[10px] font-bold uppercase text-neutral-500"
        role="img"
        aria-label={failedLabel}
      >
        {failedLabel}
      </div>
    );
  }
  return (
    <ListingMedia
      src={src}
      alt={alt}
      sizes={sizes}
      className="absolute inset-0"
      onError={() => setFailed(true)}
    />
  );
}

export default function ListingPhotoEditor({
  images,
  onChange,
  userId,
  listingTitle,
  disabled = false,
  onBusyChange,
  labels,
}: ListingPhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const uploading = uploads.some((row) => row.status === "uploading");
  const busy = disabled || uploading;
  const remaining = Math.max(0, MAX_LISTING_IMAGES - images.length);

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  const apply = (next: string[]) => {
    onChange(sanitizeListingImageUrls(next));
  };

  const failMessage = (code: ListingImageFileError | "upload_failed") =>
    labels.errors[code];

  const photoAlt = (index: number) =>
    labels.alt
      .replace("#title#", listingTitle.trim() || "listing")
      .replace("#n#", String(index + 1));

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || busy) return;
    const incoming = Array.from(fileList);
    let currentCount = images.length;
    const nextImages = [...images];

    for (const file of incoming) {
      const rowId = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`;
      const validation = validateListingImageFile(file, currentCount);
      if (validation) {
        setUploads((prev) => [
          ...prev,
          { id: rowId, name: file.name, status: "error", error: validation },
        ]);
        continue;
      }
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (!listingImageMagicLooksValid(head)) {
        setUploads((prev) => [
          ...prev,
          { id: rowId, name: file.name, status: "error", error: "unsupported_type" },
        ]);
        continue;
      }

      setUploads((prev) => [...prev, { id: rowId, name: file.name, status: "uploading" }]);

      const result = await uploadListingImageFile(supabase, userId, file);
      if (!result.ok) {
        setUploads((prev) =>
          prev.map((row) =>
            row.id === rowId ? { ...row, status: "error", error: result.error } : row,
          ),
        );
        continue;
      }
      if (nextImages.includes(result.url) || currentCount >= MAX_LISTING_IMAGES) {
        setUploads((prev) =>
          prev.map((row) =>
            row.id === rowId ? { ...row, status: "error", error: "limit_reached" } : row,
          ),
        );
        continue;
      }
      nextImages.push(result.url);
      currentCount += 1;
      setUploads((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, status: "ok" } : row)),
      );
    }

    apply(nextImages);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="md:col-span-2 min-w-0 max-w-full">
      <p className="text-[10px] font-black uppercase text-gray-400">{labels.title}</p>
      <p className="mt-1 text-xs font-semibold text-neutral-600">{labels.hint}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
        {labels.remaining.replace("#count#", String(remaining))}
      </p>

      <label className={`relative mt-3 flex min-h-[120px] flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-black bg-[#FDFCF8] px-4 py-6 text-center transition hover:bg-white ${FOCUS} ${busy || remaining <= 0 ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
        <input
          ref={inputRef}
          id="listing-photo-file-input"
          data-testid="listing-photo-file-input"
          type="file"
          multiple
          accept={LISTING_IMAGE_ACCEPT}
          disabled={busy || remaining <= 0}
          onChange={(event) => void handleFiles(event.target.files)}
          className={`absolute inset-0 z-10 h-full w-full opacity-0 ${FOCUS} disabled:cursor-not-allowed`}
        />
        <span className="text-sm font-black uppercase tracking-wide">{labels.add}</span>
        <span className="mt-1 text-[10px] font-bold uppercase text-neutral-500">
          JPG, PNG, WebP · max {Math.round(MAX_LISTING_IMAGE_BYTES / (1024 * 1024))} MB
        </span>
      </label>

      {uploads.some((row) => row.status !== "ok") ? (
        <ul className="mt-3 space-y-1" aria-live="polite">
          {uploads
            .filter((row) => row.status !== "ok")
            .map((row) => (
              <li
                key={row.id}
                className={`text-xs font-semibold ${
                  row.status === "error" ? "text-red-700" : "text-neutral-700"
                }`}
              >
                {row.status === "uploading" ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    {labels.uploading}: {row.name}
                  </span>
                ) : (
                  `${row.name}: ${failMessage(row.error ?? "upload_failed")}`
                )}
              </li>
            ))}
        </ul>
      ) : null}

      {images.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-neutral-600">{labels.empty}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((src, index) => {
              const isCover = index === 0;
              const canRemove = canRemoveListingImage(images, index);
              return (
                <div
                  key={`${src}-${index}`}
                  data-testid="listing-photo-card"
                  data-index={index}
                  className={`min-w-0 space-y-2 rounded-xl border-[3px] p-2 ${
                    isCover ? "border-[#FFD100] bg-[#FFF9E8]" : "border-black bg-white"
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#F5F1E8]">
                    <EditorPhotoFrame
                      src={src}
                      alt={photoAlt(index)}
                      sizes="220px"
                      failedLabel={labels.previewFailed}
                    />
                    {isCover ? (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md border-2 border-black bg-[#FFD100] px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-black">
                        <Star size={10} className="fill-black" aria-hidden />
                        {labels.main}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      onClick={() => apply(moveListingImage(images, index, index - 1))}
                      aria-label={labels.moveLeft.replace("#n#", String(index + 1))}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white disabled:opacity-40 ${FOCUS}`}
                    >
                      <ChevronLeft size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === images.length - 1}
                      onClick={() => apply(moveListingImage(images, index, index + 1))}
                      aria-label={labels.moveRight.replace("#n#", String(index + 1))}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white disabled:opacity-40 ${FOCUS}`}
                    >
                      <ChevronRight size={14} aria-hidden />
                    </button>
                    {!isCover ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => apply(reorderListingImagesCover(images, index))}
                        className={`min-w-0 flex-1 rounded-lg border-2 border-black bg-white px-2 py-1.5 text-[9px] font-black uppercase tracking-wide hover:bg-[#FFD100] disabled:opacity-40 ${FOCUS}`}
                      >
                        {labels.setMain}
                      </button>
                    ) : (
                      <p className="min-w-0 flex-1 py-1.5 text-center text-[9px] font-black uppercase tracking-wide text-neutral-500">
                        {labels.main}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={busy || !canRemove}
                      title={!canRemove ? labels.keepLast : undefined}
                      onClick={() => apply(removeListingImageAt(images, index))}
                      aria-label={
                        canRemove
                          ? labels.remove.replace("#n#", String(index + 1))
                          : labels.keepLast
                      }
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-white text-red-700 hover:bg-red-50 disabled:opacity-40 ${FOCUS}`}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 max-w-full overflow-x-auto rounded-xl border-2 border-black bg-[#FDFCF8] p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              {labels.preview}
            </p>
            <ol className="mt-2 flex w-max max-w-none gap-2">
              {images.map((src, index) => (
                <li key={`preview-${src}-${index}`} className="w-16 shrink-0">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-black bg-[#F5F1E8]">
                    <EditorPhotoFrame
                      src={src}
                      alt=""
                      sizes="64px"
                      failedLabel={labels.previewFailed}
                    />
                  </div>
                  <p className="mt-1 text-center text-[9px] font-black uppercase">
                    {index === 0 ? labels.main : index + 1}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
