import { createClient } from "@supabase/supabase-js";

export type ListingSeoRow = {
  id: string;
  title: string | null;
  category: string | null;
  location: string | null;
  market_price: number | null;
  exit_price: number | null;
  discount: number | null;
  discount_percentage: number | null;
  images: string[] | null;
  description: string | null;
  details: Record<string, unknown> | null;
  status: string | null;
  is_seed: boolean | null;
  created_at: string | null;
};

function getEnv(name: string): string | null {
  const v = process.env[name];
  if (!v || !v.trim()) return null;
  return v.trim();
}

export async function fetchPublicListingSeoRow(id: string): Promise<ListingSeoRow | null> {
  const listingId = typeof id === "string" ? id.trim() : "";
  if (!listingId) return null;

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          cache: "no-store",
        }),
    },
  });

  const { data, error } = await supabase
    .from("listings")
    .select(
      [
        "id",
        "title",
        "category",
        "location",
        "market_price",
        "exit_price",
        "discount",
        "discount_percentage",
        "images",
        "description",
        "details",
        "status",
        "is_seed",
        "created_at",
      ].join(",")
    )
    .eq("id", listingId)
    .eq("status", "active")
    .eq("is_seed", false)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ListingSeoRow;
}

