import type { ReactElement } from "react";
import sgMail from "@sendgrid/mail";
import { render } from "@react-email/components";

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@example.com";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "Richmond Fire District";

/** Base URL for links in emails */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Render a React Email template and send it with SendGrid
 */
export async function sendEmail(to: string, subject: string, template: ReactElement): Promise<EmailResult> {
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const [html, text] = await Promise.all([render(template), render(template, { plainText: true })]);

    await sgMail.send({
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      html,
      text,
    });

    return { success: true };
  } catch (error) {
    console.error("SendGrid error:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return { success: false, error: message };
  }
}
