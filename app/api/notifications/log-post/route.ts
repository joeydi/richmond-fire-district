import { NextRequest, NextResponse } from "next/server";
import { notifyNewLogPost } from "@/lib/services/notifications";

// Verify the request is authorized (e.g., from internal service or webhook)
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
 * POST /api/notifications/log-post
 * Notify users about a new log post
 *
 * Body: { id, title, content, createdBy, createdAt }
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { id, title, content, createdBy, createdAt } = body;

    if (!id || !title || !content || !createdBy || !createdAt) {
      return NextResponse.json(
        { error: "Missing required fields: id, title, content, createdBy, createdAt" },
        { status: 400 }
      );
    }

    const result = await notifyNewLogPost({
      id,
      title,
      content,
      createdBy,
      createdAt,
    });

    return NextResponse.json({
      success: true,
      emailsSent: result.emailsSent,
      smsSent: result.smsSent,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error("Error in log-post notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
