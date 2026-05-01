import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RawItem = Record<string, unknown>;

const EXIT_PRICE_RATIO = 0.85;
const INSERT_BATCH_SIZE = 500;

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toIntOrNull = (value: unknown): number | null => {
  const n = toNumberOrNull(value);
  if (n === null) return null;
  return Math.round(n);
};

const normalizeTitle = (item: RawItem): string => {
  const explicitTitle = item.title;
  if (typeof explicitTitle === "string" && explicitTitle.trim().length > 0) {
    return explicitTitle.trim();
  }

  const make = typeof item.vehicle_make === "string" ? item.vehicle_make : typeof item.make === "string" ? item.make : "";
  const model =
    typeof item.vehicle_model === "string" ? item.vehicle_model : typeof item.model === "string" ? item.model : "";
  const fallback = `${make} ${model}`.trim();
  return fallback.length > 0 ? fallback : "Untitled listing";
};

const pickVehicleFields = (item: RawItem) => {
  return {
    vehicle_make:
      typeof item.vehicle_make === "string" && item.vehicle_make.trim()
        ? item.vehicle_make.trim()
        : typeof item.make === "string" && item.make.trim()
          ? item.make.trim()
          : null,
    vehicle_model:
      typeof item.vehicle_model === "string" && item.vehicle_model.trim()
        ? item.vehicle_model.trim()
        : typeof item.model === "string" && item.model.trim()
          ? item.model.trim()
          : null,
    vehicle_year: toIntOrNull(item.vehicle_year ?? item.year),
    vehicle_km: toIntOrNull(item.vehicle_km ?? item.km ?? item.mileage),
  };
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const expectedSecret = process.env.ADMIN_INGEST_SECRET;

    if (!expectedSecret || token !== expectedSecret) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Server misconfigured: missing Supabase environment variables.",
        },
        { status: 500 },
      );
    }

    const payload = await req.json();
    const items: RawItem[] = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid payload. Expected a non-empty array of assets." },
        { status: 400 },
      );
    }

    const observedAt = new Date().toISOString();
    const rows = items.map((item) => {
      const category =
        typeof item.category === "string" && item.category.trim().length > 0 ? item.category.trim() : "unknown";
      const source =
        typeof item.source === "string" && item.source.trim().length > 0
          ? item.source.trim()
          : typeof payload?.source === "string" && payload.source.trim().length > 0
            ? payload.source.trim()
            : "external_scraper";

      const marketPrice =
        toNumberOrNull(item.market_price ?? item.price ?? item.price_value ?? item.extracted_price) ?? 0;
      const exitPrice = Number((marketPrice * EXIT_PRICE_RATIO).toFixed(2));

      const { category: _cat, title: _title, source: _source, ...rest } = item;
      const vehicle = pickVehicleFields(item);

      return {
        status: "seed",
        is_seed: true,
        category,
        title: normalizeTitle(item),
        market_price: marketPrice,
        exit_price: exitPrice,
        vehicle_make: vehicle.vehicle_make,
        vehicle_model: vehicle.vehicle_model,
        vehicle_year: vehicle.vehicle_year,
        vehicle_km: vehicle.vehicle_km,
        details: {
          ...rest,
          source,
          observed_at: observedAt,
        },
      };
    });

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const batches = chunk(rows, INSERT_BATCH_SIZE);

    let inserted = 0;
    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index];
      const { error } = await supabase.from("listings").insert(batch);
      if (error) {
        throw new Error(`Supabase insert failed on batch ${index + 1}/${batches.length}: ${error.message}`);
      }
      inserted += batch.length;
    }

    return NextResponse.json({
      success: true,
      inserted,
      batches: batches.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown ingestion error",
      },
      { status: 500 },
    );
  }
}
