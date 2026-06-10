import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type HqAdminAuthResult =
  | { ok: true; supabase: SupabaseClient; userEmail: string }
  | { ok: false; status: number; error: string };

export function getHqAdminEmails(): string[] {
  return (process.env.HQ_ADMIN_EMAILS || "consultantacrypto.ro@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Validates Bearer JWT + HQ admin email allowlist, then returns a service-role client.
 * Pattern aligned with app/api/hq/copilot/route.ts and app/actions/adminActions.ts.
 */
export async function assertHqAdminFromBearer(
  bearer: string | null | undefined,
): Promise<HqAdminAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, error: "Config Supabase incompletă: lipsesc URL sau anon key." };
  }
  if (!serviceRoleKey) {
    return {
      ok: false,
      status: 500,
      error: "Config server incompletă: SUPABASE_SERVICE_ROLE_KEY lipsește.",
    };
  }
  if (!bearer || typeof bearer !== "string") {
    return { ok: false, status: 401, error: "Token lipsă. Trimite Authorization Bearer." };
  }

  const authSupabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "Autentificare invalidă sau expirată." };
  }

  const userEmail = String(user.email || "").trim().toLowerCase();
  if (!getHqAdminEmails().includes(userEmail)) {
    return { ok: false, status: 403, error: "Acces interzis. Doar adminii HQ pot accesa Lead Agent." };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { ok: true, supabase, userEmail };
}

export function extractBearerToken(req: Request): string {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}
