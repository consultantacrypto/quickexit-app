import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isHqAdminEmail } from "@/lib/hqAdminAllowlist";

export type HqAdminAuthResult =
  | { ok: true; supabase: SupabaseClient; userEmail: string; userId: string }
  | { ok: false; status: number; error: string };

export {
  getHqAdminEmails,
  isHqAdminEmail,
  parseHqAdminEmails,
} from "@/lib/hqAdminAllowlist";

function createServiceRoleClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Validates access token (Bearer JWT) + HQ admin allowlist, then returns service-role client.
 * Service-role is created only after admin membership succeeds.
 */
export async function assertHqAdminFromAccessToken(
  accessToken: string | null | undefined,
): Promise<HqAdminAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, error: "access_denied" };
  }
  if (!serviceRoleKey) {
    return { ok: false, status: 500, error: "access_denied" };
  }
  if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) {
    return { ok: false, status: 401, error: "authentication_required" };
  }

  const authSupabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken.trim()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, status: 401, error: "authentication_required" };
  }

  const userEmail = String(user.email || "").trim().toLowerCase();
  if (!isHqAdminEmail(userEmail)) {
    return { ok: false, status: 403, error: "access_denied" };
  }

  return {
    ok: true,
    supabase: createServiceRoleClient(supabaseUrl, serviceRoleKey),
    userEmail,
    userId: user.id,
  };
}

/**
 * Validates Bearer JWT + HQ admin email allowlist, then returns a service-role client.
 */
export async function assertHqAdminFromBearer(
  bearer: string | null | undefined,
): Promise<HqAdminAuthResult> {
  return assertHqAdminFromAccessToken(bearer);
}

export function extractBearerToken(req: Request): string {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}
