import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "editor" | "member";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

/**
 * Get the current user's profile including their role
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Get the current user's role
 */
export async function getUserRole(): Promise<UserRole | null> {
  const profile = await getUserProfile();
  return profile?.role ?? null;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "admin";
}

/**
 * Check if the current user is an editor or admin
 */
export async function isEditorOrAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "admin" || role === "editor";
}

/**
 * Check if the current user can edit data (editor or admin)
 */
export async function canEdit(): Promise<boolean> {
  return isEditorOrAdmin();
}

/**
 * Require admin role - redirects to dashboard if not admin
 */
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  return profile;
}

/**
 * Require editor or admin role - redirects to dashboard if not authorized
 */
export async function requireEditor(): Promise<UserProfile> {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin" && profile.role !== "editor") {
    redirect("/dashboard");
  }

  return profile;
}

/**
 * Require any authenticated user - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<UserProfile> {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}
