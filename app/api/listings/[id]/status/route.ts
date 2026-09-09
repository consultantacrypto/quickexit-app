import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
import { publicationLocationFromDetails } from "@/lib/listingLocation";

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
    const nextStatus = body && typeof body === "object" ? String((body as { status?: unknown }).status ?? "") : "";
    if (nextStatus !== "active" && nextStatus !== "suspended") {
      return NextResponse.json({ error: "Status invalid." }, { status: 400 });
    }

    const { data: existing, error: existingError } = await authSupabase
      .from("listings")
      .select("id, user_id, status, details, expires_at")
      .eq("id", listingId)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: "Anunțul nu a fost găsit." }, { status: 404 });
    }
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Nu poți actualiza acest anunț." }, { status: 403 });
    }

    if (nextStatus === "active") {
      const locationCheck = publicationLocationFromDetails(existing.details);
      if (!locationCheck.ok) {
        return NextResponse.json(
          { error: locationCheck.error, code: "missing_listing_location" },
          { status: 400 },
        );
      }
      if (existing.expires_at && new Date(String(existing.expires_at)) < new Date()) {
        return NextResponse.json(
          { error: "Perioada plătită a expirat. Reînnoiește pachetul pentru a reactiva acest anunț." },
          { status: 400 },
        );
      }
    }

    const { error: updateError } = await authSupabase
      .from("listings")
      .update({ status: nextStatus })
      .eq("id", listingId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Eroare la actualizare." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch {
    return NextResponse.json({ error: "Eroare la actualizare." }, { status: 500 });
  }
}
