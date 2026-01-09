"use server";

import { createClient } from "@/lib/supabase/server";
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

export async function inviteUser(
  email: string,
  role: UserRole = "member"
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const supabase = await createClient();

  // Invite user via Supabase Auth
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/admin/users");
  return { success: true };
}
