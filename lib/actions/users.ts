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
