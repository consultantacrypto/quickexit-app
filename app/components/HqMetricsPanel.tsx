"use client";

import { useEffect, useState } from "react";
import type { HqMetricsReport, PeriodBucket, SourceRow } from "@/lib/hqMetrics";
import { heardFromLabel } from "@/lib/attribution";
import { supabase } from "@/lib/supabase";

function money(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(value);
}

function PeriodTable({ title, rows }: { title: string; rows: PeriodBucket[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-black uppercase italic tracking-tight">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b-2 border-black text-[10px] uppercase tracking-wider text-neutral-500">
              <th className="py-2 pr-3">Perioadă</th>
              <th className="py-2 pr-3">Vânzători organici</th>
              <th className="py-2 pr-3">Vânzători</th>
              <th className="py-2 pr-3">Anunțuri</th>
              <th className="py-2 pr-3">Solicitări</th>
              <th className="py-2 pr-3">Oferte</th>
              <th className="py-2 pr-3">Anunțuri plătite</th>
              <th className="py-2 pr-3">Checkout abandonat</th>
              <th className="py-2 pr-3">Venit</th>
              <th className="py-2">Vândute</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-black/10">
                <td className="py-2 pr-3 font-bold">{row.label}</td>
                <td className="py-2 pr-3 tabular-nums">{row.sellersOrganic}</td>
                <td className="py-2 pr-3 tabular-nums">{row.sellersAll}</td>
                <td className="py-2 pr-3 tabular-nums">{row.listings}</td>
                <td className="py-2 pr-3 tabular-nums">{row.inquiries}</td>
                <td className="py-2 pr-3 tabular-nums">{row.offers}</td>
                <td className="py-2 pr-3 tabular-nums">{row.paidListings}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {row.abandonedListings}
                  <span className="text-neutral-500"> / {row.abandonedDemands} cereri</span>
                </td>
                <td className="py-2 pr-3 tabular-nums">{money(row.revenueRon)}</td>
                <td className="py-2 tabular-nums">{row.sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SourceTable({ title, rows, reported }: { title: string; rows: SourceRow[]; reported?: boolean }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-black uppercase italic tracking-tight">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs font-semibold text-neutral-500">Nicio sursă în ultimele 6 luni.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-black text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="py-2 pr-3">Sursă</th>
                <th className="py-2 pr-3">Vânzători</th>
                <th className="py-2 pr-3">Anunțuri</th>
                <th className="py-2 pr-3">Solicitări</th>
                <th className="py-2 pr-3">Oferte</th>
                <th className="py-2 pr-3">Plăți</th>
                <th className="py-2">Venit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.source} className="border-b border-black/10">
                  <td className="py-2 pr-3 font-bold">
                    {reported
                      ? row.source === "unanswered"
                        ? "Fără răspuns"
                        : heardFromLabel(row.source)
                      : row.source}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{row.sellers}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.listings}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.inquiries}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.offers}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.payments}</td>
                  <td className="py-2 tabular-nums">{money(row.revenueRon)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function HqMetricsPanel() {
  const [excludeHouse, setExcludeHouse] = useState(true);
  const [report, setReport] = useState<HqMetricsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (!cancelled) {
          setError("Sesiune expirată.");
          setLoading(false);
        }
        return;
      }
      try {
        const response = await fetch(`/api/hq/metrics?excludeHouse=${excludeHouse ? "1" : "0"}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean;
          error?: string;
          report?: HqMetricsReport;
        } | null;
        if (cancelled) return;
        if (!response.ok || !payload?.success || !payload.report) {
          setError(payload?.error || "Nu am putut încărca metricile.");
          setReport(null);
        } else {
          setReport(payload.report);
        }
      } catch {
        if (!cancelled) setError("Nu am putut încărca metricile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [excludeHouse]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tight text-black">Metrici atribuire</h2>
          <p className="mt-2 max-w-3xl text-xs font-semibold leading-relaxed text-neutral-600">
            Săptămânile și lunile sunt pe ora României. Vânzător nou = primul anunț al contului.
            Organic = fără medium plătit. Comutatorul scoate contul fondatorului din toate cifrele.
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-full border-2 border-black bg-[#FFD100] px-4 py-2 text-[11px] font-black uppercase tracking-wider">
          <input
            type="checkbox"
            checked={excludeHouse}
            onChange={(event) => setExcludeHouse(event.target.checked)}
          />
          Exclude contul fondatorului
        </label>
      </div>

      {loading ? <p className="text-sm font-bold">Se încarcă metricile...</p> : null}
      {error ? (
        <p role="alert" className="text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      {report ? (
        <>
          {report.warnings.length > 0 ? (
            <ul className="space-y-1 rounded-2xl border-2 border-black bg-[#FFD100]/40 p-4 text-xs font-semibold">
              {report.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {report.truncated ? (
            <p className="text-xs font-semibold text-neutral-600">
              Citirea este limitată la 5000 de rânduri pe tabel. Cifrele pot fi incomplete.
            </p>
          ) : null}
          <PeriodTable title="Ultimele 8 săptămâni" rows={report.weeks} />
          <PeriodTable title="Ultimele 6 luni" rows={report.months} />
          <div>
            <h3 className="mb-3 text-sm font-black uppercase italic tracking-tight">Venit pe produs</h3>
            {report.products.length === 0 ? (
              <p className="text-xs font-semibold text-neutral-500">
                Nicio plată înregistrată încă. După migrație, webhook-ul scrie în payments.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.products.map((product) => (
                  <li key={product.product} className="rounded-2xl border-2 border-black p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      {product.product}
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums">{money(product.revenueRon)}</p>
                    <p className="text-[11px] font-semibold text-neutral-600">{product.payments} plăți</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <SourceTable title="Sursă automată, ultimele 6 luni" rows={report.autoSources} />
          <SourceTable title="Răspuns „De unde ai aflat”, ultimele 6 luni" rows={report.reportedSources} reported />
          {report.soldUndated > 0 ? (
            <p className="text-xs font-semibold text-neutral-600">
              {report.soldUndated} anunțuri sunt sold fără sold_at (marcate înainte de migrație). Nu intră într-o lună.
            </p>
          ) : null}
          <div className="space-y-1 text-[11px] font-medium leading-relaxed text-neutral-500">
            <p>{report.definitions.organicSeller}</p>
            <p>{report.definitions.abandonedCheckout}</p>
            <p>{report.definitions.paid}</p>
            <p>{report.definitions.sold}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
