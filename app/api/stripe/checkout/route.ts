import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/siteUrl";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
import { resolveListingPackageIdFromRow, validatePersistedSaleIntent } from "@/lib/listingSaleStrategy";
import {
  getPackageByPriceId,
  getPriceIdForPackageId,
  type ListingPackageId,
} from "@/lib/stripePackages";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

function resolveListingPackageId(listing: {
  sale_strategy?: string | null;
  details?: unknown;
}): ListingPackageId | null {
  return resolveListingPackageIdFromRow(listing);
}

export async function POST(req: Request) {
  try {
    const stripeApiKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeApiKey) {
      return NextResponse.json(
        { error: "Config server incompletă: STRIPE_SECRET_KEY lipsește." },
        { status: 500 },
      );
    }

    const bearer = extractBearerToken(req);
    if (!bearer) {
      return NextResponse.json(
        { error: "Autentificare necesară pentru checkout." },
        { status: 401 },
      );
    }

    let supabaseUrl: string;
    let anonKey: string;
    try {
      supabaseUrl = getSupabaseProjectUrl();
      anonKey = getSupabaseAnonKey();
    } catch {
      return NextResponse.json(
        { error: "Config server incompletă: Supabase." },
        { status: 500 },
      );
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
      return NextResponse.json(
        { error: "Sesiune invalidă. Te rugăm să te autentifici din nou." },
        { status: 401 },
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Config server incompletă: SUPABASE_SERVICE_ROLE_KEY lipsește." },
        { status: 500 },
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const baseUrl = getSiteUrl();
    const stripe = new Stripe(stripeApiKey, {
      apiVersion: "2023-10-16" as any,
    });

    const body = await req.json().catch(() => null);
    const type = body?.type === "demand" ? "demand" : "listing";
    const listingId = String(body?.listingId ?? "").trim();
    const demandId = String(body?.demandId ?? "").trim();
    const clientPriceId = String(body?.priceId ?? "").trim();

    let priceId = "";
    let objectId = "";
    const checkoutMetadata: Record<string, string> = {
      type,
      listingId: "",
      demandId: "",
      userId: user.id,
      priceId: "",
    };

    if (type === "listing") {
      if (!listingId) {
        return NextResponse.json(
          { error: "Date invalide: listingId este obligatoriu." },
          { status: 400 },
        );
      }

      const { data: listingRow, error: listingError } = await adminSupabase
        .from("listings")
        .select("id, user_id, status, is_seed, sale_strategy, details")
        .eq("id", listingId)
        .maybeSingle();

      if (listingError || !listingRow) {
        return NextResponse.json(
          { error: "Anunțul nu a fost găsit." },
          { status: 404 },
        );
      }

      if (listingRow.user_id !== user.id) {
        return NextResponse.json(
          { error: "Nu poți plăti pentru un anunț care nu îți aparține." },
          { status: 403 },
        );
      }

      if (listingRow.is_seed === true) {
        return NextResponse.json(
          { error: "Anunț invalid pentru plată." },
          { status: 400 },
        );
      }

      if (listingRow.status === "active") {
        return NextResponse.json(
          { error: "Anunțul este deja activ. Nu este necesară o nouă plată." },
          { status: 409 },
        );
      }

      if (listingRow.status !== "pending_payment") {
        return NextResponse.json(
          { error: "Anunțul nu este în așteptarea plății." },
          { status: 409 },
        );
      }

      const packageId = resolveListingPackageId(listingRow);
      const derivedPriceId = packageId ? getPriceIdForPackageId(packageId) : null;
      const saleIntent = validatePersistedSaleIntent(listingRow);
      if (!saleIntent.ok) {
        return NextResponse.json(
          { error: saleIntent.error.message, code: saleIntent.error.code },
          { status: 400 },
        );
      }
      if (!packageId || !derivedPriceId || saleIntent.state.packageId !== packageId) {
        return NextResponse.json(
          { error: "Pachet invalid pentru plată. Te rugăm să reîncerci." },
          { status: 400 },
        );
      }

      if (clientPriceId && clientPriceId !== derivedPriceId) {
        return NextResponse.json(
          { error: "Pachet invalid: priceId necunoscut." },
          { status: 400 },
        );
      }

      // Price is always derived server-side from the listing package — never from client amount.
      priceId = derivedPriceId;
      objectId = listingId;
      checkoutMetadata.listingId = listingId;
      checkoutMetadata.priceId = priceId;
      checkoutMetadata.packageId = saleIntent.state.packageId;
      checkoutMetadata.saleMethod = saleIntent.state.saleMethod;

      const details = listingRow.details as Record<string, unknown> | null;
      if (details?.acquisition_source === "evaluation") {
        checkoutMetadata.acquisition_source = "evaluation";
        const priceType = String(details.selected_price_type ?? "").trim().slice(0, 40);
        if (priceType) checkoutMetadata.selected_price_type = priceType;
        const prefillLevel = String(details.prefill_level ?? "").trim().slice(0, 40);
        if (prefillLevel) checkoutMetadata.prefill_level = prefillLevel;
      }
    } else {
      if (!demandId) {
        return NextResponse.json(
          { error: "Date invalide: demandId este obligatoriu." },
          { status: 400 },
        );
      }

      const { data: demandRow, error: demandError } = await adminSupabase
        .from("demands")
        .select("id, buyer_id, status")
        .eq("id", demandId)
        .maybeSingle();

      if (demandError || !demandRow) {
        return NextResponse.json(
          { error: "Cererea nu a fost găsită." },
          { status: 404 },
        );
      }

      if (demandRow.buyer_id !== user.id) {
        return NextResponse.json(
          { error: "Nu poți plăti pentru o cerere care nu îți aparține." },
          { status: 403 },
        );
      }

      if (demandRow.status === "active") {
        return NextResponse.json(
          { error: "Cererea este deja activă. Nu este necesară o nouă plată." },
          { status: 409 },
        );
      }

      if (demandRow.status !== "pending_payment") {
        return NextResponse.json(
          { error: "Cererea nu este în așteptarea plății." },
          { status: 409 },
        );
      }

      const derivedDemandPriceId = getPriceIdForPackageId("demand");
      if (!derivedDemandPriceId) {
        return NextResponse.json(
          { error: "Pachet invalid pentru plată. Te rugăm să reîncerci." },
          { status: 400 },
        );
      }

      // Prefer server-derived demand price; reject mismatched client priceId if provided.
      if (clientPriceId && clientPriceId !== derivedDemandPriceId) {
        return NextResponse.json(
          { error: "Pachet invalid: priceId necunoscut." },
          { status: 400 },
        );
      }

      priceId = derivedDemandPriceId;
      objectId = demandId;
      checkoutMetadata.demandId = demandId;
      checkoutMetadata.priceId = priceId;
    }

    const pkg = getPackageByPriceId(priceId);
    if (!pkg || !objectId) {
      return NextResponse.json(
        { error: "Pachet invalid: priceId necunoscut." },
        { status: 400 },
      );
    }

    const successQuery =
      type === "demand"
        ? `payment=success&type=demand&demandId=${demandId}`
        : `payment=success&type=listing&listingId=${listingId}`;
    const cancelQuery =
      type === "demand"
        ? `payment=cancel&type=demand&demandId=${demandId}`
        : `payment=cancel&type=listing&listingId=${listingId}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: pkg.priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?${successQuery}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard?${cancelQuery}`,
      metadata: checkoutMetadata,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error("[stripe/checkout] Eroare la generarea sesiunii:", error?.message ?? error);
    return NextResponse.json(
      { error: error?.message ?? "Eroare internă la inițializarea plății." },
      { status: 500 },
    );
  }
}
