export type ListingModalId = "verified" | "docs" | "ai-score" | "accept" | "offer";

export const labelBase =
  "block text-[10px] font-black uppercase tracking-widest text-neutral-500";

export const inputBase =
  "w-full rounded-xl border-[3px] border-black bg-white p-4 font-semibold text-black outline-none transition focus:border-[#FFD100] focus:ring-4 focus:ring-[#FFD100]/30 placeholder:text-neutral-500";

export function kycStatusRo(status: string | null | undefined): string {
  if (status === "verified") return "Identitate verificată";
  if (status === "processing") return "Verificare în procesare";
  if (status === "requires_input") return "Verificare necesară";
  return "Verificare în așteptare";
}

export type ListingOfferActionMessage = { type: "error"; text: string } | null;
