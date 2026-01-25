"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { NotificationPreferences, DigestFrequency } from "@/lib/types/database";

// Validation schema for notification preferences
const notificationPreferencesSchema = z.object({
  phone_number: z.string().nullable().optional(),

  // Log post notifications
  notify_new_log_posts: z.boolean().optional(),
  notify_new_log_posts_email: z.boolean().optional(),
  notify_new_log_posts_sms: z.boolean().optional(),

  // Meter reading notifications
  notify_missing_meter_readings: z.boolean().optional(),
  notify_missing_meter_readings_email: z.boolean().optional(),
  notify_missing_meter_readings_sms: z.boolean().optional(),
  missing_meter_reading_days: z.number().min(1).max(30).optional(),

  // Chlorine reading notifications
  notify_missing_chlorine_readings: z.boolean().optional(),
  notify_missing_chlorine_readings_email: z.boolean().optional(),
  notify_missing_chlorine_readings_sms: z.boolean().optional(),
  missing_chlorine_reading_days: z.number().min(1).max(30).optional(),

  // Digest preferences
  digest_enabled: z.boolean().optional(),
  digest_frequency: z.enum(["daily", "weekly"]).optional(),
  digest_email: z.boolean().optional(),
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

/**
 * Get notification preferences for the current user
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found
    console.error("Error fetching notification preferences:", error);
    return null;
  }

  return data ?? null;
}

/**
 * Get default notification preferences for a new user
 */
export async function getDefaultPreferences(userId: string): Promise<Omit<NotificationPreferences, "id" | "created_at" | "updated_at">> {
  return {
    user_id: userId,
    phone_number: null,

    notify_new_log_posts: false,
    notify_new_log_posts_email: false,
    notify_new_log_posts_sms: false,

    notify_missing_meter_readings: false,
    notify_missing_meter_readings_email: false,
    notify_missing_meter_readings_sms: false,
    missing_meter_reading_days: 1,

    notify_missing_chlorine_readings: false,
    notify_missing_chlorine_readings_email: false,
    notify_missing_chlorine_readings_sms: false,
    missing_chlorine_reading_days: 1,

    digest_enabled: false,
    digest_frequency: "daily" as DigestFrequency,
    digest_email: true,
  };
}

/**
 * Update notification preferences for the current user
 */
export async function updateNotificationPreferences(
  input: NotificationPreferencesInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();

  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Check if preferences exist
  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Update existing preferences
    const { error } = await supabase
      .from("notification_preferences")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating notification preferences:", error);
      return { success: false, error: error.message };
    }
  } else {
    // Create new preferences
    const defaults = await getDefaultPreferences(user.id);
    const { error } = await supabase
      .from("notification_preferences")
      .insert({
        ...defaults,
        ...parsed.data,
      });

    if (error) {
      console.error("Error creating notification preferences:", error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/dashboard/notifications");
  return { success: true };
}
