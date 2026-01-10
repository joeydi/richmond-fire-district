/**
 * Storage Bucket Setup Script
 *
 * Creates the infrastructure-images bucket in Supabase Storage.
 * Run this once after setting up the database.
 *
 * Usage:
 *   npx tsx scripts/setup-storage.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "infrastructure-images";

async function main() {
  console.log("🚀 Setting up Supabase Storage...\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error("❌ Missing environment variables:");
    if (!supabaseUrl) console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    if (!secretKey) console.error("   - SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey);

  // Check if bucket already exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("❌ Failed to list buckets:", listError.message);
    process.exit(1);
  }

  const existingBucket = buckets?.find((b) => b.name === BUCKET_NAME);

  if (existingBucket) {
    console.log(`✅ Bucket "${BUCKET_NAME}" already exists\n`);
  } else {
    // Create the bucket
    console.log(`📦 Creating bucket "${BUCKET_NAME}"...`);

    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });

    if (createError) {
      console.error("❌ Failed to create bucket:", createError.message);
      process.exit(1);
    }

    console.log(`✅ Bucket "${BUCKET_NAME}" created successfully\n`);
  }

  console.log("📋 Storage bucket configuration:");
  console.log(`   Name: ${BUCKET_NAME}`);
  console.log("   Public: false (requires auth)");
  console.log("   Allowed types: JPEG, PNG, WebP");
  console.log("   Max file size: 5MB");
  console.log("\n✅ Storage setup complete!");
  console.log("\n⚠️  Note: You may need to set up RLS policies in the Supabase dashboard:");
  console.log("   Storage > Policies > infrastructure-images");
  console.log("   - SELECT: Authenticated users can view");
  console.log("   - INSERT: Authenticated users can upload");
  console.log("   - DELETE: Authenticated users can delete own files");
}

main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
