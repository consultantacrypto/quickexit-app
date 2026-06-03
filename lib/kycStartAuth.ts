import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUserUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export type KycAuthSource = "session_cookie" | "session_bearer" | "body_fallback";

export type KycAuthResult =
  | { ok: true; userId: string; source: KycAuthSource }
  | {
      ok: false;
      status: number;
      error: string;
      debug: Record<string, unknown>;
    };

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anonKey) {
    return {
      userId: null,
      error: "Config Supabase incompletă pentru validare Bearer.",
    };
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
  const trimmedBodyId = bodyUserId.trim();
  const debug: Record<string, unknown> = {
    bodyUserIdPresent: Boolean(trimmedBodyId),
    bodyUserIdValidUuid: trimmedBodyId ? isValidUserUuid(trimmedBodyId) : false,
    hasBearer: Boolean(extractBearerToken(request)),
  };

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

  debug.cookieAuthError = cookieAuthError;
  debug.cookieUserIdPresent = Boolean(cookieUserId);

  let bearerUserId: string | null = null;
  let bearerAuthError: string | null = null;
  const bearer = extractBearerToken(request);
  if (bearer) {
    const bearerResult = await getUserIdFromBearer(bearer);
    bearerUserId = bearerResult.userId;
    bearerAuthError = bearerResult.error;
  }

  debug.bearerAuthError = bearerAuthError;
  debug.bearerUserIdPresent = Boolean(bearerUserId);

  const sessionUserId = cookieUserId || bearerUserId;
  const sessionSource: KycAuthSource | null = cookieUserId
    ? "session_cookie"
    : bearerUserId
      ? "session_bearer"
      : null;

  if (sessionUserId) {
    if (trimmedBodyId && trimmedBodyId !== sessionUserId) {
      return {
        ok: false,
        status: 403,
        error: "userId din request nu corespunde sesiunii autentificate.",
        debug: { ...debug, reason: "user_id_mismatch", sessionUserId, trimmedBodyId },
      };
    }
    return { ok: true, userId: sessionUserId, source: sessionSource! };
  }

  if (trimmedBodyId && isValidUserUuid(trimmedBodyId)) {
    console.warn(
      "[kyc/start] Fallback auth: folosim userId din body (fără sesiune server validă).",
      debug
    );
    return { ok: true, userId: trimmedBodyId, source: "body_fallback" };
  }

  if (trimmedBodyId && !isValidUserUuid(trimmedBodyId)) {
    return {
      ok: false,
      status: 400,
      error: "userId invalid — trebuie să fie un UUID valid.",
      debug: { ...debug, reason: "invalid_uuid" },
    };
  }

  return {
    ok: false,
    status: 401,
    error:
      "Autentificare necesară. Reîncarcă pagina sau reconectează-te, apoi încearcă din nou.",
    debug: { ...debug, reason: "no_session_and_no_valid_body_user_id" },
  };
}
