import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getHqAdminEmails } from "@/lib/hqAdminAuth";

export type MediaHqPageAuth =
  | { status: "authorized"; userEmail: string }
  | { status: "anon" }
  | { status: "forbidden" }
  | { status: "error"; message: string };

/**
 * Server-only HQ gate for Media ops page.
 * Uses cookie session + HQ_ADMIN_EMAILS. Never expose the allowlist to the client.
 */
export async function resolveMediaHqPageAuth(): Promise<MediaHqPageAuth> {
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
    if (!userEmail || !getHqAdminEmails().includes(userEmail)) {
      return { status: "forbidden" };
    }

    return { status: "authorized", userEmail };
  } catch {
    return { status: "error", message: "Unable to verify HQ session." };
  }
}
