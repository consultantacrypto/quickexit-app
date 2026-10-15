import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export function createUserSupabase(bearer: string): SupabaseClient {
  return createClient(getSupabaseProjectUrl(), getSupabaseAnonKey(), {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createServiceSupabase(): SupabaseClient {
  const url = getSupabaseProjectUrl();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!key) {
    throw new Error("missing_supabase_service_role");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireAuthenticatedUser(
  req: Request,
): Promise<
  | { ok: true; userId: string; bearer: string; userClient: SupabaseClient }
  | { ok: false; status: 401 | 500; error_code: string }
> {
  const bearer = extractBearerToken(req);
  if (!bearer) {
    return { ok: false, status: 401, error_code: "auth_required" };
  }
  let userClient: SupabaseClient;
  try {
    userClient = createUserSupabase(bearer);
  } catch {
    return { ok: false, status: 500, error_code: "server_error" };
  }
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user?.id) {
    return { ok: false, status: 401, error_code: "auth_required" };
  }
  return { ok: true, userId: user.id, bearer, userClient };
}

/** Allowed SIWE domains for this request (host only, no port normalization issues). */
export function resolveSiweDomain(req: Request): string | null {
  const origin = req.headers.get("origin")?.trim();
  if (origin) {
    try {
      return new URL(origin).hostname.toLowerCase();
    } catch {
      /* fall through */
    }
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return null;
  return host.split(":")[0]!.trim().toLowerCase() || null;
}

export function resolveSiweUri(req: Request, domain: string): string {
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (domain.includes("localhost") ? "http" : "https");
  return `${proto}://${domain}`;
}

export function isAllowedWalletOrigin(req: Request): boolean {
  const originHeader = req.headers.get("origin")?.trim();
  if (!originHeader) return false;
  let origin: string;
  try {
    origin = new URL(originHeader).origin.toLowerCase();
  } catch {
    return false;
  }
  const host =
    (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
      .split(",")[0]
      ?.trim()
      .toLowerCase() || "";
  if (!host) return false;
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ||
    "https";
  const requestOrigin = `${proto}://${host.split(":")[0]}`;
  // Also accept host:port form when x-forwarded-host omitted
  const altOrigin = `https://${host}`;
  const altHttp = `http://${host}`;
  return origin === requestOrigin || origin === altOrigin || origin === altHttp;
}
