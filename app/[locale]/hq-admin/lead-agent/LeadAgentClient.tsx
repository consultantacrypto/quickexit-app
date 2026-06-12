"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  LEAD_CATEGORIES,
  LEAD_STATUSES,
  LEAD_TYPES,
  type LeadEventRow,
  type LeadMessageRow,
  type LeadRow,
  type LeadType,
} from "@/lib/leadAgent";
import {
  MESSAGE_FEEDBACK_LABELS,
  MESSAGE_FEEDBACK_VALUES,
  type MessageFeedback,
} from "@/lib/leadAgentPlaybook";

type AiChannel = "whatsapp" | "linkedin" | "email" | "phone";
type AiTone = "natural" | "premium" | "direct";

const ADMIN_EMAILS = ["consultantacrypto.ro@gmail.com"];

type GateState = "loading" | "anon" | "forbidden" | "ready";

type FilterState = {
  status: string;
  lead_type: string;
  category: string;
  campaign_key: string;
  language: string;
  exclude_archived: boolean;
};

const EMPTY_FILTERS: FilterState = {
  status: "",
  lead_type: "",
  category: "",
  campaign_key: "",
  language: "",
  exclude_archived: true,
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nou",
  reviewed: "Revizuit",
  contacted: "Contactat",
  responded: "Răspuns",
  qualified: "Calificat",
  call_scheduled: "Apel programat",
  converted: "Convertit",
  lost: "Pierdut",
  archived: "Arhivat",
};

const TYPE_LABELS: Record<LeadType, string> = {
  seller: "Vânzător",
  buyer: "Cumpărător",
  connector: "Connector",
};

const LANGUAGE_OPTIONS = [
  { value: "ro" as const, label: "RO" },
  { value: "en" as const, label: "EN" },
];

const PREFERRED_CHANNEL_OPTIONS = [
  { value: "", label: "—" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefon" },
  { value: "linkedin", label: "LinkedIn" },
];

const labelClass =
  "mb-1.5 block text-[10px] font-black uppercase tracking-widest text-neutral-700";

const inputClass =
  "w-full rounded-xl border-[3px] border-black bg-white px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-black caret-black placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#FFD100] focus:ring-offset-1 [color-scheme:light]";

const textareaClass =
  "w-full min-h-[88px] resize-y rounded-xl border-[3px] border-black bg-white px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-black caret-black placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#FFD100] focus:ring-offset-1 [color-scheme:light]";

const dateInputClass =
  "w-full rounded-xl border-[3px] border-black bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-black caret-black focus:outline-none focus:ring-2 focus:ring-[#FFD100] focus:ring-offset-1 [color-scheme:light]";

const chipClass =
  "rounded-lg border-[3px] border-black bg-[#F7F4EC] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-black transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD100] focus-visible:ring-offset-1";

const activeChipClass =
  "rounded-lg border-[3px] border-black bg-black px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#FFD100] shadow-[2px_2px_0_0_rgba(0,0,0,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD100] focus-visible:ring-offset-1";

type ChipSelectorProps = {
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  compact?: boolean;
};

function ChipSelector({
  label,
  value,
  options,
  onChange,
  ariaLabel,
  compact = false,
}: ChipSelectorProps) {
  return (
    <div>
      {label && <p className={labelClass}>{label}</p>}
      <div
        className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}
        role="group"
        aria-label={ariaLabel ?? label}
      >
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value || "__empty"}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
              className={selected ? activeChipClass : chipClass}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

async function getAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function leadsApi<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  options?: { params?: URLSearchParams; body?: Record<string, unknown> },
): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Sesiune expirată. Reautentifică-te.");

  const qs = options?.params?.toString();
  const url = `/api/hq/leads${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const data = (await res.json()) as T & { success?: boolean; error?: string };
  if (!res.ok || data.success === false) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : `Cerere eșuată (${res.status}).`,
    );
  }
  return data;
}

async function leadsAiApi<T>(body: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Sesiune expirată. Reautentifică-te.");

  const res = await fetch("/api/hq/leads/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T & { success?: boolean; error?: string };
  if (!res.ok || data.success === false) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : `Cerere AI eșuată (${res.status}).`,
    );
  }
  return data;
}

async function leadsMessagesApi<T>(body: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Sesiune expirată. Reautentifică-te.");

  const res = await fetch("/api/hq/leads/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T & { success?: boolean; error?: string };
  if (!res.ok || data.success === false) {
    throw new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : `Cerere mesaje eșuată (${res.status}).`,
    );
  }
  return data;
}

function syncDraftFromMessages(msgs: LeadMessageRow[]): {
  text: string;
  messageId: string | null;
} {
  const preferred = msgs.find((m) => m.direction === "outbound" && !m.generated_by_ai);
  const latestAi = msgs.find((m) => m.direction === "outbound" && m.generated_by_ai);
  const source = preferred ?? latestAi;
  if (!source) return { text: "", messageId: null };
  return { text: source.body, messageId: source.id };
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ro-RO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function copyText(value: string | null | undefined, label: string): void {
  if (!value?.trim()) return;
  void navigator.clipboard.writeText(value.trim());
  alert(`${label} copiat în clipboard.`);
}

const LEAD_TYPE_CHIP_OPTIONS = LEAD_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }));

const LEAD_CATEGORY_CHIP_OPTIONS = [
  { value: "", label: "—" },
  ...LEAD_CATEGORIES.map((c) => ({ value: c, label: c })),
];

const FILTER_ALL_OPTION = { value: "", label: "Toate" };

const STATUS_CHIP_OPTIONS = LEAD_STATUSES.map((s) => ({
  value: s,
  label: STATUS_LABELS[s] ?? s,
}));

const AI_CHANNEL_OPTIONS: { value: AiChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefon" },
];

const AI_TONE_OPTIONS: { value: AiTone; label: string }[] = [
  { value: "natural", label: "Natural" },
  { value: "premium", label: "Premium" },
  { value: "direct", label: "Direct" },
];

export default function LeadAgentClient() {
  const [gate, setGate] = useState<GateState>("loading");
  const [operatorEmail, setOperatorEmail] = useState("");

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LeadRow | null>(null);
  const [events, setEvents] = useState<LeadEventRow[]>([]);
  const [messages, setMessages] = useState<LeadMessageRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiChannel, setAiChannel] = useState<AiChannel>("whatsapp");
  const [aiTone, setAiTone] = useState<AiTone>("natural");
  const [draftText, setDraftText] = useState("");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [messageActionBusy, setMessageActionBusy] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [createForm, setCreateForm] = useState({
    lead_type: "seller" as LeadType,
    full_name: "",
    company: "",
    phone: "",
    email: "",
    linkedin_url: "",
    category: "",
    asset_summary: "",
    asset_location: "",
    est_value_eur: "",
    campaign_key: "",
    language: "ro",
    preferred_channel: "",
    source: "manual",
    source_url: "",
    data_source_note: "",
    notes: "",
    next_action: "",
    next_action_at: "",
  });

  const [importText, setImportText] = useState(
    "# lead_type, full_name, phone, email, category, asset_summary, source\nseller\tIon Popescu\t+40722111222\tion@example.com\tauto\tMercedes E300 2022\timport",
  );

  const [editForm, setEditForm] = useState({
    status: "new",
    notes: "",
    next_action: "",
    next_action_at: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function initGate() {
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
      setOperatorEmail(user.email ?? "");
      setGate("ready");
    }
    void initGate();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadLeads = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.lead_type) params.set("lead_type", filters.lead_type);
      if (filters.category) params.set("category", filters.category);
      if (filters.campaign_key) params.set("campaign_key", filters.campaign_key);
      if (filters.language) params.set("language", filters.language);
      if (filters.exclude_archived) params.set("exclude_archived", "true");

      const data = await leadsApi<{ leads: LeadRow[] }>("GET", { params });
      setLeads(data.leads ?? []);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Eroare la încărcarea lead-urilor.");
    } finally {
      setListLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (gate !== "ready") return;
    void loadLeads();
  }, [gate, loadLeads]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setActionError(null);
    try {
      const params = new URLSearchParams({ id });
      const data = await leadsApi<{
        lead: LeadRow;
        events: LeadEventRow[];
        messages: LeadMessageRow[];
      }>("GET", { params });
      setDetail(data.lead);
      setEvents(data.events ?? []);
      const loadedMessages = data.messages ?? [];
      setMessages(loadedMessages);
      const synced = syncDraftFromMessages(loadedMessages);
      setDraftText(synced.text);
      setActiveMessageId(synced.messageId);
      setEditForm({
        status: data.lead.status,
        notes: data.lead.notes ?? "",
        next_action: data.lead.next_action ?? "",
        next_action_at: data.lead.next_action_at
          ? new Date(data.lead.next_action_at).toISOString().slice(0, 16)
          : "",
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Eroare la încărcarea detaliilor.");
      setDetail(null);
      setEvents([]);
      setMessages([]);
      setDraftText("");
      setActiveMessageId(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setEvents([]);
      setMessages([]);
      setDraftText("");
      setActiveMessageId(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId) ?? detail,
    [leads, selectedId, detail],
  );

  const preferredMessage = useMemo(
    () => messages.find((m) => m.direction === "outbound" && !m.generated_by_ai) ?? null,
    [messages],
  );

  const activeMessage = useMemo(
    () => messages.find((m) => m.id === activeMessageId) ?? null,
    [messages, activeMessageId],
  );

  const isShowingFinalMessage =
    Boolean(preferredMessage) && activeMessageId === preferredMessage?.id;

  const handleAiScore = async () => {
    if (!selectedId) return;
    setAiBusy(true);
    setActionError(null);
    try {
      const data = await leadsAiApi<{
        lead: LeadRow;
        score: {
          score: number;
          reason: string;
          recommended_channel: string;
          suggested_next_action: string;
          risk_notes: string;
        };
      }>({ leadId: selectedId, mode: "score" });
      setDetail(data.lead);
      setLeads((prev) => prev.map((l) => (l.id === data.lead.id ? data.lead : l)));
      setEditForm((f) => ({
        ...f,
        next_action: f.next_action?.trim() ? f.next_action : (data.lead.next_action ?? ""),
      }));
      await loadDetail(selectedId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Scor AI eșuat.");
    } finally {
      setAiBusy(false);
    }
  };

  const handleAiMessage = async () => {
    if (!selectedId) return;
    setAiBusy(true);
    setActionError(null);
    try {
      const data = await leadsAiApi<{ message: LeadMessageRow }>({
        leadId: selectedId,
        mode: "message",
        channel: aiChannel,
        tone: aiTone,
      });
      await loadDetail(selectedId);
      setDraftText(data.message.body);
      setActiveMessageId(data.message.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Generare mesaj AI eșuată.");
    } finally {
      setAiBusy(false);
    }
  };

  const handleSaveFinalMessage = async () => {
    if (!selectedId || !draftText.trim()) return;
    setMessageActionBusy(true);
    setActionError(null);
    try {
      await leadsMessagesApi<{ message: LeadMessageRow }>({
        action: "save_final",
        leadId: selectedId,
        channel: aiChannel,
        body: draftText.trim(),
        source_message_id: activeMessageId,
      });
      await loadDetail(selectedId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Salvare mesaj final eșuată.");
    } finally {
      setMessageActionBusy(false);
    }
  };

  const handleMessageFeedback = async (feedback: MessageFeedback) => {
    if (!selectedId || !activeMessageId) return;
    setMessageActionBusy(true);
    setActionError(null);
    try {
      await leadsMessagesApi({
        action: "feedback",
        leadId: selectedId,
        message_id: activeMessageId,
        feedback,
      });
      await loadDetail(selectedId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Feedback mesaj eșuat.");
    } finally {
      setMessageActionBusy(false);
    }
  };

  const handleCopyMessage = async () => {
    if (!selectedId || !draftText.trim() || !activeMessageId) return;
    try {
      await navigator.clipboard.writeText(draftText.trim());
      await leadsApi("PATCH", {
        body: {
          id: selectedId,
          log_event: "message_copied",
          message_id: activeMessageId,
        },
      });
      await loadDetail(selectedId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Copiere mesaj eșuată.");
    }
  };

  const handleCreate = async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      const body: Record<string, unknown> = {
        lead_type: createForm.lead_type,
        full_name: createForm.full_name || null,
        company: createForm.company || null,
        phone: createForm.phone || null,
        email: createForm.email || null,
        linkedin_url: createForm.linkedin_url || null,
        category: createForm.category || null,
        asset_summary: createForm.asset_summary || null,
        asset_location: createForm.asset_location || null,
        est_value_eur: createForm.est_value_eur ? Number(createForm.est_value_eur) : null,
        campaign_key: createForm.campaign_key || null,
        language: createForm.language,
        preferred_channel: createForm.preferred_channel || null,
        source: createForm.source || "manual",
        source_url: createForm.source_url || null,
        data_source_note: createForm.data_source_note || null,
        notes: createForm.notes || null,
        next_action: createForm.next_action || null,
        next_action_at: createForm.next_action_at || null,
        owner_email: operatorEmail,
      };

      const data = await leadsApi<{ lead: LeadRow }>("POST", { body });
      setShowCreate(false);
      await loadLeads();
      setSelectedId(data.lead.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Creare eșuată.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleImport = async () => {
    setActionBusy(true);
    setActionError(null);
    try {
      await leadsApi("POST", {
        body: {
          import_text: importText,
          campaign_key: createForm.campaign_key || null,
        },
      });
      setShowImport(false);
      await loadLeads();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Import eșuat.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveDetail = async () => {
    if (!selectedId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await leadsApi("PATCH", {
        body: {
          id: selectedId,
          status: editForm.status,
          notes: editForm.notes,
          next_action: editForm.next_action || null,
          next_action_at: editForm.next_action_at || null,
        },
      });
      await Promise.all([loadLeads(), loadDetail(selectedId)]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Salvare eșuată.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedId) return;
    if (!confirm("Arhivezi acest lead?")) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await leadsApi("DELETE", { body: { id: selectedId, action: "archive" } });
      setSelectedId(null);
      await loadLeads();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Arhivare eșuată.");
    } finally {
      setActionBusy(false);
    }
  };

  if (gate === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24">
        <p className="text-sm font-semibold text-neutral-600">Se verifică accesul Lead Agent...</p>
      </div>
    );
  }

  if (gate === "anon") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <h1 className="text-2xl font-black uppercase italic">Lead Agent</h1>
        <p className="mt-3 text-sm text-neutral-700">Pagină privată HQ. Autentifică-te pentru acces.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block border-2 border-black px-4 py-2 text-xs font-black uppercase"
        >
          Mergi la dashboard
        </Link>
      </div>
    );
  }

  if (gate === "forbidden") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <h1 className="text-2xl font-black uppercase italic">Acces refuzat</h1>
        <p className="mt-3 text-sm text-neutral-700">Contul tău nu are drepturi HQ Admin.</p>
        <Link href="/hq-admin" className="mt-6 inline-block text-xs font-bold uppercase underline">
          Înapoi la HQ Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EC] pb-20">
      <div className="mx-auto max-w-7xl px-4 pt-10 md:px-6">
        <div className="mb-8 rounded-[2rem] border-[3px] border-black bg-black p-8 text-white shadow-[10px_10px_0_0_#FFD100] md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#FFD100]/90">
                HQ Admin · Lead Intelligence
              </p>
              <h1 className="mt-2 text-3xl font-black uppercase italic tracking-tight md:text-4xl">
                Lead Agent
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium text-neutral-300">
                Gestionare manuală a lead-urilor (vânzători, cumpărători, conectori). Fără trimitere
                automată — outreach uman aprobat.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/hq-admin"
                className="rounded-full border-2 border-white/30 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:border-[#FFD100] hover:text-[#FFD100]"
              >
                ← HQ Admin
              </Link>
              <button
                type="button"
                onClick={() => {
                  setShowCreate((v) => !v);
                  setShowImport(false);
                }}
                className="rounded-full border-2 border-[#FFD100] bg-[#FFD100] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-black"
              >
                + Lead nou
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImport((v) => !v);
                  setShowCreate(false);
                }}
                className="rounded-full border-2 border-white/30 bg-transparent px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:border-white"
              >
                Import paste
              </button>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="mb-4 rounded-xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
            {actionError}
          </div>
        )}

        {showCreate && (
          <div className="mb-6 rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.08)] md:p-8">
            <h2 className="text-lg font-black uppercase italic text-black">Lead nou</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="md:col-span-2 lg:col-span-3">
                <ChipSelector
                  label="Tip"
                  value={createForm.lead_type}
                  options={LEAD_TYPE_CHIP_OPTIONS}
                  onChange={(v) =>
                    setCreateForm((f) => ({ ...f, lead_type: v as LeadType }))
                  }
                  ariaLabel="Tip lead"
                />
              </div>
              <div>
                <label className={labelClass}>Nume</label>
                <input
                  className={inputClass}
                  value={createForm.full_name ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Telefon</label>
                <input
                  className={inputClass}
                  value={createForm.phone ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  className={inputClass}
                  value={createForm.email ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>LinkedIn URL</label>
                <input
                  className={inputClass}
                  value={createForm.linkedin_url ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <ChipSelector
                  label="Categorie"
                  value={createForm.category}
                  options={LEAD_CATEGORY_CHIP_OPTIONS}
                  onChange={(v) => setCreateForm((f) => ({ ...f, category: v }))}
                  ariaLabel="Categorie activ"
                />
              </div>
              <div>
                <ChipSelector
                  label="Limbă"
                  value={createForm.language}
                  options={LANGUAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  onChange={(v) => setCreateForm((f) => ({ ...f, language: v || "ro" }))}
                  ariaLabel="Limbă lead"
                />
              </div>
              <div className="md:col-span-2">
                <ChipSelector
                  label="Canal preferat"
                  value={createForm.preferred_channel}
                  options={PREFERRED_CHANNEL_OPTIONS}
                  onChange={(v) => setCreateForm((f) => ({ ...f, preferred_channel: v }))}
                  ariaLabel="Canal preferat contact"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Rezumat activ</label>
                <input
                  className={inputClass}
                  value={createForm.asset_summary ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, asset_summary: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Valoare est. EUR</label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={createForm.est_value_eur ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, est_value_eur: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Campanie</label>
                <input
                  className={inputClass}
                  value={createForm.campaign_key ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, campaign_key: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Sursă</label>
                <input
                  className={inputClass}
                  value={createForm.source ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, source: e.target.value }))}
                />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Notițe</label>
                <textarea
                  className={textareaClass}
                  value={createForm.notes ?? ""}
                  onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleCreate()}
                className="rounded-xl border-[3px] border-black bg-[#FFD100] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-50"
              >
                Salvează lead
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border-2 border-black/20 px-6 py-3 text-[10px] font-bold uppercase text-neutral-600"
              >
                Anulează
              </button>
            </div>
          </div>
        )}

        {showImport && (
          <div className="mb-6 rounded-[2rem] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.08)] md:p-8">
            <h2 className="text-lg font-black uppercase italic text-black">Import paste</h2>
            <p className="mt-2 text-xs font-medium text-neutral-600">
              Un lead per linie: lead_type, nume, telefon, email, categorie, rezumat activ, sursă (tab
              sau virgulă). Liniile cu # sunt ignorate.
            </p>
            <textarea
              className={`${textareaClass} mt-4 min-h-[140px] font-mono`}
              value={importText ?? ""}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void handleImport()}
                className="rounded-xl border-[3px] border-black bg-black px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[#FFD100] disabled:opacity-50"
              >
                Importă
              </button>
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="rounded-xl border-2 border-black/20 px-6 py-3 text-[10px] font-bold uppercase text-neutral-600"
              >
                Anulează
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-[2rem] border-[3px] border-black bg-white p-5 shadow-[12px_12px_0_0_rgba(0,0,0,0.08)] md:p-8">
            <div className="mb-6 flex flex-wrap items-end gap-3">
              <h2 className="text-xl font-black uppercase italic text-black">Inbox</h2>
              <button
                type="button"
                onClick={() => void loadLeads()}
                className="ml-auto text-[10px] font-bold uppercase tracking-wider text-neutral-500 underline"
              >
                Reîncarcă
              </button>
            </div>

            <div className="mb-5 rounded-xl border-[3px] border-black bg-[#F7F4EC] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-black">
                  Filtre
                </span>
                <label className="flex cursor-pointer items-center gap-2 text-[10px] font-bold uppercase text-neutral-700">
                  <input
                    type="checkbox"
                    checked={filters.exclude_archived}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, exclude_archived: e.target.checked }))
                    }
                    className="h-4 w-4 accent-black"
                  />
                  Ascunde arhivate
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChipSelector
                  label="Status"
                  value={filters.status}
                  options={[FILTER_ALL_OPTION, ...STATUS_CHIP_OPTIONS]}
                  onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                  ariaLabel="Filtru status inbox"
                  compact
                />
                <ChipSelector
                  label="Tip"
                  value={filters.lead_type}
                  options={[FILTER_ALL_OPTION, ...LEAD_TYPE_CHIP_OPTIONS]}
                  onChange={(v) => setFilters((f) => ({ ...f, lead_type: v }))}
                  ariaLabel="Filtru tip lead"
                  compact
                />
                <ChipSelector
                  label="Categorie"
                  value={filters.category}
                  options={[
                    FILTER_ALL_OPTION,
                    ...LEAD_CATEGORIES.map((c) => ({ value: c, label: c })),
                  ]}
                  onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
                  ariaLabel="Filtru categorie"
                  compact
                />
                <ChipSelector
                  label="Limbă"
                  value={filters.language}
                  options={[
                    FILTER_ALL_OPTION,
                    ...LANGUAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                  ]}
                  onChange={(v) => setFilters((f) => ({ ...f, language: v }))}
                  ariaLabel="Filtru limbă"
                  compact
                />
                <div className="sm:col-span-2">
                  <label className={labelClass}>Campanie</label>
                  <input
                    className={inputClass}
                    value={filters.campaign_key ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, campaign_key: e.target.value }))}
                    placeholder="Opțional"
                  />
                </div>
              </div>
            </div>

            {listError && (
              <p className="mb-4 text-sm font-semibold text-red-700">{listError}</p>
            )}

            {listLoading ? (
              <p className="text-sm text-neutral-500">Se încarcă...</p>
            ) : leads.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-black/30 py-16 text-center">
                <p className="text-sm font-bold text-neutral-500">Niciun lead. Adaugă sau importă.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border-[3px] border-black">
                <table className="w-full min-w-[640px] border-collapse bg-white text-left text-sm">
                  <thead>
                    <tr className="border-b-[3px] border-black bg-[#F7F4EC] text-[10px] font-black uppercase tracking-widest text-black">
                      <th className="px-3 py-2.5 text-left">Nume</th>
                      <th className="px-3 py-2.5 text-left">Tip</th>
                      <th className="px-3 py-2.5 text-left">Status</th>
                      <th className="px-3 py-2.5 text-left">Categorie</th>
                      <th className="px-3 py-2.5 text-left">Următor</th>
                      <th className="px-3 py-2.5 text-left">Actualizat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedId(lead.id)}
                        className={`cursor-pointer border-b border-black/10 transition hover:bg-[#FFD100]/15 ${
                          selectedId === lead.id ? "bg-[#FFD100]/30" : "bg-white"
                        }`}
                      >
                        <td className="px-3 py-2.5 font-semibold text-black">
                          {lead.full_name || lead.email || lead.phone || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-black">
                          {TYPE_LABELS[lead.lead_type]}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-black">
                          {STATUS_LABELS[lead.status] ?? lead.status}
                        </td>
                        <td className="px-3 py-2.5 text-black">{lead.category ?? "—"}</td>
                        <td className="px-3 py-2.5 text-neutral-700">
                          {lead.next_action_at ? formatDate(lead.next_action_at) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-neutral-700">
                          {formatDate(lead.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border-[3px] border-black bg-black p-5 text-white shadow-[10px_10px_0_0_#FFD100] md:p-6 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            {!selectedId ? (
              <p className="text-sm font-medium text-neutral-400">
                Selectează un lead din tabel pentru detalii, notițe și activitate.
              </p>
            ) : detailLoading && !detail ? (
              <p className="text-sm text-neutral-400">Se încarcă detaliile...</p>
            ) : selectedLead ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD100]/80">
                      Detaliu lead
                    </p>
                    <h3 className="mt-1 text-lg font-black uppercase italic">
                      {selectedLead.full_name || "Fără nume"}
                    </h3>
                    <p className="mt-1 text-[10px] uppercase text-neutral-500">
                      {TYPE_LABELS[selectedLead.lead_type]} · {selectedLead.category ?? "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="rounded-lg border border-white/20 p-1 text-neutral-400 hover:text-white"
                    aria-label="Închide"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 rounded-xl border border-white/15 bg-white/5 p-3">
                  {[
                    { label: "Telefon", value: selectedLead.phone },
                    { label: "Email", value: selectedLead.email },
                    { label: "LinkedIn", value: selectedLead.linkedin_url },
                    { label: "Sursă URL", value: selectedLead.source_url },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase text-neutral-500">
                        {row.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="max-w-[160px] truncate text-xs text-neutral-200">
                          {row.value || "—"}
                        </span>
                        {row.value && (
                          <button
                            type="button"
                            onClick={() => copyText(row.value, row.label)}
                            className="rounded border border-white/20 p-1 hover:bg-white/10"
                            aria-label={`Copiază ${row.label}`}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedLead.asset_summary && (
                  <p className="text-xs leading-relaxed text-neutral-300">{selectedLead.asset_summary}</p>
                )}

                <div className="space-y-4 rounded-xl border-[3px] border-[#FFD100] bg-[#F7F4EC] p-4 text-black">
                  <ChipSelector
                    label="Status"
                    value={editForm.status ?? ""}
                    options={STATUS_CHIP_OPTIONS}
                    onChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
                    ariaLabel="Status lead"
                    compact
                  />

                  <div>
                    <label className={labelClass}>Notițe</label>
                    <textarea
                      className={textareaClass}
                      value={editForm.notes ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Notițe interne despre lead..."
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Următoarea acțiune</label>
                    <input
                      className={inputClass}
                      value={editForm.next_action ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, next_action: e.target.value }))}
                      placeholder="Ex: Sună mâine dimineață"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Data follow-up</label>
                    <input
                      type="datetime-local"
                      className={dateInputClass}
                      style={{ colorScheme: "light" }}
                      value={editForm.next_action_at ?? ""}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, next_action_at: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleSaveDetail()}
                    className="rounded-xl border-[3px] border-black bg-[#FFD100] px-4 py-2 text-[10px] font-black uppercase text-black disabled:opacity-50"
                  >
                    Salvează
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleArchive()}
                    className="rounded-xl border-2 border-white/30 px-4 py-2 text-[10px] font-bold uppercase text-neutral-400 hover:border-red-400 hover:text-red-300"
                  >
                    Arhivează
                  </button>
                </div>

                <div className="space-y-4 rounded-xl border-[3px] border-[#FFD100] bg-[#F7F4EC] p-4 text-black">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black">
                    AI Assistant
                  </p>
                  <p className="text-[11px] leading-relaxed text-neutral-700">
                    Draft-uri și scoruri pentru outreach manual. Nimic nu se trimite automat.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={aiBusy || actionBusy}
                      onClick={() => void handleAiScore()}
                      className="rounded-xl border-[3px] border-black bg-black px-4 py-2 text-[10px] font-black uppercase text-[#FFD100] disabled:opacity-50"
                    >
                      {aiBusy ? "Se procesează..." : "Generează scor AI"}
                    </button>
                  </div>

                  {selectedLead.ai_score != null && (
                    <div className="rounded-lg border-2 border-black bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                        Scor AI
                      </p>
                      <p className="mt-1 text-2xl font-black text-black">{selectedLead.ai_score}/100</p>
                      {selectedLead.ai_score_reason && (
                        <p className="mt-2 text-xs leading-relaxed text-neutral-800">
                          {selectedLead.ai_score_reason}
                        </p>
                      )}
                    </div>
                  )}

                  <ChipSelector
                    label="Canal mesaj"
                    value={aiChannel}
                    options={AI_CHANNEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    onChange={(v) => setAiChannel(v as AiChannel)}
                    ariaLabel="Canal mesaj AI"
                    compact
                  />
                  <ChipSelector
                    label="Ton mesaj"
                    value={aiTone}
                    options={AI_TONE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    onChange={(v) => setAiTone(v as AiTone)}
                    ariaLabel="Ton mesaj AI"
                    compact
                  />

                  <button
                    type="button"
                    disabled={aiBusy || actionBusy}
                    onClick={() => void handleAiMessage()}
                    className="rounded-xl border-[3px] border-black bg-[#FFD100] px-4 py-2 text-[10px] font-black uppercase text-black disabled:opacity-50"
                  >
                    {aiBusy ? "Se generează..." : "Generează mesaj AI"}
                  </button>

                  {(draftText || activeMessage) && (
                    <div className="rounded-lg border-2 border-black bg-white p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-600">
                          {isShowingFinalMessage ? "Mesaj final" : "Draft mesaj"} · {aiChannel}
                        </p>
                        {activeMessage?.generated_by_ai && activeMessage.model && (
                          <span className="text-[9px] uppercase text-neutral-500">
                            AI · {activeMessage.model}
                          </span>
                        )}
                        {activeMessage && !activeMessage.generated_by_ai && (
                          <span className="text-[9px] font-bold uppercase text-neutral-600">
                            Salvat de operator
                          </span>
                        )}
                      </div>
                      <textarea
                        className={`${textareaClass} min-h-[120px] text-xs`}
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        placeholder="Generează sau editează mesajul aici..."
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={messageActionBusy || aiBusy || !draftText.trim()}
                          onClick={() => void handleSaveFinalMessage()}
                          className="rounded-lg border-2 border-black bg-black px-3 py-1.5 text-[10px] font-black uppercase text-[#FFD100] disabled:opacity-50"
                        >
                          Salvează mesaj final
                        </button>
                        <button
                          type="button"
                          disabled={!draftText.trim() || !activeMessageId}
                          onClick={() => void handleCopyMessage()}
                          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-[#F7F4EC] px-3 py-1.5 text-[10px] font-black uppercase text-black hover:bg-white disabled:opacity-50"
                        >
                          <Copy className="h-3 w-3" />
                          Copiază mesaj
                        </button>
                      </div>

                      {activeMessageId && (
                        <div className="mt-4 border-t border-black/10 pt-3">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-600">
                            Feedback mesaj
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {MESSAGE_FEEDBACK_VALUES.map((fb) => (
                              <button
                                key={fb}
                                type="button"
                                disabled={messageActionBusy}
                                onClick={() => void handleMessageFeedback(fb)}
                                className={chipClass}
                              >
                                {MESSAGE_FEEDBACK_LABELS[fb]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#FFD100]/80">
                    Activitate recentă
                  </p>
                  {events.length === 0 ? (
                    <p className="text-xs text-neutral-500">Nicio eveniment încă.</p>
                  ) : (
                    <ul className="max-h-48 space-y-2 overflow-y-auto text-[11px] text-neutral-400">
                      {events.map((ev) => (
                        <li key={ev.id} className="border-l-2 border-[#FFD100]/40 pl-2">
                          <span className="font-bold uppercase text-neutral-300">{ev.event_type}</span>
                          <span className="ml-2 text-neutral-500">{formatDate(ev.created_at)}</span>
                          {ev.actor_email && (
                            <span className="block text-[10px] text-neutral-600">{ev.actor_email}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-300">Lead indisponibil.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
