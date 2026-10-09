"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabase";
import {
  allowedNextStatuses,
  isMediaHqTab,
  MEDIA_HQ_TABS,
  packageLabel,
  type MediaHqOrderListItem,
  type MediaHqTab,
} from "@/lib/mediaHqOps";
import type { MediaEditorialStatus } from "@/lib/mediaPricing";

const TAB_LABELS: Record<MediaHqTab, { ro: string; en: string }> = {
  queued: { ro: "Noi", en: "New" },
  needs_info: { ro: "Așteaptă informații", en: "Needs info" },
  in_research: { ro: "Research", en: "Research" },
  in_production: { ro: "Producție", en: "Production" },
  published: { ro: "Publicate", en: "Published" },
  closed: { ro: "Respins / Anulat", en: "Rejected / Cancelled" },
};

const STATUS_LABELS: Record<MediaEditorialStatus, { ro: string; en: string }> = {
  queued: { ro: "În coadă", en: "Queued" },
  needs_info: { ro: "Așteaptă info", en: "Needs info" },
  in_research: { ro: "Research", en: "Research" },
  in_production: { ro: "Producție", en: "Production" },
  published: { ro: "Publicat", en: "Published" },
  rejected: { ro: "Respins", en: "Rejected" },
  cancelled: { ro: "Anulat", en: "Cancelled" },
};

function formatRon(amount: number, locale: string): string {
  return `${new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO").format(amount)} RON`;
}

function formatEur(amount: number, locale: string): string {
  return `${new Intl.NumberFormat(locale === "en" ? "en-GB" : "ro-RO").format(amount)} EUR`;
}

function formatTs(value: string | null, locale: string): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ro-RO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function MediaOpsClient() {
  const locale = useLocale();
  const loc = locale === "en" ? "en" : "ro";
  const [tab, setTab] = useState<MediaHqTab>("queued");
  const [orders, setOrders] = useState<MediaHqOrderListItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLost, setAuthLost] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [rejectDraft, setRejectDraft] = useState<Record<string, string>>({});

  // Server page already authorized via HQ_ADMIN_EMAILS; client only needs session JWT for API.
  useEffect(() => {
    void loadOrders("queued");
  }, []);

  async function loadOrders(nextTab: MediaHqTab) {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setAuthLost(true);
        return;
      }
      const res = await fetch(`/api/hq/media-orders?tab=${nextTab}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        orders?: MediaHqOrderListItem[];
        counts?: Record<string, number>;
      };
      if (res.status === 401 || res.status === 403) {
        setAuthLost(true);
        setOrders([]);
        return;
      }
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to load Media orders.");
        setOrders([]);
        return;
      }
      setOrders(json.orders ?? []);
      setCounts(json.counts ?? {});
    } catch {
      setError("Failed to load Media orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const title =
    loc === "en" ? "QuickExit Media — Orders" : "QuickExit Media — Comenzi";

  const kpi = useMemo(
    () =>
      (["queued", "in_research", "in_production", "published"] as const).map(
        (key) => ({
          key,
          label: TAB_LABELS[key][loc],
          count: counts[key] ?? 0,
        }),
      ),
    [counts, loc],
  );

  async function transition(
    order: MediaHqOrderListItem,
    toStatus: MediaEditorialStatus,
  ) {
    setActionBusyId(order.id);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setAuthLost(true);
        return;
      }
      const body: Record<string, unknown> = {
        id: order.id,
        editorial_status: toStatus,
      };
      if (toStatus === "rejected") {
        body.rejection_reason = rejectDraft[order.id] ?? "";
      }
      const res = await fetch("/api/hq/media-orders", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.status === 401 || res.status === 403) {
        setAuthLost(true);
        return;
      }
      if (!res.ok || !json.success) {
        setError(json.error || "Update failed.");
        return;
      }
      await loadOrders(tab);
    } catch {
      setError("Update failed.");
    } finally {
      setActionBusyId(null);
    }
  }

  if (authLost) {
    return (
      <main className="min-h-screen bg-[#F7F4EC] px-4 py-16 text-center">
        <p className="font-black uppercase tracking-wide text-black">
          {loc === "en" ? "Session expired — sign in again" : "Sesiune expirată — autentifică-te din nou"}
        </p>
        <Link href={`/${loc}/dashboard`} className="mt-4 inline-block underline">
          Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F4EC] px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
              HQ Admin
            </p>
            <h1 className="mt-1 text-2xl font-black uppercase italic tracking-tight text-black md:text-3xl">
              {title}
            </h1>
          </div>
          <Link
            href="/hq-admin"
            className="rounded-full border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-wider text-black hover:bg-[#FFD100]"
          >
            ← HQ
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpi.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                setTab(card.key);
                void loadOrders(card.key);
              }}
              className={`rounded-2xl border-[3px] p-4 text-left transition ${
                tab === card.key
                  ? "border-black bg-[#FFD100] shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
                  : "border-black/20 bg-white hover:border-black"
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums text-black">
                {card.count}
              </p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {MEDIA_HQ_TABS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (!isMediaHqTab(id)) return;
                setTab(id);
                void loadOrders(id);
              }}
              className={`rounded-full border-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider ${
                tab === id
                  ? "border-black bg-black text-[#FFD100]"
                  : "border-black/15 bg-white text-neutral-700 hover:border-black/40"
              }`}
            >
              {TAB_LABELS[id][loc]}
              <span className="ml-2 tabular-nums text-neutral-500">
                {counts[id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border-2 border-red-700 bg-red-50 px-4 py-3 text-sm font-semibold text-red-950"
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="font-bold text-neutral-600">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="rounded-2xl border-[3px] border-dashed border-black/30 bg-white px-5 py-8 text-center font-semibold text-neutral-600">
            {loc === "en" ? "No orders in this queue." : "Nicio comandă în această coadă."}
          </p>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => {
              const open = expandedId === order.id;
              const next = isMediaEditorialStatusSafe(order.editorial_status)
                ? allowedNextStatuses(order.editorial_status)
                : [];
              return (
                <li
                  key={order.id}
                  className="rounded-2xl border-[3px] border-black bg-white p-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.06)] md:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-black uppercase italic tracking-tight text-black">
                        {order.listing_title}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-neutral-600">
                        {order.listing_id}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide">
                        <span className="rounded-lg border-2 border-black bg-[#FFD100] px-2 py-1">
                          {packageLabel(order.package, loc)}
                        </span>
                        <span className="rounded-lg border-2 border-black/20 bg-[#F7F4EC] px-2 py-1">
                          {formatRon(order.amount_ron, loc)}
                        </span>
                        <span className="rounded-lg border-2 border-black/20 bg-[#F7F4EC] px-2 py-1">
                          {formatEur(order.listing_value_eur_snapshot, loc)} ·{" "}
                          {order.value_tier}
                        </span>
                        <span className="rounded-lg border-2 border-black/20 bg-white px-2 py-1">
                          pay: {order.payment_status}
                        </span>
                        <span className="rounded-lg border-2 border-black bg-black px-2 py-1 text-[#FFD100]">
                          {isMediaEditorialStatusSafe(order.editorial_status)
                            ? STATUS_LABELS[order.editorial_status][loc]
                            : String(order.editorial_status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-neutral-600">
                        {loc === "en" ? "Paid" : "Plătit"}:{" "}
                        {formatTs(order.paid_at ?? order.created_at, loc)} ·{" "}
                        {order.source} · {order.locale || "—"}
                        {order.seller_name ? ` · ${order.seller_name}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/${loc}/anunt/${order.listing_id}`}
                        className="rounded-full border-2 border-black px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-wider hover:bg-[#FFD100]"
                        target="_blank"
                      >
                        {loc === "en" ? "Listing" : "Anunț"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : order.id)}
                        className="rounded-full border-2 border-black/30 bg-[#F7F4EC] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider hover:border-black"
                      >
                        {open
                          ? loc === "en"
                            ? "Hide"
                            : "Ascunde"
                          : loc === "en"
                            ? "Details"
                            : "Detalii"}
                      </button>
                    </div>
                  </div>

                  {open ? (
                    <div className="mt-4 space-y-4 border-t-2 border-black/10 pt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                            {loc === "en" ? "Listing summary" : "Sumar anunț"}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-neutral-800">
                            {(order.listing_description || "").slice(0, 1200) ||
                              "—"}
                          </p>
                          {order.listing_images.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {order.listing_images.slice(0, 4).map((src) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={src}
                                  src={src}
                                  alt=""
                                  className="h-16 w-16 rounded-lg border-2 border-black object-cover"
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="space-y-2 text-xs font-semibold text-neutral-700">
                          <p>
                            created: {formatTs(order.created_at, loc)}
                          </p>
                          <p>paid_at: {formatTs(order.paid_at, loc)}</p>
                          <p>
                            fulfilled_at: {formatTs(order.fulfilled_at, loc)}
                          </p>
                          <p>
                            updated_at: {formatTs(order.updated_at, loc)}
                          </p>
                          {order.rejection_reason ? (
                            <p className="rounded-lg border-2 border-red-700 bg-red-50 p-2 text-red-950">
                              rejection: {order.rejection_reason}
                            </p>
                          ) : null}
                          <p className="break-all font-mono text-[10px] text-neutral-500">
                            session: {order.stripe_checkout_session_id || "—"}
                          </p>
                          <p className="break-all font-mono text-[10px] text-neutral-500">
                            intent: {order.stripe_payment_intent_id || "—"}
                          </p>
                        </div>
                      </div>

                      {next.length > 0 ? (
                        <div className="space-y-3 rounded-xl border-2 border-black/15 bg-[#F7F4EC] p-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                            {loc === "en" ? "Actions" : "Acțiuni"}
                          </p>
                          {next.includes("rejected") ? (
                            <div>
                              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                                {loc === "en"
                                  ? "Rejection reason (required)"
                                  : "Motiv respingere (obligatoriu)"}
                              </label>
                              <textarea
                                value={rejectDraft[order.id] ?? ""}
                                onChange={(e) =>
                                  setRejectDraft((d) => ({
                                    ...d,
                                    [order.id]: e.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded-xl border-[3px] border-black bg-white px-3 py-2 text-sm"
                                rows={2}
                              />
                              <p className="mt-1 text-[11px] font-semibold text-neutral-600">
                                {loc === "en"
                                  ? "Refund / alternative package decision remains manual."
                                  : "Decizia de refund / pachet alternativ rămâne manuală."}
                              </p>
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            {next.map((status) => (
                              <button
                                key={status}
                                type="button"
                                disabled={actionBusyId === order.id}
                                onClick={() => void transition(order, status)}
                                className={`rounded-full border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-wider disabled:opacity-50 ${
                                  status === "published"
                                    ? "bg-[#FFD100]"
                                    : status === "rejected" || status === "cancelled"
                                      ? "bg-white text-red-800"
                                      : "bg-black text-[#FFD100]"
                                }`}
                              >
                                → {STATUS_LABELS[status][loc]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function isMediaEditorialStatusSafe(
  value: unknown,
): value is MediaEditorialStatus {
  return (
    typeof value === "string" &&
    [
      "queued",
      "needs_info",
      "in_research",
      "in_production",
      "published",
      "rejected",
      "cancelled",
    ].includes(value)
  );
}
