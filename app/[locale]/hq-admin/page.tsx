"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { companyInfo } from "@/lib/company";
import { buildSocialShareKit } from "@/lib/socialShare";
import { trackEvent } from "@/lib/analytics";
import { adminDeleteListing, adminForcePublish, type AdminTable } from "@/app/actions/adminActions";
import { formatAdminPriceCell } from "@/lib/listingPrice";

const ADMIN_EMAILS = ["consultantacrypto.ro@gmail.com"];

type TabId = "overview" | "copilot" | "listings" | "demands" | "offers" | "profiles" | "risks";

type OperationalRiskSeverity = "critical" | "high" | "medium" | "low";

type OperationalRiskItem = {
  risk_key: string;
  risk_type: string;
  entity_table: string | null;
  entity_id: string | null;
  severity: OperationalRiskSeverity;
  title: string;
  description: string;
  detected_at: string | null;
  href: string | null;
};

type RiskResolutionRow = {
  id?: string;
  risk_key: string;
  risk_type: string;
  entity_table: string | null;
  entity_id: string | null;
  severity: string;
  title: string;
  note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string | null;
};

type CopilotMode = "daily" | "risk" | "priorities" | "growth" | "selftest";

type CopilotRiskItem = {
  title: string;
  why: string;
  severity: OperationalRiskSeverity;
};

type CopilotOpportunityItem = {
  title: string;
  why: string;
  impact: "mare" | "mediu" | "mic";
};

type CopilotActionItem = {
  title: string;
  why: string;
  impact: "mare" | "mediu" | "mic";
  effort: "mic" | "mediu" | "mare";
  urgency: "azi" | "curand" | "backlog";
};

type CopilotStructuredResult = {
  executiveSummary?: string;
  criticalRisks?: CopilotRiskItem[];
  opportunities?: CopilotOpportunityItem[];
  recommendedActions?: CopilotActionItem[];
  founderNote?: string;
  rawText?: string;
  parseWarning?: boolean;
};

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

function severityRo(s: OperationalRiskSeverity): string {
  if (s === "critical") return "Critic";
  if (s === "high") return "Mare";
  if (s === "medium") return "Mediu";
  return "Mic";
}

function severityBadgeClass(s: OperationalRiskSeverity): string {
  if (s === "critical") return "border-red-800 bg-red-50 text-red-900";
  if (s === "high") return "border-orange-700 bg-orange-50 text-orange-950";
  if (s === "medium") return "border-black bg-[#FFD100]/90 text-black";
  return "border-neutral-400 bg-neutral-100 text-neutral-700";
}

function generateOperationalRisks(
  allListings: any[],
  allDemands: any[],
  profiles: any[],
  valuationReports: any[]
): OperationalRiskItem[] {
  const risks: OperationalRiskItem[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  allListings.forEach((l) => {
    if (l.status === "active" && l.is_seed === true) {
      risks.push({
        risk_key: `active_seed_listing_${l.id}`,
        risk_type: "listing_seed_active_public",
        entity_table: "listings",
        entity_id: l.id,
        severity: "critical",
        title: "Seed activ vizibil public",
        description: `Listing Market Index („seed”) apare ca activ public: „${String(l.title || "").slice(0, 120)}”.`,
        detected_at: l.created_at ?? null,
        href: `/anunt/${l.id}`,
      });
    }
    if (l.status === "pending_payment" && l.created_at) {
      if (now - new Date(l.created_at).getTime() > dayMs) {
        risks.push({
          risk_key: `old_pending_listing_${l.id}`,
          risk_type: "listing_pending_stale",
          entity_table: "listings",
          entity_id: l.id,
          severity: "medium",
          title: "Anunț în așteptarea plății de peste 24h",
          description: `Încă în „pending_payment” de peste 24 ore: „${String(l.title || "").slice(0, 120)}”.`,
          detected_at: l.created_at,
          href: `/anunt/${l.id}`,
        });
      }
    }
    if (!l.user_id && l.is_seed !== true) {
      risks.push({
        risk_key: `listing_missing_user_${l.id}`,
        risk_type: "listing_missing_owner",
        entity_table: "listings",
        entity_id: l.id,
        severity: "high",
        title: "Anunț real fără user_id",
        description: `Listare non-seed fără user_id: „${String(l.title || "").slice(0, 120)}”.`,
        detected_at: l.created_at ?? null,
        href: l.status === "active" ? `/anunt/${l.id}` : null,
      });
    }
    const imgs = l.images;
    const noImg = !Array.isArray(imgs) || imgs.length === 0;
    if (l.status === "active" && noImg && l.is_seed !== true) {
      risks.push({
        risk_key: `active_listing_no_images_${l.id}`,
        risk_type: "listing_active_without_images",
        entity_table: "listings",
        entity_id: l.id,
        severity: "low",
        title: "Anunț activ fără poze",
        description: `Listare activă fără imagini atașate: „${String(l.title || "").slice(0, 120)}”.`,
        detected_at: l.created_at ?? null,
        href: `/anunt/${l.id}`,
      });
    }
  });

  allDemands.forEach((d) => {
    if (d.status === "pending_payment" && d.created_at) {
      if (now - new Date(d.created_at).getTime() > dayMs) {
        risks.push({
          risk_key: `old_pending_demand_${d.id}`,
          risk_type: "demand_pending_stale",
          entity_table: "demands",
          entity_id: d.id,
          severity: "medium",
          title: "Cerere în așteptarea plății de peste 24h",
          description: `Cerere „pending_payment”: ${String(d.target_asset || d.id).slice(0, 120)}.`,
          detected_at: d.created_at,
          href: null,
        });
      }
    }
    if (d.status === "active" && !d.buyer_id) {
      risks.push({
        risk_key: `active_demand_missing_buyer_${d.id}`,
        risk_type: "demand_active_orphan_buyer",
        entity_table: "demands",
        entity_id: d.id,
        severity: "high",
        title: "Cerere activă fără buyer_id",
        description: `Cerere activă fără cumpărător asociat: ${String(d.target_asset || d.id).slice(0, 120)}.`,
        detected_at: d.created_at ?? null,
        href: null,
      });
    }
  });

  profiles.forEach((p) => {
    if (p.kyc_status === "requires_input") {
      risks.push({
        risk_key: `profile_kyc_requires_input_${p.id}`,
        risk_type: "profile_kyc_blocked",
        entity_table: "profiles",
        entity_id: p.id,
        severity: "medium",
        title: "Profil cu KYC de reluat",
        description: `${p.full_name || "Profil"} — KYC necesită reluare sau date suplimentare.`,
        detected_at: p.created_at ?? null,
        href: null,
      });
    }
  });

  valuationReports.forEach((r) => {
    const c = Number(r.confidence_score);
    if (Number.isFinite(c) && c < 50) {
      risks.push({
        risk_key: `low_confidence_report_${r.id}`,
        risk_type: "valuation_low_confidence",
        entity_table: "valuation_reports",
        entity_id: r.id,
        severity: "low",
        title: "Raport de evaluare cu încredere scăzută",
        description: `Raport evaluare scor încredere ${c}% (sub prag 50%).`,
        detected_at: r.created_at ?? null,
        href: null,
      });
    }
  });

  const sevRank: Record<OperationalRiskSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  risks.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
  return risks;
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
  { id: "copilot", label: "HQ Copilot" },
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
  const [riskResolutionHistory, setRiskResolutionHistory] = useState<RiskResolutionRow[]>([]);
  const [riskTableAvailable, setRiskTableAvailable] = useState(false);
  const [resolvingRiskKey, setResolvingRiskKey] = useState<string | null>(null);

  const [loadNote, setLoadNote] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [copilotWarnings, setCopilotWarnings] = useState<string[]>([]);
  const [copilotMode, setCopilotMode] = useState<CopilotMode | null>(null);
  const [copilotResult, setCopilotResult] = useState<CopilotStructuredResult | null>(null);
  const [copilotGeneratedAt, setCopilotGeneratedAt] = useState<string | null>(null);
  const [copilotUsedModel, setCopilotUsedModel] = useState<string | null>(null);
  const [copilotSessionReady, setCopilotSessionReady] = useState(false);
  const [copilotAnalyticsAvailable, setCopilotAnalyticsAvailable] = useState<boolean | null>(null);
  const [copilotGaLookbackDays, setCopilotGaLookbackDays] = useState<number | null>(null);
  const [copilotGaWarnings, setCopilotGaWarnings] = useState<string[]>([]);
  const [listingsPendingOnly, setListingsPendingOnly] = useState(false);

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

    const resRisks = await supabase
      .from("admin_risk_resolutions")
      .select("*")
      .order("resolved_at", { ascending: false })
      .limit(50);

    if (resRisks.error) {
      setRiskTableAvailable(false);
      setRiskResolutionHistory([]);
    } else {
      setRiskTableAvailable(true);
      setRiskResolutionHistory((resRisks.data ?? []) as RiskResolutionRow[]);
    }

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

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setCopilotSessionReady(Boolean(session?.access_token));
      }
    }
    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const resolvedRiskKeys = useMemo(
    () => new Set(riskResolutionHistory.map((r) => r.risk_key).filter(Boolean)),
    [riskResolutionHistory]
  );

  const detectedRisks = useMemo(
    () => generateOperationalRisks(allListings, allDemands, profiles, valuationReports),
    [allListings, allDemands, profiles, valuationReports]
  );

  const activeOperationalRisks = useMemo(
    () => detectedRisks.filter((r) => !resolvedRiskKeys.has(r.risk_key)),
    [detectedRisks, resolvedRiskKeys]
  );

  const pendingPaymentListings = useMemo(
    () => allListings.filter((l) => l.status === "pending_payment" && l.is_seed !== true),
    [allListings]
  );

  const visibleListings = useMemo(
    () => (listingsPendingOnly ? pendingPaymentListings : allListings),
    [allListings, listingsPendingOnly, pendingPaymentListings]
  );

  const resolveOperationalRisk = async (risk: OperationalRiskItem) => {
    if (!riskTableAvailable) {
      setActionError("Activează istoricul riscurilor prin SQL înainte de bifare.");
      return;
    }
    const ok = window.confirm("Marchezi acest risc ca rezolvat? El va fi mutat în istoric.");
    if (!ok) return;
    const noteInput = window.prompt("Notă internă opțională", "") ?? "";

    setResolvingRiskKey(risk.risk_key);
    setActionError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setResolvingRiskKey(null);
      setActionError("Nu ești autentificat; nu poți marca rezolvări.");
      return;
    }

    const { error } = await supabase.from("admin_risk_resolutions").insert({
      risk_key: risk.risk_key,
      risk_type: risk.risk_type,
      entity_table: risk.entity_table,
      entity_id: risk.entity_id,
      severity: risk.severity,
      title: risk.title,
      note: noteInput.trim() || null,
      resolved_by: user.id,
    });

    setResolvingRiskKey(null);

    if (error) {
      setActionError(`Nu am putut înregistra rezolvarea: ${error.message}`);
      return;
    }

    await loadAdminData();
  };

  const runCopilot = async (mode: CopilotMode) => {
    trackEvent("hq_copilot_run", { mode });
    setCopilotError(null);
    setCopilotWarnings([]);
    setCopilotLoading(true);
    setCopilotMode(mode);
    setCopilotResult(null);
    setCopilotUsedModel(null);
    setCopilotAnalyticsAvailable(null);
    setCopilotGaLookbackDays(null);
    setCopilotGaWarnings([]);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      setCopilotLoading(false);
      setCopilotError("Sesiunea ta a expirat. Reautentifică-te și încearcă din nou.");
      return;
    }

    try {
      const res = await fetch("/api/hq/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ mode }),
      });

      const payload = (await res.json()) as {
        success?: boolean;
        error?: string;
        details?: {
          message?: string;
          status?: number;
          statusText?: string;
          geminiStatus?: string | null;
          geminiMessage?: string;
          model?: string;
          table?: string;
        };
        snapshotSummary?: {
          warnings?: string[];
          analyticsAvailable?: boolean;
          gaLookbackDays?: number | null;
          gaWarnings?: string[];
        };
        warnings?: string[];
        generatedAt?: string;
        usedModel?: string;
        result?: CopilotStructuredResult;
        selftest?: Record<string, unknown>;
      };

      if (!res.ok || !payload.success) {
        setCopilotLoading(false);
        const warnings = payload.snapshotSummary?.warnings || payload.warnings || [];
        setCopilotWarnings(warnings);
        setCopilotAnalyticsAvailable(
          typeof payload.snapshotSummary?.analyticsAvailable === "boolean"
            ? payload.snapshotSummary.analyticsAvailable
            : null
        );
        setCopilotGaLookbackDays(payload.snapshotSummary?.gaLookbackDays ?? null);
        setCopilotGaWarnings(payload.snapshotSummary?.gaWarnings || []);
        const detailParts = [
          payload.details?.status ? `HTTP ${payload.details.status}` : null,
          payload.details?.statusText || null,
          payload.details?.geminiStatus || null,
          payload.details?.geminiMessage || payload.details?.message || null,
          payload.details?.table ? `table: ${payload.details.table}` : null,
          payload.details?.model ? `model: ${payload.details.model}` : null,
        ].filter(Boolean);
        setCopilotError(
          [payload.error || "HQ Copilot nu a putut genera analiza.", detailParts.join(" | ")]
            .filter(Boolean)
            .join(" ")
        );
        return;
      }

      setCopilotGeneratedAt(payload.generatedAt || null);
      setCopilotUsedModel(payload.usedModel || null);
      setCopilotWarnings(payload.snapshotSummary?.warnings || []);
      setCopilotAnalyticsAvailable(
        typeof payload.snapshotSummary?.analyticsAvailable === "boolean"
          ? payload.snapshotSummary.analyticsAvailable
          : null
      );
      setCopilotGaLookbackDays(payload.snapshotSummary?.gaLookbackDays ?? null);
      setCopilotGaWarnings(payload.snapshotSummary?.gaWarnings || []);
      if (mode === "selftest") {
        setCopilotResult({
          executiveSummary: "Rezultat test conexiune Gemini",
          rawText: JSON.stringify(payload.selftest || {}, null, 2),
        });
      } else {
        setCopilotResult(payload.result || {});
      }
      setCopilotLoading(false);
      setCopilotSessionReady(Boolean(accessToken));
    } catch (err) {
      setCopilotLoading(false);
      setCopilotError(err instanceof Error ? err.message : "Eroare necunoscută la rularea HQ Copilot.");
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const callForceActivateApi = async (
    body: Record<string, string>
  ): Promise<{ ok: true; message: string } | { ok: false; error: string }> => {
    const token = await getAccessToken();
    if (!token) {
      return { ok: false, error: "Sesiunea a expirat. Reautentifică-te." };
    }

    const res = await fetch("/api/admin/force-activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: payload?.error || `Force activate eșuat (HTTP ${res.status}).`,
      };
    }

    if (payload?.wasAlreadyActive) {
      return { ok: true, message: "Listarea era deja activă (idempotent)." };
    }

    const expiryNote = payload?.expiresAt
      ? ` Expiră: ${new Date(payload.expiresAt).toLocaleString("ro-RO")}.`
      : "";
    return {
      ok: true,
      message: `Listare activată (pachet: ${payload?.packageId ?? "—"}).${expiryNote}`,
    };
  };

  const forceSyncListingFromStripe = async (listing: { id: string; title?: string | null }) => {
    const sessionId = window.prompt(
      `Force Sync Stripe pentru „${String(listing.title || listing.id).slice(0, 80)}”.\n\nLipește session_id (cs_...) din Stripe Dashboard → Payments → Checkout session:`
    );
    if (!sessionId?.trim()) return;

    setActionError(null);
    const result = await callForceActivateApi({
      listingId: listing.id,
      mode: "stripe_sync",
      stripeSessionId: sessionId.trim(),
    });
    if (!result.ok) {
      setActionError(`Force Sync eșuat: ${result.error}`);
      return;
    }
    setLoadNote(result.message);
    await loadAdminData();
  };

  const activateListingManual = async (listing: {
    id: string;
    title?: string | null;
    sale_strategy?: string | null;
  }) => {
    const reason = window.prompt(
      `Activare manuală (fără verificare Stripe) pentru „${String(listing.title || listing.id).slice(0, 80)}”.\n\nMotiv obligatoriu (min. 8 caractere) — ex: plată confirmată offline, partener beta:`
    );
    if (!reason || reason.trim().length < 8) {
      if (reason !== null) setActionError("Motivul trebuie să aibă cel puțin 8 caractere.");
      return;
    }

    setActionError(null);
    const pkg = String(listing.sale_strategy ?? "").trim();

    const result = await callForceActivateApi({
      listingId: listing.id,
      mode: "manual",
      reason: reason.trim(),
      ...(pkg ? { packageId: pkg } : {}),
    });
    if (!result.ok) {
      setActionError(`Activare manuală eșuată: ${result.error}`);
      return;
    }
    setLoadNote(result.message);
    await loadAdminData();
  };

  const forceSyncDemandFromStripe = async (demand: { id: string; target_asset?: string | null }) => {
    const sessionId = window.prompt(
      `Force Sync Stripe pentru cererea „${String(demand.target_asset || demand.id).slice(0, 80)}”.\n\nLipește session_id (cs_...) din Stripe Dashboard:`
    );
    if (!sessionId?.trim()) return;

    setActionError(null);
    const result = await callForceActivateApi({
      demandId: demand.id,
      mode: "stripe_sync",
      stripeSessionId: sessionId.trim(),
    });
    if (!result.ok) {
      setActionError(`Force Sync cerere eșuat: ${result.error}`);
      return;
    }
    setLoadNote(result.message);
    await loadAdminData();
  };

  const activateDemandManual = async (demand: { id: string; target_asset?: string | null }) => {
    const reason = window.prompt(
      `Activare manuală cerere capital pentru „${String(demand.target_asset || demand.id).slice(0, 80)}”.\n\nMotiv obligatoriu (min. 8 caractere):`
    );
    if (!reason || reason.trim().length < 8) {
      if (reason !== null) setActionError("Motivul trebuie să aibă cel puțin 8 caractere.");
      return;
    }

    setActionError(null);
    const result = await callForceActivateApi({
      demandId: demand.id,
      mode: "manual",
      reason: reason.trim(),
      packageId: "demand",
    });
    if (!result.ok) {
      setActionError(`Activare cerere eșuată: ${result.error}`);
      return;
    }
    setLoadNote(result.message);
    await loadAdminData();
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

  const copyListingUtm = async (listing: any) => {
    const kit = buildSocialShareKit({
      id: String(listing.id),
      title: listing.title,
      category: listing.category,
      market_price: listing.market_price,
      exit_price: listing.exit_price,
      discount: listing.discount,
      discount_percentage: listing.discount_percentage,
      deal_score: listing.deal_score,
      location: listing.location,
      images: listing.images,
      sale_strategy: listing.sale_strategy,
      created_at: listing.created_at,
      details: listing.details,
    });
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(kit.utm.hq);
        setLoadNote("Link UTM copiat.");
      } else {
        setActionError(`Link UTM: ${kit.utm.hq}`);
      }
    } catch {
      setActionError(`Link UTM: ${kit.utm.hq}`);
    }
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

  const forcePublishRow = async (id: string, table: AdminTable) => {
    const ok = window.confirm(
      "FORCE PUBLISH: setezi status=activ, plătit=true și expirare la +30 zile, fără plată. Folosește doar pentru cazuri verificate. Continui?"
    );
    if (!ok) return;
    setActionError(null);

    const token = await getAccessToken();
    if (!token) {
      setActionError("Sesiunea a expirat. Reautentifică-te și încearcă din nou.");
      return;
    }

    const res = await adminForcePublish(id, table, token);
    if (!res.ok) {
      setActionError(`Force Publish eșuat: ${res.error}`);
      return;
    }

    setLoadNote("Rând publicat forțat (active, +30 zile).");
    await loadAdminData();
  };

  const deleteRow = async (id: string, table: AdminTable) => {
    const ok = window.confirm(
      "ȘTERGERE DEFINITIVĂ: rândul va fi eliminat permanent din baza de date. Acțiunea este IREVERSIBILĂ. Ești sigur?"
    );
    if (!ok) return;
    setActionError(null);

    const token = await getAccessToken();
    if (!token) {
      setActionError("Sesiunea a expirat. Reautentifică-te și încearcă din nou.");
      return;
    }

    const res = await adminDeleteListing(id, table, token);
    if (!res.ok) {
      setActionError(`Ștergere eșuată: ${res.error}`);
      return;
    }

    // Scoatem rândul din UI imediat pentru feedback instant.
    if (table === "listings") {
      setAllListings((prev) => prev.filter((l) => l.id !== id));
    } else {
      setAllDemands((prev) => prev.filter((d) => d.id !== id));
    }
    setLoadNote("Rând șters definitiv.");
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
        {copilotError && (
          <div className="rounded-2xl border-2 border-red-800/30 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-900">
            <p>{copilotError}</p>
            {copilotWarnings.length > 0 && (
              <p className="mt-2 text-xs font-medium text-red-800">
                {copilotWarnings.join(" | ")}
              </p>
            )}
            <button type="button" className="ml-2 underline" onClick={() => setCopilotError(null)}>
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
          <Link
            href="/hq-admin/lead-agent"
            className="rounded-full border-2 border-black/20 bg-[#FDFCF8] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-700 transition-colors hover:border-black hover:bg-[#FFD100] hover:text-black"
          >
            Lead Agent
            <span className="ml-2 text-[9px] font-semibold normal-case tracking-normal text-neutral-600">
              Inbox lead-uri, scoring și outreach manual.
            </span>
          </Link>
          <Link
            href="/hq-admin/bmk-lab"
            className="rounded-full border-2 border-black/20 bg-[#FDFCF8] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-700 transition-colors hover:border-black hover:bg-[#FFD100] hover:text-black"
          >
            BMK Lab
            <span className="ml-2 text-[9px] font-semibold normal-case tracking-normal text-neutral-600">
              Wallet, balanță BMK și tier experimental.
            </span>
          </Link>
          <Link
            href="/hq-admin/operator-brief"
            className="rounded-full border-2 border-black/20 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-700 transition-colors hover:border-black hover:bg-neutral-50"
          >
            Operator Brief
            <span className="ml-2 text-[9px] font-semibold normal-case tracking-normal text-neutral-600">
              Priorități, riscuri și taskuri propuse. Read-only.
            </span>
          </Link>
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

          {activeTab === "copilot" && (
            <div className="space-y-6">
              <div className="rounded-2xl border-[3px] border-black bg-black px-6 py-5 text-white">
                <h2 className="text-lg font-black uppercase italic tracking-tight">HQ Copilot</h2>
                <p className="mt-2 text-sm font-medium text-neutral-200">
                  Asistent strategic read-only pentru snapshot operațional. Nu scrie în bază.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => void runCopilot("daily")}
                  disabled={copilotLoading || !copilotSessionReady}
                  title={!copilotSessionReady ? "HQ Copilot necesită sesiune admin activă." : undefined}
                  className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#FFD100] disabled:opacity-50"
                >
                  Analizează ziua
                </button>
                <button
                  type="button"
                  onClick={() => void runCopilot("risk")}
                  disabled={copilotLoading || !copilotSessionReady}
                  title={!copilotSessionReady ? "HQ Copilot necesită sesiune admin activă." : undefined}
                  className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#FFD100] disabled:opacity-50"
                >
                  Detectează riscuri
                </button>
                <button
                  type="button"
                  onClick={() => void runCopilot("priorities")}
                  disabled={copilotLoading || !copilotSessionReady}
                  title={!copilotSessionReady ? "HQ Copilot necesită sesiune admin activă." : undefined}
                  className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#FFD100] disabled:opacity-50"
                >
                  Recomandă priorități
                </button>
                <button
                  type="button"
                  onClick={() => void runCopilot("growth")}
                  disabled={copilotLoading || !copilotSessionReady}
                  title={!copilotSessionReady ? "HQ Copilot necesită sesiune admin activă." : undefined}
                  className="rounded-2xl border-[3px] border-black bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-black shadow-[3px_3px_0_0_#FFD100] disabled:opacity-50"
                >
                  Găsește oportunități
                </button>
              </div>
              {!copilotSessionReady && (
                <p className="text-xs font-medium text-neutral-600">
                  HQ Copilot necesită sesiune admin activă.
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void runCopilot("selftest")}
                  disabled={copilotLoading || !copilotSessionReady}
                  className="rounded-full border border-black/40 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-700 hover:border-black disabled:opacity-50"
                >
                  Test Gemini + GA
                </button>
              </div>

              {copilotLoading && (
                <div className="rounded-2xl border-2 border-black bg-[#F7F4EC] px-5 py-4 text-sm font-semibold text-neutral-800">
                  HQ Copilot analizează platforma...
                </div>
              )}

              {copilotResult && !copilotLoading && (
                <div className="space-y-4">
                  {copilotGeneratedAt && (
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
                      Generat la {new Date(copilotGeneratedAt).toLocaleString("ro-RO")}
                      {copilotMode ? ` · mod: ${copilotMode}` : ""}
                    </p>
                  )}
                  {copilotUsedModel && (
                    <p className="text-[11px] font-medium text-neutral-600">
                      Model folosit: <span className="font-semibold">{copilotUsedModel}</span>
                    </p>
                  )}
                  {copilotAnalyticsAvailable !== null && (
                    <p className="text-[11px] font-medium text-neutral-600">
                      {copilotAnalyticsAvailable
                        ? `Context GA inclus${copilotGaLookbackDays ? ` (${copilotGaLookbackDays} zile)` : ""}`
                        : "Context GA indisponibil - analiza doar pe date interne"}
                    </p>
                  )}
                  {copilotGaWarnings.length > 0 && (
                    <p className="text-[11px] font-medium text-amber-800">
                      Avertismente GA: {copilotGaWarnings.join(" | ")}
                    </p>
                  )}
                  {copilotResult.executiveSummary && (
                    <div className="rounded-2xl border-[3px] border-black bg-white p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Rezumat</p>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-800">
                        {copilotResult.executiveSummary}
                      </p>
                    </div>
                  )}

                  {!!copilotResult.criticalRisks?.length && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Riscuri critice
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {copilotResult.criticalRisks.map((risk, idx) => (
                          <div key={`${risk.title}-${idx}`} className="rounded-xl border-2 border-black bg-[#FFF8F8] p-4">
                            <p className="text-sm font-bold text-black">{risk.title}</p>
                            <p className="mt-1 text-xs font-medium text-neutral-700">{risk.why}</p>
                            <p className="mt-2 text-[10px] font-black uppercase text-red-900">{severityRo(risk.severity)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!copilotResult.opportunities?.length && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Oportunități</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {copilotResult.opportunities.map((op, idx) => (
                          <div key={`${op.title}-${idx}`} className="rounded-xl border-2 border-black bg-[#F7F4EC]/60 p-4">
                            <p className="text-sm font-bold text-black">{op.title}</p>
                            <p className="mt-1 text-xs font-medium text-neutral-700">{op.why}</p>
                            <p className="mt-2 text-[10px] font-black uppercase text-neutral-600">Impact: {op.impact}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!!copilotResult.recommendedActions?.length && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Acțiuni recomandate
                      </p>
                      <ul className="space-y-2">
                        {copilotResult.recommendedActions.map((action, idx) => (
                          <li key={`${action.title}-${idx}`} className="rounded-xl border-2 border-black bg-white p-4">
                            <p className="text-sm font-bold text-black">{action.title}</p>
                            <p className="mt-1 text-xs font-medium text-neutral-700">{action.why}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase">
                              <span className="rounded-full border border-black bg-[#FFD100]/80 px-2 py-0.5">
                                Impact: {action.impact}
                              </span>
                              <span className="rounded-full border border-black bg-neutral-100 px-2 py-0.5">
                                Efort: {action.effort}
                              </span>
                              <span className="rounded-full border border-black bg-neutral-100 px-2 py-0.5">
                                Urgență: {action.urgency === "curand" ? "curând" : action.urgency}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {copilotResult.founderNote && (
                    <div className="rounded-2xl border-2 border-black/70 bg-[#F7F4EC] p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Notă pentru fondator
                      </p>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-800">
                        {copilotResult.founderNote}
                      </p>
                    </div>
                  )}

                  {copilotResult.rawText && (
                    <div className="rounded-2xl border-2 border-black bg-white p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        Răspuns HQ Copilot
                      </p>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs font-medium text-neutral-800">
                        {copilotResult.rawText}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "listings" && (
            <div className="overflow-x-auto">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-black uppercase italic tracking-tight text-black">Listări</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border-2 border-black bg-[#FFD100] px-3 py-1 text-[10px] font-black uppercase text-black">
                    {stats.listingsPending} așteaptă plata
                  </span>
                  <button
                    type="button"
                    onClick={() => setListingsPendingOnly((v) => !v)}
                    className={`rounded-lg border-2 border-black px-3 py-1.5 text-[10px] font-black uppercase ${
                      listingsPendingOnly ? "bg-black text-white" : "bg-white text-black hover:bg-neutral-50"
                    }`}
                  >
                    {listingsPendingOnly ? "Toate listările" : "Doar pending_payment"}
                  </button>
                </div>
              </div>
              {listingsPendingOnly && pendingPaymentListings.length === 0 && (
                <p className="mb-4 text-sm font-medium text-neutral-600">Nicio listare în așteptarea plății.</p>
              )}
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
                  {visibleListings.map((listing) => {
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
                          {formatAdminPriceCell(listing.market_price)}
                        </td>
                        <td className="p-3 font-semibold tabular-nums">
                          {formatAdminPriceCell(listing.exit_price)}
                        </td>
                        <td className="p-3 text-xs text-neutral-600">
                          {listing.created_at ? new Date(listing.created_at).toLocaleString("ro-RO") : "—"}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-neutral-500">{listing.user_id || "—"}</td>
                        <td className="p-3 space-y-1">
                          {listing.status === "active" && listing.is_seed !== true && (
                            <button
                              type="button"
                              onClick={() => void copyListingUtm(listing)}
                              className="block w-full rounded-lg border-2 border-black bg-white px-2 py-1.5 text-[9px] font-black uppercase text-neutral-900 hover:bg-[#FFD100]/50"
                            >
                              Copiază link UTM
                            </button>
                          )}
                          {canManualActivate && (
                            <>
                              <button
                                type="button"
                                onClick={() => void forceSyncListingFromStripe(listing)}
                                className="block w-full rounded-lg border-[3px] border-black bg-blue-600 px-2 py-1.5 text-[9px] font-black uppercase text-white hover:bg-blue-700"
                              >
                                Force Sync Stripe
                              </button>
                              <button
                                type="button"
                                onClick={() => void activateListingManual(listing)}
                                className="block w-full rounded-lg border-[3px] border-black bg-[#FFD100] px-2 py-1.5 text-[9px] font-black uppercase text-black"
                              >
                                Activare manuală
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => void softHideListing(listing.id)}
                            className="block w-full rounded-lg border-2 border-black/40 bg-white px-2 py-1.5 text-[9px] font-black uppercase text-neutral-800 hover:bg-neutral-50"
                          >
                            Ascunde
                          </button>
                          <button
                            type="button"
                            onClick={() => void forcePublishRow(listing.id, "listings")}
                            className="block w-full rounded-lg border-[3px] border-black bg-green-600 px-2 py-1.5 text-[9px] font-black uppercase text-white hover:bg-green-700"
                          >
                            Force Publish
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteRow(listing.id, "listings")}
                            className="block w-full rounded-lg border-2 border-red-800 bg-red-600 px-2 py-1.5 text-[9px] font-black uppercase text-white hover:bg-red-700"
                          >
                            Șterge definitiv
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
                            <>
                              <button
                                type="button"
                                onClick={() => void forceSyncDemandFromStripe(d)}
                                className="block w-full rounded-lg border-[3px] border-black bg-blue-600 px-2 py-1.5 text-[9px] font-black uppercase text-white hover:bg-blue-700"
                              >
                                Force Sync Stripe
                              </button>
                              <button
                                type="button"
                                onClick={() => void activateDemandManual(d)}
                                className="block w-full rounded-lg border-[3px] border-black bg-[#FFD100] px-2 py-1.5 text-[9px] font-black uppercase text-black"
                              >
                                Activare manuală
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => void softHideDemand(d.id)}
                            className="block w-full rounded-lg border-2 border-black/40 bg-white px-2 py-1.5 text-[9px] font-black uppercase"
                          >
                            Ascunde
                          </button>
                          <button
                            type="button"
                            onClick={() => void forcePublishRow(d.id, "demands")}
                            className="block w-full rounded-lg border-[3px] border-black bg-green-600 px-2 py-1.5 text-[9px] font-black uppercase text-white hover:bg-green-700"
                          >
                            Force Publish
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteRow(d.id, "demands")}
                            className="block w-full rounded-lg border-2 border-red-800 bg-red-600 px-2 py-1.5 text-[9px] font-black uppercase text-white hover:bg-red-700"
                          >
                            Șterge definitiv
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
            <div className="space-y-6">
              <h2 className="text-xl font-black uppercase italic text-black">Riscuri operaționale</h2>
              {!riskTableAvailable && (
                <p className="text-xs font-medium leading-relaxed text-neutral-600">
                  Istoricul riscurilor nu este încă activ. Rulează SQL-ul de creare tabel pentru a putea marca
                  riscuri ca rezolvate.
                </p>
              )}
              <div className="flex flex-wrap gap-4 text-[11px] font-black uppercase tracking-widest text-neutral-800">
                <span className="rounded-full border-[2px] border-black bg-[#F7F4EC]/80 px-4 py-1.5">
                  Riscuri active: {activeOperationalRisks.length}
                </span>
                <span className="rounded-full border-[2px] border-black bg-white px-4 py-1.5">
                  Rezolvate recent: {riskResolutionHistory.length}
                </span>
              </div>
              {activeOperationalRisks.length === 0 ? (
                <div className="rounded-2xl border-[3px] border-black bg-white px-8 py-6 shadow-[4px_4px_0_0_#000]/10">
                  <p className="text-sm font-medium text-neutral-800">
                    Nu există riscuri active detectate în acest moment.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {activeOperationalRisks.map((risk) => (
                    <li
                      key={risk.risk_key}
                      className="rounded-2xl border-[3px] border-black bg-[#FAFAF7] p-6 shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <span
                            className={`inline-flex border-[2px] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${severityBadgeClass(
                              risk.severity
                            )}`}
                          >
                            {severityRo(risk.severity)}
                          </span>
                          <h3 className="text-lg font-black uppercase italic text-black">{risk.title}</h3>
                          <p className="text-sm font-medium text-neutral-800">{risk.description}</p>
                          <p className="text-[11px] font-medium text-neutral-500">
                            {risk.risk_type} · {risk.entity_table || "—"}
                            {risk.entity_id ? <> · {String(risk.entity_id).slice(0, 8)}…</> : null}
                          </p>
                          {risk.href && (
                            <Link
                              href={risk.href}
                              className="inline-block text-xs font-black uppercase tracking-widest text-black underline decoration-2 underline-offset-4"
                            >
                              Deschide resursă
                            </Link>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void resolveOperationalRisk(risk)}
                          disabled={!riskTableAvailable || resolvingRiskKey === risk.risk_key}
                          title={
                            riskTableAvailable
                              ? undefined
                              : "Activează istoricul riscurilor prin SQL înainte de bifare."
                          }
                          className="shrink-0 rounded-2xl border-[2px] border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-neutral-900 shadow-[2px_2px_0_0_#000]/20 transition hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40"
                        >
                          {resolvingRiskKey === risk.risk_key ? "Se salvează…" : "Marchează rezolvat"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <details className="group rounded-2xl border-[3px] border-black bg-white p-4 shadow-[3px_3px_0_0_#FFD100]/50">
                <summary className="cursor-pointer list-none text-[11px] font-black uppercase tracking-[0.2em] text-black marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="underline decoration-2 underline-offset-4 group-open:no-underline">
                    Istoric riscuri rezolvate
                  </span>
                </summary>
                {riskResolutionHistory.length === 0 ? (
                  <p className="mt-4 text-xs font-medium text-neutral-600">
                    Momentan nu există riscuri rezolvate salvate pentru afișare.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {riskResolutionHistory.map((row) => (
                      <li
                        key={row.id ?? row.risk_key}
                        className="rounded-xl border-2 border-neutral-200 bg-[#F7F4EC]/40 px-4 py-3 text-[11px] text-neutral-800"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-bold text-black">{row.title}</p>
                            <p className="text-[10px] font-medium text-neutral-600">
                              {severityRo((row.severity as OperationalRiskSeverity) || "medium")} ·{" "}
                              {row.entity_table || "—"}
                            </p>
                            {row.note ? (
                              <p className="text-[11px] italic text-neutral-700">Notă: {row.note}</p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right text-[10px] font-medium text-neutral-500">
                            <p>{row.resolved_at ? new Date(row.resolved_at).toLocaleString("ro-RO") : "—"}</p>
                            {row.resolved_by ? (
                              <p className="mt-1 max-w-[10rem] break-all font-mono text-[9px] text-neutral-400">
                                {row.resolved_by}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
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
