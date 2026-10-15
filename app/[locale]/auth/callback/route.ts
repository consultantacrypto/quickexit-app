import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeInternalPath } from "@/lib/authRedirect";
import { ensureProfileRow } from "@/lib/authIdentity/ensureProfile";
import { classifyAuthCollision } from "@/lib/authIdentity/providers";
import { logAuthIdentity } from "@/lib/authIdentity/log";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";

/**
 * Server-side PKCE code exchange — writes Supabase auth cookies for SSR getUser().
 * Phase 1A: ensure profiles row exists; map identity collisions to clear UX params.
 *
 * Implicit/hash magic-link returns are not visible server-side. When `code` is absent,
 * return a tiny HTML bounce that preserves the fragment and hands off to the client
 * Supabase session detector + AuthHashCleaner (never drop tokens via 30x redirect).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> }
) {
  const { locale: localeParam } = await context.params;
  const locale = localeParam === "en" ? "en" : "ro";
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"), "/dashboard");
  const origin = url.origin.replace(/\/+$/, "");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const redirectAuthError = (kind: "error" | "identity_conflict") =>
    NextResponse.redirect(`${origin}/${locale}?auth=${kind}`);

  if (errorParam || errorDescription) {
    const collision = classifyAuthCollision(errorDescription || errorParam);
    if (collision === "identity_owned_elsewhere") {
      logAuthIdentity("collision", "conflict", {
        reason: "provider_error_param",
      });
      return redirectAuthError("identity_conflict");
    }
    logAuthIdentity("auth_callback", "denied", { reason: "oauth_error_param" });
    return redirectAuthError("error");
  }

  if (!code) {
    // Hash tokens never reach the server. Bounce client-side preserving location.hash.
    const safeNextJson = JSON.stringify(`${origin}${next}`);
    const errorJson = JSON.stringify(`${origin}/${locale}?auth=error`);
    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8"/>
  <meta name="robots" content="noindex"/>
  <title>Signing in…</title>
</head>
<body>
  <p>Signing in…</p>
  <script>
    (function () {
      var hash = window.location.hash || "";
      var nextUrl = ${safeNextJson};
      var errUrl = ${errorJson};
      if (hash.indexOf("access_token") !== -1 || hash.indexOf("refresh_token") !== -1) {
        window.location.replace(nextUrl + hash);
        return;
      }
      window.location.replace(errUrl);
    })();
  </script>
</body>
</html>`;
    logAuthIdentity("auth_callback", "success", {
      reason: "implicit_hash_bounce",
    });
    return new NextResponse(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const redirectTarget = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectTarget.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            redirectTarget.headers.set(key, value);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const collision = classifyAuthCollision(error.message);
    if (collision === "identity_owned_elsewhere") {
      logAuthIdentity("collision", "conflict", {
        reason: "exchange_identity_conflict",
      });
      return redirectAuthError("identity_conflict");
    }
    logAuthIdentity("auth_callback", "error", {
      error_code: "exchange_failed",
    });
    return redirectAuthError("error");
  }

  const userId = data.user?.id?.trim() || data.session?.user?.id?.trim();
  if (userId) {
    await ensureProfileRow(supabase, userId);
  }

  logAuthIdentity("auth_callback", "success", {
    reason: "session_established",
  });
  return redirectTarget;
}
