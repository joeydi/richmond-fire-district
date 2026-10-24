import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth/cron";
import { sendDigestEmails } from "@/lib/services/notifications";

/**
 * GET /api/cron/weekly
 *
 * Weekly cron job every Monday at 12:00 UTC (7am EST / 8am EDT):
 * - Sends weekly digest emails to subscribed users
 *
 * Configured in vercel.json with schedule "0 12 * * 1"
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDigestEmails("weekly");
    const hasErrors = result.errors.length > 0;

    if (hasErrors) {
      console.error("Weekly cron finished with errors:", result.errors);
    }

    return NextResponse.json(
      {
        success: !hasErrors,
        timestamp: new Date().toISOString(),
        emailsSent: result.sent,
        errors: hasErrors ? result.errors : undefined,
      },
      { status: hasErrors ? 500 : 200 }
    );
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
