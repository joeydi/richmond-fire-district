import { createClient } from "@/lib/supabase/server";
import { jwks } from "@/lib/supabase/jwks";
import { redirect } from "next/navigation";
import { cache } from "react";

export type UserRole = "admin" | "editor" | "member";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

/**
 * Get the current user's profile including their role.
 * Memoized per request, so layouts, pages and role checks share one lookup.
 */
export const getUserProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();

  // Verifies the JWT locally against the project's signing keys (no Auth API round trip)
  const { data } = await supabase.auth.getClaims(undefined, { jwks });
  const userId = data?.claims.sub;

  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .single();

  return profile;
});

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
    redirect("/");
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
    redirect("/");
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
    redirect("/");
  }

  return profile;
}
