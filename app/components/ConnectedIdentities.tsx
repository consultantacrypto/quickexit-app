"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { supabase } from "@/lib/supabase";
import {
  buildConnectedIdentityRows,
  type ConnectedIdentityRow,
} from "@/lib/authIdentity/providers";
import type { LinkedIdentityView } from "@/lib/authIdentity/recovery";
import { abbreviateEvmAddress } from "@/lib/walletIdentity/address";
import { trackWalletIdentityEvent } from "@/lib/walletIdentity/analytics";
import { trackWalletProviderDiag } from "@/lib/walletIdentity/providerDiag";
import {
  selectMetaMaskProvider,
  type Eip1193Provider,
} from "@/lib/walletIdentity/providerDiscovery";
import {
  classifyProviderError,
  createWalletAttemptGuard,
  flowPhaseStatusKey,
  isWalletFlowBusy,
  providerErrorMessageKey,
  withProviderUiTimeout,
  type WalletFlowPhase,
  type WalletProviderErrorCode,
} from "@/lib/walletIdentity/providerUx";

function statusLabel(
  t: ReturnType<typeof useTranslations<"Dashboard.connectedIdentities">>,
  status: ConnectedIdentityRow["status"],
): string {
  if (status === "primary_recovery") return t("statusPrimaryRecovery");
  if (status === "connected") return t("statusConnected");
  return t("statusNotConnected");
}

type WalletBindState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "connected"; address: string };

/**
 * Phase 1C / 1C.1: Email + Google (status) + Wallet bind (connect/disconnect).
 * Wallet = ownership proof only — not login/KYC/recovery.
 * MetaMask RPC timeouts restore UI without cancelling the underlying provider request.
 */
export default function ConnectedIdentities() {
  const t = useTranslations("Dashboard.connectedIdentities");
  const [rows, setRows] = useState<ConnectedIdentityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletBindState>({ status: "loading" });
  const [flowPhase, setFlowPhase] = useState<WalletFlowPhase>("idle");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletInfo, setWalletInfo] = useState<string | null>(null);
  const attemptGuard = useRef(createWalletAttemptGuard()).current;
  const boundAddressRef = useRef<string | null>(null);
  const selectedProviderRef = useRef<Eip1193Provider | null>(null);
  const [providerEpoch, setProviderEpoch] = useState(0);
  const flowPhaseRef = useRef<WalletFlowPhase>(flowPhase);
  flowPhaseRef.current = flowPhase;

  function messageForCode(code: WalletProviderErrorCode): string {
    return t(providerErrorMessageKey(code));
  }

  function failFlow(
    code: WalletProviderErrorCode,
    reason: string,
    event: "wallet_connect_failed" | "wallet_disconnect_failed" = "wallet_connect_failed",
  ) {
    setFlowPhase("error");
    setWalletError(messageForCode(code));
    setWalletInfo(null);
    trackWalletIdentityEvent(event, {
      chain_family: "evm",
      reason: reason.slice(0, 40),
      surface: "connected_identities",
    });
  }

  async function loadWallets() {
    const { data, error } = await supabase
      .from("wallet_addresses")
      .select("address")
      .eq("chain_family", "evm")
      .order("created_at", { ascending: true });
    if (error) {
      setWallet({ status: "none" });
      boundAddressRef.current = null;
      return;
    }
    const first = data?.[0]?.address;
    if (typeof first === "string" && first) {
      setWallet({ status: "connected", address: first });
      boundAddressRef.current = first;
      setFlowPhase("connected");
    } else {
      setWallet({ status: "none" });
      boundAddressRef.current = null;
      setFlowPhase("idle");
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
      attemptGuard.invalidate();
    };
  }, [attemptGuard]);

  // Surface account/chain/disconnect events on the selected MetaMask provider.
  useEffect(() => {
    const ethereum = selectedProviderRef.current;
    if (!ethereum?.on || !ethereum.removeListener) return;

    const onAccountsChanged = (accounts: unknown) => {
      if (isWalletFlowBusy(flowPhaseRef.current)) return;
      const list = Array.isArray(accounts) ? (accounts as string[]) : [];
      const next = list[0]?.toLowerCase() ?? null;
      const bound = boundAddressRef.current?.toLowerCase() ?? null;
      if (bound && next && next !== bound) {
        setWalletError(t("walletAccountChanged"));
        setFlowPhase("error");
      }
    };
    const onChainChanged = () => {
      if (isWalletFlowBusy(flowPhaseRef.current)) return;
      setWalletInfo(t("walletChainChanged"));
    };
    const onDisconnect = () => {
      if (isWalletFlowBusy(flowPhaseRef.current)) return;
      setWalletError(t("walletProviderDisconnected"));
      setFlowPhase("error");
    };

    ethereum.on("accountsChanged", onAccountsChanged);
    ethereum.on("chainChanged", onChainChanged);
    ethereum.on("disconnect", onDisconnect);
    return () => {
      ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      ethereum.removeListener?.("chainChanged", onChainChanged);
      ethereum.removeListener?.("disconnect", onDisconnect);
    };
  }, [t, providerEpoch]);

  async function connectWallet() {
    if (isWalletFlowBusy(flowPhase)) return;

    setWalletError(null);
    setWalletInfo(t("walletFreeHint"));
    trackWalletIdentityEvent("wallet_connect_started", {
      chain_family: "evm",
      surface: "connected_identities",
    });

    const attempt = attemptGuard.begin();
    setFlowPhase("awaiting_accounts");

    try {
      const selection = await selectMetaMaskProvider(300);
      if (!attemptGuard.isCurrent(attempt)) return;

      trackWalletProviderDiag("wallet_diag_provider_discovered", {
        provider_count: selection.providerCount,
        metamask_count: selection.metamaskCount,
        eip6963_count: selection.eip6963Count,
      });

      if (!selection.ok) {
        if (selection.reason === "provider_not_found") {
          trackWalletProviderDiag("wallet_diag_provider_not_found", {
            reason: selection.reason,
            provider_count: 0,
            metamask_count: 0,
            eip6963_count: selection.eip6963Count,
          });
          failFlow("provider_unavailable", "no_provider");
          return;
        }
        if (selection.reason === "ambiguous_multiple_metamask") {
          trackWalletProviderDiag("wallet_diag_provider_not_found", {
            reason: selection.reason,
            provider_count: selection.providerCount,
            metamask_count: selection.metamaskCount,
            eip6963_count: selection.eip6963Count,
          });
          failFlow("ambiguous_multiple_metamask", selection.reason);
          return;
        }
        trackWalletProviderDiag("wallet_diag_provider_not_found", {
          reason: selection.reason,
          provider_count: selection.providerCount,
          metamask_count: selection.metamaskCount,
          eip6963_count: selection.eip6963Count,
        });
        failFlow("metamask_not_found_among_injected", selection.reason);
        return;
      }

      const ethereum = selection.provider;
      selectedProviderRef.current = ethereum;
      setProviderEpoch((n) => n + 1);
      trackWalletProviderDiag("wallet_diag_provider_selected", {
        source: selection.source,
        kind: selection.kind,
        provider_count: selection.providerCount,
        metamask_count: selection.metamaskCount,
        eip6963_count: selection.eip6963Count,
      });

      trackWalletProviderDiag("wallet_diag_request_accounts_started", {
        source: selection.source,
        kind: selection.kind,
      });

      const accountsRace = await withProviderUiTimeout(
        ethereum.request({ method: "eth_requestAccounts" }) as Promise<string[]>,
      );
      if (!attemptGuard.isCurrent(attempt)) return;
      if (!accountsRace.ok) {
        trackWalletProviderDiag("wallet_diag_request_accounts_timeout", {
          source: selection.source,
          kind: selection.kind,
        });
        failFlow("request_timeout", "request_timeout");
        return;
      }

      trackWalletProviderDiag("wallet_diag_request_accounts_resolved", {
        source: selection.source,
        kind: selection.kind,
      });

      const address = accountsRace.value?.[0];
      if (!address) {
        failFlow("no_account", "no_account");
        return;
      }

      const chainRace = await withProviderUiTimeout(
        ethereum.request({ method: "eth_chainId" }) as Promise<string>,
      );
      if (!attemptGuard.isCurrent(attempt)) return;
      if (!chainRace.ok) {
        failFlow("request_timeout", "request_timeout");
        return;
      }
      const chainId = Number.parseInt(chainRace.value, 16);
      if (!Number.isInteger(chainId) || chainId <= 0) {
        failFlow("chain_changed", "invalid_chain");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!attemptGuard.isCurrent(attempt)) return;
      const token = session?.access_token;
      if (!token) {
        failFlow("auth_required", "auth_required");
        return;
      }

      setFlowPhase("obtaining_challenge");
      setWalletInfo(t("walletFreeHint"));

      const nonceRes = await fetch("/api/wallet/nonce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address, chainId }),
      });
      if (!attemptGuard.isCurrent(attempt)) return;
      const nonceJson = (await nonceRes.json()) as {
        success?: boolean;
        error_code?: string;
        message?: string;
      };
      if (!attemptGuard.isCurrent(attempt)) return;
      if (!nonceRes.ok || !nonceJson.success || !nonceJson.message) {
        if (nonceJson.error_code === "auth_required") {
          failFlow("auth_required", "auth_required");
        } else {
          failFlow("connect_failed", nonceJson.error_code || "nonce_failed");
        }
        return;
      }

      // Only one signature attempt per connect attempt; never start verify without it.
      setFlowPhase("awaiting_signature");
      setWalletInfo(t("walletProofHint"));
      trackWalletProviderDiag("wallet_diag_signature_requested", {
        source: selection.source,
        kind: selection.kind,
      });

      const signRace = await withProviderUiTimeout(
        ethereum.request({
          method: "personal_sign",
          params: [nonceJson.message, address],
        }) as Promise<string>,
      );
      if (!attemptGuard.isCurrent(attempt)) return;
      if (!signRace.ok) {
        failFlow("request_timeout", "request_timeout");
        return;
      }

      setFlowPhase("verifying");
      setWalletInfo(t("walletPhaseVerifying"));

      const verifyRes = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: nonceJson.message,
          signature: signRace.value,
        }),
      });
      if (!attemptGuard.isCurrent(attempt)) return;
      const verifyJson = (await verifyRes.json()) as {
        success?: boolean;
        error_code?: string;
      };
      if (!attemptGuard.isCurrent(attempt)) return;

      if (!verifyRes.ok || !verifyJson.success) {
        if (verifyJson.error_code === "wallet_owned_elsewhere") {
          failFlow("wallet_owned_elsewhere", "wallet_owned_elsewhere");
        } else {
          failFlow("connect_failed", verifyJson.error_code || "verify_failed");
        }
        return;
      }

      await loadWallets();
      if (!attemptGuard.isCurrent(attempt)) return;
      setWalletInfo(null);
      setWalletError(null);
      setFlowPhase("connected");
      trackWalletIdentityEvent("wallet_connect_success", {
        chain_family: "evm",
        surface: "connected_identities",
      });
    } catch (err) {
      if (!attemptGuard.isCurrent(attempt)) return;
      const classified = classifyProviderError(err);
      if (classified.code === "user_rejected") {
        trackWalletProviderDiag("wallet_diag_request_accounts_rejected", {
          reason: classified.reason,
        });
      }
      failFlow(classified.code, classified.reason);
    }
  }

  async function disconnectWallet() {
    if (wallet.status !== "connected") return;
    if (isWalletFlowBusy(flowPhase)) return;

    setWalletError(null);
    setWalletInfo(null);
    trackWalletIdentityEvent("wallet_disconnect_started", {
      chain_family: "evm",
      surface: "connected_identities",
    });

    const attempt = attemptGuard.begin();
    setFlowPhase("disconnecting");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!attemptGuard.isCurrent(attempt)) return;
      const token = session?.access_token;
      if (!token) {
        failFlow("auth_required", "auth_required", "wallet_disconnect_failed");
        return;
      }
      const res = await fetch("/api/wallet/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address: wallet.address }),
      });
      if (!attemptGuard.isCurrent(attempt)) return;
      const json = (await res.json()) as {
        success?: boolean;
        error_code?: string;
      };
      if (!attemptGuard.isCurrent(attempt)) return;
      if (!res.ok || !json.success) {
        failFlow(
          "disconnect_failed",
          json.error_code || "unlink_failed",
          "wallet_disconnect_failed",
        );
        return;
      }
      setWallet({ status: "none" });
      boundAddressRef.current = null;
      setFlowPhase("idle");
      trackWalletIdentityEvent("wallet_disconnect_success", {
        chain_family: "evm",
        surface: "connected_identities",
      });
    } catch (err) {
      if (!attemptGuard.isCurrent(attempt)) return;
      const classified = classifyProviderError(err);
      failFlow(
        classified.code === "connect_failed" ? "disconnect_failed" : classified.code,
        classified.reason,
        "wallet_disconnect_failed",
      );
    }
  }

  if (loading) return null;
  if (rows.length === 0) return null;

  const walletConnected = wallet.status === "connected";
  const busy = isWalletFlowBusy(flowPhase);
  const phaseKey = flowPhaseStatusKey(flowPhase);
  const buttonLabel = busy
    ? phaseKey
      ? t(phaseKey)
      : t("walletWorking")
    : walletConnected
      ? t("walletDisconnect")
      : t("walletConnect");

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
              disabled={busy || wallet.status === "loading"}
              onClick={() =>
                void (walletConnected ? disconnectWallet() : connectWallet())
              }
              className="shrink-0 rounded-lg border-2 border-black bg-[#FDFCF8] px-3 py-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
            >
              {buttonLabel}
            </button>
          </div>
          {walletInfo ? (
            <p className="mt-2 text-[11px] font-semibold text-neutral-600">
              {walletInfo}
            </p>
          ) : null}
          {walletError ? (
            <p className="mt-2 text-[11px] font-semibold text-red-700" role="alert">
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
      <p className="mt-2 text-[11px] font-semibold leading-relaxed text-neutral-500">
        {t("walletFreeHint")}
      </p>
    </div>
  );
}
