import { NextRequest, NextResponse } from "next/server";
import { sendDigestEmails } from "@/lib/services/notifications";

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
 * POST /api/notifications/digest
 * Send digest emails to subscribed users
 *
 * Query params:
 * - frequency: "daily" | "weekly"
 *
 * This should be called by cron jobs:
 * - Daily digest: every day at 8am
 * - Weekly digest: every Monday at 8am
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const frequency = searchParams.get("frequency");

    if (frequency !== "daily" && frequency !== "weekly") {
      return NextResponse.json(
        { error: "Invalid frequency. Must be 'daily' or 'weekly'" },
        { status: 400 }
      );
    }

    const result = await sendDigestEmails(frequency);

    return NextResponse.json({
      success: true,
      frequency,
      emailsSent: result.sent,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Error in digest notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
