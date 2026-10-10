import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isHqAdminEmail } from "@/lib/hqAdminAllowlist";

export type HqAdminPageAuth =
  | { status: "authorized"; userEmail: string }
  | { status: "anon" }
  | { status: "forbidden" }
  | { status: "error"; message: string };

/**
 * Cookie-session HQ gate for App Router pages / layouts (server-only).
 * Never exposes the allowlist to the client.
 */
export async function resolveHqAdminPageAuth(): Promise<HqAdminPageAuth> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { status: "anon" };
    }

    const userEmail = String(user.email || "").trim().toLowerCase();
    if (!isHqAdminEmail(userEmail)) {
      return { status: "forbidden" };
    }

    return { status: "authorized", userEmail };
  } catch {
    return { status: "error", message: "Unable to verify HQ session." };
  }
}
