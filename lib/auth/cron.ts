import type { NextRequest } from "next/server";

/**
 * Verify a cron request. Vercel Cron sends `Authorization: Bearer {CRON_SECRET}`;
 * send the same header to trigger a job by hand. Without CRON_SECRET, requests
 * are allowed only in development.
 */
export function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV === "development";
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}
