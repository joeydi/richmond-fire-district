"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin, requireAuth } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import type { UserRole, Profile } from "@/lib/types/database";

export async function getUsers(): Promise<Profile[]> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export interface UserActivity {
  lastSignInAt: string | null;
  /** Meter, chlorine and reservoir readings entered in the last 30 days */
  readings30d: number;
  posts30d: number;
  /** Most recent reading or post, if within the last 30 days */
  lastEntryAt: string | null;
}

const ACTIVITY_WINDOW_DAYS = 30;

/**
 * Sign-in times from Supabase Auth plus recent data entry per user, for the
 * admin user list.
 */
export async function getUserActivity(): Promise<Record<string, UserActivity>> {
  await requireAdmin();

  const supabase = await createClient();
  const adminClient = createAdminClient();
  const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 86_400_000).toISOString();

  const readingTables = ["meter_readings", "chlorine_readings", "reservoir_readings"] as const;
  const [authResult, posts, ...readings] = await Promise.all([
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("log_posts").select("author_id, created_at").gte("created_at", since),
    ...readingTables.map((table) =>
      supabase.from(table).select("created_by, created_at").gte("created_at", since)
    ),
  ]);

  const activity: Record<string, UserActivity> = {};
  const entry = (id: string) =>
    (activity[id] ??= { lastSignInAt: null, readings30d: 0, posts30d: 0, lastEntryAt: null });
  const touch = (record: UserActivity, at: string) => {
    if (!record.lastEntryAt || at > record.lastEntryAt) record.lastEntryAt = at;
  };

  if (authResult.error) {
    console.error("Error listing auth users:", authResult.error);
  }
  for (const user of authResult.data?.users ?? []) {
    entry(user.id).lastSignInAt = user.last_sign_in_at ?? null;
  }

  for (const post of posts.data ?? []) {
    if (!post.author_id) continue;
    const record = entry(post.author_id);
    record.posts30d++;
    touch(record, post.created_at);
  }

  for (const result of readings) {
    if (result.error) console.error("Error fetching reading activity:", result.error);
    for (const reading of result.data ?? []) {
      if (!reading.created_by) continue;
      const record = entry(reading.created_by);
      record.readings30d++;
      touch(record, reading.created_at);
    }
  }

  return activity;
}

export async function getUser(id: string): Promise<Profile | null> {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function updateUser(
  userId: string,
  data: { name?: string; role?: UserRole }
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();

  // Prevent admin from changing their own role
  if (data.role && admin.id === userId) {
    return { success: false, error: "You cannot change your own role" };
  }

  const supabase = await createClient();

  const updateData: { full_name?: string; role?: UserRole } = {};
  if (data.name !== undefined) updateData.full_name = data.name;
  if (data.role !== undefined) updateData.role = data.role;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function createUser(
  email: string,
  name: string,
  role: UserRole = "member"
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const adminClient = createAdminClient();

  // Create user via Supabase Auth without sending invite email
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role, full_name: name },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Update the profile with the name
  if (data.user && name) {
    await adminClient.from("profiles").update({ full_name: name }).eq("id", data.user.id);
  }

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function sendInviteEmail(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const supabase = await createClient();

  // Get user email first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.email) {
    return { success: false, error: "User not found" };
  }

  // Send a "magic link" sign in email
  const { error } = await supabase.auth.signInWithOtp({
    email: profile.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateOwnProfile(data: {
  name?: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  const supabase = await createClient();

  const updateData: { full_name?: string } = {};
  if (data.name !== undefined) updateData.full_name = data.name;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updatePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  const supabase = await createClient();

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: data.currentPassword,
  });

  if (signInError) {
    return { success: false, error: "Current password is incorrect" };
  }

  // Update to new password
  const { error } = await supabase.auth.updateUser({
    password: data.newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
