import { NextRequest, NextResponse } from "next/server";
import { checkAndNotifyMissingReadings } from "@/lib/services/notifications";

// Verify the request is authorized (e.g., from cron job service)
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.NOTIFICATION_API_SECRET;

  if (!expectedToken) {
    // If no secret is configured, allow in development
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${expectedToken}`;
}

/**
 * POST /api/notifications/check-readings
 * Check for missing readings and notify subscribed users
 *
 * This should be called by a cron job (e.g., daily)
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAndNotifyMissingReadings();

    return NextResponse.json({
      success: true,
      meterAlerts: result.meterAlerts,
      chlorineAlerts: result.chlorineAlerts,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Error in check-readings notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
