"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HeardFromFields from "@/app/components/HeardFromFields";
import { hasAnalyticsConsent, trackEvent } from "@/lib/analytics";
import {
  isOptionalAttributionColumnError,
  parseHeardFrom,
  readAttributionSnapshot,
  rememberSelfReport,
} from "@/lib/attribution";
import { supabase } from "@/lib/supabase";

export default function AttributionSync() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const handledUserId = useRef<string | null>(null);

  const sync = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      handledUserId.current = null;
      setOpen(false);
      return;
    }
    if (handledUserId.current === user.id) return;

    const stored = readAttributionSnapshot();
    const { data, error: readError } = await supabase
      .from("profiles")
      .select("id, created_at, attribution_first, attribution_last, heard_from")
      .eq("id", user.id)
      .maybeSingle();

    if (readError && isOptionalAttributionColumnError(readError)) {
      handledUserId.current = user.id;
      setOpen(false);
      return;
    }
    if (readError || !data) return;

    const patch: Record<string, unknown> = {};
    if (!data.attribution_first && stored.first) {
      patch.attribution_first = stored.first;
      patch.attribution_last = stored.last ?? stored.first;
    } else if (!data.attribution_last && stored.last) {
      patch.attribution_last = stored.last;
    }
    if (!data.heard_from && stored.heard_from) {
      patch.heard_from = stored.heard_from;
      patch.heard_from_detail = stored.heard_from_detail ?? null;
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("profiles").update(patch).eq("id", user.id);
    }

    const heard = data.heard_from || stored.heard_from || "";
    setOpen(!heard);
    handledUserId.current = user.id;

    const createdAt = data.created_at ? new Date(data.created_at).getTime() : 0;
    const recent = createdAt > 0 && Date.now() - createdAt < 30 * 60 * 1000;
    if (recent && hasAnalyticsConsent() && typeof window !== "undefined") {
      const key = `qe_signup_tracked:${user.id}`;
      if (!window.sessionStorage.getItem(key)) {
        const method = String(
          user.app_metadata?.provider || user.identities?.[0]?.provider || "account",
        );
        trackEvent("sign_up", {
          method,
          heard_from: heard || undefined,
        });
        window.sessionStorage.setItem(key, "1");
      }
    }
  }, []);

  useEffect(() => {
    const frame = window.setTimeout(() => {
      void sync();
    }, 0);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        handledUserId.current = null;
        setOpen(false);
        return;
      }
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        handledUserId.current = null;
        void sync();
      }
    });
    return () => {
      window.clearTimeout(frame);
      data.subscription.unsubscribe();
    };
  }, [sync]);

  const save = async () => {
    const parsed = parseHeardFrom(value, detail);
    if (!parsed) {
      setError(
        value === "other"
          ? "Scrie pe scurt de unde ai aflat."
          : "Alege de unde ai aflat de QuickExit.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    rememberSelfReport(parsed.heard_from, parsed.heard_from_detail);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Sesiunea a expirat. Intră din nou în cont.");
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        heard_from: parsed.heard_from,
        heard_from_detail: parsed.heard_from_detail,
      })
      .eq("id", user.id);
    setSaving(false);
    if (updateError) {
      setError("Nu am putut salva răspunsul. Încearcă din nou.");
      return;
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="heard-from-title"
        className="relative w-full max-w-md rounded-[2rem] border-[4px] border-black bg-white p-8 shadow-[16px_16px_0_0_#FFD100]"
      >
        <h2 id="heard-from-title" className="mb-2 text-2xl font-black uppercase italic tracking-tight">
          De unde ai aflat de QuickExit?
        </h2>
        <p className="mb-5 text-xs font-semibold leading-relaxed text-neutral-600">
          Răspunsul ne ajută să înțelegem ce canale aduc vânzători și cumpărători. Este obligatoriu o singură dată.
        </p>
        <HeardFromFields
          idPrefix="account-heard-from"
          value={value}
          detail={detail}
          onValueChange={setValue}
          onDetailChange={setDetail}
          error={error}
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="mt-6 w-full rounded-2xl border-[3px] border-black bg-black px-4 py-4 text-sm font-black uppercase tracking-widest text-[#FFD100] disabled:opacity-60"
        >
          {saving ? "Se salvează..." : "Salvează răspunsul"}
        </button>
      </div>
    </div>
  );
}
