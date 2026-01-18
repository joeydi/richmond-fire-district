"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/roles";
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

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();

  // Prevent admin from changing their own role
  if (admin.id === userId) {
    return { success: false, error: "You cannot change your own role" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function createUser(
  email: string,
  role: UserRole = "member"
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const adminClient = createAdminClient();

  // Create user via Supabase Auth without sending invite email
  const { error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}

export async function sendInviteEmail(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Get user email first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.email) {
    return { success: false, error: "User not found" };
  }

  // Generate a password reset link which serves as the invite
  const { error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
