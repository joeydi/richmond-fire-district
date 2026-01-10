/**
 * Parcel Import Script
 *
 * Downloads and imports parcel data from Vermont GIS (VCGI) into Supabase.
 *
 * Usage:
 *   npx tsx scripts/import-parcels.ts
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
 *   SUPABASE_SECRET_KEY - Secret key (bypasses RLS)
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as shapefile from "shapefile";
import { createWriteStream, mkdirSync, existsSync, rmSync } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";

const execAsync = promisify(exec);

const SHAPEFILE_URL =
  "https://maps.vcgi.vermont.gov/gisdata/vcgi/packaged_zips/CadastralParcels_VTPARCELS/VTPARCELS_Richmond.zip";

const TEMP_DIR = "/tmp/parcel-import";
const BATCH_SIZE = 100;

interface ParcelProperties {
  SPAN?: string;
  OWNER1?: string;
  OWNER2?: string;
  E911ADDR?: string;
  DESCPROP?: string;
  TOWN?: string;
  [key: string]: unknown;
}

async function downloadAndExtract(): Promise<string> {
  // Create temp directory
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true });
  }
  mkdirSync(TEMP_DIR, { recursive: true });

  const zipPath = join(TEMP_DIR, "parcels.zip");

  console.log("📥 Downloading shapefile from VCGI...");
  console.log(`   URL: ${SHAPEFILE_URL}\n`);

  // Download ZIP file
  const response = await fetch(SHAPEFILE_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const fileStream = createWriteStream(zipPath);
  await pipeline(Readable.fromWeb(response.body as any), fileStream);

  console.log("📦 Extracting shapefile...");

  // Extract ZIP
  await execAsync(`unzip -o "${zipPath}" -d "${TEMP_DIR}"`);

  // Find the .shp file
  const { stdout } = await execAsync(`find "${TEMP_DIR}" -name "*.shp" | head -1`);
  const shpPath = stdout.trim();

  if (!shpPath) {
    throw new Error("No .shp file found in ZIP");
  }

  console.log(`   Found: ${shpPath}\n`);
  return shpPath;
}

async function main() {
  console.log("🚀 Starting parcel import...\n");

  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error("❌ Missing environment variables:");
    if (!supabaseUrl) console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    if (!secretKey) console.error("   - SUPABASE_SECRET_KEY");
    console.error(
      "\nAdd SUPABASE_SECRET_KEY to .env.local (get from Supabase dashboard > Settings > API)"
    );
    process.exit(1);
  }

  // Create Supabase client with secret key (bypasses RLS)
  const supabase = createClient(supabaseUrl, secretKey);

  // Download and extract shapefile
  const shpPath = await downloadAndExtract();

  // Read shapefile
  console.log("🔄 Reading shapefile...");
  const source = await shapefile.open(shpPath);

  const features: Array<{
    geometry: GeoJSON.Geometry;
    properties: ParcelProperties;
  }> = [];

  let result = await source.read();
  while (!result.done) {
    if (result.value && result.value.geometry) {
      features.push({
        geometry: result.value.geometry,
        properties: result.value.properties as ParcelProperties,
      });
    }
    result = await source.read();
  }

  console.log(`   Found ${features.length} features\n`);

  // Group features by parcel_id to merge multi-part geometries
  console.log("🔗 Merging multi-part parcels...");
  const parcelMap = new Map<
    string,
    {
      properties: ParcelProperties;
      coordinates: GeoJSON.Position[][][];
    }
  >();

  let unknownCount = 0;
  for (const feature of features) {
    if (!feature.geometry) continue;

    const props = feature.properties;
    const parcelId = props.SPAN || `UNKNOWN-${unknownCount++}`;

    // Get polygon coordinates
    let coords: GeoJSON.Position[][][];
    if (feature.geometry.type === "Polygon") {
      coords = [(feature.geometry as GeoJSON.Polygon).coordinates];
    } else if (feature.geometry.type === "MultiPolygon") {
      coords = (feature.geometry as GeoJSON.MultiPolygon).coordinates;
    } else {
      continue;
    }

    if (parcelMap.has(parcelId)) {
      // Merge with existing parcel
      const existing = parcelMap.get(parcelId)!;
      existing.coordinates.push(...coords);
    } else {
      parcelMap.set(parcelId, {
        properties: props,
        coordinates: coords,
      });
    }
  }

  console.log(`   Merged into ${parcelMap.size} unique parcels\n`);

  // Clear existing parcels
  console.log("🗑️  Clearing existing parcels...");
  const { error: deleteError } = await supabase
    .from("parcels")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    console.error("❌ Failed to clear parcels:", deleteError);
    process.exit(1);
  }
  console.log("   Done\n");

  // Convert map to array for batch processing
  const parcelEntries = Array.from(parcelMap.entries());

  // Process and insert parcels in batches
  console.log(`📤 Inserting parcels in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < parcelEntries.length; i += BATCH_SIZE) {
    const batch = parcelEntries.slice(i, i + BATCH_SIZE);

    const parcels = batch
      .map(([parcelId, data]) => {
        const props = data.properties;

        // Combine owner fields
        const ownerName =
          [props.OWNER1, props.OWNER2].filter(Boolean).join(", ") || null;

        // Get address
        const address = props.E911ADDR || null;

        // Create MultiPolygon from merged coordinates
        const geometry: GeoJSON.MultiPolygon = {
          type: "MultiPolygon",
          coordinates: data.coordinates,
        };

        return {
          parcel_id: parcelId,
          owner_name: ownerName,
          address: address,
          geometry: geometry,
          properties: {
            description: props.DESCPROP || null,
            town: props.TOWN || null,
          },
        };
      })
      .filter(Boolean);

    if (parcels.length === 0) continue;

    const { error } = await supabase.from("parcels").insert(parcels);

    if (error) {
      console.error(
        `   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`,
        error.message
      );
      errors += parcels.length;
    } else {
      inserted += parcels.length;
      process.stdout.write(
        `\r   Inserted: ${inserted} | Skipped: ${skipped} | Errors: ${errors}`
      );
    }
  }

  // Cleanup
  console.log("\n\n🧹 Cleaning up temp files...");
  rmSync(TEMP_DIR, { recursive: true });

  console.log("\n✅ Import complete!");
  console.log(`   Features in shapefile: ${features.length}`);
  console.log(`   Unique parcels: ${parcelEntries.length}`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
