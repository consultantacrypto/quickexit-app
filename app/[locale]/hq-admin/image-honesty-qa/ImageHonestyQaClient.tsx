"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdCard from "@/app/components/AdCard";
import ListingMedia from "@/app/components/ListingMedia";
import {
  cleanupStagingImageHonestyQaFixture,
  createStagingImageHonestyQaFixture,
} from "@/app/actions/stagingImageHonestyQaActions";
import {
  IMAGE_HONESTY_QA_MARKER,
  IMAGE_HONESTY_QA_TITLE_PREFIX,
} from "@/lib/stagingImageHonestyQa";

const FIXTURE_STORAGE_KEY = "qe_image_honesty_qa_fixture_v1";

type StoredFixture = {
  listingId: string;
  title: string;
  status: string;
  imageUrls: string[];
  storagePaths: string[];
};

function readStoredFixture(): StoredFixture | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(FIXTURE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFixture;
    if (!parsed?.listingId || !Array.isArray(parsed.imageUrls)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredFixture(fixture: StoredFixture | null) {
  if (typeof window === "undefined") return;
  if (!fixture) {
    sessionStorage.removeItem(FIXTURE_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(FIXTURE_STORAGE_KEY, JSON.stringify(fixture));
}

export default function ImageHonestyQaClient() {
  const [fixture, setFixture] = useState<StoredFixture | null>(null);
  const [busy, setBusy] = useState<"create" | "cleanup" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    setFixture(readStoredFixture());
  }, []);

  const onCreate = useCallback(async () => {
    setBusy("create");
    setError(null);
    setLastMessage(null);
    try {
      const result = await createStagingImageHonestyQaFixture();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const stored: StoredFixture = {
        listingId: result.listingId,
        title: result.title,
        status: result.status,
        imageUrls: result.imageUrls,
        storagePaths: result.storagePaths,
      };
      writeStoredFixture(stored);
      setFixture(stored);
      setLastMessage(
        `Created pending_payment fixture ${result.listingId} (status=${result.status}). Not public.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "create_failed");
    } finally {
      setBusy(null);
    }
  }, []);

  const onCleanup = useCallback(async () => {
    if (!fixture?.listingId) {
      setError("missing_listing_id");
      return;
    }
    setBusy("cleanup");
    setError(null);
    setLastMessage(null);
    try {
      const result = await cleanupStagingImageHonestyQaFixture({
        listingId: fixture.listingId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      writeStoredFixture(null);
      setFixture(null);
      setLastMessage("Fixture listing + Storage objects removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "cleanup_failed");
    } finally {
      setBusy(null);
    }
  }, [fixture?.listingId]);

  const primaryImage = fixture?.imageUrls[0] ?? "";
  const secondaryImage = fixture?.imageUrls[1] ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800">
            <span className="rounded-sm bg-amber-100 px-2 py-0.5 ring-1 ring-amber-300">
              STAGING ONLY
            </span>
            Image Honesty QA
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase italic tracking-tight text-black">
            Real Storage fixture
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-600">
            Creează un anunț sintetic{" "}
            <code className="rounded bg-neutral-100 px-1">pending_payment</code>{" "}
            cu două PNG-uri pe Staging Storage. Fără Stripe. Fără{" "}
            <code className="rounded bg-neutral-100 px-1">status=active</code>.
            Blocat pe Production Vercel și pe host-ul Supabase de Production.
          </p>
        </div>
        <Link
          href="/hq-admin"
          className="rounded-full border-2 border-black/20 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-700 hover:border-black"
        >
          ← HQ
        </Link>
      </div>

      <div className="rounded-[1.5rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.06)]">
        <p className="text-xs text-neutral-600">
          Marker: <code>{IMAGE_HONESTY_QA_MARKER}</code> · Title prefix:{" "}
          <code>{IMAGE_HONESTY_QA_TITLE_PREFIX}</code>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy !== null || Boolean(fixture)}
            onClick={() => void onCreate()}
            className="rounded-full border-2 border-black bg-[#FFD100] px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "create" ? "Se creează…" : "Creează test"}
          </button>
          <button
            type="button"
            disabled={busy !== null || !fixture}
            onClick={() => void onCleanup()}
            className="rounded-full border-2 border-black/30 bg-white px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "cleanup" ? "Se curăță…" : "Curăță test"}
          </button>
        </div>
        {error ? (
          <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {lastMessage ? (
          <p className="mt-4 text-sm text-neutral-700">{lastMessage}</p>
        ) : null}
      </div>

      {fixture ? (
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-black/10 bg-[#FDFCF8] p-5 text-sm">
            <p>
              <span className="font-bold">listingId:</span>{" "}
              <code>{fixture.listingId}</code>
            </p>
            <p className="mt-1">
              <span className="font-bold">status:</span> {fixture.status}
            </p>
            <p className="mt-1">
              <span className="font-bold">title:</span> {fixture.title}
            </p>
            <p className="mt-1 break-all">
              <span className="font-bold">storagePaths:</span>{" "}
              {fixture.storagePaths.join(", ")}
            </p>
            <p className="mt-3 text-xs text-neutral-500">
              Public /anunt and catalog surfaces will not show this row while
              status remains pending_payment. Preview below uses the same
              ListingMedia / AdCard path as production UIs.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wider">
              ListingMedia frames
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[primaryImage, secondaryImage].map((src, i) => (
                <div
                  key={`${fixture.listingId}-frame-${i}`}
                  className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-black/10"
                >
                  <ListingMedia
                    src={src}
                    alt={`QA image ${i + 1}`}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    forceCover
                    className="absolute inset-0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wider">
              AdCard preview
            </h2>
            <div className="max-w-sm">
              <AdCard
                id={fixture.listingId}
                title={fixture.title}
                image={primaryImage}
                marketPrice="10.000 €"
                exitPrice="8.000 €"
                discount="20"
                type="standard"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
