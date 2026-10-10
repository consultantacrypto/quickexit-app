import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUserUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export type KycAuthSource = "session_cookie" | "session_bearer";

export type KycAuthErrorCode =
  | "authentication_required"
  | "identity_mismatch";

export type KycAuthResult =
  | { ok: true; userId: string; source: KycAuthSource }
  | {
      ok: false;
      status: 401 | 403;
      error: KycAuthErrorCode;
      debug: Record<string, unknown>;
    };

export type KycAuthInputs = {
  cookieUserId: string | null;
  bearerUserId: string | null;
  /** Optional compatibility field — never authoritative. */
  bodyUserId: string;
};

/**
 * Pure identity decision for KYC start.
 * Authority: authenticated cookie and/or Bearer only.
 * body.userId is never a fallback; if present it must match the authenticated user.
 */
export function decideKycStartAuth(input: KycAuthInputs): KycAuthResult {
  const trimmedBodyId = input.bodyUserId.trim();
  const cookieUserId = input.cookieUserId?.trim() || null;
  const bearerUserId = input.bearerUserId?.trim() || null;

  const debug: Record<string, unknown> = {
    bodyUserIdPresent: Boolean(trimmedBodyId),
    bodyUserIdValidUuid: trimmedBodyId ? isValidUserUuid(trimmedBodyId) : false,
    cookieUserIdPresent: Boolean(cookieUserId),
    bearerUserIdPresent: Boolean(bearerUserId),
  };

  if (cookieUserId && bearerUserId && cookieUserId !== bearerUserId) {
    return {
      ok: false,
      status: 403,
      error: "identity_mismatch",
      debug: {
        ...debug,
        reason: "cookie_bearer_mismatch",
      },
    };
  }

  const sessionUserId = cookieUserId || bearerUserId;
  const sessionSource: KycAuthSource | null = cookieUserId
    ? "session_cookie"
    : bearerUserId
      ? "session_bearer"
      : null;

  if (!sessionUserId || !sessionSource) {
    return {
      ok: false,
      status: 401,
      error: "authentication_required",
      debug: { ...debug, reason: "no_authenticated_session" },
    };
  }

  if (trimmedBodyId && trimmedBodyId !== sessionUserId) {
    return {
      ok: false,
      status: 403,
      error: "identity_mismatch",
      debug: {
        ...debug,
        reason: "body_user_id_mismatch",
      },
    };
  }

  return { ok: true, userId: sessionUserId, source: sessionSource };
}

function extractBearerToken(request: Request): string | null {
  const authHeader =
    request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

async function getUserIdFromBearer(bearer: string): Promise<{
  userId: string | null;
  error: string | null;
}> {
  let supabaseUrl: string;
  let anonKey: string;
  try {
    supabaseUrl = getSupabaseProjectUrl();
    anonKey = getSupabaseAnonKey();
  } catch (configError) {
    const message =
      configError instanceof Error ? configError.message : "Config Supabase invalidă.";
    return { userId: null, error: message };
  }

  const authSupabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });

  const {
    data: { user },
    error,
  } = await authSupabase.auth.getUser();

  if (error) {
    return { userId: null, error: error.message };
  }
  if (!user?.id?.trim()) {
    return { userId: null, error: "Bearer valid dar fără user.id." };
  }

  return { userId: user.id.trim(), error: null };
}

export async function resolveKycStartUserId(
  request: Request,
  bodyUserId: string
): Promise<KycAuthResult> {
  let cookieUserId: string | null = null;
  let cookieAuthError: string | null = null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      cookieAuthError = error.message;
    } else if (user?.id?.trim()) {
      cookieUserId = user.id.trim();
    } else {
      cookieAuthError = "getUser() fără user (cookie session lipsă sau expirată).";
    }
  } catch (err) {
    cookieAuthError =
      err instanceof Error ? err.message : "Eroare la createServerSupabaseClient.";
  }

  let bearerUserId: string | null = null;
  let bearerAuthError: string | null = null;
  const bearer = extractBearerToken(request);
  if (bearer) {
    const bearerResult = await getUserIdFromBearer(bearer);
    bearerUserId = bearerResult.userId;
    bearerAuthError = bearerResult.error;
  }

  const result = decideKycStartAuth({
    cookieUserId,
    bearerUserId,
    bodyUserId,
  });

  if (!result.ok) {
    return {
      ...result,
      debug: {
        ...result.debug,
        cookieAuthError,
        bearerAuthError,
        hasBearer: Boolean(bearer),
      },
    };
  }

  return result;
}
