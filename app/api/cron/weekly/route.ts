import { NextRequest, NextResponse } from "next/server";
import { sendDigestEmails } from "@/lib/services/notifications";

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
 * GET /api/cron/weekly
 *
 * Weekly cron job that runs every Monday at 8am:
 * - Sends weekly digest emails to subscribed users
 *
 * Configured in vercel.json with schedule "0 8 * * 1"
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDigestEmails("weekly");

    return NextResponse.json({
      success: result.errors.length === 0,
      timestamp: new Date().toISOString(),
      emailsSent: result.sent,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Error in weekly cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
