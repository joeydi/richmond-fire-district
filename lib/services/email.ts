import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@example.com";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "Richmond Fire District";

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(
  options: EmailOptions
): Promise<{ success: boolean; error?: string }> {
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    await sgMail.send({
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: options.subject,
      text: options.text || options.html?.replace(/<[^>]*>/g, "") || "",
      html: options.html,
    });

    return { success: true };
  } catch (error) {
    console.error("SendGrid error:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return { success: false, error: message };
  }
}

/**
 * Send a new log post notification email
 */
export async function sendNewLogPostEmail(
  to: string,
  logPost: {
    title: string;
    content: string;
    createdBy: string;
    createdAt: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const formattedDate = new Date(logPost.createdAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">New Log Entry</h2>
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; color: #0f172a;">${logPost.title}</h3>
        <p style="color: #64748b; margin: 0 0 16px 0; font-size: 14px;">
          Posted by ${logPost.createdBy} on ${formattedDate}
        </p>
        <div style="color: #334155; line-height: 1.6;">
          ${logPost.content}
        </div>
      </div>
      <p style="color: #64748b; font-size: 12px;">
        You received this email because you have notifications enabled for new log posts.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `New Log Entry: ${logPost.title}`,
    html,
    text: `New Log Entry: ${logPost.title}\n\nPosted by ${logPost.createdBy} on ${formattedDate}\n\n${logPost.content}`,
  });
}

/**
 * Send a missing reading alert email
 */
export async function sendMissingReadingEmail(
  to: string,
  readingType: "meter" | "chlorine",
  daysSinceLastReading: number
): Promise<{ success: boolean; error?: string }> {
  const typeLabel = readingType === "meter" ? "Meter" : "Chlorine";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Missing ${typeLabel} Reading Alert</h2>
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 16px 0;">
        <p style="color: #991b1b; margin: 0; font-size: 16px;">
          It has been <strong>${daysSinceLastReading} day${daysSinceLastReading === 1 ? "" : "s"}</strong> since the last ${readingType} reading was recorded.
        </p>
      </div>
      <p style="color: #334155;">
        Please log in to the Richmond Fire District water system to record the latest ${readingType} readings.
      </p>
      <p style="color: #64748b; font-size: 12px;">
        You received this email because you have notifications enabled for missing ${readingType} readings.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Alert: No ${typeLabel} Reading for ${daysSinceLastReading} Day${daysSinceLastReading === 1 ? "" : "s"}`,
    html,
    text: `Missing ${typeLabel} Reading Alert\n\nIt has been ${daysSinceLastReading} day(s) since the last ${readingType} reading was recorded.\n\nPlease log in to record the latest readings.`,
  });
}

/**
 * Send a digest email with summary stats
 */
export async function sendDigestEmail(
  to: string,
  frequency: "daily" | "weekly",
  data: {
    stats: {
      totalMeters: number;
      totalReservoirs: number;
      totalHydrants: number;
      recentReadings: number;
    };
    latestMeterReadings: Array<{
      meterName: string;
      value: number;
      recordedAt: string;
    }>;
    latestChlorineReadings: Array<{
      location: string;
      value: number;
      recordedAt: string;
    }>;
    latestReservoirReadings: Array<{
      reservoirName: string;
      level: number;
      recordedAt: string;
    }>;
    recentLogPosts: Array<{
      title: string;
      createdBy: string;
      createdAt: string;
    }>;
  }
): Promise<{ success: boolean; error?: string }> {
  const periodLabel = frequency === "daily" ? "Daily" : "Weekly";
  const dateRange = frequency === "daily"
    ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : `Week of ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">${periodLabel} Water System Digest</h2>
      <p style="color: #64748b;">${dateRange}</p>

      <!-- Stats -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 16px 0; color: #0f172a;">System Overview</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Total Meters</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${data.stats.totalMeters}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Total Reservoirs</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${data.stats.totalReservoirs}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Total Hydrants</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${data.stats.totalHydrants}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Recent Readings</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${data.stats.recentReadings}</td>
          </tr>
        </table>
      </div>

      <!-- Latest Meter Readings -->
      ${data.latestMeterReadings.length > 0 ? `
        <div style="margin: 24px 0;">
          <h3 style="color: #0f172a; margin-bottom: 12px;">Latest Meter Readings</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.latestMeterReadings.map(r => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 0; color: #334155;">${r.meterName}</td>
                <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #0f172a;">${r.value.toLocaleString()} gal</td>
              </tr>
            `).join("")}
          </table>
        </div>
      ` : ""}

      <!-- Latest Chlorine Readings -->
      ${data.latestChlorineReadings.length > 0 ? `
        <div style="margin: 24px 0;">
          <h3 style="color: #0f172a; margin-bottom: 12px;">Latest Chlorine Readings</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.latestChlorineReadings.map(r => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 0; color: #334155;">${r.location}</td>
                <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #0f172a;">${r.value} ppm</td>
              </tr>
            `).join("")}
          </table>
        </div>
      ` : ""}

      <!-- Latest Reservoir Readings -->
      ${data.latestReservoirReadings.length > 0 ? `
        <div style="margin: 24px 0;">
          <h3 style="color: #0f172a; margin-bottom: 12px;">Latest Reservoir Levels</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${data.latestReservoirReadings.map(r => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 0; color: #334155;">${r.reservoirName}</td>
                <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #0f172a;">${r.level}%</td>
              </tr>
            `).join("")}
          </table>
        </div>
      ` : ""}

      <!-- Recent Log Posts -->
      ${data.recentLogPosts.length > 0 ? `
        <div style="margin: 24px 0;">
          <h3 style="color: #0f172a; margin-bottom: 12px;">Recent Log Entries</h3>
          ${data.recentLogPosts.map(p => `
            <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; color: #334155; font-weight: 500;">${p.title}</p>
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                By ${p.createdBy} on ${new Date(p.createdAt).toLocaleDateString()}
              </p>
            </div>
          `).join("")}
        </div>
      ` : ""}

      <p style="color: #64748b; font-size: 12px; margin-top: 32px;">
        You received this email because you have ${frequency} digest emails enabled.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: `${periodLabel} Water System Digest - ${dateRange}`,
    html,
  });
}
