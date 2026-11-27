"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";

export type VerifiedQeAdminListing = {
  id: string;
  title: string | null;
  status: string | null;
  verified_qe: boolean;
  verified_docs: boolean;
  verified_vin: boolean;
  verified_photos: boolean;
  verified_at: string | null;
};

const COPY = {
  ro: {
    back: "Înapoi la HQ",
    kicker: "Manual",
    title: "Verificat QE",
    intro:
      "Insigna se acordă doar de aici, după cele trei bife. Nu există acordare automată la plată, cron sau webhook.",
    search: "ID sau titlu",
    find: "Caută",
    loading: "Se încarcă...",
    empty: "Niciun anunț pentru această căutare.",
    schema:
      "Migrarea nu este aplicată pe această bază. Insigna rămâne oprită și paginile publice nu se schimbă.",
    docs: "Acte",
    vin: "VIN",
    photos: "Poze reale",
    grant: "Marchează Verificat QE",
    revoke: "Retrage verificarea",
    verified: "Verificat",
    unverified: "Neverificat",
    at: "Verificat la",
    working: "Se salvează...",
    saved: "Salvat.",
    auth: "Sesiunea HQ a expirat.",
  },
  en: {
    back: "Back to HQ",
    kicker: "Manual",
    title: "Verified QE",
    intro:
      "The badge is granted only from this screen, after all three checks. Payment, cron, and webhooks never grant it.",
    search: "ID or title",
    find: "Search",
    loading: "Loading...",
    empty: "No listings match this search.",
    schema:
      "The migration is not applied on this database. The badge stays off and public pages do not change.",
    docs: "Documents",
    vin: "VIN",
    photos: "Real photos",
    grant: "Mark Verified QE",
    revoke: "Withdraw verification",
    verified: "Verified",
    unverified: "Not verified",
    at: "Verified at",
    working: "Saving...",
    saved: "Saved.",
    auth: "The HQ session expired.",
  },
} as const;

function normalizeListing(row: VerifiedQeAdminListing): VerifiedQeAdminListing {
  return {
    id: row.id,
    title: row.title ?? "",
    status: row.status ?? "",
    verified_qe: row.verified_qe === true,
    verified_docs: row.verified_docs === true,
    verified_vin: row.verified_vin === true,
    verified_photos: row.verified_photos === true,
    verified_at: row.verified_at ?? null,
  };
}

export default function VerifiedQeAdminClient({
  fixtureListings,
}: {
  fixtureListings?: VerifiedQeAdminListing[];
}) {
  const locale = useLocale();
  const copy = locale === "en" ? COPY.en : COPY.ro;
  const [query, setQuery] = useState("");
  const [listings, setListings] = useState<VerifiedQeAdminListing[]>(
    () => fixtureListings?.map(normalizeListing) ?? [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(fixtureListings?.[0]?.id ?? null);
  const [docs, setDocs] = useState(fixtureListings?.[0]?.verified_docs === true);
  const [vin, setVin] = useState(fixtureListings?.[0]?.verified_vin === true);
  const [photos, setPhotos] = useState(fixtureListings?.[0]?.verified_photos === true);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const selected = useMemo(
    () => listings.find((listing) => listing.id === selectedId) ?? null,
    [listings, selectedId],
  );
  const checksComplete = docs && vin && photos;

  function selectListing(listing: VerifiedQeAdminListing) {
    setSelectedId(listing.id);
    setDocs(listing.verified_docs);
    setVin(listing.verified_vin);
    setPhotos(listing.verified_photos);
    setNote(null);
    setError(null);
  }

  async function accessToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function search() {
    if (fixtureListings) {
      const needle = query.trim().toLowerCase();
      const source = fixtureListings.map(normalizeListing);
      setListings(
        needle
          ? source.filter(
              (listing) =>
                listing.id.toLowerCase().includes(needle) ||
                (listing.title ?? "").toLowerCase().includes(needle),
            )
          : source,
      );
      return;
    }
    setLoading(true);
    setError(null);
    setSchemaMissing(false);
    try {
      const token = await accessToken();
      if (!token) {
        setError(copy.auth);
        return;
      }
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/hq/verified-qe?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        listings?: VerifiedQeAdminListing[];
      };
      if (res.status === 503 || json.error === "schema_missing") {
        setSchemaMissing(true);
        setListings([]);
        return;
      }
      if (!res.ok || !json.success) {
        setError(json.error || copy.auth);
        return;
      }
      const next = (json.listings ?? []).map(normalizeListing);
      setListings(next);
      if (next[0]) selectListing(next[0]);
    } catch {
      setError(copy.auth);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fixtureListings) return;
    void search();
    // Live HQ loads the latest listings once. The screenshot fixture already has rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(action: "grant" | "revoke") {
    if (!selected) return;
    if (action === "grant" && !checksComplete) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      if (fixtureListings) {
        const next: VerifiedQeAdminListing = {
          ...selected,
          verified_qe: action === "grant",
          verified_docs: action === "grant",
          verified_vin: action === "grant",
          verified_photos: action === "grant",
          verified_at: action === "grant" ? new Date().toISOString() : null,
        };
        setListings((rows) => rows.map((row) => (row.id === next.id ? next : row)));
        selectListing(next);
        setNote(copy.saved);
        return;
      }
      const token = await accessToken();
      if (!token) {
        setError(copy.auth);
        return;
      }
      const res = await fetch("/api/hq/verified-qe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selected.id,
          action,
          docs,
          vin,
          photos,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        listing?: VerifiedQeAdminListing;
      };
      if (res.status === 503 || json.error === "schema_missing") {
        setSchemaMissing(true);
        return;
      }
      if (!res.ok || !json.success || !json.listing) {
        setError(json.error || "error");
        return;
      }
      const next = normalizeListing({ ...selected, ...json.listing, title: selected.title, status: selected.status });
      setListings((rows) => rows.map((row) => (row.id === next.id ? next : row)));
      selectListing(next);
      setNote(copy.saved);
    } catch {
      setError("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 py-8 font-sans text-black md:px-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/hq-admin"
          className="text-[11px] font-black uppercase tracking-widest text-neutral-600 hover:text-black"
        >
          ← {copy.back}
        </Link>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">{copy.kicker}</p>
        <h1 className="mt-2 text-3xl font-black uppercase italic tracking-tight md:text-4xl">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-neutral-700">{copy.intro}</p>

        <form
          className="mt-6 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <label className="sr-only" htmlFor="verified-qe-query">
            {copy.search}
          </label>
          <input
            id="verified-qe-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="w-full rounded-xl border-2 border-black bg-white px-4 py-3 text-sm font-semibold outline-none"
          />
          <button
            type="submit"
            className="rounded-xl border-2 border-black bg-black px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[#FFD100]"
          >
            {loading ? copy.loading : copy.find}
          </button>
        </form>

        {schemaMissing ? (
          <p className="mt-4 rounded-xl border-2 border-black bg-[#FFD100] px-4 py-3 text-sm font-bold">{copy.schema}</p>
        ) : null}
        {error ? <p className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}
        {note ? <p className="mt-4 text-sm font-bold text-neutral-800">{note}</p> : null}

        <ul className="mt-6 space-y-2">
          {listings.length === 0 && !loading ? (
            <li className="text-sm font-medium text-neutral-600">{copy.empty}</li>
          ) : (
            listings.map((listing) => (
              <li key={listing.id}>
                <button
                  type="button"
                  onClick={() => selectListing(listing)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left ${
                    listing.id === selectedId ? "border-black bg-white" : "border-black/20 bg-white/70"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{listing.title || listing.id}</span>
                    <span className="block truncate font-mono text-[10px] text-neutral-500">{listing.id}</span>
                  </span>
                  <span className="shrink-0 rounded-md border-2 border-black bg-[#FFD100] px-2 py-0.5 text-[10px] font-black uppercase">
                    {listing.verified_qe ? copy.verified : copy.unverified}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        {selected ? (
          <section
            data-testid="verified-qe-admin"
            className="mt-6 rounded-[1.5rem] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_0_#FFD100] md:p-7"
          >
            <h2 className="text-lg font-black uppercase italic">{selected.title || selected.id}</h2>
            <p className="mt-1 font-mono text-[10px] text-neutral-500">{selected.status || "—"}</p>
            {selected.verified_at ? (
              <p className="mt-2 text-xs font-bold text-neutral-700">
                {copy.at}: {selected.verified_at}
              </p>
            ) : null}
            <fieldset className="mt-5 space-y-3">
              <legend className="sr-only">{copy.title}</legend>
              {(
                [
                  ["docs", copy.docs, docs, setDocs],
                  ["vin", copy.vin, vin, setVin],
                  ["photos", copy.photos, photos, setPhotos],
                ] as const
              ).map(([key, label, checked, setChecked]) => (
                <label key={key} className="flex items-center gap-3 text-sm font-black uppercase tracking-wide">
                  <input
                    type="checkbox"
                    data-testid={`verified-qe-${key}`}
                    checked={checked}
                    onChange={(event) => setChecked(event.target.checked)}
                    className="h-5 w-5 accent-black"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                data-testid="verified-qe-grant"
                disabled={!checksComplete || busy}
                onClick={() => void submit("grant")}
                className="rounded-xl border-2 border-black bg-[#FFD100] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? copy.working : copy.grant}
              </button>
              <button
                type="button"
                data-testid="verified-qe-revoke"
                disabled={!selected.verified_qe || busy}
                onClick={() => void submit("revoke")}
                className="rounded-xl border-2 border-black bg-white px-4 py-3 text-[11px] font-black uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copy.revoke}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
