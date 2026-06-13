import { supabase } from "@/lib/supabase";

export type PublicDemandRow = {
  id: string;
  target_asset: string;
  category: string | null;
  budget: number;
  description: string | null;
  status: string;
  created_at: string | null;
};

const PUBLIC_DEMAND_SELECT =
  "id,target_asset,category,budget,description,status,created_at" as const;

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
      const budget = Number(row.budget);
      if (!id || !targetAsset || !Number.isFinite(budget) || budget <= 0) {
        return null;
      }
      return {
        id,
        target_asset: targetAsset,
        category: typeof row.category === "string" ? row.category.trim() : null,
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
  budget: number,
  locale: "ro" | "en",
): string {
  return budget.toLocaleString(locale === "en" ? "en-GB" : "ro-RO");
}

export function truncateForSchema(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}
