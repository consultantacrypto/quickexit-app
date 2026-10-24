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

/**
 * Owner pause/resume only.
 * - active → suspended (pause)
 * - suspended → active when expires_at is present and still in the future (resume)
 * Never activates pending_payment or other unpaid intermediate statuses.
 * Privileged unpaid publish remains HQ Force Publish / Force Activate (service_role).
 */
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
    const nextStatus =
      body && typeof body === "object"
        ? String((body as { status?: unknown }).status ?? "")
        : "";
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

    const currentStatus = String(existing.status ?? "").trim().toLowerCase();

    if (nextStatus === "suspended") {
      if (currentStatus !== "active") {
        return NextResponse.json(
          {
            error: "Doar anunțurile active pot fi suspendate.",
            code: "invalid_status_transition",
          },
          { status: 400 },
        );
      }
    }

    if (nextStatus === "active") {
      if (currentStatus !== "suspended") {
        return NextResponse.json(
          {
            error:
              "Reactivarea este permisă doar din suspendat, după publicare verificată.",
            code: "invalid_status_transition",
          },
          { status: 400 },
        );
      }

      const locationCheck = publicationLocationFromDetails(existing.details);
      if (!locationCheck.ok) {
        return NextResponse.json(
          { error: locationCheck.error, code: "missing_listing_location" },
          { status: 400 },
        );
      }

      if (!existing.expires_at) {
        return NextResponse.json(
          {
            error:
              "Anunțul nu are o fereastră de publicare validă. Publicarea se face prin plată sau HQ.",
            code: "missing_publication_window",
          },
          { status: 400 },
        );
      }
      if (new Date(String(existing.expires_at)) < new Date()) {
        return NextResponse.json(
          {
            error:
              "Perioada plătită a expirat. Reînnoiește pachetul pentru a reactiva acest anunț.",
            code: "publication_expired",
          },
          { status: 400 },
        );
      }
    }

    const { data: updated, error: updateError } = await authSupabase
      .from("listings")
      .update({ status: nextStatus })
      .eq("id", listingId)
      .eq("user_id", user.id)
      .select("id, status")
      .maybeSingle();

    if (updateError) {
      const msg = String(updateError.message ?? "");
      if (msg.includes("QEX:publication_forbidden") || updateError.code === "42501") {
        return NextResponse.json(
          { error: "Tranziție de status nepermisă.", code: "publication_forbidden" },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: "Eroare la actualizare." }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Eroare la actualizare." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: updated.status });
  } catch {
    return NextResponse.json({ error: "Eroare la actualizare." }, { status: 500 });
  }
}
