"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Tabelele pe care le poate administra adminul prin aceste acțiuni.
export type AdminTable = "listings" | "demands";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

// Allowlist de admini — aliniat cu restul aplicației (HQ Copilot / hq-admin).
// Suprascriere prin env: HQ_ADMIN_EMAILS="a@x.com,b@y.com".
function getAdminEmails(): string[] {
  return (process.env.HQ_ADMIN_EMAILS || "consultantacrypto.ro@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isValidTable(table: string): table is AdminTable {
  return table === "listings" || table === "demands";
}

/**
 * FILTRU DE SECURITATE STRICT.
 * 1. Validează identitatea utilizatorului cu cheia ANON + access token-ul lui
 *    (NU folosim service role pentru verificare — ar sări peste autentificare).
 * 2. Verifică dacă emailul este în allowlist-ul de admin.
 * 3. Doar dacă ambele trec, returnează un client cu SERVICE_ROLE (bypass RLS).
 * Aruncă o eroare dacă oricare pas eșuează — nimic nu se execută cu service role
 * fără o identitate de admin confirmată.
 */
async function assertAdminAndGetServiceClient(
  accessToken: string
): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Config server incompletă pentru acțiuni admin.");
  }
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Lipsește tokenul de sesiune.");
  }

  // Pasul 1: identitate verificată cu cheia ANON (nu service role).
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(accessToken);

  if (authError || !user) {
    throw new Error("Sesiune invalidă sau expirată.");
  }

  // Pasul 2: gate de admin pe email.
  const email = (user.email || "").trim().toLowerCase();
  if (!getAdminEmails().includes(email)) {
    throw new Error("Acces refuzat: utilizatorul nu este administrator.");
  }

  // Pasul 3: abia acum primim puteri de service role (bypass RLS).
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Update cu degradare a coloanelor opționale (paid / expires_at) dacă lipsesc
// din schemă (PostgREST PGRST204) — nu blocăm activarea din cauza schemei.
async function updateWithColumnFallback(
  supabase: SupabaseClient,
  table: AdminTable,
  id: string,
  fullPayload: Record<string, unknown>
): Promise<{ message: string } | null> {
  const payload: Record<string, unknown> = { ...fullPayload };

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.from(table).update(payload).eq("id", id);
    if (!error) return null;

    let removed = false;
    for (const col of ["paid", "expires_at"]) {
      const msg = (error.message ?? "").toLowerCase();
      const missing = error.code === "PGRST204" || (msg.includes(col) && msg.includes("column"));
      if (col in payload && missing) {
        delete payload[col];
        removed = true;
        break;
      }
    }
    if (!removed) return error;
  }
  return { message: "Update eșuat după mai multe încercări de fallback." };
}

// Bucket-ul unde sunt încărcate pozele anunțurilor (vezi PuneAnuntClient).
const LISTINGS_BUCKET = "listings";
const STORAGE_PUBLIC_MARKER = `/storage/v1/object/public/${LISTINGS_BUCKET}/`;

// Convertește URL-urile publice ale imaginilor anunțului în path-uri de storage
// și le șterge din bucket. Ignoră URL-uri externe (ex. Unsplash seed). Best-effort.
async function cleanupListingImages(supabase: SupabaseClient, id: string): Promise<void> {
  try {
    const { data: row, error } = await supabase
      .from("listings")
      .select("images")
      .eq("id", id)
      .maybeSingle();

    if (error || !row) return;

    const images = Array.isArray((row as { images?: unknown }).images)
      ? ((row as { images: unknown[] }).images)
      : [];

    const paths = images
      .filter((u): u is string => typeof u === "string" && u.includes(STORAGE_PUBLIC_MARKER))
      .map((u) => {
        const afterMarker = u.split(STORAGE_PUBLIC_MARKER)[1] ?? "";
        // eliminăm eventualele query params și decodăm (numele pot fi encodate URL).
        return decodeURIComponent(afterMarker.split("?")[0]);
      })
      .filter((p) => p.length > 0);

    if (paths.length === 0) return;

    const { error: storageError } = await supabase.storage.from(LISTINGS_BUCKET).remove(paths);
    if (storageError) {
      console.error("[adminDeleteListing] curățare storage eșuată (continuăm cu ștergerea rândului):", {
        id,
        error: storageError.message,
      });
    } else {
      console.log("[adminDeleteListing] imagini șterse din storage", { id, count: paths.length });
    }
  } catch (e: unknown) {
    // Nu blocăm ștergerea rândului din cauza unei erori de storage.
    console.error(
      "[adminDeleteListing] excepție la curățarea storage (ignorată):",
      e instanceof Error ? e.message : e
    );
  }
}

/**
 * Șterge DEFINITIV un rând din `listings` sau `demands` (admin only, bypass RLS).
 * Pentru `listings`, curăță și imaginile din Storage.
 */
export async function adminDeleteListing(
  id: string,
  table: AdminTable,
  accessToken: string
): Promise<AdminActionResult> {
  try {
    if (!id || !isValidTable(table)) {
      return { ok: false, error: "Parametri invalizi (id/table)." };
    }

    const supabase = await assertAdminAndGetServiceClient(accessToken);

    // Pentru listări: curățăm imaginile din Storage (bucket "listings") înainte de
    // a șterge rândul, ca să nu rămână orphan data / cost de stocare. Best-effort —
    // dacă ștergerea din storage eșuează, tot ștergem rândul, dar logăm.
    if (table === "listings") {
      await cleanupListingImages(supabase, id);
    }

    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      console.error("[adminDeleteListing] eroare ștergere:", { table, id, error: error.message });
      return { ok: false, error: error.message };
    }

    console.log("[adminDeleteListing] rând șters", { table, id });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Eroare necunoscută.";
    console.error("[adminDeleteListing] excepție:", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Forțează publicarea unui rând: status="active", paid=true, expires_at = azi + 30 zile.
 * Admin only, bypass RLS.
 */
export async function adminForcePublish(
  id: string,
  table: AdminTable,
  accessToken: string
): Promise<AdminActionResult> {
  try {
    if (!id || !isValidTable(table)) {
      return { ok: false, error: "Parametri invalizi (id/table)." };
    }

    const supabase = await assertAdminAndGetServiceClient(accessToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const updateError = await updateWithColumnFallback(supabase, table, id, {
      status: "active",
      paid: true,
      expires_at: expiresAt.toISOString(),
    });

    if (updateError) {
      console.error("[adminForcePublish] eroare update:", { table, id, error: updateError.message });
      return { ok: false, error: updateError.message };
    }

    console.log("[adminForcePublish] rând publicat forțat", { table, id, expiresAt: expiresAt.toISOString() });
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Eroare necunoscută.";
    console.error("[adminForcePublish] excepție:", msg);
    return { ok: false, error: msg };
  }
}
