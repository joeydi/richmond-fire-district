import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { APP_URL, sendEmail, type EmailResult } from "./email";
import { NewLogPostEmail } from "@/emails/new-log-post";
import { MissingReadingEmail, missingReadingSubject, type MissingReadingType } from "@/emails/missing-reading";
import { DigestEmail, digestSubject, type DigestEmailProps } from "@/emails/digest";
import { TestEmail } from "@/emails/test-email";
import type { NotificationPreferences } from "@/lib/types/database";

// SMS (lib/services/sms.ts) is not wired up yet: Twilio needs A2P 10DLC or
// toll-free verification before it can text US numbers. Only email is sent.

// These run from cron jobs and after() callbacks with no user session, and
// they read every user's preferences, so they need the service role client.
// RLS would otherwise hide every row but the caller's own.

const DAY_MS = 1000 * 60 * 60 * 24;

interface Recipient {
  email: string;
  fullName: string | null;
  preferences: NotificationPreferences;
}

type PreferenceRow = NotificationPreferences & {
  profiles: { email: string; full_name: string | null } | null;
};

/**
 * Get users who have turned on an alert and its email channel
 */
async function getEmailRecipients(
  enabledField: keyof NotificationPreferences,
  emailField: keyof NotificationPreferences
): Promise<Recipient[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*, profiles:user_id (email, full_name)")
    .eq(enabledField, true)
    .eq(emailField, true);

  if (error) {
    throw new Error(`Error fetching notification recipients: ${error.message}`);
  }

  return ((data ?? []) as unknown as PreferenceRow[])
    .filter((row) => row.profiles?.email)
    .map(({ profiles, ...preferences }) => ({
      email: profiles!.email,
      fullName: profiles!.full_name,
      preferences,
    }));
}

/**
 * A one-line title for a markdown log post: its first line, stripped of
 * heading and emphasis markers
 */
export function logPostTitle(content: string): string {
  const firstLine =
    content
      .split("\n")
      .map((line) => line.replace(/^[#>\-*+\s]+/, "").replace(/[*_`~]|\[|\]\([^)]*\)|\]/g, "").trim())
      .find(Boolean) ?? "Untitled post";
  return firstLine.length > 60 ? `${firstLine.slice(0, 60).trimEnd()}…` : firstLine;
}

function tally(results: { email: string; result: EmailResult }[]) {
  return {
    sent: results.filter((r) => r.result.success).length,
    errors: results.filter((r) => !r.result.success).map((r) => `${r.email}: ${r.result.error}`),
  };
}

/**
 * Email everyone subscribed to new log posts, except the author
 */
export async function notifyNewLogPost(logPost: {
  id: string;
  content: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
}): Promise<{ sent: number; errors: string[] }> {
  const recipients = await getEmailRecipients("notify_new_log_posts", "notify_new_log_posts_email");
  const title = logPostTitle(logPost.content);

  const results = await Promise.all(
    recipients
      .filter((user) => user.preferences.user_id !== logPost.authorId)
      .map(async (user) => ({
        email: user.email,
        result: await sendEmail(
          user.email,
          `${logPost.authorName} posted to the log: ${title}`,
          createElement(NewLogPostEmail, {
            appUrl: APP_URL,
            postId: logPost.id,
            title,
            content: logPost.content,
            authorName: logPost.authorName,
            createdAt: logPost.createdAt,
          })
        ),
      }))
  );

  return tally(results);
}

const MISSING_READING_CONFIG = {
  meter: {
    table: "meter_readings",
    enabled: "notify_missing_meter_readings",
    email: "notify_missing_meter_readings_email",
    threshold: "missing_meter_reading_days",
    lastAlert: "last_meter_alert_at",
  },
  chlorine: {
    table: "chlorine_readings",
    enabled: "notify_missing_chlorine_readings",
    email: "notify_missing_chlorine_readings_email",
    threshold: "missing_chlorine_reading_days",
    lastAlert: "last_chlorine_alert_at",
  },
} as const;

async function notifyMissingReading(readingType: MissingReadingType): Promise<{ sent: number; errors: string[] }> {
  const config = MISSING_READING_CONFIG[readingType];
  const supabase = createAdminClient();

  // Interpolated rows are estimates filled in during imports, not readings
  // someone took, so they don't count as the last reading
  const { data: latest, error } = await supabase
    .from(config.table)
    .select("recorded_at")
    .eq("interpolated", false)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Error fetching latest ${readingType} reading: ${error.message}`);
  }

  const lastReadingAt: string | null = latest?.recorded_at ?? null;
  const daysSinceLastReading = lastReadingAt
    ? Math.floor((Date.now() - new Date(lastReadingAt).getTime()) / DAY_MS)
    : null;

  const recipients = await getEmailRecipients(config.enabled, config.email);

  const due = recipients.filter((user) => {
    if (daysSinceLastReading !== null && daysSinceLastReading < user.preferences[config.threshold]) {
      return false;
    }
    // One alert per gap: skip anyone already alerted since the last reading
    const lastAlert = user.preferences[config.lastAlert];
    return !lastAlert || (lastReadingAt !== null && new Date(lastAlert) < new Date(lastReadingAt));
  });

  const results = await Promise.all(
    due.map(async (user) => {
      const props = {
        appUrl: APP_URL,
        readingType,
        lastReadingAt,
        daysSinceLastReading,
        thresholdDays: user.preferences[config.threshold],
      };
      const result = await sendEmail(user.email, missingReadingSubject(props), createElement(MissingReadingEmail, props));

      if (result.success) {
        const { error: updateError } = await supabase
          .from("notification_preferences")
          .update({ [config.lastAlert]: new Date().toISOString() })
          .eq("user_id", user.preferences.user_id);
        if (updateError) {
          console.error(`Error recording ${readingType} alert for ${user.email}:`, updateError);
        }
      }

      return { email: user.email, result };
    })
  );

  return tally(results);
}

/**
 * Check for missing meter and chlorine readings and alert subscribed users
 */
export async function checkAndNotifyMissingReadings(): Promise<{
  meterAlerts: number;
  chlorineAlerts: number;
  errors: string[];
}> {
  const [meter, chlorine] = await Promise.all([notifyMissingReading("meter"), notifyMissingReading("chlorine")]);

  return {
    meterAlerts: meter.sent,
    chlorineAlerts: chlorine.sent,
    errors: [...meter.errors, ...chlorine.errors],
  };
}

type MeterReadingRow = { meter_id: string | null; reading_value: number; recorded_at: string };

/**
 * Gallons produced across all meters in a period. Meter readings are
 * cumulative, so each meter's production is its last reading in the period
 * minus its last reading before it (or its first reading in the period when
 * there's none before). Returns null when no meter has two readings to compare.
 */
async function getProduction(start: Date, end: Date): Promise<DigestEmailProps["production"]> {
  const supabase = createAdminClient();

  const [{ data: before }, { data: during }] = await Promise.all([
    // Baseline per meter: the most recent reading before the period
    supabase
      .from("meter_readings")
      .select("meter_id, reading_value, recorded_at")
      .lt("recorded_at", start.toISOString())
      .order("recorded_at", { ascending: false })
      .limit(50),
    supabase
      .from("meter_readings")
      .select("meter_id, reading_value, recorded_at")
      .gte("recorded_at", start.toISOString())
      .lte("recorded_at", end.toISOString())
      .order("recorded_at", { ascending: true })
      .limit(5000),
  ]);

  const byMeter = new Map<string, { first?: MeterReadingRow; last?: MeterReadingRow }>();
  for (const row of (before ?? []) as MeterReadingRow[]) {
    if (row.meter_id && !byMeter.has(row.meter_id)) byMeter.set(row.meter_id, { first: row });
  }
  for (const row of (during ?? []) as MeterReadingRow[]) {
    if (!row.meter_id) continue;
    const entry = byMeter.get(row.meter_id) ?? {};
    entry.first ??= row;
    entry.last = row;
    byMeter.set(row.meter_id, entry);
  }

  let totalGallons = 0;
  let spanMs = 0;
  let measured = false;
  for (const { first, last } of byMeter.values()) {
    if (!first || !last || first === last) continue;
    totalGallons += last.reading_value - first.reading_value;
    spanMs = Math.max(spanMs, new Date(last.recorded_at).getTime() - new Date(first.recorded_at).getTime());
    measured = true;
  }

  if (!measured) return { totalGallons: null, averageDailyGallons: null };
  return {
    totalGallons,
    averageDailyGallons: spanMs > 0 ? totalGallons / (spanMs / DAY_MS) : null,
  };
}

export async function buildDigest(frequency: "daily" | "weekly"): Promise<DigestEmailProps> {
  const supabase = createAdminClient();
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - (frequency === "daily" ? 1 : 7) * DAY_MS);
  const since = periodStart.toISOString();

  const count = (table: string, excludeInterpolated: boolean) => {
    let query = supabase.from(table).select("*", { count: "exact", head: true }).gte("recorded_at", since);
    if (excludeInterpolated) query = query.eq("interpolated", false);
    return query;
  };

  const [
    production,
    { count: meterCount },
    { count: chlorineCount },
    { count: reservoirCount },
    { data: chlorine, error: chlorineError },
    { data: reservoirReadings, error: reservoirError },
    { data: logPosts, error: logError },
  ] = await Promise.all([
    getProduction(periodStart, periodEnd),
    count("meter_readings", true),
    count("chlorine_readings", true),
    count("reservoir_readings", false),
    supabase
      .from("chlorine_readings")
      .select("residual_level, recorded_at, infrastructure_points:location_id (name)")
      .eq("interpolated", false)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false })
      .limit(10),
    // Recent readings across reservoirs; reduced to the latest per reservoir below
    supabase
      .from("reservoir_readings")
      .select("reservoir_id, level_inches, recorded_at, reservoirs:reservoir_id (name, max_level_inches)")
      .order("recorded_at", { ascending: false })
      .limit(50),
    supabase
      .from("log_posts")
      .select("id, content, created_at, profiles:author_id (full_name, email)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const queryError = chlorineError ?? reservoirError ?? logError;
  if (queryError) {
    throw new Error(`Error building ${frequency} digest: ${queryError.message}`);
  }

  // Supabase types to-one relations as arrays without generated types
  type Named = { name: string } | null;
  type Reservoir = { name: string; max_level_inches: number | null } | null;
  type Author = { full_name: string | null; email: string } | null;

  const latestByReservoir = new Map<string, DigestEmailProps["reservoirs"][number]>();
  for (const r of reservoirReadings ?? []) {
    if (!r.reservoir_id || latestByReservoir.has(r.reservoir_id)) continue;
    const reservoir = r.reservoirs as unknown as Reservoir;
    latestByReservoir.set(r.reservoir_id, {
      name: reservoir?.name ?? "Reservoir",
      levelInches: r.level_inches,
      maxLevelInches: reservoir?.max_level_inches ?? null,
      recordedAt: r.recorded_at,
    });
  }

  return {
    appUrl: APP_URL,
    frequency,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    production,
    readingCounts: { meter: meterCount ?? 0, chlorine: chlorineCount ?? 0, reservoir: reservoirCount ?? 0 },
    chlorineReadings: (chlorine ?? []).map((r) => ({
      location: (r.infrastructure_points as unknown as Named)?.name ?? "Unknown location",
      level: r.residual_level,
      recordedAt: r.recorded_at,
    })),
    reservoirs: [...latestByReservoir.values()],
    logPosts: (logPosts ?? []).map((p) => {
      const author = p.profiles as unknown as Author;
      return {
        id: p.id,
        title: logPostTitle(p.content),
        authorName: author?.full_name || author?.email || "Unknown",
        createdAt: p.created_at,
      };
    }),
  };
}

/**
 * Send digest emails to users subscribed at this frequency
 */
export async function sendDigestEmails(frequency: "daily" | "weekly"): Promise<{ sent: number; errors: string[] }> {
  const recipients = (await getEmailRecipients("digest_enabled", "digest_email")).filter(
    (user) => user.preferences.digest_frequency === frequency
  );

  if (recipients.length === 0) {
    return { sent: 0, errors: [] };
  }

  const digest = await buildDigest(frequency);
  const subject = digestSubject(digest);

  const results = await Promise.all(
    recipients.map(async (user) => ({
      email: user.email,
      result: await sendEmail(user.email, subject, createElement(DigestEmail, digest)),
    }))
  );

  return tally(results);
}

/**
 * Send a test email so a user can confirm delivery
 */
export async function sendTestEmail(to: string, recipientName: string | null): Promise<EmailResult> {
  return sendEmail(
    to,
    "Test email from Richmond Fire District",
    createElement(TestEmail, { appUrl: APP_URL, recipientName })
  );
}
