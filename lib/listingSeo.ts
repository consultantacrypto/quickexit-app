import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ListingSeoRow = {
  id: string;
  title: string | null;
  category: string | null;
  exit_price: number | null;
  images: string[] | null;
  description: string | null;
  status: string | null;
  is_seed: boolean | null;
  details?: Record<string, unknown> | null;
};

export type PublicListingRow = ListingSeoRow & {
  user_id?: string | null;
  market_price?: number | null;
  discount?: number | null;
  deal_score?: number | null;
  sale_strategy?: string | null;
  offer_count?: number | string | null;
  highest_offer?: number | null;
  expires_at?: string | null;
  details?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type SellerProfileRow = {
  id: string;
  full_name: string | null;
  kyc_status: string | null;
  user_type: string | null;
  created_at: string | null;
};

export type ListingSellerContext = {
  profile: SellerProfileRow | null;
  otherListings: PublicListingRow[];
  activeCount: number | null;
};

const LISTING_CARD_FIELDS =
  "id,title,images,market_price,exit_price,discount,deal_score,sale_strategy,offer_count,highest_offer,expires_at,status,is_seed,category,user_id,description,created_at,details";

function getEnv(name: string): string | null {
  const v = process.env[name];
  if (!v || !v.trim()) return null;
  return v.trim();
}

function createServerSupabase(): SupabaseClient | null {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          cache: "no-store",
        }),
    },
  });
}

export async function fetchPublicListingSeoRow(id: string): Promise<ListingSeoRow | null> {
  const listingId = typeof id === "string" ? id.trim() : "";
  if (!listingId) return null;

  const supabase = createServerSupabase();
  if (!supabase) {
    console.warn("listingSeo.fetchPublicListingSeoRow missing env");
    return null;
  }

  const { data, error } = await supabase
    .from("listings")
    .select(
      [
        "id",
        "title",
        "category",
        "exit_price",
        "images",
        "description",
        "status",
        "is_seed",
        "details",
      ].join(",")
    )
    .eq("id", listingId)
    .eq("status", "active")
    .eq("is_seed", false)
    .maybeSingle();

  if (error) {
    console.warn("listingSeo.fetchPublicListingSeoRow failed", {
      listingId,
      code: error.code ?? null,
      message: error.message ?? null,
    });
    return null;
  }
  if (!data) return null;
  return data as unknown as ListingSeoRow;
}

export async function fetchPublicListingDetail(id: string): Promise<PublicListingRow | null> {
  const listingId = typeof id === "string" ? id.trim() : "";
  if (!listingId) return null;

  const supabase = createServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .eq("status", "active")
    .eq("is_seed", false)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublicListingRow;
}

export async function fetchListingSellerContext(
  userId: string,
  listingId: string
): Promise<ListingSellerContext> {
  const supabase = createServerSupabase();
  if (!supabase) {
    return { profile: null, otherListings: [], activeCount: null };
  }

  const [profileRes, othersRes, countRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, kyc_status, user_type, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("listings")
      .select(LISTING_CARD_FIELDS)
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("is_seed", false)
      .neq("id", listingId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("is_seed", false),
  ]);

  return {
    profile: (profileRes.data as SellerProfileRow | null) ?? null,
    otherListings: (othersRes.data ?? []) as PublicListingRow[],
    activeCount: countRes.count ?? null,
  };
}

export async function fetchSimilarListings(
  category: string,
  listingId: string
): Promise<PublicListingRow[]> {
  const supabase = createServerSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("listings")
    .select(LISTING_CARD_FIELDS)
    .eq("category", category)
    .eq("status", "active")
    .eq("is_seed", false)
    .neq("id", listingId)
    .limit(3);

  return (data ?? []) as PublicListingRow[];
}

export async function fetchFutureMobilityListings(): Promise<PublicListingRow[]> {
  const supabase = createServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_CARD_FIELDS)
    .eq("status", "active")
    .eq("is_seed", false)
    .filter("details->>collection", "eq", "future_mobility")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("listingSeo.fetchFutureMobilityListings failed", {
      code: error.code ?? null,
      message: error.message ?? null,
    });
    return [];
  }

  return (data ?? []) as PublicListingRow[];
}
