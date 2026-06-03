import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/siteUrl";
import { resolveKycStartUserId } from "@/lib/kycStartAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint generic de inițiere KYC — decuplează UI-ul de providerul concret.
// KYC_PROVIDER: "didit" | "stripe" (implicit: "stripe" dacă lipsește sau e invalid).
// IMPORTANT: /api/create-verification-session rămâne intact (rollback Stripe direct).

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

async function startDiditKyc(userId: string) {
  const apiKey = process.env.DIDIT_API_KEY?.trim();
  const workflowId = process.env.DIDIT_WORKFLOW_ID?.trim();
  if (!apiKey || !workflowId) {
    return NextResponse.json(
      {
        error:
          "Config server incompletă: DIDIT_API_KEY sau DIDIT_WORKFLOW_ID lipsește.",
        provider: "didit",
      },
      { status: 500 }
    );
  }

  const baseUrl = getSiteUrl();
  const callback = baseUrl
    ? `${baseUrl}/dashboard?kyc_process=started`
    : undefined;

  const sessionRes = await fetch("https://verification.didit.me/v3/session/", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: userId,
      ...(callback ? { callback } : {}),
    }),
  });

  const sessionData = (await sessionRes.json().catch(() => null)) as {
    verification_url?: string;
    url?: string;
    detail?: string;
    message?: string;
    error?: string;
  } | null;

  if (!sessionRes.ok) {
    console.error("[kyc/start] Didit API error:", {
      status: sessionRes.status,
      body: sessionData,
      userId,
      workflowIdPresent: Boolean(workflowId),
      apiKeyPresent: Boolean(apiKey),
    });
    const diditMessage =
      sessionData?.detail ||
      sessionData?.message ||
      sessionData?.error ||
      "Eroare la crearea sesiunii Didit.";

    return NextResponse.json(
      {
        error: diditMessage,
        provider: "didit",
        upstream: "didit",
        upstreamStatus: sessionRes.status,
      },
      { status: sessionRes.status >= 400 && sessionRes.status < 600 ? sessionRes.status : 502 }
    );
  }

  const verificationUrl =
    sessionData?.verification_url ?? sessionData?.url ?? null;

  if (!verificationUrl) {
    console.error("[kyc/start] Didit răspuns fără verification_url:", sessionData);
    return NextResponse.json(
      {
        error: "Răspuns Didit invalid: lipsește URL-ul de verificare.",
        provider: "didit",
        upstream: "didit",
      },
      { status: 502 }
    );
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
    const bodyUserId =
      body && typeof body.userId === "string" ? body.userId.trim() : "";

    const authResult = await resolveKycStartUserId(request, bodyUserId);

    if (!authResult.ok) {
      console.error("[kyc/start] Auth refuzată:", {
        status: authResult.status,
        error: authResult.error,
        debug: authResult.debug,
        provider,
      });
      return NextResponse.json(
        {
          error: authResult.error,
          provider,
          auth: authResult.debug,
        },
        { status: authResult.status }
      );
    }

    const userId = authResult.userId;

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
        error: message,
        provider,
      },
      { status: 500 }
    );
  }
}
