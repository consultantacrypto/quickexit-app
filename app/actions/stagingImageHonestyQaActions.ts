"use server";

import { resolveHqAdminPageAuth } from "@/lib/hqAdminPageAuth";
import { publicListingKindPayload } from "@/lib/listingInventory";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  IMAGE_HONESTY_QA_MARKER,
  IMAGE_HONESTY_QA_PNG_COLORS,
  IMAGE_HONESTY_QA_TITLE_PREFIX,
  assertStagingImageHonestyPlane,
  buildImageHonestyQaTitle,
  solidPngBytes,
} from "@/lib/stagingImageHonestyQa";

export type ImageHonestyQaFixtureResult = {
  ok: true;
  listingId: string;
  title: string;
  status: string;
  imageUrls: string[];
  storagePaths: string[];
  userId: string;
};

export type ImageHonestyQaActionError = {
  ok: false;
  error: string;
};

/**
 * Creates a Staging-only pending_payment listing with 2 synthetic Storage images.
 * Uses the caller's cookie session (HQ allowlist). Never sets status=active.
 * Never calls Stripe. Refuses Production plane.
 */
export async function createStagingImageHonestyQaFixture(): Promise<
  ImageHonestyQaFixtureResult | ImageHonestyQaActionError
> {
  const plane = assertStagingImageHonestyPlane();
  if (!plane.ok) {
    return { ok: false, error: plane.error };
  }

  const auth = await resolveHqAdminPageAuth();
  if (auth.status !== "authorized") {
    return {
      ok: false,
      error: auth.status === "anon" ? "auth_required" : "forbidden",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    return { ok: false, error: "auth_required" };
  }

  const storagePaths: string[] = [];
  const imageUrls: string[] = [];
  const stamp = Date.now();

  for (let i = 0; i < IMAGE_HONESTY_QA_PNG_COLORS.length; i++) {
    const bytes = solidPngBytes(64, 48, IMAGE_HONESTY_QA_PNG_COLORS[i]!);
    const path = `${user.id}/image-honesty-qa-${stamp}-${i + 1}.png`;
    const { error: uploadError } = await supabase.storage
      .from("listings")
      .upload(path, new Uint8Array(bytes), {
        contentType: "image/png",
        upsert: false,
      });
    if (uploadError) {
      return { ok: false, error: `upload_failed:${uploadError.message}` };
    }
    const { data: pub } = supabase.storage.from("listings").getPublicUrl(path);
    if (!pub.publicUrl.includes("nlnzlswjjplofpkhoxtr")) {
      return { ok: false, error: "upload_url_not_staging" };
    }
    storagePaths.push(path);
    imageUrls.push(pub.publicUrl);
  }

  const title = buildImageHonestyQaTitle(String(stamp));
  const { data: row, error: insertError } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      title,
      status: "pending_payment",
      is_seed: false,
      paid: false,
      category: "auto",
      description:
        "Synthetic Staging Image Honesty QA fixture. pending_payment by design. Safe to delete via HQ cleanup.",
      market_price: 10000,
      exit_price: 8000,
      discount: 20,
      images: imageUrls,
      ...publicListingKindPayload(),
      sale_strategy: "standard",
      details: {
        qa: IMAGE_HONESTY_QA_MARKER,
        synthetic: true,
        storage_paths: storagePaths,
        note: "DELETE_ME",
      },
    })
    .select("id, title, status, user_id")
    .single();

  if (insertError || !row) {
    // Best-effort Storage cleanup if insert fails.
    await supabase.storage.from("listings").remove(storagePaths);
    return {
      ok: false,
      error: `insert_failed:${insertError?.message ?? "no_row"}`,
    };
  }

  return {
    ok: true,
    listingId: row.id,
    title: row.title,
    status: row.status,
    imageUrls,
    storagePaths,
    userId: row.user_id,
  };
}

/**
 * Deletes the HQ-owned Image Honesty QA listing and its Storage objects.
 */
export async function cleanupStagingImageHonestyQaFixture(input: {
  listingId: string;
}): Promise<{ ok: true } | ImageHonestyQaActionError> {
  const plane = assertStagingImageHonestyPlane();
  if (!plane.ok) {
    return { ok: false, error: plane.error };
  }

  const auth = await resolveHqAdminPageAuth();
  if (auth.status !== "authorized") {
    return {
      ok: false,
      error: auth.status === "anon" ? "auth_required" : "forbidden",
    };
  }

  const listingId = String(input.listingId ?? "").trim();
  if (!listingId) {
    return { ok: false, error: "missing_listing_id" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    return { ok: false, error: "auth_required" };
  }

  const { data: row, error: loadError } = await supabase
    .from("listings")
    .select("id, user_id, title, details, images")
    .eq("id", listingId)
    .maybeSingle();

  if (loadError || !row) {
    return { ok: false, error: "listing_not_found" };
  }
  if (row.user_id !== user.id) {
    return { ok: false, error: "forbidden_not_owner" };
  }
  if (!String(row.title ?? "").startsWith(IMAGE_HONESTY_QA_TITLE_PREFIX)) {
    return { ok: false, error: "refused_non_qa_title" };
  }
  const details =
    row.details && typeof row.details === "object"
      ? (row.details as Record<string, unknown>)
      : {};
  if (details.qa !== IMAGE_HONESTY_QA_MARKER) {
    return { ok: false, error: "refused_missing_qa_marker" };
  }

  const fromDetails = Array.isArray(details.storage_paths)
    ? details.storage_paths.filter((p): p is string => typeof p === "string")
    : [];
  const fromImages = Array.isArray(row.images)
    ? row.images
        .map((url) => {
          try {
            const u = new URL(String(url));
            const marker = "/object/public/listings/";
            const idx = u.pathname.indexOf(marker);
            if (idx < 0) return null;
            return decodeURIComponent(u.pathname.slice(idx + marker.length));
          } catch {
            return null;
          }
        })
        .filter((p): p is string => Boolean(p))
    : [];
  const paths = [...new Set([...fromDetails, ...fromImages])];

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("listings")
      .remove(paths);
    if (removeError) {
      return {
        ok: false,
        error: `storage_remove_failed:${removeError.message}`,
      };
    }
  }

  const { error: deleteError } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { ok: false, error: `delete_failed:${deleteError.message}` };
  }

  return { ok: true };
}
