"use client";

import { HEARD_FROM_OPTIONS } from "@/lib/attribution";

type HeardFromFieldsProps = {
  value: string;
  detail: string;
  onValueChange: (value: string) => void;
  onDetailChange: (value: string) => void;
  error?: string | null;
  idPrefix?: string;
};

/**
 * Required acquisition question. Copy stays Romanian on every locale:
 * this is the wording Dani asks sellers and new accounts.
 */
export default function HeardFromFields({
  value,
  detail,
  onValueChange,
  onDetailChange,
  error,
  idPrefix = "heard-from",
}: HeardFromFieldsProps) {
  const selectId = `${idPrefix}-select`;
  const detailId = `${idPrefix}-detail`;
  const showDetail = value === "other" || value === "referral";

  return (
    <fieldset className="space-y-3 text-left">
      <legend className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
        De unde ai aflat de QuickExit?
      </legend>
      <label htmlFor={selectId} className="sr-only">
        De unde ai aflat de QuickExit?
      </label>
      <select
        id={selectId}
        name="heard_from"
        required
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="w-full rounded-xl border-[3px] border-black bg-white px-4 py-3 text-sm font-bold text-black outline-none focus:border-[#FFD100]"
      >
        <option value="">Alege o variantă</option>
        {HEARD_FROM_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {showDetail ? (
        <div>
          <label htmlFor={detailId} className="mb-2 block text-[10px] font-black uppercase tracking-widest text-neutral-500">
            {value === "other" ? "Spune-ne pe scurt" : "De la cine? (opțional)"}
          </label>
          <input
            id={detailId}
            name="heard_from_detail"
            value={detail}
            required={value === "other"}
            maxLength={200}
            onChange={(event) => onDetailChange(event.target.value)}
            placeholder={value === "other" ? "Altceva" : "Numele persoanei"}
            className="w-full rounded-xl border-[3px] border-black bg-white px-4 py-3 text-sm font-semibold text-black outline-none focus:border-[#FFD100]"
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-[11px] font-bold text-red-700">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
