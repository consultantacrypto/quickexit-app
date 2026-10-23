"use client";

import { supabase } from "@/lib/supabase";
import {
  type AttributionSnapshot,
  mergeSnapshots,
  readAttributionSnapshot,
  sanitizeSnapshot,
} from "@/lib/attribution";

export async function snapshotForWrite(
  userId: string | null,
  heardOverride?: { heard_from: string; heard_from_detail: string | null } | null,
): Promise<AttributionSnapshot> {
  const local = readAttributionSnapshot();
  let profile: AttributionSnapshot | null = null;
  if (userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("attribution_first, attribution_last, heard_from, heard_from_detail")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) {
      profile = sanitizeSnapshot({
        v: 1,
        first: data.attribution_first,
        last: data.attribution_last,
        heard_from: data.heard_from,
        heard_from_detail: data.heard_from_detail,
      });
    }
  }
  const merged = mergeSnapshots(profile, local);
  if (heardOverride) {
    merged.heard_from = heardOverride.heard_from;
    merged.heard_from_detail = heardOverride.heard_from_detail;
  }
  return merged;
}
