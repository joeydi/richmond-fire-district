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
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (bypasses RLS)
 */

import { createClient } from "@supabase/supabase-js";
import shp from "shpjs";

const SHAPEFILE_URL =
  "https://maps.vcgi.vermont.gov/gisdata/vcgi/packaged_zips/CadastralParcels_VTPARCELS/VTPARCELS_Richmond.zip";

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

interface ParcelFeature {
  type: "Feature";
  geometry: GeoJSON.Geometry;
  properties: ParcelProperties;
}

async function main() {
  console.log("🚀 Starting parcel import...\n");

  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing environment variables:");
    if (!supabaseUrl) console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    console.error(
      "\nAdd SUPABASE_SERVICE_ROLE_KEY to .env.local (get from Supabase dashboard > Settings > API)"
    );
    process.exit(1);
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Download and parse shapefile
  console.log("📥 Downloading shapefile from VCGI...");
  console.log(`   URL: ${SHAPEFILE_URL}\n`);

  let geojson: GeoJSON.FeatureCollection;
  try {
    const response = await fetch(SHAPEFILE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    console.log(`   Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB\n`);

    console.log("🔄 Parsing shapefile...");
    const result = await shp(buffer);

    // shpjs can return a single FeatureCollection or an array of them
    if (Array.isArray(result)) {
      geojson = result[0] as GeoJSON.FeatureCollection;
    } else {
      geojson = result as GeoJSON.FeatureCollection;
    }

    console.log(`   Found ${geojson.features.length} parcels\n`);
  } catch (error) {
    console.error("❌ Failed to download/parse shapefile:", error);
    process.exit(1);
  }

  // Clear existing parcels (optional - comment out to append)
  console.log("🗑️  Clearing existing parcels...");
  const { error: deleteError } = await supabase.from("parcels").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    console.error("❌ Failed to clear parcels:", deleteError);
    process.exit(1);
  }
  console.log("   Done\n");

  // Process and insert parcels in batches
  console.log(`📤 Inserting parcels in batches of ${BATCH_SIZE}...`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  const features = geojson.features as ParcelFeature[];

  for (let i = 0; i < features.length; i += BATCH_SIZE) {
    const batch = features.slice(i, i + BATCH_SIZE);

    const parcels = batch
      .map((feature) => {
        const props = feature.properties;

        // Skip features without geometry
        if (!feature.geometry) {
          skipped++;
          return null;
        }

        // Extract parcel ID (SPAN is Vermont's parcel ID system)
        const parcelId = props.SPAN || `UNKNOWN-${i}`;

        // Combine owner fields
        const ownerName = [props.OWNER1, props.OWNER2]
          .filter(Boolean)
          .join(", ") || null;

        // Get address
        const address = props.E911ADDR || null;

        // Ensure geometry is MultiPolygon
        let geometry = feature.geometry;
        if (geometry.type === "Polygon") {
          geometry = {
            type: "MultiPolygon",
            coordinates: [geometry.coordinates],
          } as GeoJSON.MultiPolygon;
        }

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
      console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      errors += parcels.length;
    } else {
      inserted += parcels.length;
      process.stdout.write(
        `\r   Inserted: ${inserted} | Skipped: ${skipped} | Errors: ${errors}`
      );
    }
  }

  console.log("\n");
  console.log("✅ Import complete!");
  console.log(`   Total parcels: ${features.length}`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
