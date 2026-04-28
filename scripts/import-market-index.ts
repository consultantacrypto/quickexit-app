// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";

// Încărcăm variabilele din .env.local cu cale absolută, sigură
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ EROARE: Lipsesc variabilele de mediu!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function importData() {
  const csvFilePath = path.resolve(process.cwd(), "market-index.csv");

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Nu găsesc fișierul: ${csvFilePath}`);
    return;
  }

  const fileContent = fs.readFileSync(csvFilePath, "utf-8");

  // Parsăm CSV-ul
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`🚀 Pornim importul pentru ${records.length} înregistrări...`);

  // Pasul 1: Curățăm indexul vechi (pentru a evita duplicatele)
  const { error: deleteError } = await supabase
    .from("listings")
    .delete()
    .eq("is_seed", true);

  if (deleteError) {
    console.warn("⚠️ Notă: Nu am putut curăța indexul (poate e deja gol).");
  }

  // Pasul 2: Inserăm rândurile noi
  let successCount = 0;

  for (const record of records) {
    const marketPrice = parseFloat(record.market_price);
    
    // Fallback inteligent pentru titlu
    const cleanTitle = record.title?.trim() || record.model?.trim() || record.brand?.trim() || "Activ";
    
    const payload = {
      title: `Index: ${cleanTitle}`,
      category: record.category,
      vehicle_make: record.make || null,
      vehicle_model: record.model || null,
      vehicle_year: record.year ? parseInt(record.year) : null,
      vehicle_km: record.km ? parseInt(record.km) : null,
      market_price: marketPrice,
      exit_price: Math.round(marketPrice * 0.85),
      status: "seed",
      is_seed: true,
      details: {
        brand: record.brand || null,
        surface: record.surface ? parseFloat(record.surface) : null,
        location: record.location || null,
        source: record.source || "manual_import",
        observed_at: new Date().toISOString().split("T")[0],
      },
    };

    const { error: insertError } = await supabase.from("listings").insert(payload);

    if (insertError) {
      console.error(`❌ Eroare la ${cleanTitle}: ${insertError.message}`);
    } else {
      console.log(`✅ OK: ${cleanTitle}`);
      successCount++;
    }
  }

  console.log(`✨ Gata! Am importat ${successCount} comparabile.`);
}

importData();