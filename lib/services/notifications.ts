import { createClient } from "@/lib/supabase/server";
import {
  sendNewLogPostEmail,
  sendMissingReadingEmail,
  sendDigestEmail,
} from "./email";
import {
  sendNewLogPostSms,
  sendMissingReadingSms,
} from "./sms";
import type { NotificationPreferences } from "@/lib/types/database";

interface UserWithPreferences {
  id: string;
  email: string;
  full_name: string | null;
  preferences: NotificationPreferences;
}

/**
 * Get all users with notification preferences enabled for a specific type
 */
async function getUsersWithPreference(
  preferenceField: keyof NotificationPreferences
): Promise<UserWithPreferences[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name
      )
    `)
    .eq(preferenceField, true);

  if (error) {
    console.error("Error fetching users with preferences:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => row.profiles)
    .map((row) => ({
      id: row.profiles.id,
      email: row.profiles.email,
      full_name: row.profiles.full_name,
      preferences: row as NotificationPreferences,
    }));
}

/**
 * Notify all subscribed users about a new log post
 */
export async function notifyNewLogPost(logPost: {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
}): Promise<{ emailsSent: number; smsSent: number; errors: string[] }> {
  const results = { emailsSent: 0, smsSent: 0, errors: [] as string[] };

  const users = await getUsersWithPreference("notify_new_log_posts");

  for (const user of users) {
    // Send email if enabled
    if (user.preferences.notify_new_log_posts_email) {
      const result = await sendNewLogPostEmail(user.email, {
        title: logPost.title,
        content: logPost.content,
        createdBy: logPost.createdBy,
        createdAt: logPost.createdAt,
      });

      if (result.success) {
        results.emailsSent++;
      } else if (result.error) {
        results.errors.push(`Email to ${user.email}: ${result.error}`);
      }
    }

    // Send SMS if enabled and phone number is set
    if (
      user.preferences.notify_new_log_posts_sms &&
      user.preferences.phone_number
    ) {
      const result = await sendNewLogPostSms(user.preferences.phone_number, {
        title: logPost.title,
        createdBy: logPost.createdBy,
      });

      if (result.success) {
        results.smsSent++;
      } else if (result.error) {
        results.errors.push(`SMS to ${user.preferences.phone_number}: ${result.error}`);
      }
    }
  }

  return results;
}

/**
 * Check for missing readings and notify subscribed users
 */
export async function checkAndNotifyMissingReadings(): Promise<{
  meterAlerts: number;
  chlorineAlerts: number;
  errors: string[];
}> {
  const results = { meterAlerts: 0, chlorineAlerts: 0, errors: [] as string[] };
  const supabase = await createClient();

  // Get the latest meter reading date
  const { data: latestMeterReading } = await supabase
    .from("meter_readings")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  // Get the latest chlorine reading date
  const { data: latestChlorineReading } = await supabase
    .from("chlorine_readings")
    .select("recorded_at")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  const now = new Date();

  // Calculate days since last readings
  const daysSinceMeterReading = latestMeterReading
    ? Math.floor(
        (now.getTime() - new Date(latestMeterReading.recorded_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : Infinity;

  const daysSinceChlorineReading = latestChlorineReading
    ? Math.floor(
        (now.getTime() - new Date(latestChlorineReading.recorded_at).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : Infinity;

  // Get users subscribed to meter reading alerts
  const meterUsers = await getUsersWithPreference("notify_missing_meter_readings");

  for (const user of meterUsers) {
    if (daysSinceMeterReading >= user.preferences.missing_meter_reading_days) {
      // Send email if enabled
      if (user.preferences.notify_missing_meter_readings_email) {
        const result = await sendMissingReadingEmail(
          user.email,
          "meter",
          daysSinceMeterReading
        );

        if (result.success) {
          results.meterAlerts++;
        } else if (result.error) {
          results.errors.push(`Meter email to ${user.email}: ${result.error}`);
        }
      }

      // Send SMS if enabled
      if (
        user.preferences.notify_missing_meter_readings_sms &&
        user.preferences.phone_number
      ) {
        const result = await sendMissingReadingSms(
          user.preferences.phone_number,
          "meter",
          daysSinceMeterReading
        );

        if (result.success) {
          results.meterAlerts++;
        } else if (result.error) {
          results.errors.push(`Meter SMS: ${result.error}`);
        }
      }
    }
  }

  // Get users subscribed to chlorine reading alerts
  const chlorineUsers = await getUsersWithPreference("notify_missing_chlorine_readings");

  for (const user of chlorineUsers) {
    if (daysSinceChlorineReading >= user.preferences.missing_chlorine_reading_days) {
      // Send email if enabled
      if (user.preferences.notify_missing_chlorine_readings_email) {
        const result = await sendMissingReadingEmail(
          user.email,
          "chlorine",
          daysSinceChlorineReading
        );

        if (result.success) {
          results.chlorineAlerts++;
        } else if (result.error) {
          results.errors.push(`Chlorine email to ${user.email}: ${result.error}`);
        }
      }

      // Send SMS if enabled
      if (
        user.preferences.notify_missing_chlorine_readings_sms &&
        user.preferences.phone_number
      ) {
        const result = await sendMissingReadingSms(
          user.preferences.phone_number,
          "chlorine",
          daysSinceChlorineReading
        );

        if (result.success) {
          results.chlorineAlerts++;
        } else if (result.error) {
          results.errors.push(`Chlorine SMS: ${result.error}`);
        }
      }
    }
  }

  return results;
}

/**
 * Send digest emails to subscribed users
 */
export async function sendDigestEmails(
  frequency: "daily" | "weekly"
): Promise<{ sent: number; errors: string[] }> {
  const results = { sent: 0, errors: [] as string[] };
  const supabase = await createClient();

  // Get users with digest enabled for this frequency
  const { data: users, error: usersError } = await supabase
    .from("notification_preferences")
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name
      )
    `)
    .eq("digest_enabled", true)
    .eq("digest_frequency", frequency)
    .eq("digest_email", true);

  if (usersError || !users?.length) {
    return results;
  }

  // Get stats
  const [
    { count: totalMeters },
    { count: totalReservoirs },
    { count: totalHydrants },
  ] = await Promise.all([
    supabase.from("meters").select("*", { count: "exact", head: true }),
    supabase.from("reservoirs").select("*", { count: "exact", head: true }),
    supabase
      .from("infrastructure_points")
      .select("*", { count: "exact", head: true })
      .eq("type", "hydrant"),
  ]);

  // Get date range for readings
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - (frequency === "daily" ? 1 : 7));

  // Get recent readings count
  const { count: recentReadings } = await supabase
    .from("meter_readings")
    .select("*", { count: "exact", head: true })
    .gte("recorded_at", dateThreshold.toISOString());

  // Get latest meter readings
  const { data: meterReadings } = await supabase
    .from("meter_readings")
    .select(`
      reading_value,
      recorded_at,
      meters:meter_id (name)
    `)
    .order("recorded_at", { ascending: false })
    .limit(5);

  // Get latest chlorine readings
  const { data: chlorineReadings } = await supabase
    .from("chlorine_readings")
    .select(`
      free_chlorine,
      recorded_at,
      infrastructure_points:location_id (name)
    `)
    .order("recorded_at", { ascending: false })
    .limit(5);

  // Get latest reservoir readings
  const { data: reservoirReadings } = await supabase
    .from("reservoir_readings")
    .select(`
      level_percentage,
      recorded_at,
      reservoirs:reservoir_id (name)
    `)
    .order("recorded_at", { ascending: false })
    .limit(5);

  // Get recent log posts
  const { data: logPosts } = await supabase
    .from("log_posts")
    .select(`
      title,
      created_at,
      profiles:created_by (full_name, email)
    `)
    .gte("created_at", dateThreshold.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  // Prepare digest data
  // Note: Supabase returns relations as single objects for foreign keys
  type RelatedMeter = { name: string } | null;
  type RelatedPoint = { name: string } | null;
  type RelatedReservoir = { name: string } | null;
  type RelatedProfile = { full_name: string | null; email: string } | null;

  const digestData = {
    stats: {
      totalMeters: totalMeters ?? 0,
      totalReservoirs: totalReservoirs ?? 0,
      totalHydrants: totalHydrants ?? 0,
      recentReadings: recentReadings ?? 0,
    },
    latestMeterReadings: (meterReadings ?? []).map((r) => {
      const meter = r.meters as unknown as RelatedMeter;
      return {
        meterName: meter?.name ?? "Unknown",
        value: r.reading_value,
        recordedAt: r.recorded_at,
      };
    }),
    latestChlorineReadings: (chlorineReadings ?? []).map((r) => {
      const point = r.infrastructure_points as unknown as RelatedPoint;
      return {
        location: point?.name ?? "Unknown",
        value: r.free_chlorine,
        recordedAt: r.recorded_at,
      };
    }),
    latestReservoirReadings: (reservoirReadings ?? []).map((r) => {
      const reservoir = r.reservoirs as unknown as RelatedReservoir;
      return {
        reservoirName: reservoir?.name ?? "Unknown",
        level: r.level_percentage,
        recordedAt: r.recorded_at,
      };
    }),
    recentLogPosts: (logPosts ?? []).map((p) => {
      const author = p.profiles as unknown as RelatedProfile;
      return {
        title: p.title,
        createdBy: author?.full_name ?? author?.email ?? "Unknown",
        createdAt: p.created_at,
      };
    }),
  };

  // Send to each user
  for (const user of users) {
    if (!user.profiles?.email) continue;

    const result = await sendDigestEmail(
      user.profiles.email,
      frequency,
      digestData
    );

    if (result.success) {
      results.sent++;
    } else if (result.error) {
      results.errors.push(`Digest to ${user.profiles.email}: ${result.error}`);
    }
  }

  return results;
}
