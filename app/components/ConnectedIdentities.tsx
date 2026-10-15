"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import {
  buildConnectedIdentityRows,
  type ConnectedIdentityRow,
} from "@/lib/authIdentity/providers";
import type { LinkedIdentityView } from "@/lib/authIdentity/recovery";
import { abbreviateEvmAddress } from "@/lib/walletIdentity/address";
import { trackWalletIdentityEvent } from "@/lib/walletIdentity/analytics";

type InjectedEthereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getInjectedEthereum(): InjectedEthereum | undefined {
  if (typeof window === "undefined") return undefined;
  const eth = (window as Window & { ethereum?: InjectedEthereum }).ethereum;
  return eth;
}

function statusLabel(
  t: ReturnType<typeof useTranslations<"Dashboard.connectedIdentities">>,
  status: ConnectedIdentityRow["status"],
): string {
  if (status === "primary_recovery") return t("statusPrimaryRecovery");
  if (status === "connected") return t("statusConnected");
  return t("statusNotConnected");
}

type WalletState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "connected"; address: string };

/**
 * Phase 1C: Email + Google (status) + Wallet bind (connect/disconnect).
 * Apple UI gated until configured. Wallet = ownership proof only — not login/KYC/recovery.
 */
export default function ConnectedIdentities() {
  const t = useTranslations("Dashboard.connectedIdentities");
  const [rows, setRows] = useState<ConnectedIdentityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletState>({ status: "loading" });
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<string | null>(null);

  async function loadWallets() {
    const { data, error } = await supabase
      .from("wallet_addresses")
      .select("address")
      .eq("chain_family", "evm")
      .order("created_at", { ascending: true });
    if (error) {
      setWallet({ status: "none" });
      return;
    }
    const first = data?.[0]?.address;
    if (typeof first === "string" && first) {
      setWallet({ status: "connected", address: first });
    } else {
      setWallet({ status: "none" });
    }
  }

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
        await loadWallets();
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function connectWallet() {
    setWalletError(null);
    setWalletInfo(null);
    trackWalletIdentityEvent("wallet_connect_started", {
      chain_family: "evm",
      surface: "connected_identities",
    });

    const ethereum = getInjectedEthereum();
    if (!ethereum) {
      setWalletError(t("walletNoProvider"));
      trackWalletIdentityEvent("wallet_connect_failed", {
        chain_family: "evm",
        reason: "no_provider",
        surface: "connected_identities",
      });
      return;
    }

    setWalletBusy(true);
    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts?.[0];
      if (!address) {
        throw new Error("no_account");
      }
      const chainIdHex = (await ethereum.request({
        method: "eth_chainId",
      })) as string;
      const chainId = Number.parseInt(chainIdHex, 16);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("auth_required");
      }

      const nonceRes = await fetch("/api/wallet/nonce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address, chainId }),
      });
      const nonceJson = (await nonceRes.json()) as {
        success?: boolean;
        error_code?: string;
        message?: string;
      };
      if (!nonceRes.ok || !nonceJson.success || !nonceJson.message) {
        throw new Error(nonceJson.error_code || "nonce_failed");
      }

      setWalletInfo(t("walletProofHint"));

      const signature = (await ethereum.request({
        method: "personal_sign",
        params: [nonceJson.message, address],
      })) as string;

      const verifyRes = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: nonceJson.message,
          signature,
        }),
      });
      const verifyJson = (await verifyRes.json()) as {
        success?: boolean;
        error_code?: string;
        error?: string;
        address?: string;
      };

      if (!verifyRes.ok || !verifyJson.success) {
        if (verifyJson.error_code === "wallet_owned_elsewhere") {
          setWalletError(t("walletOwnedElsewhere"));
        } else {
          setWalletError(t("walletConnectFailed"));
        }
        trackWalletIdentityEvent("wallet_connect_failed", {
          chain_family: "evm",
          reason: verifyJson.error_code || "verify_failed",
          surface: "connected_identities",
        });
        return;
      }

      await loadWallets();
      setWalletInfo(null);
      trackWalletIdentityEvent("wallet_connect_success", {
        chain_family: "evm",
        surface: "connected_identities",
      });
    } catch (err) {
      const code = err instanceof Error ? err.message : "error";
      setWalletError(t("walletConnectFailed"));
      trackWalletIdentityEvent("wallet_connect_failed", {
        chain_family: "evm",
        reason: code.slice(0, 40),
        surface: "connected_identities",
      });
    } finally {
      setWalletBusy(false);
    }
  }

  async function disconnectWallet() {
    if (wallet.status !== "connected") return;
    setWalletError(null);
    setWalletInfo(null);
    trackWalletIdentityEvent("wallet_disconnect_started", {
      chain_family: "evm",
      surface: "connected_identities",
    });
    setWalletBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("auth_required");
      }
      const res = await fetch("/api/wallet/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address: wallet.address }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error_code?: string;
      };
      if (!res.ok || !json.success) {
        setWalletError(t("walletDisconnectFailed"));
        trackWalletIdentityEvent("wallet_disconnect_failed", {
          chain_family: "evm",
          reason: json.error_code || "unlink_failed",
          surface: "connected_identities",
        });
        return;
      }
      setWallet({ status: "none" });
      trackWalletIdentityEvent("wallet_disconnect_success", {
        chain_family: "evm",
        surface: "connected_identities",
      });
    } catch {
      setWalletError(t("walletDisconnectFailed"));
      trackWalletIdentityEvent("wallet_disconnect_failed", {
        chain_family: "evm",
        reason: "error",
        surface: "connected_identities",
      });
    } finally {
      setWalletBusy(false);
    }
  }

  if (loading) return null;
  if (rows.length === 0) return null;

  const walletConnected = wallet.status === "connected";

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

        <li className="rounded-xl border-2 border-black bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-black uppercase tracking-wide">
                {t("wallet")}
              </span>
              <p className="mt-1 text-[11px] font-semibold text-neutral-500">
                {walletConnected
                  ? `${t("walletBadge")} · ${abbreviateEvmAddress(wallet.address)}`
                  : t("walletNotConnected")}
              </p>
            </div>
            <button
              type="button"
              disabled={walletBusy || wallet.status === "loading"}
              onClick={() =>
                void (walletConnected ? disconnectWallet() : connectWallet())
              }
              className="shrink-0 rounded-lg border-2 border-black bg-[#FDFCF8] px-3 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {walletBusy
                ? t("walletWorking")
                : walletConnected
                  ? t("walletDisconnect")
                  : t("walletConnect")}
            </button>
          </div>
          {walletInfo ? (
            <p className="mt-2 text-[11px] font-semibold text-neutral-600">
              {walletInfo}
            </p>
          ) : null}
          {walletError ? (
            <p className="mt-2 text-[11px] font-semibold text-red-700">
              {walletError}
            </p>
          ) : null}
        </li>
      </ul>
      <p className="mt-4 text-[11px] font-semibold leading-relaxed text-neutral-500">
        {t("linkHint")}
      </p>
      <p className="mt-2 text-[11px] font-semibold leading-relaxed text-neutral-500">
        {t("walletSemantics")}
      </p>
    </div>
  );
}
