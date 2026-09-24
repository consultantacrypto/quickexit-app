"use client";

import { useTranslations } from "next-intl";
import {
  CRYPTO_ASSET_ALLOWLIST,
  type CryptoAsset,
  type CryptoPaymentMode,
} from "@/lib/cryptoPayment";

type CryptoPaymentFieldsProps = {
  mode: CryptoPaymentMode;
  assets: readonly CryptoAsset[];
  onModeChange: (mode: CryptoPaymentMode) => void;
  onAssetsChange: (assets: CryptoAsset[]) => void;
};

const MODES: CryptoPaymentMode[] = ["none", "full", "partial", "negotiable"];

export default function CryptoPaymentFields({
  mode,
  assets,
  onModeChange,
  onAssetsChange,
}: CryptoPaymentFieldsProps) {
  const t = useTranslations("PostListing.cryptoPayment");

  const chooseMode = (next: CryptoPaymentMode) => {
    onModeChange(next);
    if (next === "none") onAssetsChange([]);
  };

  const toggleAsset = (asset: CryptoAsset) => {
    if (mode === "none") return;
    if (assets.includes(asset)) {
      onAssetsChange(assets.filter((item) => item !== asset));
      return;
    }
    onAssetsChange([...assets, asset]);
  };

  return (
    <div className="rounded-2xl border-[3px] border-black bg-[#F7F4EC]/80 p-5 md:p-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
        {t("question")}
      </p>
      <p className="mt-2 text-xs font-medium leading-relaxed text-neutral-600">{t("help")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => chooseMode(item)}
            className={`rounded-xl border-[3px] p-3 text-left text-xs font-black uppercase tracking-wide transition ${
              mode === item
                ? "border-black bg-[#FFD100] shadow-[4px_4px_0_0_#000]"
                : "border-black bg-white hover:bg-[#FFF9E8]"
            }`}
          >
            {t(`modes.${item}`)}
          </button>
        ))}
      </div>
      {mode !== "none" ? (
        <fieldset className="mt-5">
          <legend className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
            {t("assetsLabel")}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {CRYPTO_ASSET_ALLOWLIST.map((asset) => {
              const checked = assets.includes(asset);
              return (
                <label
                  key={asset}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs font-black uppercase ${
                    checked ? "border-black bg-black text-[#FFD100]" : "border-black bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleAsset(asset)}
                  />
                  {asset.toUpperCase()}
                </label>
              );
            })}
          </div>
          {mode === "partial" ? (
            <p className="mt-3 text-xs font-medium text-neutral-600">{t("partialNote")}</p>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  );
}
