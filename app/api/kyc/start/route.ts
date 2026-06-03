import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSiteUrl } from "@/lib/siteUrl";

// Endpoint generic de inițiere KYC — decuplează UI-ul de providerul concret.
// Provider selectat prin env: KYC_PROVIDER = "stripe" | "didit" (default: "stripe").
// DIDIT_ENABLED gardează activarea Didit (default: "false").
//
// IMPORTANT: ruta veche /api/create-verification-session rămâne intactă (rollback).

type KycProvider = "stripe" | "didit";

function resolveProvider(): KycProvider {
  const raw = (process.env.KYC_PROVIDER || "stripe").trim().toLowerCase();
  return raw === "didit" ? "didit" : "stripe";
}

function isDiditEnabled(): boolean {
  return (process.env.DIDIT_ENABLED || "false").trim().toLowerCase() === "true";
}

// Aceeași logică Stripe Identity ca în /api/create-verification-session,
// întoarcem același format așteptat de UI: { url }.
async function startStripeKyc(userId: string) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Config server incompletă: STRIPE_SECRET_KEY lipsește." },
      { status: 500 }
    );
  }

  const baseUrl = getSiteUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Config server incompletă: NEXT_PUBLIC_BASE_URL lipsește." },
      { status: 500 }
    );
  }

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

  return NextResponse.json({ url: verificationSession.url });
}

async function startDiditKyc(userId: string) {
  if (!isDiditEnabled()) {
    return NextResponse.json(
      { error: "Providerul Didit nu este activat (DIDIT_ENABLED=false)." },
      { status: 503 }
    );
  }

  const apiKey = process.env.DIDIT_API_KEY?.trim();
  const workflowId = process.env.DIDIT_WORKFLOW_ID?.trim();
  if (!apiKey || !workflowId) {
    return NextResponse.json(
      {
        error:
          "Config server incompletă: DIDIT_API_KEY sau DIDIT_WORKFLOW_ID lipsește.",
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
      },
      { status: sessionRes.status >= 400 && sessionRes.status < 600 ? sessionRes.status : 502 }
    );
  }

  const verificationUrl =
    sessionData?.verification_url ?? sessionData?.url ?? null;

  if (!verificationUrl) {
    console.error("[kyc/start] Didit răspuns fără verification_url:", sessionData);
    return NextResponse.json(
      { error: "Răspuns Didit invalid: lipsește URL-ul de verificare." },
      { status: 502 }
    );
  }

  return NextResponse.json({ url: verificationUrl });
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

    const provider = resolveProvider();

    if (provider === "didit") {
      return await startDiditKyc(userId);
    }

    return await startStripeKyc(userId);
  } catch (error: any) {
    console.error("[kyc/start] Eroare inițiere KYC:", error);
    return NextResponse.json(
      { error: error?.message || "Eroare la inițierea verificării." },
      { status: 500 }
    );
  }
}
