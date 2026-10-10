import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/siteUrl";
import { resolveKycStartUserId } from "@/lib/kycStartAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint generic de inițiere KYC — decuplează UI-ul de providerul concret.
// KYC_PROVIDER: "didit" | "stripe" (implicit: "stripe" dacă lipsește sau e invalid).
// Identity: authenticated cookie and/or Bearer only — never body.userId as authority.
// Legacy /api/create-verification-session is retired (410 Gone).

type KycProvider = "stripe" | "didit";

function normalizeEnvValue(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase();
}

function getKycProvider(): KycProvider {
  const raw = normalizeEnvValue(process.env.KYC_PROVIDER);
  return raw === "didit" ? "didit" : "stripe";
}

/** ID-uri aplicație Quick Exit din consola Didit (override prin env pe Vercel). */
const DEFAULT_DIDIT_APPLICATION_ID = "2930d050-3f93-47c1-b595-30ebaf407db3";
const DEFAULT_DIDIT_ORGANIZATION_ID = "2e3455b4-a04f-4ffd-8171-e9550bb148a2";

function resolveDiditApplicationId(): string {
  return (
    process.env.DIDIT_APPLICATION_ID?.trim() || DEFAULT_DIDIT_APPLICATION_ID
  );
}

function resolveDiditOrganizationId(): string {
  return (
    process.env.DIDIT_ORGANIZATION_ID?.trim() || DEFAULT_DIDIT_ORGANIZATION_ID
  );
}

/** Parsează body Didit: JSON dacă e posibil, altfel text brut. */
function parseDiditResponseBody(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

/** Non-sensitive session id for server logs only — never return upstream bodies to clients. */
function extractDiditSessionId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const id = record.session_id ?? record.id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

function diditProviderErrorResponse(status: number) {
  return NextResponse.json(
    { error: "kyc_provider_error", provider: "didit" },
    { status }
  );
}

async function startDiditKyc(userId: string) {
  const apiKey = process.env.DIDIT_API_KEY?.trim();
  const workflowId = process.env.DIDIT_WORKFLOW_ID?.trim();
  const applicationId = resolveDiditApplicationId();
  const organizationId = resolveDiditOrganizationId();

  if (!apiKey || !workflowId) {
    console.error("[kyc/start] Didit misconfigured:", {
      provider: "didit",
      failureClass: "missing_credentials",
      workflowIdPresent: Boolean(workflowId),
      apiKeyPresent: Boolean(apiKey),
    });
    return diditProviderErrorResponse(500);
  }

  const baseUrl = getSiteUrl();
  const callback = baseUrl
    ? `${baseUrl}/dashboard?kyc_process=started`
    : undefined;

  const diditSessionBody = {
    workflow_id: workflowId,
    vendor_data: userId,
    application_id: applicationId,
    organization_id: organizationId,
    ...(callback ? { callback } : {}),
  };

  let sessionRes: Response;
  try {
    sessionRes = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "X-App-Id": applicationId,
        "X-Organization-Id": organizationId,
      },
      body: JSON.stringify(diditSessionBody),
    });
  } catch (fetchError: unknown) {
    const message =
      fetchError instanceof Error ? fetchError.message : "network_error";
    console.error("[kyc/start] Didit fetch failed:", {
      provider: "didit",
      failureClass: "network_error",
      message,
      userId,
    });
    return diditProviderErrorResponse(502);
  }

  const rawText = await sessionRes.text();
  const parsedBody = parseDiditResponseBody(rawText);
  const providerSessionId = extractDiditSessionId(parsedBody);

  if (!sessionRes.ok) {
    console.error("[kyc/start] Didit API error:", {
      provider: "didit",
      failureClass: "upstream_http_error",
      diditStatus: sessionRes.status,
      providerSessionId,
      rawTextLength: rawText.length,
      userId,
      workflowIdPresent: Boolean(workflowId),
      apiKeyPresent: Boolean(apiKey),
      applicationId,
      organizationId,
      callbackPresent: Boolean(callback),
    });
    return diditProviderErrorResponse(
      sessionRes.status >= 400 && sessionRes.status < 600
        ? sessionRes.status
        : 502
    );
  }

  const sessionData = parsedBody as {
    verification_url?: string;
    url?: string;
  } | null;

  const verificationUrl =
    sessionData &&
    typeof sessionData === "object" &&
    !Array.isArray(sessionData)
      ? sessionData.verification_url ?? sessionData.url ?? null
      : null;

  if (!verificationUrl) {
    console.error("[kyc/start] Didit response missing verification_url:", {
      provider: "didit",
      failureClass: "missing_verification_url",
      diditStatus: sessionRes.status,
      providerSessionId,
      rawTextLength: rawText.length,
      userId,
    });
    return diditProviderErrorResponse(502);
  }

  return NextResponse.json({ url: verificationUrl, provider: "didit" });
}

async function startStripeKyc(userId: string) {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    return NextResponse.json(
      {
        error: "Config server incompletă: STRIPE_SECRET_KEY lipsește.",
        provider: "stripe",
      },
      { status: 500 }
    );
  }

  const baseUrl = getSiteUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error: "Config server incompletă: NEXT_PUBLIC_BASE_URL lipsește.",
        provider: "stripe",
      },
      { status: 500 }
    );
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16" as any,
  });

  const verificationSession = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: {
      userId,
    },
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
    return_url: `${baseUrl}/dashboard?kyc_process=started`,
  });

  return NextResponse.json({ url: verificationSession.url, provider: "stripe" });
}

export async function POST(request: Request) {
  const provider = getKycProvider();

  try {
    const body = await request.json().catch(() => null);
    // Compatibility only: if a client still sends userId, it must match the
    // authenticated session. It is never authoritative and never a fallback.
    const bodyUserId =
      body && typeof body.userId === "string" ? body.userId.trim() : "";

    const authResult = await resolveKycStartUserId(request, bodyUserId);

    if (!authResult.ok) {
      console.error("[kyc/start] Auth refuzată:", {
        route: "/api/kyc/start",
        provider,
        status: authResult.status,
        error: authResult.error,
        reason: authResult.debug.reason ?? null,
        authSourceHints: {
          cookieUserIdPresent: authResult.debug.cookieUserIdPresent,
          bearerUserIdPresent: authResult.debug.bearerUserIdPresent,
          bodyUserIdPresent: authResult.debug.bodyUserIdPresent,
        },
      });
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const userId = authResult.userId;
    console.log("[kyc/start] Auth OK:", {
      route: "/api/kyc/start",
      provider,
      userId,
      source: authResult.source,
    });

    switch (provider) {
      case "didit":
        return await startDiditKyc(userId);
      case "stripe":
        return await startStripeKyc(userId);
      default:
        return await startStripeKyc(userId);
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Eroare la inițierea verificării.";
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[kyc/start] Eroare neașteptată:", {
      message,
      stack,
      provider,
      supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      kycProviderEnv: process.env.KYC_PROVIDER ?? null,
      diditKeyPresent: Boolean(process.env.DIDIT_API_KEY),
      stripeKeyPresent: Boolean(process.env.STRIPE_SECRET_KEY),
    });

    return NextResponse.json(
      {
        error: "kyc_start_failed",
        provider,
      },
      { status: 500 }
    );
  }
}
