import { NextResponse } from "next/server";
import { getSiteUrl } from "@/lib/siteUrl";

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
    console.error("[kyc/start] Didit session error:", sessionRes.status, sessionData);
    return NextResponse.json(
      {
        error:
          sessionData?.detail ||
          sessionData?.message ||
          sessionData?.error ||
          "Eroare la crearea sesiunii Didit.",
        provider: "didit",
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
  try {
    const body = await request.json().catch(() => null);
    const userId = body && typeof body.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json(
        { error: "ID-ul utilizatorului este obligatoriu" },
        { status: 400 }
      );
    }

    const provider = getKycProvider();

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
    console.error("[kyc/start] Eroare inițiere KYC:", error);
    return NextResponse.json(
      {
        error: message,
        provider: getKycProvider(),
      },
      { status: 500 }
    );
  }
}
