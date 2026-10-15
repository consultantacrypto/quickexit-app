import { supabase } from "@/lib/supabase";
import {
  formatDemandBudgetCompact,
  readDemandBudgetAmount,
  type DemandBudgetLocale,
} from "@/lib/demandBudget";
import { isDemandEffectivelyActive } from "@/lib/demandLifecycle";

export type PublicDemandRow = {
  id: string;
  target_asset: string;
  category: string | null;
  budget_min: number | null;
  budget: number;
  description: string | null;
  requirements: unknown;
  status: string;
  created_at: string | null;
  expires_at: string | null;
  activated_at: string | null;
  buyer_verified: boolean;
};

/** Explicit public columns only — no private identity fields and no select star. */
const PUBLIC_DEMAND_SELECT =
  "id,target_asset,category,budget_min,budget,description,requirements,status,created_at,expires_at,activated_at,buyer_verified" as const;

export const HOME_PUBLIC_ACTIVE_DEMANDS_LIMIT = 3;

/**
 * Shared public fetch for homepage and /capital-disponibil.
 * Sort is newest-first: created_at DESC, then id DESC (deterministic ties).
 *
 * Cache: both pages keep ISR `export const revalidate = 60`. New active demands
 * become visible after the next regeneration, typically within 60 seconds.
 * Pages stay statically revalidated — not fully dynamic.
 */
export async function fetchPublicActiveDemands(limit = 100): Promise<PublicDemandRow[]> {
  const { data, error } = await supabase
    .from("demands")
    .select(PUBLIC_DEMAND_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(Math.max(limit * 2, limit));

  if (error) {
    console.error("[fetchPublicActiveDemands]", error.message);
    return [];
  }

  const now = new Date();
  const rows = (data ?? [])
    .map((row) => {
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const targetAsset =
        typeof row.target_asset === "string" ? row.target_asset.trim() : "";
      const budget = readDemandBudgetAmount(row.budget);
      if (!id || !targetAsset || budget === null) {
        return null;
      }
      const budgetMin = readDemandBudgetAmount(row.budget_min);
      const mapped: PublicDemandRow = {
        id,
        target_asset: targetAsset,
        category: typeof row.category === "string" ? row.category.trim() : null,
        budget_min: budgetMin !== null && budgetMin <= budget ? budgetMin : null,
        budget,
        description:
          typeof row.description === "string" ? row.description.trim() : null,
        requirements: row.requirements ?? null,
        status: typeof row.status === "string" ? row.status : "active",
        created_at:
          typeof row.created_at === "string" ? row.created_at.trim() : null,
        expires_at:
          typeof row.expires_at === "string" ? row.expires_at.trim() : null,
        activated_at:
          typeof row.activated_at === "string" ? row.activated_at.trim() : null,
        buyer_verified: row.buyer_verified === true,
      };
      if (!isDemandEffectivelyActive(mapped, now)) return null;
      return mapped;
    })
    .filter((row): row is PublicDemandRow => row !== null);

  rows.sort((a, b) => {
    const createdCmp = (b.created_at ?? "").localeCompare(a.created_at ?? "");
    if (createdCmp !== 0) return createdCmp;
    return b.id.localeCompare(a.id);
  });

  return rows.slice(0, limit);
}

export function summarizePublicDemandCapital(demands: PublicDemandRow[]): {
  activeCount: number;
  totalBudgetEur: number;
  categories: string[];
} {
  const categorySet = new Set<string>();
  let totalBudgetEur = 0;
  for (const d of demands) {
    totalBudgetEur += d.budget;
    if (d.category) categorySet.add(d.category);
  }
  return {
    activeCount: demands.length,
    totalBudgetEur,
    categories: Array.from(categorySet),
  };
}

export function formatDemandBudget(
  budgetMin: number | null,
  budget: number,
  locale: DemandBudgetLocale,
): string {
  return formatDemandBudgetCompact(budgetMin, budget, locale);
}

export function truncateForSchema(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}
