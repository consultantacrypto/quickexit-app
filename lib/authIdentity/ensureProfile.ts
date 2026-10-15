import type { SupabaseClient } from "@supabase/supabase-js";
import { logAuthIdentity } from "@/lib/authIdentity/log";

/**
 * Belt-and-suspenders after auth callback.
 * Primary invariant is the DB trigger on auth.users.
 * This only inserts missing profiles (idempotent); never updates fields / KYC.
 */
export async function ensureProfileRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; created: boolean }> {
  const id = userId.trim();
  if (!id) {
    logAuthIdentity("profile_provision", "denied", { reason: "empty_user_id" });
    return { ok: false, created: false };
  }

  const existing = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existing.data?.id) {
    logAuthIdentity("profile_provision", "success", {
      reason: "already_present",
      created: false,
    });
    return { ok: true, created: false };
  }

  const inserted = await supabase.from("profiles").insert({ id }).select("id").maybeSingle();

  if (inserted.error) {
    // Concurrent insert from trigger → treat as success if row now exists.
    const retry = await supabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (retry.data?.id) {
      logAuthIdentity("profile_provision", "success", {
        reason: "race_resolved",
        created: false,
      });
      return { ok: true, created: false };
    }
    logAuthIdentity("profile_provision", "error", {
      error_code: inserted.error.code ?? "profile_insert_failed",
    });
    return { ok: false, created: false };
  }

  logAuthIdentity("profile_provision", "success", {
    reason: "inserted",
    created: true,
  });
  return { ok: true, created: true };
}
