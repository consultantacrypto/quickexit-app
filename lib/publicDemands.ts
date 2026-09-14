import { supabase } from "@/lib/supabase";
import {
  formatDemandBudgetCompact,
  readDemandBudgetAmount,
  type DemandBudgetLocale,
} from "@/lib/demandBudget";

export type PublicDemandRow = {
  id: string;
  target_asset: string;
  category: string | null;
  budget_min: number | null;
  budget: number;
  description: string | null;
  status: string;
  created_at: string | null;
};

const PUBLIC_DEMAND_SELECT =
  "id,target_asset,category,budget_min,budget,description,status,created_at" as const;

export async function fetchPublicActiveDemands(limit = 100): Promise<PublicDemandRow[]> {
  const { data, error } = await supabase
    .from("demands")
    .select(PUBLIC_DEMAND_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[fetchPublicActiveDemands]", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const targetAsset =
        typeof row.target_asset === "string" ? row.target_asset.trim() : "";
      const budget = readDemandBudgetAmount(row.budget);
      if (!id || !targetAsset || budget === null) {
        return null;
      }
      const budgetMin = readDemandBudgetAmount(row.budget_min);
      return {
        id,
        target_asset: targetAsset,
        category: typeof row.category === "string" ? row.category.trim() : null,
        budget_min: budgetMin !== null && budgetMin <= budget ? budgetMin : null,
        budget,
        description:
          typeof row.description === "string" ? row.description.trim() : null,
        status: typeof row.status === "string" ? row.status : "active",
        created_at:
          typeof row.created_at === "string" ? row.created_at.trim() : null,
      } satisfies PublicDemandRow;
    })
    .filter((row): row is PublicDemandRow => row !== null);
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
