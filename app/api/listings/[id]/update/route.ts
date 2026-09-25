import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
import { parseCryptoPayment } from "@/lib/cryptoPayment";
import { payloadAttemptsInventoryReclassification } from "@/lib/listingInventory";
import {
  applyListingLocationToDetails,
  locationFromFormData,
} from "@/lib/listingLocation";

function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const listingId = String(id ?? "").trim();
    if (!listingId) {
      return NextResponse.json({ error: "ID invalid." }, { status: 400 });
    }

    const bearer = extractBearerToken(req);
    if (!bearer) {
      return NextResponse.json({ error: "Autentificare necesară." }, { status: 401 });
    }

    let supabaseUrl: string;
    let anonKey: string;
    try {
      supabaseUrl = getSupabaseProjectUrl();
      anonKey = getSupabaseAnonKey();
    } catch {
      return NextResponse.json({ error: "Config server incompletă." }, { status: 500 });
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
      return NextResponse.json({ error: "Sesiune invalidă." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    }
    if (payloadAttemptsInventoryReclassification(body)) {
      return NextResponse.json({ error: "Tipul de inventar nu poate fi schimbat din editor." }, { status: 400 });
    }

    const detailsIn =
      body.details && typeof body.details === "object" && !Array.isArray(body.details)
        ? (body.details as Record<string, unknown>)
        : null;
    if (!detailsIn) {
      return NextResponse.json({ error: "Detaliile anunțului lipsesc." }, { status: 400 });
    }

    const locationCheck = locationFromFormData({
      country_code: typeof detailsIn.country_code === "string" ? detailsIn.country_code : "RO",
      county:
        typeof detailsIn.county === "string"
          ? detailsIn.county
          : typeof detailsIn.region === "string"
            ? detailsIn.region
            : "",
      city: typeof detailsIn.city === "string" ? detailsIn.city : "",
      district: typeof detailsIn.district === "string" ? detailsIn.district : "",
    });
    if (!locationCheck.ok) {
      return NextResponse.json(
        { error: locationCheck.error, code: "missing_listing_location" },
        { status: 400 },
      );
    }

    const { data: existing, error: existingError } = await authSupabase
      .from("listings")
      .select("id, user_id, details")
      .eq("id", listingId)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: "Anunțul nu a fost găsit." }, { status: 404 });
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Nu poți edita acest anunț." }, { status: 403 });
    }

    const mergedDetails = applyListingLocationToDetails(
      { ...detailsIn },
      locationCheck.location,
    );

    const updatePayload: Record<string, unknown> = {
      details: mergedDetails,
    };
    if (typeof body.title === "string") updatePayload.title = body.title;
    if (typeof body.description === "string") updatePayload.description = body.description;
    if (Array.isArray(body.images)) updatePayload.images = body.images;
    if ("exit_price" in body) updatePayload.exit_price = body.exit_price;
    if ("market_price" in body) updatePayload.market_price = body.market_price;
    if ("discount" in body) updatePayload.discount = body.discount;
    if ("deal_score" in body) updatePayload.deal_score = body.deal_score;
    if ("crypto_payment_mode" in body || "crypto_assets" in body) {
      const crypto = parseCryptoPayment(body.crypto_payment_mode, body.crypto_assets);
      if (!crypto.ok) {
        return NextResponse.json({ error: "Opțiunea crypto este invalidă." }, { status: 400 });
      }
      updatePayload.crypto_payment_mode = crypto.value.mode;
      updatePayload.crypto_assets = crypto.value.assets;
    }

    const { error: updateError } = await authSupabase
      .from("listings")
      .update(updatePayload)
      .eq("id", listingId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Eroare la salvare." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Eroare la salvare." }, { status: 500 });
  }
}
