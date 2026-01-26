import { NextRequest, NextResponse } from "next/server";
import {
  checkAndNotifyMissingReadings,
  sendDigestEmails,
} from "@/lib/services/notifications";

/**
 * Verify Vercel Cron authorization
 * Vercel sends CRON_SECRET in the Authorization header
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");

  // Check for Vercel's CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Fallback to NOTIFICATION_API_SECRET for manual triggers
  const apiSecret = process.env.NOTIFICATION_API_SECRET;
  if (apiSecret && authHeader === `Bearer ${apiSecret}`) {
    return true;
  }

  // Allow in development without secret
  if (!cronSecret && !apiSecret && process.env.NODE_ENV === "development") {
    return true;
  }

  return false;
}

/**
 * GET /api/cron/daily
 *
 * Daily cron job that runs at 8am:
 * - Checks for missing readings and sends alerts
 * - Sends daily digest emails to subscribed users
 *
 * Configured in vercel.json with schedule "0 8 * * *"
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
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

  return NextResponse.json({
    success: !hasErrors,
    timestamp: new Date().toISOString(),
    results,
  });
}
