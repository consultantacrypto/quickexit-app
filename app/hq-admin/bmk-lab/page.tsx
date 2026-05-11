"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPublicClient, formatUnits, http } from "viem";

const ADMIN_EMAILS = ["consultantacrypto.ro@gmail.com"];

const BMK_ADDRESS = "0xc7e9d03b6f13d7215c2e2b1854a2b0bdbebe6fb9" as const;
const BSC_CHAIN_ID_HEX = "0x38";
const BSC_CHAIN_ID_DECIMAL = 56;
const BSC_RPC_URL = "https://bsc-dataseed.binance.org";

const bmkAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

type GateState = "loading" | "anon" | "forbidden" | "ready";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getTier(balance: number): string {
  if (!Number.isFinite(balance) || balance <= 0) return "Fără tier BMK";
  if (balance >= 100_000) return "Founder Circle";
  if (balance >= 10_000) return "VIP";
  if (balance >= 1_000) return "Legacy Member";
  return "Legacy Watcher";
}

export default function BMKLabPage() {
  const [gate, setGate] = useState<GateState>("loading");

  const [hasWallet, setHasWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [chainIdHex, setChainIdHex] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const [tokenName, setTokenName] = useState("BMK");
  const [tokenSymbol, setTokenSymbol] = useState("BMK");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [balanceText, setBalanceText] = useState("0");

  const [uiError, setUiError] = useState<string>("");
  const [loadingTokenData, setLoadingTokenData] = useState(false);

  const isOnBsc = chainIdHex.toLowerCase() === BSC_CHAIN_ID_HEX;
  const parsedBalance = Number(balanceText);
  const tierLabel = useMemo(() => getTier(parsedBalance), [parsedBalance]);

  useEffect(() => {
    let cancelled = false;

    async function initGate() {
      const { supabase } = await import("@/lib/supabase");
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
      setGate("ready");
    }

    void initGate();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshWalletState = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      const provider = window.ethereum;
      const accounts = (await provider.request({
        method: "eth_accounts",
      })) as string[];
      const chainId = (await provider.request({ method: "eth_chainId" })) as string;
      setChainIdHex(chainId || "");
      setWalletAddress(accounts?.[0] || "");
    } catch (error) {
      console.error("BMK Lab wallet refresh error:", error);
    }
  }, []);

  useEffect(() => {
    if (gate !== "ready") return;
    const provider = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!provider) {
      setHasWallet(false);
      return;
    }

    setHasWallet(true);
    void refreshWalletState();

    const onAccountsChanged = (accounts: unknown) => {
      const list = Array.isArray(accounts) ? (accounts as string[]) : [];
      setWalletAddress(list[0] || "");
      setUiError("");
    };
    const onChainChanged = (chainId: unknown) => {
      setChainIdHex(typeof chainId === "string" ? chainId : "");
      setUiError("");
    };

    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", onChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, [gate, refreshWalletState]);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setUiError("Nu am detectat niciun wallet în browser.");
      return;
    }
    setIsConnecting(true);
    setUiError("");
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const chainId = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;

      setWalletAddress(accounts?.[0] || "");
      setChainIdHex(chainId || "");
    } catch (error) {
      console.error("BMK Lab connect error:", error);
      setUiError("Conectarea wallet-ului a fost anulată sau a eșuat.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const switchToBsc = useCallback(async () => {
    if (!window.ethereum) {
      setUiError("Nu am detectat niciun wallet în browser.");
      return;
    }

    setIsSwitching(true);
    setUiError("");

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID_HEX }],
      });
      setChainIdHex(BSC_CHAIN_ID_HEX);
    } catch (switchError: any) {
      const code = Number(switchError?.code);
      if (code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BSC_CHAIN_ID_HEX,
                chainName: "BNB Smart Chain",
                nativeCurrency: {
                  name: "BNB",
                  symbol: "BNB",
                  decimals: 18,
                },
                rpcUrls: [BSC_RPC_URL],
                blockExplorerUrls: ["https://bscscan.com"],
              },
            ],
          });
          setChainIdHex(BSC_CHAIN_ID_HEX);
        } catch (addError) {
          console.error("BMK Lab add chain error:", addError);
          setUiError("Nu am putut adăuga rețeaua BNB Smart Chain în wallet.");
        }
      } else {
        console.error("BMK Lab switch chain error:", switchError);
        setUiError("Nu am putut schimba rețeaua către BNB Smart Chain.");
      }
    } finally {
      setIsSwitching(false);
    }
  }, []);

  useEffect(() => {
    if (!walletAddress || !isOnBsc) {
      setBalanceText("0");
      return;
    }

    let cancelled = false;

    async function readBmkData() {
      setLoadingTokenData(true);
      setUiError("");
      try {
        const client = createPublicClient({
          transport: http(BSC_RPC_URL),
        });

        const [name, symbol, decimals, balanceRaw] = await Promise.all([
          client.readContract({
            address: BMK_ADDRESS,
            abi: bmkAbi,
            functionName: "name",
          }),
          client.readContract({
            address: BMK_ADDRESS,
            abi: bmkAbi,
            functionName: "symbol",
          }),
          client.readContract({
            address: BMK_ADDRESS,
            abi: bmkAbi,
            functionName: "decimals",
          }),
          client.readContract({
            address: BMK_ADDRESS,
            abi: bmkAbi,
            functionName: "balanceOf",
            args: [walletAddress as `0x${string}`],
          }),
        ]);

        if (cancelled) return;

        const decimalsNumber = Number(decimals);
        setTokenName(name);
        setTokenSymbol(symbol);
        setTokenDecimals(decimalsNumber);
        setBalanceText(formatUnits(balanceRaw, decimalsNumber));
      } catch (error) {
        console.error("BMK Lab read contract error:", error);
        if (!cancelled) {
          setUiError("Nu am reușit să citim balanța BMK. Încearcă din nou.");
        }
      } finally {
        if (!cancelled) setLoadingTokenData(false);
      }
    }

    void readBmkData();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, isOnBsc]);

  if (gate === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <p className="text-sm font-semibold text-neutral-600">Se verifică accesul pentru BMK Lab...</p>
      </div>
    );
  }

  if (gate === "anon") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <h1 className="text-2xl font-black uppercase italic">BMK Lab</h1>
        <p className="mt-3 text-sm text-neutral-700">
          Pagina este privată. Te rugăm să te autentifici pentru acces.
        </p>
        <Link href="/dashboard" className="mt-6 inline-block border-2 border-black px-4 py-2 text-xs font-black uppercase">
          Mergi la dashboard
        </Link>
      </div>
    );
  }

  if (gate === "forbidden") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <h1 className="text-2xl font-black uppercase italic">BMK Lab</h1>
        <p className="mt-3 text-sm text-neutral-700">Nu ai acces la această zonă privată.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <div className="rounded-3xl border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_0_rgba(0,0,0,1)] md:p-8">
        <h1 className="text-3xl font-black uppercase italic tracking-tight md:text-4xl">BMK Lab</h1>
        <p className="mt-3 text-sm font-semibold text-neutral-700 md:text-base">
          Spațiu privat pentru testarea utilității BMK în Quick Exit.
        </p>

        <div className="mt-5 rounded-2xl border border-neutral-300 bg-neutral-50 p-4">
          <p className="text-xs font-semibold leading-relaxed text-neutral-700">
            BMK este opțional. Quick Exit rămâne utilizabil fără crypto. Această pagină nu oferă consultanță financiară
            și nu promite profit, randament sau creștere de preț.
          </p>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-neutral-700">
            BMK Lab nu procesează plăți, nu face swap și nu conectează tokenul la tranzacțiile dintre cumpărător și
            vânzător.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-black bg-white p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-700">Wallet</h2>
            <p className="mt-2 text-sm text-neutral-700">
              {hasWallet ? "Wallet detectat în browser." : "Nu am detectat wallet. Instalează MetaMask sau un wallet compatibil EVM."}
            </p>

            <button
              type="button"
              onClick={connectWallet}
              disabled={!hasWallet || isConnecting}
              className="mt-4 w-full rounded-xl border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-[#FFD100] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isConnecting ? "Conectare..." : "Conectează wallet"}
            </button>

            <p className="mt-4 text-xs font-semibold text-neutral-700">
              Wallet: {walletAddress ? shortAddress(walletAddress) : "Neconectat"}
            </p>
            <p className="mt-1 text-xs font-semibold text-neutral-700">
              Chain: {chainIdHex ? `${chainIdHex} (${isOnBsc ? "BNB Smart Chain" : "Altă rețea"})` : "Necunoscut"}
            </p>

            {!isOnBsc && walletAddress ? (
              <div className="mt-4 rounded-xl border border-yellow-500 bg-yellow-50 p-3">
                <p className="text-xs font-semibold text-yellow-900">
                  Schimbă pe BNB Smart Chain pentru a citi balanța BMK.
                </p>
                <button
                  type="button"
                  onClick={switchToBsc}
                  disabled={isSwitching}
                  className="mt-3 rounded-lg border border-yellow-800 bg-yellow-200 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-black disabled:opacity-50"
                >
                  {isSwitching ? "Se schimbă..." : "Schimbă rețeaua"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border-2 border-black bg-white p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-neutral-700">Token BMK</h2>
            <p className="mt-2 text-sm font-semibold text-neutral-800">
              {loadingTokenData ? "Citim datele tokenului..." : `${tokenName} (${tokenSymbol})`}
            </p>
            <p className="mt-1 text-xs text-neutral-600">Contract: {BMK_ADDRESS}</p>
            <p className="mt-1 text-xs text-neutral-600">Decimals: {tokenDecimals}</p>

            <div className="mt-4 rounded-xl border border-black bg-neutral-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-neutral-600">Balanță BMK</p>
              <p className="mt-2 text-2xl font-black italic tracking-tight text-black">{balanceText}</p>
              <p className="mt-1 text-xs font-semibold text-neutral-600">Tier estimativ: {tierLabel}</p>
            </div>

            <p className="mt-3 text-[11px] font-semibold text-neutral-600">
              Tierurile sunt experimentale și nu reprezintă promisiuni financiare, randament sau valoare viitoare.
            </p>
          </div>
        </div>

        {uiError ? (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-800">{uiError}</p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
          <a
            href={`https://bscscan.com/token/${BMK_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-[#FFD100]"
          >
            Vezi contractul BMK pe BscScan
          </a>

          {walletAddress ? (
            <a
              href={`https://bscscan.com/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-[#FFD100]"
            >
              Vezi walletul pe BscScan
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
