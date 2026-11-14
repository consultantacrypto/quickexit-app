import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/evaluateSafety";
import { isSameOriginMutationRequest } from "@/lib/listingInquiry";
import {
  MAX_LISTING_TRAFFIC_BODY_BYTES,
  takeListingTrafficRateLimit,
  type ListingTrafficStore,
} from "@/lib/listingTraffic";
import { handleListingTrafficPost } from "@/lib/listingTrafficHandle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };
const rateStore = new Map<string, { count: number; resetAt: number }>();

function empty(): NextResponse {
  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}

function createServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function adaptStore(supabase: SupabaseClient): ListingTrafficStore {
  return {
    async findRecent(filter) {
      let query = supabase
        .from("listing_traffic_events")
        .select("id")
        .eq("session_id", filter.sessionId)
        .eq("path", filter.path)
        .eq("event_type", filter.eventType)
        .gte("created_at", filter.sinceIso)
        .limit(1);
      query = filter.conversion
        ? query.eq("conversion", filter.conversion)
        : query.is("conversion", null);
      const { data, error } = await query;
      if (error) {
        console.error("[listing-traffic] dedup lookup failed", { code: error.code });
        return { found: false, error: true };
      }
      return { found: Array.isArray(data) && data.length > 0, error: false };
    },
    async insert(row) {
      const { error } = await supabase.from("listing_traffic_events").insert(row);
      if (error) {
        console.error("[listing-traffic] insert failed", { code: error.code });
        return { error: true };
      }
      return { error: false };
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_LISTING_TRAFFIC_BODY_BYTES) {
      return empty();
    }
    const bodyText = await req.text();
    if (bodyText.length > MAX_LISTING_TRAFFIC_BODY_BYTES) return empty();
    const ipHash = createHash("sha256").update(getClientIp(req.headers)).digest("hex");
    await handleListingTrafficPost({
      sameOrigin: isSameOriginMutationRequest(req.headers),
      rateAllowed: takeListingTrafficRateLimit(rateStore, ipHash, Date.now()),
      bodyText,
      vercelEnv: process.env.VERCEL_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      openStore: () => {
        const supabase = createServiceClient();
        return supabase ? adaptStore(supabase) : null;
      },
    });
  } catch {
    // tracking is append-only and optional
  }
  return empty();
}
