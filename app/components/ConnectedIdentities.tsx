"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import {
  buildConnectedIdentityRows,
  type ConnectedIdentityRow,
} from "@/lib/authIdentity/providers";
import type { LinkedIdentityView } from "@/lib/authIdentity/recovery";

function statusLabel(
  t: ReturnType<typeof useTranslations<"Dashboard.connectedIdentities">>,
  status: ConnectedIdentityRow["status"],
): string {
  if (status === "primary_recovery") return t("statusPrimaryRecovery");
  if (status === "connected") return t("statusConnected");
  return t("statusNotConnected");
}

/**
 * Phase 1A: display Email + Google identity state only.
 * No Apple/wallet connect buttons (no dead CTAs).
 */
export default function ConnectedIdentities() {
  const t = useTranslations("Dashboard.connectedIdentities");
  const [rows, setRows] = useState<ConnectedIdentityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUserIdentities();
      const identities: LinkedIdentityView[] = (data?.identities ?? []).map((i) => ({
        provider: i.provider,
        identityId: i.identity_id,
        email:
          typeof (i as { identity_data?: { email?: string } }).identity_data?.email ===
          "string"
            ? (i as { identity_data?: { email?: string } }).identity_data?.email
            : null,
      }));

      const sessionHasEmail =
        typeof user.email === "string" && user.email.trim().length > 0;
      if (!cancelled) {
        setRows(buildConnectedIdentityRows(identities, sessionHasEmail));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <div className="bg-[#FDFCF8] border-[3px] border-black rounded-2xl p-4 md:p-5 shadow-[5px_5px_0_0_rgba(0,0,0,0.12)] mb-6">
      <p className="text-xs font-black uppercase tracking-widest text-neutral-600 mb-1">
        {t("title")}
      </p>
      <p className="text-sm text-neutral-700 mb-4">{t("subtitle")}</p>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.provider}
            className="flex items-center justify-between gap-3 rounded-xl border-2 border-black bg-white px-4 py-3"
          >
            <span className="text-sm font-black uppercase tracking-wide">
              {row.labelKey === "email" ? t("email") : t("google")}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${
                row.status === "not_connected" ? "text-neutral-400" : "text-black"
              }`}
            >
              {statusLabel(t, row.status)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] font-semibold leading-relaxed text-neutral-500">
        {t("linkHint")}
      </p>
    </div>
  );
}
