"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { companyInfo } from "@/lib/company";

const ADMIN_EMAILS = ["consultantacrypto.ro@gmail.com"];

type TabId = "overview" | "listings" | "demands" | "offers" | "profiles" | "risks";

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

function listingStatusLabel(status: string | undefined): string {
  const s = (status || "").toLowerCase();
  if (s === "active") return "Activ";
  if (s === "pending_payment") return "Așteaptă plata";
  if (s === "admin_removed" || s === "removed" || s === "hidden") return "Ascuns";
  if (s === "suspended") return "Suspendat";
  if (!s) return "Necunoscut";
  return "Necunoscut";
}

function demandStatusLabel(status: string | undefined): string {
  const s = (status || "").toLowerCase();
  if (s === "active") return "Activ";
  if (s === "pending_payment") return "Așteaptă plata";
  if (s === "suspended") return "Suspendat";
  if (s === "admin_removed" || s === "removed" || s === "hidden") return "Ascuns";
  if (!s) return "Necunoscut";
  return "Necunoscut";
}

function kycBadgeLabel(status: string | null | undefined): string {
  if (status === "verified") return "Verificat";
  if (status === "pending") return "În așteptare";
  if (status === "processing") return "În procesare";
  if (status === "requires_input") return "Necesită reluare";
  if (status === "canceled") return "Anulat";
  return status || "—";
}

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Panou general" },
  { id: "listings", label: "Listări" },
  { id: "demands", label: "Cereri" },
  { id: "offers", label: "Oferte" },
  { id: "profiles", label: "Profiluri / KYC" },
  { id: "risks", label: "Riscuri" },
];

export default function AdminHQ() {
  const [gate, setGate] = useState<"loading" | "anon" | "forbidden" | "ready">("loading");
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [allListings, setAllListings] = useState<any[]>([]);
  const [allDemands, setAllDemands] = useState<any[]>([]);
  const [listingOffers, setListingOffers] = useState<any[]>([]);
  const [demandOffers, setDemandOffers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [valuationReports, setValuationReports] = useState<any[]>([]);

  const [loadNote, setLoadNote] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    setLoadNote(null);
    setActionError(null);

    const results = await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("demands").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("listing_offers").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("demand_offers").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id, full_name, kyc_status, user_type, created_at").order("created_at", { ascending: false }).limit(300),
      supabase.from("valuation_reports").select("id, confidence_score, created_at").order("created_at", { ascending: false }).limit(300),
    ]);

    const anyError = results.some((r) => r.error);
    if (anyError) {
      setLoadNote("Date indisponibile prin politicile curente.");
    }

    setAllListings(results[0].data ?? []);
    setAllDemands(results[1].data ?? []);
    setListingOffers(results[2].data ?? []);
    setDemandOffers(results[3].data ?? []);
    setProfiles(results[4].data ?? []);
    setValuationReports(results[5].data ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setGate("loading");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setGate("anon");
        return;
      }
      if (!isAdminEmail(user.email)) {
        setGate("forbidden");
        return;
      }

      await loadAdminData();
      setGate("ready");
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [loadAdminData]);

  const stats = useMemo(() => {
    const listingsActive = allListings.filter((l) => l.status === "active").length;
    const listingsPending = allListings.filter((l) => l.status === "pending_payment").length;
    const demandsActive = allDemands.filter((d) => d.status === "active").length;
    const demandsPending = allDemands.filter((d) => d.status === "pending_payment").length;
    const marketIndex = allListings.filter((l) => l.is_seed === true).length;
    return {
      listingsActive,
      listingsPending,
      demandsActive,
      demandsPending,
      listingOffers: listingOffers.length,
      demandOffers: demandOffers.length,
      profiles: profiles.length,
      valuationReports: valuationReports.length,
      marketIndex,
    };
  }, [allListings, allDemands, listingOffers, demandOffers, profiles, valuationReports]);

  const riskAlerts = useMemo(() => {
    const alerts: string[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    if (allListings.some((l) => l.status === "active" && l.is_seed === true)) {
      alerts.push("Există listări marcate active cu Market Index (is_seed) — verifică consistența.");
    }
    allListings.forEach((l) => {
      if (l.status === "pending_payment" && l.created_at) {
        if (now - new Date(l.created_at).getTime() > dayMs) {
          alerts.push(`Listare în așteptarea plății >24h: ${String(l.title || l.id).slice(0, 48)}…`);
        }
      }
    });
    allDemands.forEach((d) => {
      if (d.status === "pending_payment" && d.created_at) {
        if (now - new Date(d.created_at).getTime() > dayMs) {
          alerts.push(`Cerere în așteptarea plății >24h: ${String(d.target_asset || d.id).slice(0, 48)}…`);
        }
      }
    });
    if (allDemands.some((d) => d.status === "active" && !d.buyer_id)) {
      alerts.push("Cereri active fără buyer_id — date vechi sau orfane.");
    }
    profiles.forEach((p) => {
      if (p.kyc_status === "requires_input") {
        alerts.push(`Profil KYC necesită reluare: ${p.full_name || p.id}`);
      }
    });
    valuationReports.forEach((r) => {
      const c = Number(r.confidence_score);
      if (Number.isFinite(c) && c < 50) {
        alerts.push(`Raport evaluare cu încredere scăzută (${c}): ${r.id}`);
      }
    });
    if (allListings.some((l) => !l.user_id)) {
      alerts.push("Există listări fără user_id.");
    }
    allListings.forEach((l) => {
      const m = Number(l.market_price);
      const e = Number(l.exit_price);
      if (m > 50_000_000 || e > 50_000_000) {
        alerts.push(`Prețuri foarte mari (verificare): ${String(l.title || "").slice(0, 40)}`);
      } else if (m > 0 && e > m * 2.5) {
        alerts.push(`Preț exit mult peste piață: ${String(l.title || "").slice(0, 40)}`);
      }
    });

    return alerts;
  }, [allListings, allDemands, profiles, valuationReports]);

  const activateListingManual = async (id: string) => {
    const ok = window.confirm(
      "Activezi manual acest anunț fără plată? Folosește doar pentru testeri, parteneri sau cazuri verificate."
    );
    if (!ok) return;
    setActionError(null);
    const { error } = await supabase.from("listings").update({ status: "active" }).eq("id", id);
    if (error) {
      setActionError(`Nu am putut activa anunțul: ${error.message}`);
      return;
    }
    setAllListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "active" } : l)));
  };

  const softHideListing = async (id: string) => {
    const ok = window.confirm("Ascunzi acest anunț din zona publică?");
    if (!ok) return;
    setActionError(null);
    const { error } = await supabase.from("listings").update({ status: "admin_removed" }).eq("id", id);
    if (error) {
      setActionError(`Nu am putut ascunde anunțul: ${error.message}`);
      return;
    }
    setAllListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "admin_removed" } : l)));
  };

  const activateDemandManual = async (id: string) => {
    const ok = window.confirm(
      "Activezi manual această cerere fără plată? Folosește doar pentru cazuri verificate. Statusul va deveni activ."
    );
    if (!ok) return;
    setActionError(null);
    const { error } = await supabase.from("demands").update({ status: "active" }).eq("id", id);
    if (error) {
      setActionError(`Nu am putut activa cererea: ${error.message}`);
      return;
    }
    setAllDemands((prev) => prev.map((d) => (d.id === id ? { ...d, status: "active" } : d)));
  };

  const softHideDemand = async (id: string) => {
    const ok = window.confirm("Ascunzi această cerere din zona publică?");
    if (!ok) return;
    setActionError(null);
    const { error } = await supabase.from("demands").update({ status: "suspended" }).eq("id", id);
    if (error) {
      setActionError(`Nu am putut ascunde cererea: ${error.message}`);
      return;
    }
    setAllDemands((prev) => prev.map((d) => (d.id === id ? { ...d, status: "suspended" } : d)));
  };

  if (gate === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F4EC] px-6 font-sans antialiased">
        <div className="w-full max-w-md rounded-[2rem] border-[3px] border-black bg-white p-10 text-center shadow-[12px_12px_0_0_#FFD100]">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-[3px] border-neutral-200 border-t-black" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">Se verifică accesul…</p>
        </div>
      </div>
    );
  }

  if (gate === "anon") {
    return (
      <div className="min-h-screen bg-[#F7F4EC] px-4 py-20 font-sans antialiased md:px-8">
        <div className="mx-auto max-w-lg rounded-[2rem] border-[3px] border-black bg-white p-10 text-center shadow-[12px_12px_0_0_#FFD100]">
          <h1 className="text-xl font-black uppercase italic text-black">Acces restricționat</h1>
          <p className="mt-4 text-sm font-medium text-neutral-600">Autentifică-te pentru a continua.</p>
          <Link
            href="/"
            className="mt-8 inline-block w-full rounded-2xl border-[3px] border-black bg-black py-4 text-xs font-black uppercase tracking-widest text-[#FFD100] transition hover:brightness-110"
          >
            Înapoi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  if (gate === "forbidden") {
    return (
      <div className="min-h-screen bg-[#F7F4EC] px-4 py-20 font-sans antialiased md:px-8">
        <div className="mx-auto max-w-lg rounded-[2rem] border-[3px] border-black bg-white p-10 text-center shadow-[12px_12px_0_0_#FFD100]">
          <h1 className="text-xl font-black uppercase italic text-black">Acces refuzat</h1>
          <p className="mt-4 text-sm font-medium text-neutral-600">Nu ai acces la această zonă.</p>
          <Link
            href="/"
            className="mt-8 inline-block w-full rounded-2xl border-[3px] border-black bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-50"
          >
            Înapoi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EC] px-4 pb-28 pt-20 font-sans text-neutral-900 antialiased selection:bg-[#FFD100]/40 md:px-8">
      <div className="mx-auto max-w-7xl space-y-10 md:space-y-12">
        <div className="rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#FFD100]/90 md:text-[11px]">HQ Admin</p>
            <h1 className="mt-5 text-3xl font-black uppercase italic leading-[1.05] tracking-tight md:text-5xl">
              Centrul de control <span className="text-[#FFD100]">Quick Exit</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm font-medium leading-relaxed text-neutral-300 md:text-base">
              Monitorizează listări, cereri, oferte, verificări și riscuri operaționale.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.08)] md:p-8 md:shadow-[8px_8px_0_0_#FFD100]/70">
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Entitate (intern)</h2>
          <dl className="mt-3 grid gap-2 text-sm font-medium text-neutral-800 sm:grid-cols-2 md:gap-x-8">
            <div>
              <dt className="text-[10px] font-black uppercase text-neutral-500">Denumire</dt>
              <dd>{companyInfo.legalName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase text-neutral-500">Formă</dt>
              <dd>Delaware LLC</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase text-neutral-500">File number</dt>
              <dd>{companyInfo.filing.fileNumber}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase text-neutral-500">Registered Agent</dt>
              <dd>{companyInfo.registeredAgent}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-black uppercase text-neutral-500">Manager</dt>
              <dd>{companyInfo.manager}</dd>
            </div>
          </dl>
        </div>

        {loadNote && (
          <div className="rounded-2xl border-2 border-black/20 bg-white/90 px-4 py-3 text-center text-xs font-medium text-neutral-600">
            {loadNote}
          </div>
        )}
        {actionError && (
          <div className="rounded-2xl border-2 border-red-800/30 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-900">
            {actionError}
            <button type="button" className="ml-2 underline" onClick={() => setActionError(null)}>
              Închide
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2 md:gap-3">
          {TAB_LABELS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-full border-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === t.id
                  ? "border-black bg-black text-[#FFD100]"
                  : "border-black/15 bg-white text-neutral-600 hover:border-black/30"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[12px_12px_0_0_rgba(0,0,0,0.08)] md:p-10 md:shadow-[14px_14px_0_0_#FFD100]">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase italic tracking-tight text-black">Panou general</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Listări active", value: stats.listingsActive },
                  { label: "Listări în așteptarea plății", value: stats.listingsPending },
                  { label: "Cereri active", value: stats.demandsActive },
                  { label: "Cereri în așteptarea plății", value: stats.demandsPending },
                  { label: "Oferte către listări", value: stats.listingOffers },
                  { label: "Oferte către cereri", value: stats.demandOffers },
                  { label: "Profiluri", value: stats.profiles },
                  { label: "Rapoarte evaluare", value: stats.valuationReports },
                  { label: "Intrări Market Index", value: stats.marketIndex },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="rounded-2xl border-[3px] border-black bg-[#F7F4EC]/80 p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.06)]"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{c.label}</p>
                    <p className="mt-2 text-3xl font-black tabular-nums text-black">{c.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "listings" && (
            <div className="overflow-x-auto">
              <h2 className="mb-6 text-xl font-black uppercase italic tracking-tight text-black">Listări</h2>
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b-[3px] border-black">
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Titlu</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Categorie</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Status</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Seed</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Piață</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Exit</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Creat</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">user_id</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {allListings.map((listing) => {
                    const canManualActivate =
                      listing.status === "pending_payment" && listing.is_seed !== true;
                    return (
                      <tr key={listing.id} className="bg-white/80">
                        <td className="p-3 font-bold text-black">{listing.title}</td>
                        <td className="p-3 text-neutral-700">{listing.category}</td>
                        <td className="p-3">
                          <span className="inline-block rounded-full border border-black bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase">
                            {listingStatusLabel(listing.status)}
                          </span>
                          {listing.is_seed === true && (
                            <span className="ml-1 inline-block rounded-full border border-black bg-[#FFD100] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                              Market Index
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-neutral-600">{listing.is_seed === true ? "Da" : "Nu"}</td>
                        <td className="p-3 font-semibold tabular-nums">
                          €{Number(listing.market_price || 0).toLocaleString("ro-RO")}
                        </td>
                        <td className="p-3 font-semibold tabular-nums">
                          €{Number(listing.exit_price || 0).toLocaleString("ro-RO")}
                        </td>
                        <td className="p-3 text-xs text-neutral-600">
                          {listing.created_at ? new Date(listing.created_at).toLocaleString("ro-RO") : "—"}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-neutral-500">{listing.user_id || "—"}</td>
                        <td className="p-3 space-y-1">
                          {canManualActivate && (
                            <button
                              type="button"
                              onClick={() => void activateListingManual(listing.id)}
                              className="block w-full rounded-lg border-[3px] border-black bg-[#FFD100] px-2 py-1.5 text-[9px] font-black uppercase text-black"
                            >
                              Activează manual
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void softHideListing(listing.id)}
                            className="block w-full rounded-lg border-2 border-black/40 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-neutral-800 hover:bg-neutral-50"
                          >
                            Ascunde
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "demands" && (
            <div className="overflow-x-auto">
              <h2 className="mb-6 text-xl font-black uppercase italic tracking-tight text-black">Cereri</h2>
              <p className="mb-4 text-xs font-medium text-neutral-600">
                Cererile fără <code className="rounded bg-neutral-100 px-1">buyer_id</code> sunt date vechi sau orfane.
              </p>
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b-[3px] border-black">
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Activ</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Categorie</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Buget</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Status</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">buyer_id</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Creat</th>
                    <th className="p-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {allDemands.map((d) => {
                    const orphan = !d.buyer_id;
                    const canActivate = d.status === "pending_payment";
                    return (
                      <tr key={d.id} className={orphan ? "bg-amber-50/80" : "bg-white/80"}>
                        <td className="p-3 font-bold text-black">{d.target_asset}</td>
                        <td className="p-3">{d.category}</td>
                        <td className="p-3 font-semibold tabular-nums">€{Number(d.budget || 0).toLocaleString("ro-RO")}</td>
                        <td className="p-3">
                          <span className="inline-block rounded-full border border-black bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase">
                            {demandStatusLabel(d.status)}
                          </span>
                          {orphan && (
                            <span className="ml-1 text-[9px] font-bold uppercase text-amber-800">Risc</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-neutral-600">{d.buyer_id || "—"}</td>
                        <td className="p-3 text-xs text-neutral-600">
                          {d.created_at ? new Date(d.created_at).toLocaleString("ro-RO") : "—"}
                        </td>
                        <td className="p-3 space-y-1">
                          {canActivate && (
                            <button
                              type="button"
                              onClick={() => void activateDemandManual(d.id)}
                              className="block w-full rounded-lg border-[3px] border-black bg-[#FFD100] px-2 py-1.5 text-[9px] font-black uppercase text-black"
                            >
                              Activează manual (fără plată)
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void softHideDemand(d.id)}
                            className="block w-full rounded-lg border-2 border-black/40 bg-white px-2 py-1.5 text-[9px] font-black uppercase"
                          >
                            Ascunde
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "offers" && (
            <div className="space-y-10">
              <div>
                <h2 className="mb-4 text-lg font-black uppercase italic text-black">Oferte către listări</h2>
                <div className="space-y-3">
                  {listingOffers.length === 0 && <p className="text-sm text-neutral-500">Nicio ofertă încărcată sau indisponibilă.</p>}
                  {listingOffers.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-2xl border-[3px] border-black bg-[#F7F4EC]/50 p-4 md:flex md:justify-between md:gap-4"
                    >
                      <div>
                        <p className="text-[10px] font-black uppercase text-neutral-500">Listing</p>
                        <p className="font-mono text-xs">{o.listing_id}</p>
                        <p className="mt-2 font-black">€{Number(o.offer_price || 0).toLocaleString("ro-RO")}</p>
                        <p className="mt-1 text-xs text-neutral-700 line-clamp-2">{o.message}</p>
                        <p className="mt-1 text-[10px] uppercase text-neutral-500">Status: {o.status}</p>
                      </div>
                      <div className="mt-3 rounded-xl border border-black/20 bg-white/80 p-3 text-[10px] md:mt-0 md:min-w-[180px]">
                        <p className="font-black uppercase text-neutral-500">Contact (intern)</p>
                        <p className="mt-1 font-mono text-neutral-700">{o.buyer_phone || "—"}</p>
                        <p className="font-mono text-neutral-600">{o.buyer_email || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="mb-4 text-lg font-black uppercase italic text-black">Oferte către cereri</h2>
                <div className="space-y-3">
                  {demandOffers.length === 0 && <p className="text-sm text-neutral-500">Nicio ofertă sau indisponibilă.</p>}
                  {demandOffers.map((o) => (
                    <div key={o.id} className="rounded-2xl border-[3px] border-black bg-[#F7F4EC]/50 p-4 text-sm">
                      <p className="text-[10px] font-black uppercase text-neutral-500">Cerere</p>
                      <p className="font-mono text-xs">{o.demand_id}</p>
                      <p className="mt-2 font-black">€{Number(o.offer_price || 0).toLocaleString("ro-RO")}</p>
                      <p className="mt-1 text-xs text-neutral-600">Status: {o.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "profiles" && (
            <div className="overflow-x-auto">
              <h2 className="mb-6 text-xl font-black uppercase italic text-black">Profiluri / KYC</h2>
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b-[3px] border-black">
                    <th className="p-3 text-[10px] font-black uppercase text-neutral-500">Nume</th>
                    <th className="p-3 text-[10px] font-black uppercase text-neutral-500">KYC</th>
                    <th className="p-3 text-[10px] font-black uppercase text-neutral-500">Tip</th>
                    <th className="p-3 text-[10px] font-black uppercase text-neutral-500">Creat</th>
                    <th className="p-3 text-[10px] font-black uppercase text-neutral-500">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {profiles.map((p) => (
                    <tr key={p.id} className="bg-white/80">
                      <td className="p-3 font-medium">{p.full_name || "—"}</td>
                      <td className="p-3">
                        <span className="rounded-full border border-black bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase">
                          {kycBadgeLabel(p.kyc_status)}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-700">{p.user_type || "—"}</td>
                      <td className="p-3 text-xs text-neutral-600">
                        {p.created_at ? new Date(p.created_at).toLocaleString("ro-RO") : "—"}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-neutral-500">{p.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "risks" && (
            <div>
              <h2 className="mb-4 text-xl font-black uppercase italic text-black">Riscuri operaționale</h2>
              {riskAlerts.length === 0 ? (
                <p className="text-sm font-medium text-neutral-600">Nu au fost detectate alerte automate în setul curent de date.</p>
              ) : (
                <ul className="space-y-2 rounded-2xl border-[3px] border-black bg-[#F7F4EC]/60 p-6">
                  {riskAlerts.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm font-medium text-neutral-800">
                      <span className="text-[#FFD100]" aria-hidden>
                        •
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-center pb-8">
          <button
            type="button"
            onClick={() => void loadAdminData()}
            className="rounded-2xl border-[3px] border-black bg-white px-6 py-3 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] transition hover:bg-neutral-50"
          >
            Reîncarcă datele
          </button>
        </div>
      </div>
    </div>
  );
}
