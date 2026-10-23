"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { compassBearing, distanceMeters } from "@/lib/geo";
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
  revalidatePath("/dashboard/infrastructure");
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
  revalidatePath("/dashboard/infrastructure");
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
  revalidatePath("/dashboard/infrastructure");
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

export interface GetInfrastructurePointsOptions {
  search?: string;
  type?: InfrastructureType | "all";
  status?: InfrastructureStatus | "all";
  sortBy?: keyof InfrastructurePoint;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export async function getInfrastructurePoints(
  options: GetInfrastructurePointsOptions = {}
): Promise<{ data: InfrastructurePoint[]; count: number }> {
  const {
    search,
    type,
    status,
    sortBy = "name",
    sortOrder = "asc",
    limit = 50,
    offset = 0,
  } = options;

  const supabase = await createClient();

  let query = supabase
    .from("infrastructure_points")
    .select("*", { count: "exact" });

  // Apply search filter (name, notes)
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,notes.ilike.%${search}%`
    );
  }

  // Apply type filter (skip if "all")
  if (type && type !== "all") {
    query = query.eq("type", type);
  }
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  // Names lead with house numbers ("8 Robbins…", "114 Robbins…"), which
  // Postgres sorts as text. Sort those in JS with numeric collation instead;
  // the table is small enough to fetch whole.
  if (sortBy === "name") {
    const { data, error, count } = await query;
    if (error) {
      console.error("Error fetching infrastructure points:", error);
      return { data: [], count: 0 };
    }
    const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
    const sorted = (data ?? []).sort((a, b) => collator.compare(a.name, b.name));
    if (sortOrder === "desc") sorted.reverse();
    return { data: sorted.slice(offset, offset + limit), count: count ?? 0 };
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching infrastructure points:", error);
    return { data: [], count: 0 };
  }

  return { data: data ?? [], count: count ?? 0 };
}

export interface NearbyPoint {
  id: string;
  name: string;
  type: InfrastructureType;
  latitude: number;
  longitude: number;
  distanceM: number;
  bearing: string;
}

export interface LogMention {
  id: string;
  created_at: string;
  authorName: string;
  before: string;
  match: string;
  after: string;
}

export interface InfrastructurePointDetails {
  point: InfrastructurePoint;
  /** Every other point within the map preview radius, nearest first */
  nearby: NearbyPoint[];
  mentions: LogMention[];
  mentionTerm: string;
}

const NEARBY_RADIUS_M = 150;
const MENTION_CONTEXT_CHARS = 90;

/**
 * Text a log post would use to refer to a point: the house number and street
 * ("114 Robbins" also matches "114 Robbins Mnt Ext"), else the name without
 * its type word ("Extension Flush" for "Extension Flush Hydrant").
 */
function getMentionTerm(name: string): string {
  const address = name.match(/^(\d+[A-Za-z]?)\s+([A-Za-z]+)/);
  if (address) return `${address[1]} ${address[2]}`;
  const stripped = name
    .replace(/\b(shutoff|valve|hydrant|well|meter|reservoir)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || name;
}

function stripMarkdown(content: string): string {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getInfrastructurePointDetails(
  id: string
): Promise<InfrastructurePointDetails | null> {
  const supabase = await createClient();

  const [pointResult, allResult] = await Promise.all([
    supabase.from("infrastructure_points").select("*").eq("id", id).single(),
    supabase.from("infrastructure_points").select("id, name, type, latitude, longitude"),
  ]);

  if (pointResult.error || !pointResult.data) {
    console.error("Error fetching infrastructure point:", pointResult.error);
    return null;
  }
  const point = pointResult.data as InfrastructurePoint;

  const nearby: NearbyPoint[] = (allResult.data ?? [])
    .filter((other) => other.id !== point.id)
    .map((other) => ({
      ...other,
      distanceM: distanceMeters(point.latitude, point.longitude, other.latitude, other.longitude),
      bearing: compassBearing(point.latitude, point.longitude, other.latitude, other.longitude),
    }))
    .filter((other) => other.distanceM <= NEARBY_RADIUS_M)
    .sort((a, b) => a.distanceM - b.distanceM);

  const mentionTerm = getMentionTerm(point.name);
  const { data: posts, error: postsError } = await supabase
    .from("log_posts")
    .select("id, content, created_at, author:profiles!author_id(full_name, email)")
    .ilike("content", `%${mentionTerm}%`)
    .order("created_at", { ascending: false })
    .limit(5);
  if (postsError) {
    console.error("Error fetching log mentions:", postsError);
  }

  const mentions: LogMention[] = [];
  for (const post of (posts ?? []) as unknown as {
    id: string;
    content: string;
    created_at: string;
    author: { full_name: string | null; email: string } | null;
  }[]) {
    const text = stripMarkdown(post.content);
    const index = text.toLowerCase().indexOf(mentionTerm.toLowerCase());
    if (index === -1) continue;
    const start = Math.max(0, index - MENTION_CONTEXT_CHARS);
    const end = Math.min(text.length, index + mentionTerm.length + MENTION_CONTEXT_CHARS);
    mentions.push({
      id: post.id,
      created_at: post.created_at,
      authorName: post.author?.full_name || post.author?.email || "Unknown",
      before: (start > 0 ? "…" : "") + text.slice(start, index),
      match: text.slice(index, index + mentionTerm.length),
      after: text.slice(index + mentionTerm.length, end) + (end < text.length ? "…" : ""),
    });
  }

  return { point, nearby, mentions, mentionTerm };
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
