import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron";
import {
  checkAndNotifyMissingReadings,
  sendDigestEmails,
} from "@/lib/services/notifications";

/**
 * GET /api/cron/daily
 *
 * Daily cron job at 12:00 UTC (7am EST / 8am EDT):
 * - Checks for missing readings and sends alerts
 * - Sends daily digest emails to subscribed users
 *
 * Configured in vercel.json with schedule "0 12 * * *"
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    missingReadings: { meterAlerts: 0, chlorineAlerts: 0, errors: [] as string[] },
    dailyDigest: { sent: 0, errors: [] as string[] },
  };

  try {
    // Check for missing readings and notify users
    results.missingReadings = await checkAndNotifyMissingReadings();
  } catch (error) {
    console.error("Error checking missing readings:", error);
    results.missingReadings.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  try {
    // Send daily digest emails
    results.dailyDigest = await sendDigestEmails("daily");
  } catch (error) {
    console.error("Error sending daily digest:", error);
    results.dailyDigest.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  const hasErrors =
    results.missingReadings.errors.length > 0 ||
    results.dailyDigest.errors.length > 0;

  if (hasErrors) {
    console.error("Daily cron finished with errors:", results);
  }

  return NextResponse.json(
    {
      success: !hasErrors,
      timestamp: new Date().toISOString(),
      results,
    },
    { status: hasErrors ? 500 : 200 }
  );
}
