"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import type {
  InfrastructurePoint,
  InfrastructureImage,
  InfrastructureType,
  InfrastructureStatus,
} from "@/lib/types/infrastructure";

const STORAGE_BUCKET = "infrastructure-images";

// ============================================
// Infrastructure Point CRUD
// ============================================

export interface CreateInfrastructurePointInput {
  name: string;
  type: InfrastructureType;
  latitude: number;
  longitude: number;
  status: InfrastructureStatus;
  notes?: string;
  properties?: Record<string, unknown>;
}

export interface UpdateInfrastructurePointInput {
  name?: string;
  type?: InfrastructureType;
  latitude?: number;
  longitude?: number;
  status?: InfrastructureStatus;
  notes?: string;
  properties?: Record<string, unknown>;
}

export async function createInfrastructurePoint(
  input: CreateInfrastructurePointInput
): Promise<{ data: InfrastructurePoint | null; error: string | null }> {
  // Check admin permission
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { data: null, error: "Unauthorized: Admin access required" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("infrastructure_points")
    .insert({
      name: input.name,
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
      status: input.status,
      notes: input.notes || null,
      properties: input.properties || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating infrastructure point:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/dashboard/map");
  return { data, error: null };
}

export async function updateInfrastructurePoint(
  id: string,
  input: UpdateInfrastructurePointInput
): Promise<{ data: InfrastructurePoint | null; error: string | null }> {
  // Check admin permission
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { data: null, error: "Unauthorized: Admin access required" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("infrastructure_points")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating infrastructure point:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/dashboard/map");
  return { data, error: null };
}

export async function deleteInfrastructurePoint(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  // Check admin permission
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const supabase = await createClient();

  // Delete images from storage first (database records will cascade)
  const { data: images } = await supabase
    .from("infrastructure_images")
    .select("storage_path")
    .eq("infrastructure_point_id", id);

  if (images && images.length > 0) {
    const paths = images.map((img) => img.storage_path);
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  }

  // Delete the infrastructure point (images cascade)
  const { error } = await supabase
    .from("infrastructure_points")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting infrastructure point:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/map");
  return { success: true, error: null };
}

export async function getInfrastructurePointById(
  id: string
): Promise<InfrastructurePoint | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("infrastructure_points")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching infrastructure point:", error);
    return null;
  }

  return data;
}

// ============================================
// Infrastructure Images
// ============================================

export async function getInfrastructureImages(
  infrastructurePointId: string
): Promise<InfrastructureImage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("infrastructure_images")
    .select("*")
    .eq("infrastructure_point_id", infrastructurePointId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching infrastructure images:", error);
    return [];
  }

  // Generate signed URLs for each image
  const imagesWithUrls = await Promise.all(
    (data ?? []).map(async (image) => {
      const { data: urlData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(image.storage_path, 3600); // 1 hour expiry

      return {
        ...image,
        url: urlData?.signedUrl || null,
      };
    })
  );

  return imagesWithUrls;
}

export async function uploadInfrastructureImage(
  infrastructurePointId: string,
  formData: FormData
): Promise<{ data: InfrastructureImage | null; error: string | null }> {
  // Check admin permission
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { data: null, error: "Unauthorized: Admin access required" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { data: null, error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { data: null, error: "Invalid file type. Allowed: JPEG, PNG, WebP" };
  }

  // Validate file size (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { data: null, error: "File too large. Maximum size: 5MB" };
  }

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "jpg";
  const storagePath = `${infrastructurePointId}/${timestamp}.${extension}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading image:", uploadError);
    return { data: null, error: uploadError.message };
  }

  // Create database record
  const { data, error: dbError } = await supabase
    .from("infrastructure_images")
    .insert({
      infrastructure_point_id: infrastructurePointId,
      storage_path: storagePath,
      filename: file.name,
      size_bytes: file.size,
      mime_type: file.type,
      created_by: user?.id || null,
    })
    .select()
    .single();

  if (dbError) {
    // Rollback: delete uploaded file
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    console.error("Error creating image record:", dbError);
    return { data: null, error: dbError.message };
  }

  // Get signed URL for the new image
  const { data: urlData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  revalidatePath("/dashboard/map");
  return {
    data: { ...data, url: urlData?.signedUrl || null },
    error: null,
  };
}

export async function deleteInfrastructureImage(
  imageId: string
): Promise<{ success: boolean; error: string | null }> {
  // Check admin permission
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return { success: false, error: "Unauthorized: Admin access required" };
  }

  const supabase = await createClient();

  // Get image record first
  const { data: image, error: fetchError } = await supabase
    .from("infrastructure_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();

  if (fetchError || !image) {
    return { success: false, error: "Image not found" };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([image.storage_path]);

  if (storageError) {
    console.error("Error deleting from storage:", storageError);
    // Continue to delete DB record anyway
  }

  // Delete database record
  const { error: dbError } = await supabase
    .from("infrastructure_images")
    .delete()
    .eq("id", imageId);

  if (dbError) {
    console.error("Error deleting image record:", dbError);
    return { success: false, error: dbError.message };
  }

  revalidatePath("/dashboard/map");
  return { success: true, error: null };
}
