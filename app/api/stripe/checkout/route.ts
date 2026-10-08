import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/siteUrl";
import { getSupabaseAnonKey, getSupabaseProjectUrl } from "@/lib/supabase/config";
import { resolveListingPackageIdFromRow, validatePersistedSaleIntent } from "@/lib/listingSaleStrategy";
import { publicationLocationFromDetails } from "@/lib/listingLocation";
import {
  getPackageByPriceId,
  getPriceIdForPackageId,
  type ListingPackageId,
} from "@/lib/stripePackages";
import {
  resolveMediaCheckoutEligibility,
  type MediaPackageId,
  type MediaValueTier,
} from "@/lib/mediaPricing";
import {
  assertListingAndMediaCurrencyCompatible,
  buildCombinedListingMediaLineItems,
  buildCombinedMediaCheckoutMetadata,
  buildListingOnlyLineItems,
  buildMediaCheckoutIdempotencyKey,
  cancelMediaOrderAfterFailure,
  isMediaCheckoutEnabled,
  parseCheckoutMediaPackage,
  persistMediaCheckoutSessionId,
  preparePendingMediaOrder,
} from "@/lib/mediaCheckout";

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

function parseCheckoutLocale(value: unknown): "ro" | "en" {
  return value === "en" ? "en" : "ro";
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
      // Keep existing Production API version pin (do not upgrade solely for Phase 2D).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pinned legacy Stripe API version
      apiVersion: "2023-10-16" as any,
    });

    const body = await req.json().catch(() => null);
    const type = body?.type === "demand" ? "demand" : "listing";
    const listingId = String(body?.listingId ?? "").trim();
    const demandId = String(body?.demandId ?? "").trim();
    const clientPriceId = String(body?.priceId ?? "").trim();
    const checkoutLocale = parseCheckoutLocale(body?.locale);
    const mediaPackageParsed = parseCheckoutMediaPackage(body?.mediaPackage);
    const clientExpectedMediaAmount =
      body?.expectedMediaAmountRon === undefined || body?.expectedMediaAmountRon === null
        ? null
        : Number(body.expectedMediaAmountRon);

    let priceId = "";
    let objectId = "";
    const checkoutMetadata: Record<string, string> = {
      type,
      listingId: "",
      demandId: "",
      userId: user.id,
      priceId: "",
    };

    // Combined Media only applies to listing checkout.
    let mediaAttach: {
      mediaOrderId: string;
      mediaPackage: MediaPackageId;
      quoteAmountRon: number;
      mediaTier: MediaValueTier;
      lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
      idempotencyKey: string;
    } | null = null;

    if (type === "listing") {
      if (!listingId) {
        return NextResponse.json(
          { error: "Date invalide: listingId este obligatoriu." },
          { status: 400 },
        );
      }

      if (mediaPackageParsed === "invalid") {
        return NextResponse.json(
          { error: "Pachet Media invalid.", code: "invalid_media_package" },
          { status: 400 },
        );
      }

      const wantsMedia = mediaPackageParsed !== null;

      if (wantsMedia && !isMediaCheckoutEnabled()) {
        return NextResponse.json(
          {
            error: "Checkout-ul Media nu este activ momentan.",
            code: "MEDIA_CHECKOUT_DISABLED",
          },
          { status: 503 },
        );
      }

      const { data: listingRow, error: listingError } = await adminSupabase
        .from("listings")
        .select("id, user_id, status, is_seed, sale_strategy, details, exit_price, listing_kind")
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

      const locationCheck = publicationLocationFromDetails(listingRow.details);
      if (!locationCheck.ok) {
        return NextResponse.json(
          { error: locationCheck.error, code: "missing_listing_location" },
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

      if (wantsMedia) {
        const currencyCheck = assertListingAndMediaCurrencyCompatible();
        if (!currencyCheck.ok) {
          return NextResponse.json(
            { error: currencyCheck.reason, code: "MEDIA_CURRENCY_MISMATCH" },
            { status: 500 },
          );
        }

        const eligibility = resolveMediaCheckoutEligibility({
          userId: user.id,
          mediaPackage: mediaPackageParsed,
          listing: listingRow,
        });

        if (!eligibility.eligible || !eligibility.quote) {
          return NextResponse.json(
            {
              error: "Anunțul nu este eligibil pentru QuickExit Media.",
              code: eligibility.reason ?? "media_ineligible",
            },
            { status: 400 },
          );
        }

        const quote = eligibility.quote;

        if (
          clientExpectedMediaAmount !== null &&
          Number.isFinite(clientExpectedMediaAmount) &&
          clientExpectedMediaAmount !== quote.amountRon
        ) {
          return NextResponse.json(
            {
              error: "Prețul Media s-a actualizat. Verifică totalul și încearcă din nou.",
              code: "MEDIA_PRICE_CHANGED",
              quote: {
                package: quote.package,
                tier: quote.tier,
                amountRon: quote.amountRon,
                currency: quote.currency,
                listingValueEur: quote.listingValueEur,
              },
            },
            { status: 409 },
          );
        }

        const prepared = await preparePendingMediaOrder({
          admin: adminSupabase,
          listingId,
          userId: user.id,
          quote,
          locale: checkoutLocale,
        });

        if (!prepared.ok) {
          const status = prepared.code === "media_already_paid" ? 409 : 500;
          return NextResponse.json(
            { error: prepared.message, code: prepared.code },
            { status },
          );
        }

        mediaAttach = {
          mediaOrderId: prepared.order.id,
          mediaPackage: quote.package,
          quoteAmountRon: quote.amountRon,
          mediaTier: quote.tier,
          lineItems: buildCombinedListingMediaLineItems(priceId, quote, checkoutLocale),
          idempotencyKey: buildMediaCheckoutIdempotencyKey({
            listingId,
            listingPackageId: saleIntent.state.packageId,
            mediaOrderId: prepared.order.id,
          }),
        };
      }
    } else {
      if (!demandId) {
        return NextResponse.json(
          { error: "Date invalide: demandId este obligatoriu." },
          { status: 400 },
        );
      }

      // Demand path: ignore any mediaPackage; never attach Media.
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

    const lineItems = mediaAttach
      ? mediaAttach.lineItems
      : buildListingOnlyLineItems(pkg.priceId);

    const sessionMetadata = mediaAttach
      ? buildCombinedMediaCheckoutMetadata(checkoutMetadata, {
          mediaOrderId: mediaAttach.mediaOrderId,
          mediaPackage: mediaAttach.mediaPackage,
          mediaTier: mediaAttach.mediaTier,
        })
      : checkoutMetadata;

    // Listing-only / demand: preserve card-only (current Production behavior).
    // Combined Media: omit payment_method_types → Stripe dynamic payment methods.
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      line_items: lineItems,
      success_url: `${baseUrl}/dashboard?${successQuery}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard?${cancelQuery}`,
      metadata: sessionMetadata,
    };
    if (!mediaAttach) {
      sessionParams.payment_method_types = ["card"];
    }

    let session: Stripe.Checkout.Session;
    try {
      session = mediaAttach
        ? await stripe.checkout.sessions.create(sessionParams, {
            idempotencyKey: mediaAttach.idempotencyKey,
          })
        : await stripe.checkout.sessions.create(sessionParams);
    } catch (stripeError: unknown) {
      if (mediaAttach) {
        await cancelMediaOrderAfterFailure({
          admin: adminSupabase,
          mediaOrderId: mediaAttach.mediaOrderId,
        });
      }
      const message =
        stripeError instanceof Error ? stripeError.message : "Eroare Stripe la sesiune.";
      console.error("[stripe/checkout] Stripe session create failed", {
        message,
        mediaOrderId: mediaAttach?.mediaOrderId ?? null,
        listingId: listingId || null,
      });
      return NextResponse.json(
        { error: "Nu am putut inițializa plata. Te rugăm să încerci din nou.", code: "stripe_session_failed" },
        { status: 500 },
      );
    }

    if (mediaAttach) {
      const persisted = await persistMediaCheckoutSessionId({
        admin: adminSupabase,
        mediaOrderId: mediaAttach.mediaOrderId,
        sessionId: session.id,
      });

      if (!persisted.ok) {
        console.error("[stripe/checkout] orphan Stripe session — media_orders session id persist failed", {
          sessionId: session.id,
          mediaOrderId: mediaAttach.mediaOrderId,
          listingId,
          message: persisted.message,
        });

        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch (expireError: unknown) {
          const expireMessage =
            expireError instanceof Error ? expireError.message : String(expireError);
          console.error("[stripe/checkout] failed to expire orphan session", {
            sessionId: session.id,
            message: expireMessage,
          });
        }

        await cancelMediaOrderAfterFailure({
          admin: adminSupabase,
          mediaOrderId: mediaAttach.mediaOrderId,
        });

        return NextResponse.json(
          {
            error: "Nu am putut finaliza inițializarea plății Media. Te rugăm să încerci din nou.",
            code: "media_session_persist_failed",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Eroare internă la inițializarea plății.";
    console.error("[stripe/checkout] Eroare la generarea sesiunii:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
