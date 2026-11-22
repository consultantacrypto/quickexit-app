/**
 * Client-side shelf chooser. Returns at most two brands that match the answers.
 * Order follows the catalog, with Tangem first when it matches. No ranking language.
 */

import { sortedWalletProducts, type WalletBrandSlug, type WalletDeviceType, type WalletTier } from "./walletCatalog";

export type ChooserBudget = WalletTier;
export type ChooserExperience = "beginner" | "familiar" | "handsOn";
export type ChooserStyle = "card" | "screen" | "airgap";

export type ChooserAnswers = {
  budget: ChooserBudget;
  experience: ChooserExperience;
  style: ChooserStyle;
};

export type ChooserMatch = {
  slug: WalletBrandSlug;
  approximate: boolean;
  mentionsDani: boolean;
};

const STYLE_TO_TYPE: Record<ChooserStyle, WalletDeviceType> = {
  card: "card",
  screen: "device",
  airgap: "airgap",
};

function brandsWith(style: ChooserStyle, budget: ChooserBudget | null): WalletBrandSlug[] {
  const deviceType = STYLE_TO_TYPE[style];
  const slugs: WalletBrandSlug[] = [];
  for (const product of sortedWalletProducts()) {
    if (product.deviceType !== deviceType) continue;
    if (budget && product.tier !== budget) continue;
    if (!slugs.includes(product.brandSlug)) slugs.push(product.brandSlug);
  }
  if (slugs.includes("tangem")) {
    return ["tangem", ...slugs.filter((slug) => slug !== "tangem")];
  }
  return slugs;
}

export function chooseWalletBrands(answers: ChooserAnswers): ChooserMatch[] {
  const exact = brandsWith(answers.style, answers.budget);
  const pool = exact.length > 0 ? exact : brandsWith(answers.style, null);
  const approximate = exact.length === 0 && pool.length > 0;
  return pool.slice(0, 2).map((slug) => ({
    slug,
    approximate,
    mentionsDani: slug === "tangem",
  }));
}
