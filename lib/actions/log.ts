"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  requireEditor,
  requireAdmin,
  isAdmin,
  getUserProfile,
} from "@/lib/auth/roles";
import { z } from "zod";
import type {
  LogPost,
  LogPostImage,
  LogPostWithImages,
  GetLogPostsOptions,
} from "@/lib/types/log";

const STORAGE_BUCKET = "log-images";

// Validation schemas
const createPostSchema = z.object({
  content: z.string().min(1, "Content is required").max(50000),
  author_id: z.string().uuid().optional(),
  created_at: z.string().datetime().optional(),
});

const updatePostSchema = z.object({
  content: z.string().min(1, "Content is required").max(50000),
  created_at: z.string().datetime().optional(),
  author_id: z.string().uuid().optional(),
});

// ============================================
// Log Post CRUD
// ============================================

/**
 * Get paginated log posts with author info
 */
export async function getLogPosts(
  options: GetLogPostsOptions = {}
): Promise<{ data: LogPostWithImages[]; count: number }> {
  const { limit = 20, offset = 0, search } = options;

  const supabase = await createClient();

  let query = supabase
    .from("log_posts")
    .select(
      `
      *,
      author:profiles!author_id(id, full_name, email)
    `,
      { count: "exact" }
    );

  // Apply search filter (content only - Supabase doesn't support or() on related tables)
  if (search) {
    query = query.ilike("content", `%${search}%`);
  }

  // Order by created_at descending (newest first)
  query = query.order("created_at", { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching log posts:", error);
    return { data: [], count: 0 };
  }

  // Fetch images for each post
  const postsWithImages = await Promise.all(
    (data ?? []).map(async (post) => {
      const images = await getLogPostImages(post.id);
      return {
        ...post,
        images,
      } as LogPostWithImages;
    })
  );

  return { data: postsWithImages, count: count ?? 0 };
}

/**
 * Get a single log post with images
 */
export async function getLogPost(id: string): Promise<LogPostWithImages | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("log_posts")
    .select(
      `
      *,
      author:profiles!author_id(id, full_name, email)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching log post:", error);
    return null;
  }

  const images = await getLogPostImages(id);

  return {
    ...data,
    images,
  } as LogPostWithImages;
}

/**
 * Create a new log post
 * Editors can create as themselves, admins can create for any user
 */
export async function createLogPost(input: {
  content: string;
  author_id?: string;
  created_at?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const profile = await requireEditor();

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const userIsAdmin = await isAdmin();

  // Only admins can set author_id for other users
  let authorId = profile.id;
  if (parsed.data.author_id) {
    if (!userIsAdmin) {
      return {
        success: false,
        error: "Only admins can create posts for other users",
      };
    }
    authorId = parsed.data.author_id;
  }

  const supabase = await createClient();

  const insertData: {
    content: string;
    author_id: string;
    created_at?: string;
  } = {
    content: parsed.data.content,
    author_id: authorId,
  };

  if (parsed.data.created_at) {
    insertData.created_at = parsed.data.created_at;
  }

  const { data, error } = await supabase
    .from("log_posts")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating log post:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/log");
  return { success: true, id: data.id };
}

/**
 * Update an existing log post
 * Authors can update their own, admins can update any
 */
export async function updateLogPost(
  id: string,
  input: { content: string; created_at?: string }
): Promise<{ success: boolean; error?: string }> {
  const profile = await requireEditor();

  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Check if user can edit this post
  const { data: post, error: fetchError } = await supabase
    .from("log_posts")
    .select("author_id")
    .eq("id", id)
    .single();

  if (fetchError || !post) {
    return { success: false, error: "Post not found" };
  }

  const userIsAdmin = await isAdmin();
  if (post.author_id !== profile.id && !userIsAdmin) {
    return { success: false, error: "You can only edit your own posts" };
  }

  const updateData: {
    content: string;
    updated_at: string;
    created_at?: string;
  } = {
    content: parsed.data.content,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.created_at) {
    updateData.created_at = parsed.data.created_at;
  }

  const { error } = await supabase
    .from("log_posts")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating log post:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/log");
  revalidatePath(`/dashboard/log/${id}`);
  return { success: true };
}

/**
 * Delete a log post (admin only)
 */
export async function deleteLogPost(
  id: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const supabase = await createClient();

  // Delete images from storage first (database records will cascade)
  const { data: images } = await supabase
    .from("log_post_images")
    .select("storage_path")
    .eq("log_post_id", id);

  if (images && images.length > 0) {
    const paths = images.map((img) => img.storage_path);
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  }

  // Delete the post (images cascade)
  const { error } = await supabase.from("log_posts").delete().eq("id", id);

  if (error) {
    console.error("Error deleting log post:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/log");
  return { success: true };
}

// ============================================
// Log Post Images
// ============================================

/**
 * Get all images for a log post with signed URLs
 */
export async function getLogPostImages(
  logPostId: string
): Promise<LogPostImage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("log_post_images")
    .select("*")
    .eq("log_post_id", logPostId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching log post images:", error);
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

/**
 * Upload an image to a log post
 * Authors can upload to their posts, admins can upload to any
 */
export async function uploadLogPostImage(
  logPostId: string,
  formData: FormData
): Promise<{ data: LogPostImage | null; error: string | null }> {
  const profile = await requireEditor();

  const supabase = await createClient();

  // Check if user can upload to this post
  const { data: post, error: fetchError } = await supabase
    .from("log_posts")
    .select("author_id")
    .eq("id", logPostId)
    .single();

  if (fetchError || !post) {
    return { data: null, error: "Post not found" };
  }

  const userIsAdmin = await isAdmin();
  if (post.author_id !== profile.id && !userIsAdmin) {
    return { data: null, error: "You can only upload images to your own posts" };
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

  // Generate unique filename
  const timestamp = Date.now();
  const extension = file.name.split(".").pop() || "jpg";
  const storagePath = `${logPostId}/${timestamp}.${extension}`;

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
    .from("log_post_images")
    .insert({
      log_post_id: logPostId,
      storage_path: storagePath,
      filename: file.name,
      size_bytes: file.size,
      mime_type: file.type,
      created_by: profile.id,
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

  revalidatePath("/dashboard/log");
  revalidatePath(`/dashboard/log/${logPostId}`);
  return {
    data: { ...data, url: urlData?.signedUrl || null },
    error: null,
  };
}

/**
 * Delete a log post image
 * Authors can delete from their posts, admins can delete any
 */
export async function deleteLogPostImage(
  imageId: string
): Promise<{ success: boolean; error: string | null }> {
  const profile = await requireEditor();

  const supabase = await createClient();

  // Get image record with post info
  const { data: image, error: fetchError } = await supabase
    .from("log_post_images")
    .select("storage_path, log_post_id")
    .eq("id", imageId)
    .single();

  if (fetchError || !image) {
    return { success: false, error: "Image not found" };
  }

  // Check if user can delete from this post
  const { data: post } = await supabase
    .from("log_posts")
    .select("author_id")
    .eq("id", image.log_post_id)
    .single();

  const userIsAdmin = await isAdmin();
  if (post?.author_id !== profile.id && !userIsAdmin) {
    return { success: false, error: "You can only delete images from your own posts" };
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
    .from("log_post_images")
    .delete()
    .eq("id", imageId);

  if (dbError) {
    console.error("Error deleting image record:", dbError);
    return { success: false, error: dbError.message };
  }

  revalidatePath("/dashboard/log");
  revalidatePath(`/dashboard/log/${image.log_post_id}`);
  return { success: true, error: null };
}

/**
 * Check if user can edit a specific post
 */
export async function canEditLogPost(postId: string): Promise<boolean> {
  const profile = await getUserProfile();
  if (!profile) return false;

  if (profile.role === "admin") return true;
  if (profile.role === "member") return false;

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("log_posts")
    .select("author_id")
    .eq("id", postId)
    .single();

  return post?.author_id === profile.id;
}
